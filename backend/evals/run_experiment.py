"""Upload the SOC eval dataset and run Phoenix experiments.

Routing runs on every case and does not call a model. Answer quality runs
on the lookup and fast splits. Lookup answers come from the alert store.
Fast answers call the live OpenRouter model. Deep cases keep their gold
reference in the dataset and are scored on the route only.

    /tmp/soc-api-venv/bin/python backend/evals/run_experiment.py
"""

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from evals.cases import examples, validate
from evals.evaluators import answer_quality, models_match, reason_accuracy, route_accuracy
from model_router import RouterError, answer_question, planned_models

DATASET_NAME = "soc-assistant-evals"
DATASET_PATH = Path(__file__).with_name("soc_assistant_cases.json")


def _load_phoenix_env():
    from tracer import _load_env_files

    _load_env_files()


def routing_task(input):
    from model_router import choose_route

    tier, reasons = choose_route(
        input["message"],
        input["records"],
        input["context_type"],
        input["matched"],
    )
    return {
        "tier": tier,
        "reason": "; ".join(reasons),
        "models": planned_models(input["message"], tier),
        "message": "",
        "executed": False,
    }


def answer_task(input):
    from model_router import choose_route

    tier, reasons = choose_route(
        input["message"],
        input["records"],
        input["context_type"],
        input["matched"],
    )
    reason = "; ".join(reasons)
    if tier == "deep":
        return {
            "tier": tier,
            "reason": reason,
            "models": planned_models(input["message"], tier),
            "message": "",
            "executed": False,
        }
    try:
        result = answer_question(
            input["message"],
            input["records"],
            input["context_type"],
            input["matched"],
        )
    except RouterError as exc:
        return {
            "tier": tier,
            "reason": reason,
            "models": [],
            "message": "",
            "executed": False,
            "error": str(exc),
        }
    result["executed"] = True
    return result


def _write_dataset(rows):
    DATASET_PATH.write_text(json.dumps(rows, indent=2) + "\n")


def _upload(client, rows):
    try:
        existing = client.datasets.get_dataset(dataset=DATASET_NAME, timeout=60)
    except ValueError as exc:
        if "not found" not in str(exc).lower():
            raise
        existing = None
    if existing is not None and len(existing) == len(rows):
        print(f"Reusing Phoenix dataset {existing.name}")
        return existing
    if existing is not None:
        deleted = client._client.delete(f"v1/datasets/{existing.id}")
        if deleted.status_code not in {200, 204}:
            deleted.raise_for_status()
    return client.datasets.create_dataset(
        name=DATASET_NAME,
        examples=rows,
        dataset_description=(
            "Synthetic SOC assistant cases. Lookup rows are answered from the "
            "alert store. Fast rows call the live cheap model. Deep rows carry "
            "a gold reference and are scored on the local route only."
        ),
        timeout=60,
    )


def _field(obj, name):
    if isinstance(obj, dict):
        return obj.get(name)
    return getattr(obj, name, None)


def _print_scores(ran):
    buckets = {}
    for run in _field(ran, "evaluation_runs") or []:
        result = _field(run, "result") or {}
        if isinstance(result, list):
            result = result[0] if result else {}
        buckets.setdefault(_field(run, "name"), []).append(_field(result, "score"))
    for name, scores in buckets.items():
        numbers = [score for score in scores if isinstance(score, (int, float))]
        skipped = len(scores) - len(numbers)
        average = sum(numbers) / len(numbers) if numbers else 0
        suffix = f", {skipped} not run" if skipped else ""
        print(f"  {name}: {average:.2f} across {len(numbers)}{suffix}")


def main():
    _load_phoenix_env()
    from tracer import init_tracing

    init_tracing()
    rows = validate(examples())
    _write_dataset(rows)
    print(f"Wrote {len(rows)} cases to {DATASET_PATH.name}")

    from phoenix.client import Client

    client = Client()
    dataset = _upload(client, rows)
    print(f"Phoenix dataset {dataset.name} has {len(dataset)} examples")

    routing = client.experiments.run_experiment(
        dataset=dataset,
        task=routing_task,
        evaluators=[route_accuracy, reason_accuracy, models_match],
        experiment_name="soc-routing",
        experiment_description="Local tier choice for every synthetic case. No model call.",
        print_summary=True,
        timeout=60,
        retries=0,
    )
    _print_scores(routing)
    answers = client.experiments.run_experiment(
        dataset=dataset,
        task=answer_task,
        evaluators=[route_accuracy, reason_accuracy, models_match, answer_quality],
        experiment_name="soc-answer-quality",
        experiment_description=(
            "Live lookup and fast-path answers. Deep rows are routed only and "
            "are not sent to the correlator or planner."
        ),
        print_summary=True,
        timeout=180,
        retries=0,
    )
    _print_scores(answers)
    from opentelemetry import trace

    provider = trace.get_tracer_provider()
    if hasattr(provider, "force_flush"):
        provider.force_flush()
    routing_url = client.experiments.get_experiment_url(dataset.id, routing["experiment_id"])
    answer_url = client.experiments.get_experiment_url(dataset.id, answers["experiment_id"])
    print(f"Routing experiment: {routing_url}")
    print(f"Answer experiment: {answer_url}")


if __name__ == "__main__":
    main()
