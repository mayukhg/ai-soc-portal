"""Run the SOC assistant eval suites as Langfuse experiments and apply the release gates.

From the backend directory:

    python -m langfuse_evals.run                      # all suites, deep path routed only
    python -m langfuse_evals.run --include-deep       # also call the correlator and planner
    python -m langfuse_evals.run --judge --repeats 3  # LLM judge and consistency
    python -m langfuse_evals.run --offline-model      # no OpenRouter call, pipeline smoke test
    python -m langfuse_evals.run --no-langfuse        # same checks, nothing sent to Langfuse

Each suite becomes a Langfuse dataset named ``soc-assistant/<suite>``. Items
are upserted by id, so re-running updates labels in place. Each run is an
experiment on that dataset, with item scores on every trace and summary
scores on the run. The exit code is 1 when a blocking gate fails.
"""

import argparse
import json
import statistics
import sys
from datetime import datetime, timezone
from functools import partial
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from langfuse_evals import cases, checks, evaluators, gates, tasks  # noqa: E402

DATASET_PREFIX = "soc-assistant"


class _LocalResult:
    """Same shape as a Langfuse ExperimentItemResult, for --no-langfuse runs."""

    def __init__(self, item, output, evaluations):
        self.item = item
        self.output = output
        self.evaluations = evaluations
        self.trace_id = None


def _flatten(value):
    if value is None:
        return []
    if isinstance(value, list):
        return value
    return [value]


def run_local(items, task, item_evaluators):
    results = []
    for item in items:
        output = task(item=item)
        evaluations = []
        for evaluator in item_evaluators:
            evaluations += _flatten(
                evaluator(
                    input=item["input"],
                    output=output,
                    expected_output=item["expected_output"],
                    metadata=item["metadata"],
                )
            )
        results.append(_LocalResult(item, output, evaluations))
    return results


def sync_dataset(client, suite, items):
    name = f"{DATASET_PREFIX}/{suite}"
    try:
        client.get_dataset(name)
    except Exception:  # the SDK raises a not-found API error
        client.create_dataset(
            name=name,
            description=cases.DESCRIPTIONS[suite],
            metadata={"owner": "soc-assistant", "suite": suite},
        )
    for item in items:
        client.create_dataset_item(
            dataset_name=name,
            id=item["id"],
            input=item["input"],
            expected_output=item["expected_output"],
            metadata=item["metadata"],
        )
    return client.get_dataset(name)


def _field(item, name):
    if isinstance(item, dict):
        return item.get(name)
    return getattr(item, name, None)


# Checks whose pass/fail must not flip between identical runs. Wording, and
# which true details a reply chooses to mention, may vary.
DECISION_CHECKS = (
    "route_accuracy",
    "models_match",
    "lookup_exact",
    "fact_recall",
    "no_invented_entities",
    "severity_fidelity",
    "status_fidelity",
    "injection_resisted",
    "abstained",
    "safe_actions",
    "answer_complete",
)


def _repeat_signatures(runs, signature):
    by_case = {}
    for results in runs:
        for result in results:
            case_id = (_field(result.item, "metadata") or {}).get("case_id")
            by_case.setdefault(case_id, []).append(signature(result))
    repeated = [sigs for sigs in by_case.values() if len(sigs) > 1]
    if not repeated:
        return None
    return statistics.fmean(1.0 if len(set(sigs)) == 1 else 0.0 for sigs in repeated)


def consistency(runs):
    """Share of cases whose route and decision-check outcomes match in every repeat."""

    def signature(result):
        output = result.output or {}
        outcomes = tuple(
            sorted(
                (e.name, float(e.value) >= 1.0)
                for e in result.evaluations or []
                if e.name in DECISION_CHECKS and isinstance(e.value, (int, float))
            )
        )
        return output.get("tier"), bool(output.get("message")), outcomes

    return _repeat_signatures(runs, signature)


def entity_consistency(runs):
    """Share of cases that name exactly the same entities in every repeat. Reported, not gated."""

    def signature(result):
        output = result.output or {}
        return tuple(sorted(checks.extract_entities(output.get("message") or "")))

    return _repeat_signatures(runs, signature)


def run_suite(suite, args, client):
    items = cases.SUITES[suite]()
    if suite == "retrieval":
        task, item_evaluators = tasks.retrieval_task, list(evaluators.RETRIEVAL_EVALUATORS)
    else:
        task = partial(tasks.assistant_task, include_deep=args.include_deep)
        item_evaluators = list(evaluators.ASSISTANT_EVALUATORS)
        if args.judge:
            item_evaluators.append(evaluators.make_llm_judge(args.judge_model))
    repeats = 1 if suite == "retrieval" else args.repeats
    runs, urls = [], []
    last_run_id = None
    dataset = sync_dataset(client, suite, items) if client else None
    for index in range(repeats):
        run_name = f"{args.run_name}-{suite}" + (f"-r{index + 1}" if repeats > 1 else "")
        if dataset is None:
            runs.append(run_local(items, task, item_evaluators))
            continue
        result = dataset.run_experiment(
            name=f"{suite}",
            run_name=run_name,
            description=cases.DESCRIPTIONS[suite],
            task=task,
            evaluators=item_evaluators,
            run_evaluators=[evaluators.summary_run_evaluator],
            max_concurrency=args.concurrency,
            metadata={
                "suite": suite,
                "include_deep": str(args.include_deep),
                "judge": str(args.judge),
                "offline_model": str(args.offline_model),
                "repeat": str(index + 1),
            },
        )
        runs.append(result.item_results)
        urls.append(result.experiment_url or "")
        last_run_id = getattr(result, "experiment_id", None) or last_run_id
    rows = [row for results in runs for row in evaluators._item_scores(results)]
    summary = evaluators.summarize(rows)
    wording = entity_consistency(runs)
    if wording is not None:
        summary["entity_consistency"] = wording
    value = consistency(runs)
    if value is not None:
        summary["consistency"] = value
        if dataset is not None and last_run_id:
            client.create_score(
                name="consistency",
                value=value,
                dataset_run_id=last_run_id,
                comment=f"route and decision-check outcomes identical across {repeats} repeats",
            )
    return {"summary": summary, "results": runs[-1], "urls": urls, "items": len(items)}


def _fmt(value):
    if value is None:
        return "—"
    return f"{value:.3f}" if isinstance(value, float) else str(value)


def metric_table(summary):
    """One row per metric: overall, critical-severity cases, then each slice."""
    metrics = sorted({k.split("/", 1)[1] for k in summary if k.startswith("avg/")})
    slices = sorted({k.split("/")[1] for k in summary if k.startswith("slice/")})
    has_critical = any(k.startswith("critical/") for k in summary)
    header = ["Metric", "All"] + (["Critical"] if has_critical else []) + slices
    lines = ["", "| " + " | ".join(header) + " |", "|" + "---|" * len(header)]
    for metric in metrics:
        cells = [f"`{metric}`", _fmt(summary.get(f"avg/{metric}"))]
        if has_critical:
            cells.append(_fmt(summary.get(f"critical/{metric}")))
        cells += [_fmt(summary.get(f"slice/{name}/{metric}")) for name in slices]
        lines.append("| " + " | ".join(cells) + " |")
    extras = [k for k in ("consistency", "entity_consistency", "latency_p95_s", "cost_usd_total") if k in summary]
    if extras:
        lines += ["", " · ".join(f"`{k}` {_fmt(summary[k])}" for k in extras)]
    return lines


def scorecard(outcomes, gate_rows, args):
    lines = [
        "# SOC assistant eval scorecard",
        "",
        f"Run `{args.run_name}` · {datetime.now(timezone.utc):%Y-%m-%d %H:%M UTC}"
        f" · deep path {'called' if args.include_deep else 'routed only'}"
        f" · judge {'on' if args.judge else 'off'} · repeats {args.repeats}"
        + (" · **offline model (pipeline smoke test, not model quality)**" if args.offline_model else ""),
        "",
        "## Gates",
        "",
        "| Suite | Metric | Gate | Level | Value | Result |",
        "|---|---|---|---|---|---|",
    ]
    for suite, metric, op, threshold, level, value, status in gate_rows:
        lines.append(f"| {suite} | `{metric}` | {op} {threshold} | {level} | {_fmt(value)} | {status} |")
    for suite, outcome in outcomes.items():
        lines += ["", f"## {suite} ({outcome['items']} cases)", ""]
        for url in outcome["urls"]:
            if url:
                lines.append(f"Langfuse: {url}")
        lines += metric_table(outcome["summary"])
        failures = []
        for result in outcome["results"]:
            case_id = (_field(result.item, "metadata") or {}).get("case_id")
            for evaluation in result.evaluations or []:
                if evaluation.name in {"latency_s", "cost_usd"}:
                    continue
                if isinstance(evaluation.value, (int, float)) and evaluation.value < 1.0 and evaluation.name != "task_error":
                    failures.append(f"| {case_id} | `{evaluation.name}` | {_fmt(float(evaluation.value))} | {evaluation.comment or ''} |")
                if evaluation.name == "task_error":
                    failures.append(f"| {case_id} | `task_error` | 1 | {evaluation.comment or ''} |")
        if failures:
            lines += ["", "Cases below 1.0 (last repeat):", "", "| Case | Score | Value | Why |", "|---|---|---|---|"]
            lines += [row.replace("\n", " ") for row in failures]
    return "\n".join(lines) + "\n"


def parse_args(argv=None):
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--suite", default="all", help=f"comma list from {sorted(cases.SUITES)} or 'all'")
    parser.add_argument("--include-deep", action="store_true", help="call the deep-path models (costs more)")
    parser.add_argument("--judge", action="store_true", help="add the LLM-as-judge evaluator")
    parser.add_argument("--judge-model", default=None, help="OpenRouter model id for the judge")
    parser.add_argument("--repeats", type=int, default=1, help="run each suite N times to measure consistency")
    parser.add_argument("--concurrency", type=int, default=4)
    parser.add_argument("--offline-model", action="store_true", help="answer from the records, no OpenRouter call")
    parser.add_argument("--no-langfuse", action="store_true", help="run locally, send nothing to Langfuse")
    parser.add_argument("--run-name", default=f"soc-eval-{datetime.now(timezone.utc):%Y%m%d-%H%M%S}")
    parser.add_argument("--report", default=None, help="write the markdown scorecard here (a .json is written next to it)")
    parser.add_argument("--no-gate", action="store_true", help="always exit 0")
    return parser.parse_args(argv)


def main(argv=None):
    args = parse_args(argv)
    suites = sorted(cases.SUITES) if args.suite == "all" else [s.strip() for s in args.suite.split(",")]
    unknown = [s for s in suites if s not in cases.SUITES]
    if unknown:
        raise SystemExit(f"unknown suite {unknown}")

    import langfuse_tracing

    client = None if args.no_langfuse else langfuse_tracing.get_langfuse()
    if client is None and not args.no_langfuse:
        print("Langfuse is not configured (LANGFUSE_PUBLIC_KEY / LANGFUSE_SECRET_KEY / LANGFUSE_HOST). Running locally.")
    if args.no_langfuse:
        langfuse_tracing._DISABLED = True

    outcomes = {}
    with tasks.collector(offline=args.offline_model):
        for suite in suites:
            print(f"Running {suite} ...", flush=True)
            outcomes[suite] = run_suite(suite, args, client)
    if client is not None:
        client.flush()

    gate_rows = gates.evaluate_gates({suite: o["summary"] for suite, o in outcomes.items()})
    report = scorecard(outcomes, gate_rows, args)
    print(report)
    if args.report:
        path = Path(args.report)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(report)
        path.with_suffix(".json").write_text(
            json.dumps(
                {
                    "run_name": args.run_name,
                    "summaries": {s: o["summary"] for s, o in outcomes.items()},
                    "gates": [dict(zip(("suite", "metric", "op", "threshold", "level", "value", "status"), row)) for row in gate_rows],
                },
                indent=2,
            )
        )
    failures = gates.blocking_failures(gate_rows)
    if failures and not args.no_gate:
        print(f"{len(failures)} blocking gate(s) failed.")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
