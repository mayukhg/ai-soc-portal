# Langfuse evaluation framework

Evaluates the live SOC assistant (`backend/model_router.py` behind `/api/functions/ai-assistant`) in Langfuse. It runs next to the existing Phoenix evals in `backend/evals/` and does not replace them.

## What the product outputs, and what is graded

| Output | Produced by | Graded by |
|---|---|---|
| Records the model sees (top 3) | `related_alerts()` in `server.py`, keyword `LIKE` | `retrieval` suite: recall, precision, matched flag |
| Route: tier, reason, models | `choose_route()`, regex, no model | `route_accuracy`, `no_under_escalation`, `no_over_escalation`, `models_match` |
| Lookup reply | alert-store formatter | `lookup_exact` |
| Fast reply (≤120 words) | Ling, then Gemini failover | grounding, hygiene and safety checks, optional LLM judge |
| Deep reply: correlation + response plan | Claude Sonnet 5, then GPT-4.1 | the same checks plus `deep_structure` (confidence, unknowns, ≥2 next checks) |

The product doesn't emit a structured verdict (true positive / false positive) or a severity. It answers questions about records that already exist. So "missed escalation" is measured as a multi-step question sent to the fast path, and verdict errors are measured as `status_fidelity` (calling an open alert resolved or benign) and `severity_fidelity`.

## Suites (Langfuse datasets `soc-assistant/<suite>`)

| Suite | Purpose |
|---|---|
| `golden` | The 17 hand-labeled cases from `backend/evals/cases.py`. This is the release gate. |
| `adversarial` | Prompt injection in attacker-controlled fields: process notes, command lines, email subjects, file names. |
| `degraded` | No records, unrelated fallback records, a truncated IP address. The assistant should abstain. |
| `routing_challenge` | Questions labeled by analyst intent, not by the router's keywords. Measures under-escalation. |
| `retrieval` | The real `related_alerts()` SQL run against a fixed corpus in SQLite. |

## Running

```bash
cd backend
pip install -r requirements.txt
export LANGFUSE_PUBLIC_KEY=pk-lf-... LANGFUSE_SECRET_KEY=sk-lf-... LANGFUSE_HOST=https://cloud.langfuse.com
python -m langfuse_evals.run --report reports/latest.md                 # all suites; deep path routed only
python -m langfuse_evals.run --include-deep --judge --repeats 3         # full run
python -m langfuse_evals.run --offline-model --no-langfuse              # CI smoke test, no keys needed
python -m pytest -q langfuse_evals/tests
```

The runner exits 1 when a `block` gate fails (`langfuse_evals/gates.py`). Blocking gates cover errors that can hide an attack: under-escalation, invented entities, wrong status or severity claims, followed injections, and destructive steps without approval. Quality and cost metrics only warn.

`--offline-model` answers by copying record text. It tests the pipeline and the evaluators, not model quality. It fails the injection suite on purpose, because a model that copies its inputs follows injected text.

## Production (online) evaluation

- Every assistant question is a Langfuse trace, `soc.answer_question`, with user, session, route and records. Each OpenRouter call is a child generation with token usage and cost. The trace id goes back to the browser in `routing.traceId`.
- The existing Accept / Reject / Feedback controls in `AIAssistant.tsx` now also POST to `/api/functions/ai-feedback`. That stores `analyst_helpful` (1/0) and `analyst_override_reason` scores on the trace.
- `python -m langfuse_evals.score_production --since-hours 24` writes `online_*` deterministic scores onto live traces. Run it on a schedule. Score ids are deterministic, so re-runs overwrite instead of duplicating.
- You can also configure Langfuse's managed LLM-as-a-judge evaluators in the Langfuse UI on `soc.answer_question` traces.

Tracing is off unless the Langfuse keys are set. With no keys, the router behaves exactly as before.

## Findings from the first run (offline model)

- **Retrieval:** recall is 0.47. Questions like "Summarize the failed login attempts" return the three newest alerts instead of the matching one. Every token longer than two characters (including "the") is OR-ed into the `LIKE` filter, and results are sorted by recency. The same thing happens for "Explain the malware on WS-USER-045".
- **Routing:** the `routing_challenge` suite scores 0 of 4 on under-escalation. "Is the beacon connected to the invoice mail?", "how the attacker got from…", "same actor?" and "what should we do next…" all go to the fast path or the lookup path, because they contain no deep keyword. This gate is `warn` for now. Move it to `block` once the router is fixed.
- The LLM judge, consistency and latency numbers need a live run with `OPENROUTER_API_KEY` set.

Calibrate the LLM judge before relying on it: hand-score 50 or more replies and check agreement (Cohen's kappa ≥ 0.7).
