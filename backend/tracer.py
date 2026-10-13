"""OpenTelemetry export to Arize Phoenix for the live OpenRouter calls.

The assistant posts to OpenRouter with urllib, so the OpenAI SDK
instrumentor does not see those requests. This module registers an
OTLP/HTTP exporter and exposes span helpers the router wraps around
each completion and around the routing decision.
"""

import os
from contextlib import contextmanager
from pathlib import Path

_READY = False
ROOT = Path(__file__).resolve().parent


def _load_env_files():
    """Fill missing Phoenix settings from project env files. Existing variables win."""
    for path in (ROOT.parent / ".env", ROOT / ".env"):
        if not path.is_file():
            continue
        for line in path.read_text().splitlines():
            stripped = line.strip()
            if not stripped or stripped.startswith("#") or "=" not in stripped:
                continue
            name, value = stripped.split("=", 1)
            name = name.strip()
            if not name.startswith("PHOENIX_"):
                continue
            if os.environ.get(name, "").strip():
                continue
            os.environ[name] = value.strip().strip('"').strip("'")


def _headers(raw):
    headers = {}
    for part in (raw or "").split(","):
        if "=" not in part:
            continue
        name, value = part.split("=", 1)
        name, value = name.strip(), value.strip()
        if name and value:
            headers[name] = value
    return headers


def _traces_endpoint():
    endpoint = os.environ.get("PHOENIX_COLLECTOR_ENDPOINT", "http://localhost:6006").strip()
    endpoint = endpoint.rstrip("/") or "http://localhost:6006"
    if not endpoint.endswith("/v1/traces"):
        endpoint = endpoint + "/v1/traces"
    return endpoint


def init_tracing():
    """Register the Phoenix OTLP exporter. Safe to call once at process start."""
    global _READY
    _load_env_files()
    from opentelemetry import trace
    from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
    from opentelemetry.sdk.resources import Resource
    from opentelemetry.sdk.trace import TracerProvider
    from opentelemetry.sdk.trace.export import BatchSpanProcessor

    project = os.environ.get("PHOENIX_PROJECT_NAME", "my-cursor-app").strip() or "my-cursor-app"
    headers = _headers(os.environ.get("PHOENIX_CLIENT_HEADERS", ""))
    provider = TracerProvider(
        resource=Resource.create(
            {
                "service.name": project,
                "openinference.project.name": project,
            }
        )
    )
    provider.add_span_processor(
        BatchSpanProcessor(OTLPSpanExporter(endpoint=_traces_endpoint(), headers=headers or None))
    )
    trace.set_tracer_provider(provider)
    try:
        import openai  # noqa: F401
        from openinference.instrumentation.openai import OpenAIInstrumentor

        OpenAIInstrumentor().instrument(tracer_provider=provider)
    except Exception:
        # The live router posts to OpenRouter with urllib, so it does not
        # need the OpenAI SDK instrumentor. Any later SDK call in this
        # process is traced when that package is installed.
        pass
    _READY = True
    print(f"Phoenix tracing on. Project {project}. Endpoint {_traces_endpoint()}")


def _semconv():
    from openinference.semconv.trace import OpenInferenceSpanKindValues, SpanAttributes

    class Names:
        OPENINFERENCE_SPAN_KIND = getattr(SpanAttributes, "OPENINFERENCE_SPAN_KIND", "openinference.span.kind")
        INPUT_VALUE = getattr(SpanAttributes, "INPUT_VALUE", "input.value")
        INPUT_MIME_TYPE = getattr(SpanAttributes, "INPUT_MIME_TYPE", "input.mime_type")
        OUTPUT_VALUE = getattr(SpanAttributes, "OUTPUT_VALUE", "output.value")
        OUTPUT_MIME_TYPE = getattr(SpanAttributes, "OUTPUT_MIME_TYPE", "output.mime_type")
        LLM_MODEL_NAME = getattr(SpanAttributes, "LLM_MODEL_NAME", "llm.model_name")
        LLM_PROVIDER = getattr(SpanAttributes, "LLM_PROVIDER", "llm.provider")
        LLM_INVOCATION_PARAMETERS = getattr(SpanAttributes, "LLM_INVOCATION_PARAMETERS", "llm.invocation_parameters")
        LLM_TOKEN_COUNT_PROMPT = getattr(SpanAttributes, "LLM_TOKEN_COUNT_PROMPT", "llm.token_count.prompt")
        LLM_TOKEN_COUNT_COMPLETION = getattr(SpanAttributes, "LLM_TOKEN_COUNT_COMPLETION", "llm.token_count.completion")
        LLM_TOKEN_COUNT_TOTAL = getattr(SpanAttributes, "LLM_TOKEN_COUNT_TOTAL", "llm.token_count.total")

    return Names, OpenInferenceSpanKindValues


def _tracer():
    from opentelemetry import trace

    return trace.get_tracer("soc.model_router")


@contextmanager
def chain_span(message):
    """Span for one routed question, including a database lookup with no model call."""
    if not _READY:
        yield None
        return
    attributes, kinds = _semconv()
    with _tracer().start_as_current_span("soc.answer_question") as span:
        span.set_attribute(attributes.OPENINFERENCE_SPAN_KIND, kinds.CHAIN.value)
        span.set_attribute(attributes.INPUT_VALUE, message or "")
        span.set_attribute(attributes.INPUT_MIME_TYPE, "text/plain")
        yield span


@contextmanager
def llm_call_span(model, messages, max_tokens):
    """Span for one OpenRouter chat completion."""
    if not _READY:
        yield None
        return
    attributes, kinds = _semconv()
    with _tracer().start_as_current_span("openrouter.chat.completions") as span:
        span.set_attribute(attributes.OPENINFERENCE_SPAN_KIND, kinds.LLM.value)
        span.set_attribute(attributes.LLM_MODEL_NAME, model)
        span.set_attribute(attributes.LLM_PROVIDER, "openrouter")
        span.set_attribute(
            attributes.LLM_INVOCATION_PARAMETERS,
            f'{{"temperature": 0, "max_tokens": {int(max_tokens)}}}',
        )
        for index, message in enumerate(messages or []):
            span.set_attribute(f"llm.input_messages.{index}.message.role", message.get("role", ""))
            span.set_attribute(f"llm.input_messages.{index}.message.content", message.get("content", ""))
        yield span


def finish_chain_span(span, result):
    if span is None or result is None:
        return
    attributes, _kinds = _semconv()
    span.set_attribute("soc.tier", result.get("tier") or "")
    span.set_attribute("soc.reason", result.get("reason") or "")
    span.set_attribute("soc.models", ", ".join(result.get("models") or []) or "database")
    span.set_attribute(attributes.OUTPUT_VALUE, result.get("message") or "")
    span.set_attribute(attributes.OUTPUT_MIME_TYPE, "text/plain")


def finish_llm_span(span, text, usage):
    if span is None:
        return
    attributes, _kinds = _semconv()
    span.set_attribute(attributes.OUTPUT_VALUE, text or "")
    span.set_attribute(attributes.OUTPUT_MIME_TYPE, "text/plain")
    span.set_attribute("llm.output_messages.0.message.role", "assistant")
    span.set_attribute("llm.output_messages.0.message.content", text or "")
    usage = usage or {}
    mapping = (
        ("prompt_tokens", attributes.LLM_TOKEN_COUNT_PROMPT),
        ("completion_tokens", attributes.LLM_TOKEN_COUNT_COMPLETION),
        ("total_tokens", attributes.LLM_TOKEN_COUNT_TOTAL),
    )
    for source, target in mapping:
        value = usage.get(source)
        if isinstance(value, int):
            span.set_attribute(target, value)


def mark_span_error(span, exc):
    if span is None:
        return
    from opentelemetry.trace import Status, StatusCode

    span.record_exception(exc)
    span.set_status(Status(StatusCode.ERROR, str(exc)))
