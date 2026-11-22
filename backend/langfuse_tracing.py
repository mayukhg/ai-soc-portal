"""Langfuse tracing for the SOC assistant.

Runs next to the Phoenix exporter in tracer.py. It is off unless
LANGFUSE_PUBLIC_KEY and LANGFUSE_SECRET_KEY are set, in the environment or
in the project .env file. When it is off, every helper here is a no-op and the
router behaves exactly as before.

What gets recorded:

* one trace per assistant question, named ``soc.answer_question``, with the
  route (tier, reason, models), the record count and whether retrieval
  matched. Its id is returned to the browser so analyst feedback can be
  attached to it as a score.
* one generation per OpenRouter completion, with model, prompt, reply, token
  usage and cost from the price table in model_router.

Langfuse gets its own OpenTelemetry TracerProvider, so it never takes over
the global provider that tracer.py registers for Phoenix.
"""

import os
from contextlib import contextmanager
from pathlib import Path

ROOT = Path(__file__).resolve().parent
TRACE_NAME = "soc.answer_question"

_CLIENT = None
_DISABLED = False


def _load_env_files():
    """Fill missing LANGFUSE_* settings from project env files. Existing variables win."""
    for path in (ROOT.parent / ".env", ROOT / ".env"):
        if not path.is_file():
            continue
        for line in path.read_text().splitlines():
            stripped = line.strip()
            if not stripped or stripped.startswith("#") or "=" not in stripped:
                continue
            name, value = stripped.split("=", 1)
            name = name.strip()
            if not name.startswith("LANGFUSE_"):
                continue
            if os.environ.get(name, "").strip():
                continue
            os.environ[name] = value.strip().strip('"').strip("'")


def enabled():
    _load_env_files()
    return bool(
        os.environ.get("LANGFUSE_PUBLIC_KEY", "").strip()
        and os.environ.get("LANGFUSE_SECRET_KEY", "").strip()
    )


def get_langfuse():
    """Return the shared Langfuse client, or None when Langfuse is not configured."""
    global _CLIENT, _DISABLED
    if _CLIENT is not None or _DISABLED:
        return _CLIENT
    if not enabled():
        _DISABLED = True
        return None
    try:
        from langfuse import Langfuse
        from opentelemetry.sdk.trace import TracerProvider
    except ImportError:
        _DISABLED = True
        return None
    _CLIENT = Langfuse(
        tracer_provider=TracerProvider(),
        environment=os.environ.get("LANGFUSE_TRACING_ENVIRONMENT") or None,
        release=os.environ.get("LANGFUSE_RELEASE") or None,
    )
    return _CLIENT


def reset_for_tests():
    global _CLIENT, _DISABLED
    _CLIENT = None
    _DISABLED = False


class _NullObservation:
    """Stands in for a Langfuse observation when tracing is off."""

    trace_id = None
    id = None

    def update(self, **_kwargs):
        return self


def model_cost(model_id, usage):
    """USD cost of one completion from the price table in model_router."""
    from model_router import TIER_1_MODELS, TIER_2_AGENTS

    for item in TIER_1_MODELS + TIER_2_AGENTS:
        if item["id"] == model_id:
            prompt = (usage or {}).get("prompt_tokens") or 0
            completion = (usage or {}).get("completion_tokens") or 0
            return {
                "input": prompt * item["input_per_million"] / 1_000_000,
                "output": completion * item["output_per_million"] / 1_000_000,
            }
    return None


@contextmanager
def question_trace(message, context_type, records, matched, user_id=None, session_id=None):
    """Root observation for one assistant question."""
    client = get_langfuse()
    if client is None:
        yield _NullObservation()
        return
    from langfuse import propagate_attributes

    with client.start_as_current_observation(
        name=TRACE_NAME,
        as_type="chain",
        input={
            "message": message,
            "context_type": context_type,
            "matched": matched,
            "records": records,
        },
    ) as span:
        with propagate_attributes(
            trace_name=TRACE_NAME,
            user_id=str(user_id) if user_id else None,
            session_id=str(session_id) if session_id else None,
            tags=[f"context:{context_type}"],
            metadata={"context_type": str(context_type), "matched": str(bool(matched))},
        ):
            yield span


def finish_question(span, result):
    span.update(
        output=result,
        metadata={
            "tier": result.get("tier"),
            "models": result.get("models"),
            "reason": result.get("reason"),
        },
    )


@contextmanager
def generation(model, messages, max_tokens, role=None):
    """Child generation for one OpenRouter completion."""
    client = get_langfuse()
    if client is None:
        yield _NullObservation()
        return
    with client.start_as_current_observation(
        name=f"openrouter.{role or 'chat'}",
        as_type="generation",
        model=model,
        input=messages,
        model_parameters={"max_tokens": max_tokens, "temperature": 0},
    ) as gen:
        yield gen


def finish_generation(gen, model, text, usage):
    usage = usage or {}
    details = {}
    if usage.get("prompt_tokens") is not None:
        details["input"] = int(usage["prompt_tokens"])
    if usage.get("completion_tokens") is not None:
        details["output"] = int(usage["completion_tokens"])
    kwargs = {"output": text}
    if details:
        kwargs["usage_details"] = details
    cost = model_cost(model, usage)
    if cost:
        kwargs["cost_details"] = cost
    gen.update(**kwargs)


def mark_error(observation, exc):
    observation.update(level="ERROR", status_message=str(exc))


def current_trace_id():
    client = get_langfuse()
    if client is None:
        return None
    return client.get_current_trace_id()


FEEDBACK_REASONS = (
    "wrong_facts",
    "invented_entity",
    "missed_escalation",
    "missing_context",
    "incomplete_answer",
    "unsafe_action",
    "too_slow",
    "other",
)


def record_feedback(trace_id, helpful, reason=None, comment=None):
    """Attach an analyst rating to a live assistant trace. Returns False when off.

    ``analyst_helpful`` is 1 or 0. ``analyst_override_reason`` is a category
    from FEEDBACK_REASONS, recorded only on a negative rating. These two scores
    are the online agreement and override-reason metrics.
    """
    client = get_langfuse()
    if client is None or not trace_id:
        return False
    client.create_score(
        trace_id=trace_id,
        name="analyst_helpful",
        value=1.0 if helpful else 0.0,
        data_type="NUMERIC",
        comment=comment,
    )
    if not helpful:
        client.create_score(
            trace_id=trace_id,
            name="analyst_override_reason",
            value=reason if reason in FEEDBACK_REASONS else "other",
            data_type="CATEGORICAL",
            comment=comment,
        )
    client.flush()
    return True


def flush():
    client = get_langfuse()
    if client is not None:
        client.flush()
