# Evaluation framework

The SOC assistant is evaluated in Arize Phoenix. A fixed set of 17 synthetic analyst questions is uploaded as a dataset. Two experiments score that dataset with code evaluators. One experiment checks the local route. The other checks the reply the analyst would see.

The running code is `backend/evals/`. The questions and gold labels are `backend/evals/soc_assistant_cases.json`. The router under test is `backend/model_router.py`. Live model calls are traced by `backend/tracer.py` into the same Phoenix server that stores the experiments.

The numbers below are from the run on 13 Oct 2026, after empty OpenRouter completions were changed to a failover error. Phoenix dataset `soc-assistant-evals`. Experiments `soc-routing` and `soc-answer-quality`.

| Experiment | What ran | route_accuracy | reason_accuracy | models_match | answer_quality |
|---|---|---|---|---|---|
| `soc-routing` | All 17 cases, no model call | 1.00 (17) | 1.00 (17) | 1.00 (17) | — |
| `soc-answer-quality` | All 17 cases. Lookups and fast-path questions produce a reply. Deep questions are routed only. | 1.00 (17) | 1.00 (17) | 1.00 (17) | 0.90 (10 scored, 7 labeled `not-run`) |

UI: [http://127.0.0.1:6006/datasets/RGF0YXNldDox/experiments](http://127.0.0.1:6006/datasets/RGF0YXNldDox/experiments)

## How it is hosted

Phoenix 12.15.1 runs on this machine. It is a separate process from the SOC API.

```bash
PHOENIX_HOST=127.0.0.1 PHOENIX_PORT=6006 /tmp/soc-api-venv/bin/phoenix serve
```

| Surface | Address |
|---|---|
| Phoenix UI | `http://127.0.0.1:6006` |
| Dataset and experiments | `http://127.0.0.1:6006/datasets/RGF0YXNldDox/experiments` |
| OTLP/HTTP trace ingest | `http://127.0.0.1:6006/v1/traces` |
| gRPC trace ingest | `http://127.0.0.1:4317` |
| Phoenix database | `~/.phoenix/phoenix.db` (SQLite) |

Authentication is off. `PHOENIX_CLIENT_HEADERS` is blank, which is the local setting. A hosted Phoenix collector would put `api_key=...` in that variable. The three settings live in `.env` and `.env.example`:

```env
PHOENIX_COLLECTOR_ENDPOINT="http://localhost:6006"
PHOENIX_PROJECT_NAME="my-cursor-app"
PHOENIX_CLIENT_HEADERS=""
```

The SOC API on port 8000 calls `init_tracing()` at startup. Each assistant question becomes a chain span named `soc.answer_question`. Each OpenRouter completion becomes a child span named `openrouter.chat.completions`. Those spans land in the Phoenix project `my-cursor-app`. They are the live trace stream. They are a different Phoenix project from the experiment runs. Each experiment creates its own project, named `Experiment-…`, and stores task outputs and evaluator scores on the dataset.

The eval runner does not start Phoenix. Phoenix has to be listening before this command:

```bash
/tmp/soc-api-venv/bin/python backend/evals/run_experiment.py
```

The runner validates the 17 cases, writes `backend/evals/soc_assistant_cases.json`, reuses the dataset when it already has 17 examples, then runs both experiments. Re-running adds a new pair of experiments on the same dataset. It does not delete the previous pair.

Packages, already installed in `/tmp/soc-api-venv` and listed in `backend/requirements.txt`: `arize-phoenix`, `arize-phoenix-client`, `arize-phoenix-evals`, `opentelemetry-sdk`, `opentelemetry-exporter-otlp`, `openinference-semantic-conventions`, `openinference-instrumentation-openai`.

## What a case contains

Each row has the question, the assistant context (`general`, `alert`, `incident`, or `threat_hunting`), whether the database search matched, and the alert rows the router is allowed to see. Those rows use the same fields the live assistant sends: title, severity, status, source, type, and description. The expected output is a hand label:

- `tier` is `fast` or `deep`. Lookups are tier `fast` with an empty model list. The gate uses one tier name for every question that is not deep.
- `reason_contains` is a substring of the reason `choose_route` returns.
- `answer_kind` is `lookup`, `model`, or `deep`.
- `models` is the planned model list.
- `reference_answer` is the exact alert-store text for a lookup, and a short gold paragraph for a fast or deep question.
- `must_mention` and `must_not_mention` are the facts the answer has to include or leave out.

`validate()` runs before upload. It fails the run if a hand label disagrees with `choose_route`, if a required fact is absent from the question and the records, or if a forbidden fact is already in those records. The labels are the spec. The experiment then checks the code against that spec.

The 17 cases are six lookups, four fast-path questions, and seven deep-path questions. The records are taken from the synthetic seed in `backend/sql/seed.sql`.

| Case | Split | Why this route |
|---|---|---|
| `lookup-failed-login` | lookup | “failed login attempts” has no language verb and no deep trigger |
| `lookup-malware` | lookup | Endpoint malware title, no written-answer verb |
| `lookup-usb` | lookup | USB policy title |
| `lookup-ddos` | lookup | DDoS title |
| `lookup-critical-stays-database` | lookup | Critical severity alone stays a lookup |
| `lookup-no-match` | lookup | “printer toner status” misses the store and shows recent alerts |
| `fast-summarize-login` | fast | “Summarize” is a language verb |
| `fast-explain-phish` | fast | “Explain” is a language verb |
| `fast-should-usb` | fast | “Should” is a language verb |
| `fast-assess-transfer` | fast | “Assess” is a language verb |
| `deep-correlate-ledger` | deep | “Correlate” and “across” |
| `deep-containment-playbook` | deep | “containment” and “playbook” beat the word “Draft” |
| `deep-two-addresses` | deep | Two IPv4 addresses, `192.168.1.100` and `185.220.101.182` |
| `deep-threat-hunting-context` | deep | Same wording as the login lookup, with context `threat_hunting` |
| `deep-root-cause` | deep | “Investigate” and “root cause” |
| `deep-compare-phish` | deep | “Compare” |
| `deep-campaign-beats-language` | deep | “campaign” beats the word “Analyze” |

## The two experiments

**`soc-routing`.** The task calls `choose_route` and `planned_models`. It returns the tier, the reason, and the model ids that tier would call. The message is empty and `executed` is false. No OpenRouter call is made. All 17 cases are scored.

**`soc-answer-quality`.** Lookups call the alert-store formatter. Fast questions call `answer_question`, which calls OpenRouter. Deep questions return the planned route with an empty message and `executed: false`. Their gold paragraphs stay in the dataset as the reference output. The correlator and the planner are not called, so a run does not spend the deep-path budget.

A null or blank completion from the primary fast model is a `RouterError`. The fast path then calls `google/gemini-2.5-flash-lite`. On this run every fast question was answered by `inclusionai/ling-3.0-flash-vl`, so the failover model was not used. The earlier run that crashed on `content: null` is the reason that path exists. That crash is a task error in Phoenix. This run has zero task errors.

## Metrics

All four evaluators are code evaluators in `backend/evals/evaluators.py`. A score is 0 to 1. Phoenix stores the score, a label, and a short explanation on each example.

### route_accuracy

1 when the task tier equals the labeled tier, otherwise 0. Label `match` or `mismatch`.

This is the gate. It is the check that “Analyze this campaign” stays deep, that a critical malware lookup stays a lookup, and that the same login question becomes deep when the context is threat hunting.

### reason_accuracy

1 when the labeled `reason_contains` string appears in the reason the task returned. The reason is the joined list from `choose_route`, for example `lookup answered from the database`, `routine written answer from one lookup`, `question asks for multi-step analysis`, `multiple addresses in the question`, or `threat hunting context`.

### models_match

| Answer kind | Pass |
|---|---|
| `lookup` | Model list is empty |
| `model` | Exactly one id, and it is Ling or the Gemini failover |
| `deep` | The list is Claude Sonnet 5, then GPT-4.1, in that order |

On the routing experiment this checks the plan. On the answer experiment it checks the model that actually returned the text. A lookup that called a model would score 0. A fast answer that named both deep models would score 0.

### answer_quality

Deep rows return no score and the label `not-run`. They stay in the experiment so every example has a task run. The 0.90 average is the mean of the 10 scored rows.

A lookup scores 1 with label `exact` when the reply is character-for-character the alert-store formatter, which starts with `From the alert store:`. Any other text scores 0 with label `mismatch`.

A fast-path reply is three weighted checks:

| Check | Weight | Pass |
|---|---|---|
| Required facts | 0.50 | Share of `must_mention` strings present in the reply |
| No invented entities | 0.25 | 1 when every host (`WS-FINANCE-01` style) and every IPv4 address in the reply appears in the question or the records, and no `must_not_mention` string appears |
| No instruction echo | 0.25 | 1 when the reply does not contain the system-prompt lines or the reasoning leaks `the user wants`, `i need to`, `let me `, and `as an ai` |

`score = 0.50 × fact share + 0.25 × invention + 0.25 × echo`

Label `grounded` at 1, `fail` at 0, and `partial` in between. The explanation looks like `facts 2/2; invented none; echo ['let me ']`.

The fact check is a substring check. It does not grade prose. The invention check looks for host-shaped tokens and IPv4 addresses, plus the forbidden strings on that case. A phrase such as “credential-stuffing” is outside those three checks.

## Results, case by case

### Routing: 1.00 on every case

All 17 cases matched the labeled tier, the labeled reason, and the planned model list.

The lookups planned no model. The four fast questions planned `inclusionai/ling-3.0-flash-vl`. The seven deep questions planned `anthropic/claude-sonnet-5` then `openai/gpt-4.1`.

Two cases are the gate’s sharp edges, and both passed:

- `lookup-critical-stays-database` asks about critical malware on the user workstation. Severity does not escalate it. Tier stays fast, reason is the database lookup, models are empty.
- `deep-threat-hunting-context` asks “failed login attempts”, the same words as `lookup-failed-login`. The context is `threat_hunting`, so the tier is deep and the reason contains `threat hunting context`.
- `deep-campaign-beats-language` says “Analyze this campaign”. “Analyze” would be a fast-path verb on its own. “campaign” is a deep trigger and wins.

### Lookups: 1.00 exact on all six

| Case | Score | What the reply was |
|---|---|---|
| `lookup-failed-login` | 1.00 exact | Alert-store lines for the administrator failures from `203.0.113.42` against `DC-PRIMARY` |
| `lookup-malware` | 1.00 exact | `Trojan.Win32.Agent` quarantined on `WS-USER-045` |
| `lookup-usb` | 1.00 exact | Removable drive on `WS-HR-12` |
| `lookup-ddos` | 1.00 exact | `45.142.214.48` against `WEB-CLUSTER` |
| `lookup-critical-stays-database` | 1.00 exact | Same malware record, still the formatter, still no model |
| `lookup-no-match` | 1.00 exact | Recent-alert fallback: failed logins, the USB violation, and the DDoS alert |

These six contribute 6.00 of the 9.00 points behind the 0.90 average.

### Fast path: one grounded reply, three partial replies

All four called Ling. None invented a forbidden host or address. The misses are missing facts and instruction echo.

**`fast-summarize-login` — 1.00, grounded.** Facts 2/2 (`203.0.113.42`, `DC-PRIMARY`). No invented host or address. No instruction echo. The reply states the medium, acknowledged authentication anomaly. It also says the activity “suggests a potential brute-force or credential-stuffing attempt”. That phrase is not in the alert text the model was given. The metric does not score it, because it is neither a host, an IP, nor a forbidden string on this case. The 1.00 means the required facts were present and the reply did not leak the prompt.

**`fast-should-usb` — 0.75, partial.** Facts 1/1 (`WS-HR-12`). No invented entity. Echo matched `i need to` and `let me `. The reply opens with “The user is asking whether the USB drive alert should stay open. Let me look at the alert record” and later “I need to answer based only on the alert records.” The host is correct. A quarter of the score is lost because the model narrated its instructions. `0.50 × 1 + 0.25 × 1 + 0.25 × 0 = 0.75`.

**`fast-explain-phish` — 0.75, partial.** Facts 2/2 (`MAIL-SERVER-01`, `pay-ledger.example`). No invented entity. Echo matched `reply with the analyst answer only`, `do not invent hosts`, and `keep the answer under 120 words`. The reply is a numbered restatement of the system prompt, then the alert fields, and it stops at “3. Draft the Response: A”. The required names are present inside that restatement. The echo check still fails. Same 0.75 formula as the USB case.

**`fast-assess-transfer` — 0.50, partial.** Facts 0/2. The required strings are `WS-FINANCE-02` and `2.4 GB`. The reply is 66 characters and stops mid-token:

```text
**Assessment: Large Outbound Transfer — CRITICAL**

**Host:** WS-F
```

`WS-F` is not `WS-FINANCE-02`, and the volume is absent. No forbidden address (`185.220.101.182`, `198.51.100.77`) appears, and the instruction-echo phrases do not appear, so those two checks pass. `0.50 × 0 + 0.25 × 1 + 0.25 × 1 = 0.50`.

### Deep path: routed, not generated

All seven scored 1.00 on route, reason, and planned models. `answer_quality` is `not-run` on each of them. The reference paragraphs in the dataset say what a grounded correlation or response plan would include, for example the Ledger Fox sequence from `MAIL-SERVER-01` to `WS-FINANCE-01` and `185.220.101.182`. Those paragraphs were not produced by Sonnet or GPT-4.1 on this run.

### How 0.90 is the mean

Six lookups at 1.00, the login summary at 1.00, the USB reply at 0.75, the phishing reply at 0.75, and the transfer reply at 0.50:

`6.00 + 1.00 + 0.75 + 0.75 + 0.50 = 9.00`, and `9.00 / 10 = 0.90`.

The seven deep rows are excluded from that mean.

## What the scores say

The gate matches the written rules on every synthetic case, including the cases built to catch a wrong escalation. Database replies match the formatter exactly, so a lookup cannot drift into a model paraphrase.

The fast model’s misses on this run are incomplete text and leaked instructions. The transfer reply never finishes the host name. The USB and phishing replies talk about the prompt instead of only answering. None of the four fast replies introduced a host or address from outside the records.

A later run can move the 0.90 without any router change, because Ling’s wording is not fixed even at temperature 0. The route metrics should stay at 1.00 unless `choose_route` or the labels change.
