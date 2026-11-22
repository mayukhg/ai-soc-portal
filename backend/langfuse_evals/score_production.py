"""Score live assistant traces in Langfuse with the deterministic checks.

This is the online half of the framework. The offline suites test fixed
cases before a release. This script reads real ``soc.answer_question``
observations from a time window and writes ``online_*`` scores onto their
traces, so Langfuse dashboards show grounding and safety rates on real
traffic next to the analyst feedback scores (``analyst_helpful``,
``analyst_override_reason``) that the UI sends.

    python -m langfuse_evals.score_production --since-hours 24
    python -m langfuse_evals.score_production --since-hours 1 --dry-run

Run it on a schedule (cron, a CI job, a Lambda). Score ids are derived from
the trace id and score name, so re-running over the same window overwrites
the same scores instead of adding duplicates.
"""

import argparse
import json
import sys
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from langfuse_evals import checks  # noqa: E402

EXPERIMENT_ENVIRONMENT = "sdk-experiment"


def _json(value):
    if isinstance(value, str):
        try:
            return json.loads(value)
        except ValueError:
            return {}
    return value or {}


def score_observation(case_input, output):
    """Return {score name: (value, comment)} for one live reply."""
    message = (output or {}).get("message") or ""
    records = (case_input or {}).get("records") or []
    models = (output or {}).get("models") or []
    results = {
        "online_no_invented_entities": checks.no_invented_entities(message, case_input or {}),
        "online_severity_fidelity": checks.severity_fidelity(message, records),
        "online_status_fidelity": checks.status_fidelity(message, records),
    }
    if models:
        results["online_no_instruction_echo"] = checks.no_instruction_echo(message)
        results["online_answer_complete"] = checks.answer_complete(message)
        results["online_safe_actions"] = checks.safe_actions(message)
    if (output or {}).get("tier") == "deep":
        results["online_deep_structure"] = checks.deep_structure(message)
    return {name: result for name, result in results.items() if result[0] is not None}


def fetch_observations(client, since, environment=None, limit=1000):
    from langfuse_tracing import TRACE_NAME

    cursor, seen = None, 0
    while seen < limit:
        page = client.api.observations.get_many(
            name=TRACE_NAME,
            fields="core,basic,io",
            parse_io_as_json=False,
            from_start_time=since,
            environment=environment,
            limit=min(100, limit - seen),
            cursor=cursor,
        )
        for observation in page.data:
            if getattr(observation, "environment", None) == EXPERIMENT_ENVIRONMENT:
                continue
            seen += 1
            yield observation
        cursor = getattr(page.meta, "cursor", None) if page.meta else None
        if not cursor or not page.data:
            return


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--since-hours", type=float, default=24)
    parser.add_argument("--environment", default=None, help="Langfuse tracing environment to score")
    parser.add_argument("--limit", type=int, default=1000)
    parser.add_argument("--dry-run", action="store_true", help="print scores, write nothing")
    args = parser.parse_args(argv)

    import langfuse_tracing

    client = langfuse_tracing.get_langfuse()
    if client is None:
        raise SystemExit("Set LANGFUSE_PUBLIC_KEY, LANGFUSE_SECRET_KEY and LANGFUSE_HOST first.")
    since = datetime.now(timezone.utc) - timedelta(hours=args.since_hours)
    totals = defaultdict(list)
    scored = 0
    for observation in fetch_observations(client, since, args.environment, args.limit):
        results = score_observation(_json(observation.input), _json(observation.output))
        scored += 1
        for name, (value, comment) in results.items():
            totals[name].append(value)
            if args.dry_run:
                if value < 1:
                    print(f"{observation.trace_id} {name}={value:.2f} {comment}")
                continue
            client.create_score(
                score_id=f"{observation.trace_id}-{name}",
                trace_id=observation.trace_id,
                observation_id=observation.id,
                name=name,
                value=float(value),
                data_type="NUMERIC",
                comment=comment[:500],
            )
    client.flush()
    print(f"Scored {scored} live replies since {since:%Y-%m-%d %H:%M} UTC")
    for name, values in sorted(totals.items()):
        print(f"  {name}: {sum(values) / len(values):.3f} over {len(values)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
