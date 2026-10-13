"""Two-tier model routing. Every model call goes to OpenRouter.

The tier choice is local and does not call a model. Routine lookups are
answered from the records already loaded. A short written answer uses the
fast model. Ambiguous or multi-record questions use the deep two-agent loop.
"""

import json
import os
import re
import urllib.error
import urllib.request
from pathlib import Path

OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
ROOT = Path(__file__).resolve().parent

# Prices are USD per million tokens from the OpenRouter catalog.
TIER_1_MODELS = (
    {
        "id": "inclusionai/ling-3.0-flash-vl",
        "role": "fast primary",
        "input_per_million": 0.021,
        "output_per_million": 0.0616,
        "max_tokens": 220,
        "timeout": 20,
    },
    {
        "id": "google/gemini-2.5-flash-lite",
        "role": "fast failover",
        "input_per_million": 0.10,
        "output_per_million": 0.40,
        "max_tokens": 220,
        "timeout": 8,
    },
)

TIER_2_AGENTS = (
    {
        "id": "anthropic/claude-sonnet-5",
        "role": "correlation",
        "input_per_million": 2.00,
        "output_per_million": 10.00,
        "max_tokens": 450,
        "timeout": 30,
    },
    {
        "id": "openai/gpt-4.1",
        "role": "response plan",
        "input_per_million": 2.00,
        "output_per_million": 8.00,
        "max_tokens": 450,
        "timeout": 30,
    },
)

DEEP_PATTERN = re.compile(
    r"\b("
    r"correlat\w*|attribut\w*|campaign|lateral|playbook|root cause|"
    r"containment|investigat\w*|compare|ambiguous|multi-?stage|"
    r"kill chain|across|threat report|intelligence report"
    r")\b",
    re.IGNORECASE,
)
LANGUAGE_PATTERN = re.compile(
    r"\b(analy[sz]e|explain|summar\w*|recommend\w*|should|draft|assess|mean)\b",
    re.IGNORECASE,
)


class RouterError(RuntimeError):
    def __init__(self, message, code="openrouter_error", routing=None):
        super().__init__(message)
        self.code = code
        self.routing = routing


def _key_in(path):
    if not path.is_file():
        return ""
    for line in path.read_text().splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#") or "=" not in stripped:
            continue
        name, value = stripped.split("=", 1)
        if name.strip() != "OPENROUTER_API_KEY":
            continue
        key = value.strip().strip('"').strip("'")
        if key:
            return key
    return ""


def load_openrouter_key():
    """Read OPENROUTER_API_KEY from the project .env file on each model call."""
    for path in (ROOT.parent / ".env", ROOT / ".env"):
        key = _key_in(path)
        if key:
            return key
    return os.environ.get("OPENROUTER_API_KEY", "").strip()


def save_openrouter_key(api_key):
    """Write the key to the project .env file."""
    key = (api_key or "").strip()
    if len(key) < 20 or any(character.isspace() for character in key):
        raise RouterError("Enter a valid OpenRouter API key.", "openrouter_key_invalid")
    path = ROOT.parent / ".env"
    lines = path.read_text().splitlines() if path.is_file() else []
    updated = []
    replaced = False
    for line in lines:
        if line.strip().startswith("OPENROUTER_API_KEY="):
            updated.append(f"OPENROUTER_API_KEY={key}")
            replaced = True
        else:
            updated.append(line)
    if not replaced:
        updated.append(f"OPENROUTER_API_KEY={key}")
    path.write_text("\n".join(updated) + "\n")


def choose_route(message, records, context_type, matched=True):
    """Return fast or deep, plus the reason. This function never calls a model."""
    reasons = []
    if context_type == "threat_hunting":
        reasons.append("threat hunting context")
    if DEEP_PATTERN.search(message or ""):
        reasons.append("question asks for multi-step analysis")
    addresses = set(re.findall(r"\b\d{1,3}(?:\.\d{1,3}){3}\b", message or ""))
    if len(addresses) >= 2:
        reasons.append("multiple addresses in the question")
    if reasons:
        return "deep", reasons
    if LANGUAGE_PATTERN.search(message or ""):
        return "fast", ["routine written answer from one lookup"]
    if not matched:
        return "fast", ["no direct record match; showing recent alerts"]
    return "fast", ["lookup answered from the database"]


def planned_models(message, tier):
    """Model ids that tier would call. This does not call a model."""
    if tier == "deep":
        return [item["id"] for item in TIER_2_AGENTS]
    if LANGUAGE_PATTERN.search(message or ""):
        return [TIER_1_MODELS[0]["id"]]
    return []


def _record_block(records):
    if not records:
        return "No matching alert records."
    lines = []
    for row in records:
        lines.append(
            f"- {row.get('title')} | severity={row.get('severity')} | "
            f"status={row.get('status')} | source={row.get('source')} | "
            f"type={row.get('alert_type')} | {row.get('description')}"
        )
    return "\n".join(lines)


def _completion_text(body, model):
    """Return the assistant text, or raise when the provider sent none.

    A null or blank content field is a failed completion. Raising RouterError
    lets the fast path try its failover model instead of crashing.
    """
    try:
        content = body["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError) as exc:
        raise RouterError(f"OpenRouter returned an empty completion for {model}") from exc
    if isinstance(content, list):
        parts = []
        for item in content:
            if isinstance(item, str):
                parts.append(item)
            elif isinstance(item, dict):
                text = item.get("text") or item.get("content") or ""
                if isinstance(text, str):
                    parts.append(text)
        content = "".join(parts)
    if not isinstance(content, str) or not content.strip():
        raise RouterError(f"OpenRouter returned an empty completion for {model}")
    return content.strip()


def _post_chat(model, messages, max_tokens, timeout):
    key = load_openrouter_key()
    if not key:
        raise RouterError(
            "Add OPENROUTER_API_KEY to the project .env file.",
            "openrouter_key_required",
        )
    payload = json.dumps(
        {
            "model": model,
            "messages": messages,
            "max_tokens": max_tokens,
            "temperature": 0,
        }
    ).encode()
    request = urllib.request.Request(
        OPENROUTER_URL,
        data=payload,
        headers={
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "http://127.0.0.1:8080",
            "X-Title": "SOC Portal",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            body = json.loads(response.read().decode())
    except urllib.error.HTTPError as exc:
        exc.read()
        if exc.code == 401:
            raise RouterError(
                "OpenRouter rejected that API key.",
                "openrouter_key_invalid",
            ) from exc
        raise RouterError(f"OpenRouter returned {exc.code} for {model}.") from exc
    except urllib.error.URLError as exc:
        raise RouterError(f"OpenRouter request failed for {model}: {exc.reason}") from exc
    text = _completion_text(body, model)
    return text, body.get("usage") if isinstance(body.get("usage"), dict) else {}


def _chat(model, messages, max_tokens, timeout):
    """Call OpenRouter and record one Phoenix LLM span when tracing is on."""
    try:
        from tracer import finish_llm_span, llm_call_span, mark_span_error
    except ImportError:
        text, _usage = _post_chat(model, messages, max_tokens, timeout)
        return text
    with llm_call_span(model, messages, max_tokens) as span:
        try:
            text, usage = _post_chat(model, messages, max_tokens, timeout)
        except RouterError as exc:
            mark_span_error(span, exc)
            raise
        finish_llm_span(span, text, usage)
        return text


def _fast_answer(message, records):
    messages = [
        {
            "role": "system",
            "content": (
                "You are a SOC analyst assistant. Answer only from the alert "
                "records in the next message. If they do not contain the answer, "
                "say so. Keep the answer under 120 words. Do not invent hosts, "
                "indicators, or actions. Reply with the analyst answer only. "
                "Do not restate these instructions or list your reasoning steps."
            ),
        },
        {
            "role": "user",
            "content": f"Question:\n{message}\n\nAlert records:\n{_record_block(records)}",
        },
    ]
    errors = []
    for model in TIER_1_MODELS:
        try:
            text = _chat(model["id"], messages, model["max_tokens"], model["timeout"])
            return text, [model["id"]]
        except RouterError as exc:
            if exc.code in {"openrouter_key_required", "openrouter_key_invalid"}:
                raise
            errors.append(str(exc))
    raise RouterError(errors[-1] if errors else "Fast-path models were unavailable")


def _deep_answer(message, records):
    evidence = _record_block(records)
    correlator, planner = TIER_2_AGENTS
    correlation = _chat(
        correlator["id"],
        [
            {
                "role": "system",
                "content": (
                    "You correlate SOC records. State what the records support, "
                    "what is still unknown, and a confidence of high, medium, or "
                    "low. Use only the records."
                ),
            },
            {
                "role": "user",
                "content": f"Question:\n{message}\n\nAlert records:\n{evidence}",
            },
        ],
        correlator["max_tokens"],
        correlator["timeout"],
    )
    plan = _chat(
        planner["id"],
        [
            {
                "role": "system",
                "content": (
                    "You write a short response plan for a SOC analyst. Use the "
                    "correlation and the alert records. List the next checks. "
                    "Do not invent tools or hosts."
                ),
            },
            {
                "role": "user",
                "content": (
                    f"Question:\n{message}\n\nAlert records:\n{evidence}\n\n"
                    f"Correlation:\n{correlation}"
                ),
            },
        ],
        planner["max_tokens"],
        planner["timeout"],
    )
    text = f"{correlation}\n\nResponse plan:\n{plan}"
    return text, [correlator["id"], planner["id"]]


def _lookup_answer(records):
    if not records:
        return "The alert store has no records that match that question."
    lines = [
        (
            f"- {row.get('title')} ({row.get('severity')}, {row.get('status')}, "
            f"{row.get('source')}): {row.get('description')}"
        )
        for row in records
    ]
    return "From the alert store:\n" + "\n".join(lines)


def answer_question(message, records, context_type, matched=True):
    try:
        from tracer import chain_span, finish_chain_span, mark_span_error
    except ImportError:
        chain_span = None
    if chain_span is None:
        return _answer_question(message, records, context_type, matched)
    with chain_span(message) as span:
        try:
            result = _answer_question(message, records, context_type, matched)
        except RouterError as exc:
            mark_span_error(span, exc)
            raise
        finish_chain_span(span, result)
        return result


def _answer_question(message, records, context_type, matched=True):
    tier, reasons = choose_route(message, records, context_type, matched)
    reason = "; ".join(reasons)
    try:
        if tier == "deep":
            text, models = _deep_answer(message, records)
        elif LANGUAGE_PATTERN.search(message or ""):
            text, models = _fast_answer(message, records)
        else:
            text, models = _lookup_answer(records), []
    except RouterError as exc:
        planned = TIER_2_AGENTS if tier == "deep" else TIER_1_MODELS[:1]
        exc.routing = {
            "tier": tier,
            "models": [item["id"] for item in planned],
            "reason": reason,
        }
        raise
    return {
        "message": text,
        "tier": tier,
        "models": models,
        "reason": reason,
    }
