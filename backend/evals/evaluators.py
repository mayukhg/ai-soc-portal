"""Code evaluators for the SOC assistant dataset.

Routing scores compare the task output with the hand-labeled tier.
Answer scores check the live reply against the records that were shown
to the model. Deep-path rows are not executed, so answer quality is
only attached to the lookup and fast experiment.
"""

import re

from phoenix.client.experiments import create_evaluator

from model_router import TIER_1_MODELS, TIER_2_AGENTS

FAST_MODELS = {item["id"] for item in TIER_1_MODELS}
DEEP_MODELS = [item["id"] for item in TIER_2_AGENTS]
HOST_PATTERN = re.compile(r"\b[A-Z]{2,}(?:-[A-Z0-9]+)+\b")
IP_PATTERN = re.compile(r"\b\d{1,3}(?:\.\d{1,3}){3}\b")
ECHO_PHRASES = (
    "you are a soc analyst assistant",
    "do not restate these instructions",
    "reply with the analyst answer only",
    "do not invent hosts",
    "keep the answer under 120 words",
    "alert records in the next message",
    "the user wants",
    "i need to",
    "let me ",
    "as an ai",
)


def _result(score, label, explanation):
    return (score, label, explanation)


@create_evaluator(kind="CODE", name="route_accuracy")
def route_accuracy(output, expected):
    got = (output or {}).get("tier")
    wanted = expected.get("tier")
    ok = got == wanted
    return _result(float(ok), "match" if ok else "mismatch", f"tier {got} vs {wanted}")


@create_evaluator(kind="CODE", name="reason_accuracy")
def reason_accuracy(output, expected):
    reason = (output or {}).get("reason") or ""
    needle = expected.get("reason_contains") or ""
    ok = needle in reason
    return _result(float(ok), "match" if ok else "mismatch", f"reason {reason}")


@create_evaluator(kind="CODE", name="models_match")
def models_match(output, expected):
    got = list((output or {}).get("models") or [])
    kind = expected.get("answer_kind")
    if kind == "lookup":
        ok = got == []
        detail = "lookup must not call a model"
    elif kind == "model":
        ok = len(got) == 1 and got[0] in FAST_MODELS
        detail = "fast path must use the primary or its failover"
    else:
        ok = got == DEEP_MODELS
        detail = "deep path plans the correlator then the planner"
    label = "match" if ok else "mismatch"
    return _result(float(ok), label, f"{detail}. got {got}")


def _evidence(case_input):
    parts = [case_input.get("message") or ""]
    for record in case_input.get("records") or []:
        parts.extend(str(value) for value in record.values())
    return "\n".join(parts).lower()


def invented_entities(message, case_input, forbidden):
    """Hosts and addresses in the answer that the records do not contain."""
    evidence = _evidence(case_input)
    invented = []
    for pattern in (HOST_PATTERN, IP_PATTERN):
        for found in pattern.findall(message or ""):
            if found.lower() not in evidence:
                invented.append(found)
    for fact in forbidden or []:
        if fact.lower() in (message or "").lower():
            invented.append(fact)
    return invented


def instruction_echo(message):
    lowered = (message or "").lower()
    return [phrase for phrase in ECHO_PHRASES if phrase in lowered]


@create_evaluator(kind="CODE", name="answer_quality")
def answer_quality(output, expected, input):
    """Score a lookup exactly, and a model answer by facts, invention, and echo."""
    message = (output or {}).get("message") or ""
    kind = expected.get("answer_kind")
    if kind == "deep":
        return _result(
            None,
            "not-run",
            "Deep cases keep a gold reference and are scored on the routing experiment.",
        )
    if kind == "lookup":
        ok = message == (expected.get("reference_answer") or "")
        label = "exact" if ok else "mismatch"
        return _result(float(ok), label, "Database answers use the alert-store formatter.")

    mentions = expected.get("must_mention") or []
    hits = sum(1 for fact in mentions if fact.lower() in message.lower())
    fact_score = (hits / len(mentions)) if mentions else 1.0
    invented = invented_entities(message, input, expected.get("must_not_mention"))
    echoed = instruction_echo(message)
    invention_score = 0.0 if invented else 1.0
    echo_score = 0.0 if echoed else 1.0
    score = (0.5 * fact_score) + (0.25 * invention_score) + (0.25 * echo_score)
    if score == 1:
        label = "grounded"
    elif score == 0:
        label = "fail"
    else:
        label = "partial"
    explanation = (
        f"facts {hits}/{len(mentions)}; "
        f"invented {invented or 'none'}; "
        f"echo {echoed or 'none'}"
    )
    return _result(score, label, explanation)
