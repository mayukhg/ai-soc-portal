"""Tasks the experiments run: the real router, the real retrieval query.

``assistant_task`` calls model_router.answer_question, the same function the
API calls. When the runner is connected to Langfuse, the router's own
trace and generations nest under the experiment item's trace.

``retrieval_task`` runs server.related_alerts, the SQL the API uses to pick
the records the model sees, against an in-memory SQLite copy of a fixed
alert corpus.
"""

import contextvars
import re
import sqlite3
import time
from contextlib import contextmanager

import model_router
from model_router import RouterError, choose_route, planned_models

_USAGE = contextvars.ContextVar("soc_eval_usage", default=None)
_REAL_POST_CHAT = model_router._post_chat


def _collecting_post_chat(model, messages, max_tokens, timeout):
    text, usage = _ACTIVE_POST_CHAT(model, messages, max_tokens, timeout)
    sink = _USAGE.get()
    if sink is not None:
        sink.append({"model": model, **(usage or {})})
    return text, usage


_ACTIVE_POST_CHAT = _REAL_POST_CHAT


def install_usage_collector(offline=False):
    """Route OpenRouter calls through a wrapper that records token usage per task.

    With ``offline`` the wrapper answers from the records with no network call.
    That mode tests the pipeline and the evaluators, not the model.
    """
    global _ACTIVE_POST_CHAT
    _ACTIVE_POST_CHAT = offline_post_chat if offline else _REAL_POST_CHAT
    model_router._post_chat = _collecting_post_chat


def uninstall_usage_collector():
    global _ACTIVE_POST_CHAT
    _ACTIVE_POST_CHAT = _REAL_POST_CHAT
    model_router._post_chat = _REAL_POST_CHAT


def _cost(usage_rows):
    from langfuse_tracing import model_cost

    total = 0.0
    for row in usage_rows:
        cost = model_cost(row.get("model"), row) or {}
        total += sum(cost.values())
    return total


def assistant_task(*, item, include_deep=False, **_kwargs):
    case_input = _field(item, "input")
    message = case_input["message"]
    records = case_input["records"]
    context_type = case_input["context_type"]
    matched = case_input["matched"]
    tier, reasons = choose_route(message, records, context_type, matched)
    reason = "; ".join(reasons)
    base = {
        "tier": tier,
        "reason": reason,
        "models": planned_models(message, tier),
        "message": "",
        "executed": False,
        "latency_s": 0.0,
        "cost_usd": 0.0,
        "usage": [],
    }
    if tier == "deep" and not include_deep:
        return base
    sink = []
    token = _USAGE.set(sink)
    started = time.perf_counter()
    try:
        result = model_router.answer_question(message, records, context_type, matched)
    except RouterError as exc:
        return dict(base, error=str(exc), latency_s=time.perf_counter() - started, usage=sink)
    finally:
        _USAGE.reset(token)
    return dict(
        base,
        message=result["message"],
        models=result["models"],
        executed=True,
        latency_s=round(time.perf_counter() - started, 3),
        usage=sink,
        cost_usd=round(_cost(sink), 6),
    )


def routing_task(*, item, **_kwargs):
    """Route only. Never calls a model."""
    case_input = _field(item, "input")
    tier, reasons = choose_route(
        case_input["message"],
        case_input["records"],
        case_input["context_type"],
        case_input["matched"],
    )
    return {
        "tier": tier,
        "reason": "; ".join(reasons),
        "models": planned_models(case_input["message"], tier),
        "message": "",
        "executed": False,
    }


class _SqliteCursor:
    """Enough of a psycopg2 RealDictCursor to run related_alerts() on SQLite."""

    def __init__(self, conn):
        self._cur = conn.cursor()

    def execute(self, sql, params=()):
        sql = sql.replace("public.alerts", "alerts").replace("%s", "?")
        self._cur.execute(sql, tuple(params))

    def fetchall(self):
        columns = [col[0] for col in self._cur.description]
        return [dict(zip(columns, row)) for row in self._cur.fetchall()]


def corpus_cursor(corpus):
    conn = sqlite3.connect(":memory:")
    conn.execute(
        "CREATE TABLE alerts (title TEXT, severity TEXT, status TEXT, description TEXT, "
        "alert_type TEXT, source TEXT, created_at TEXT)"
    )
    conn.executemany(
        "INSERT INTO alerts VALUES (?, ?, ?, ?, ?, ?, ?)",
        [
            (
                r["title"],
                r["severity"],
                r["status"],
                r["description"],
                r["alert_type"],
                r["source"],
                r["created_at"],
            )
            for r in corpus
        ],
    )
    return _SqliteCursor(conn)


def retrieval_task(*, item, **_kwargs):
    from server import related_alerts

    from langfuse_evals.cases import RETRIEVAL_CORPUS

    case_input = _field(item, "input")
    rows, matched = related_alerts(corpus_cursor(RETRIEVAL_CORPUS), case_input["message"])
    return {"titles": [row["title"] for row in rows], "matched": matched}


def _field(item, name):
    if isinstance(item, dict):
        return item.get(name)
    return getattr(item, name, None)


# ------------------------------------------------------------- offline model
# Extractive stand-in for OpenRouter. It copies record text, so it passes the
# grounding checks on clean records and fails the injection checks on poisoned
# ones, which is what a pipeline smoke test needs to show.

_RECORD_LINE = re.compile(r"^- (.*?) \| severity=(\w+) \| status=(\w+) \| .*? \| (.*)$")


def offline_post_chat(model, messages, max_tokens, timeout):
    system = messages[0]["content"]
    user = messages[-1]["content"]
    rows = [m.groups() for m in map(_RECORD_LINE.match, user.splitlines()) if m]
    if not rows:
        text = "The alert records do not contain information that answers this question."
    elif system.startswith("You correlate"):
        facts = " ".join(f"{t} ({s}, {st}): {d}" for t, s, st, d in rows)
        text = (
            f"The records support this: {facts} Confidence: medium. "
            "Unknown: the records do not confirm how the activity started."
        )
    elif system.startswith("You write a short response plan"):
        text = "\n".join(
            [f"- Review the {t.lower()} record and confirm scope." for t, *_rest in rows]
            + ["- Confirm findings with the incident commander before any containment."]
        )
    else:
        t, s, st, d = rows[0]
        text = f"{t} is a {s} severity alert with status {st}. {d}"
    usage = {
        "prompt_tokens": sum(len(m["content"].split()) for m in messages),
        "completion_tokens": len(text.split()),
    }
    return text, usage


@contextmanager
def collector(offline=False):
    install_usage_collector(offline=offline)
    try:
        yield
    finally:
        uninstall_usage_collector()
