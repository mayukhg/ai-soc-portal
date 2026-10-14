# AI SOC Portal

An AI-native Security Operations Centre workspace: agentic alert triage, threat hunting, and incident response over live security telemetry — built so that every AI-generated conclusion can be traced, evaluated, and audited.

Most "AI for SOC" work stops at wiring an LLM to an alert queue. The harder problem is the one that actually blocks adoption in a regulated environment: a Tier 1 analyst will not act on a machine-generated verdict they cannot interrogate, and a CISO will not sign off on a control they cannot evidence. This project treats that trust problem as a first-class product requirement rather than a later hardening pass — which is why roughly half the repository is reasoning, evaluation, and audit infrastructure.

---

## Status

**Personal R&D project.** This is a working prototype built to explore AI product architecture in security operations. It is not a commercial product and has no production deployments.

- **Backend migration in progress.** The platform is moving to AWS Lambda (Python), Pinecone, Aurora Serverless (PostgreSQL), and Redis on ElastiCache. The earlier Supabase backend under `supabase/` is deprecated and will be removed.
- Figures in `EXECUTIVE_PITCH.md` and `business_justification.md` are **modelled** from published industry benchmarks and stated assumptions. They are a value hypothesis to be tested with a design partner, not measured outcomes.

---

## What it does

**Agentic triage.** Incoming alerts are enriched, correlated, and classified by a graph-orchestrated set of reasoning steps rather than a single prompt. Each step's inputs, outputs, and rationale are recorded, so a verdict can be replayed rather than merely trusted. See `lang_graph_implementation.md` and `ai_reasoning_pseudocode.md`.

**Semantic retrieval over security data.** Analysts query telemetry, prior incidents, and threat intelligence in natural language. Retrieval is vector-backed via Pinecone, with retrieved context attached to every answer so the source of a claim is visible. See `rag_implementation.md` and `contextualization_pseudocode.md`.

**Threat hunting.** Behavioural and pattern-based hunting across ingested data, with hypotheses expressed in natural language and translated into structured queries.

**Incident workflow.** End-to-end handling from detection through triage, assignment, and resolution, with stakeholder and executive reporting views.

**Operations dashboard.** Live alert feed, filtering, and KPI surfaces for both analyst and executive audiences.

---

## The trust layer

This is the part of the repository worth reading first, and the reason the project exists in this shape.

| Concern | How it is addressed | Reference |
|---|---|---|
| Is the model right? | Evaluation harness using LangSmith tracing and RAGAS retrieval/answer metrics, run against a fixed question set | `langsmith_ragas_implementation.md`, `langsmith_usage.md`, `langsmith-config.md` |
| Did the assistant take the right path, and did the answer stay on the records? | Phoenix dataset of 17 synthetic questions, with code evaluators for route, reason, model choice, and answer quality | `EVAL_FRAMEWORK.md` |
| Is it making things up? | Hallucination and accuracy detection on generated output, with grounding checks against retrieved context | `hall_acc_detect.md` |
| Why did it decide that? | Explainability surfaces exposing the reasoning path and the evidence behind each conclusion | `ai_explainability.md`, `prompt_reasoning_logic.md` |
| Can we prove what happened? | Structured logging of LLM operations and generative AI calls, retained for audit | `gen_ai_logging.md`, `llm_operations_logging.md`, `auditability.md` |
| How do we grade quality consistently? | Rubric-based scoring of model output across defined dimensions | `llm_rubric_implementation.md` |

The design principle: **an AI verdict an analyst cannot audit is worth less than no verdict at all**, because it consumes trust without transferring confidence.

---

## Architecture

**Frontend** — React 18 with TypeScript, Vite, Tailwind CSS, shadcn/ui.

**Backend (running locally)** — a Python API over PostgreSQL. Alert, incident, comment, indicator, KPI, and report screens read that database. A static walkthrough of the same screens is in `mockup/index.html`.

**Backend (target state)** — Python on AWS Lambda for serverless compute, Aurora Serverless (PostgreSQL) for relational state, Pinecone for vector search, Redis on ElastiCache for caching and session state.

**AI orchestration** — LangChain and LangGraph for multi-step reasoning, with LangSmith for tracing and RAGAS for retrieval-augmented generation evaluation.

### Two-tier model routing

The assistant that answers analyst questions does not send every question to a model. `backend/model_router.py` chooses the tier locally, then sends only the model calls to OpenRouter.

Routine lookups are answered from the alert rows already loaded, at no model cost. A short written question uses the fast path: `inclusionai/ling-3.0-flash-vl`, with `google/gemini-2.5-flash-lite` only if Ling returns an error. A correlation, campaign, multi-address, or threat-hunting question uses the deep path: `anthropic/claude-sonnet-5` states what the records support, then `openai/gpt-4.1` writes the response plan.

The fast-path model was chosen from the cheapest comparable text models on the OpenRouter catalog (12 Oct 2026), then scored on four equal criteria: cost, Artificial Analysis Intelligence Index, an Omniscience-based trust score, and the AA-Omniscience hallucination rate. Ling 3.0 Flash VL scored 81.4 out of 100 and led the shortlist on performance, trust, and non-hallucination while staying at about $0.022 per 1,000 calls. The deep-path models were not taken from that cheap list. They are reserved for the smaller set of ambiguous questions, where a higher unit cost is accepted because each question is still about one cent at the output cap and the local gate keeps them off the routine path. The full scoring, token budgets, and gate rules are in `TWO_TIER_ARCHITECTURE.md`.

The same router is evaluated in Arize Phoenix. `backend/evals/` holds 17 synthetic analyst questions. A local Phoenix server at `http://127.0.0.1:6006` stores the dataset `soc-assistant-evals` and two experiments: `soc-routing` checks the gate on every case, and `soc-answer-quality` checks live lookup and fast-path replies. On the 13 Oct 2026 run, routing scored 1.00 and answer quality scored 0.90. Deep-path questions are labeled and scored on the route only. Metrics, hosting, and the per-case results are in `EVAL_FRAMEWORK.md`.

**Observability** — OpenTelemetry spans from the live assistant go to the same Phoenix server. See `EVAL_FRAMEWORK.md`, `monitoring/`, and `llm_operations_logging.md`.

### Hotjar

Analyst behaviour is recorded in the browser with the Hotjar snippet (`@hotjar/browser`, wired through `src/lib/hotjar.ts`). The snippet loads only when `VITE_HOTJAR_SITE_ID` is a positive integer. This portal uses site **1058676** and snippet version **6** (`VITE_HOTJAR_VERSION`). Both values are in `.env.example`. There is no feedback widget and no consent banner. With the site id unset, every Hotjar call is skipped and the app behaves as it did before.

Identity sent to Hotjar is a SHA-256 of the user id, plus `user_role`, `account_tier`, `device` (`desktop` or `mobile`), and `synthetic: true`. Email, name, and the raw user id are dropped. Event names are a fixed list: sign-in failure and success, sign-out, each dashboard section, severity filter, search, incident open and close, assistant lookup, assistant fast path, and report viewed. The event does not include the search text, the question, or the answer. Route changes are reported as the pathname only. Password fields, the header search and its results, incident search, the assistant transcript and input, the incident detail, and generated report text carry `data-hj-suppress`.

Hotjar does not capture pages served over plain HTTP, including `http://127.0.0.1:8080`. The snippet still loads on that URL. Recordings appear in the Hotjar project after the portal is served over HTTPS.

The metrics view for these sessions is hosted in this app, not read back from Hotjar:

[http://127.0.0.1:8080/dev/hotjar-insights](http://127.0.0.1:8080/dev/hotjar-insights)

`src/pages/HotjarMetricsPage.tsx` computes the page from `data/hotjar/sessions-50.json`, `sessions-250.json`, and `sessions-1000.json`. Every persona is tagged synthetic. The page shows session count, average duration, report conversion, and a frustration index (share of sessions with a rage click or a u-turn; the figure is red at 25% or above), plus the funnel from sign-in through report viewed and a session table. Sample size, device, and frustration can be filtered, and a funnel step with drop-off lists the sessions that stopped before that step. On the 50-session file the page shows 50 sessions, an average duration of 6m 25s, 42% reaching a viewed report (21 sessions), and a 32% frustration index (16 sessions).

Regenerate the fixtures without sending them to Hotjar:

```bash
node scripts/hotjar-seed-sessions.mjs        # 50 sessions
node scripts/hotjar-seed-sessions.mjs 250
node scripts/hotjar-seed-sessions.mjs 1000
```

Detailed diagrams and component breakdowns:

- `TWO_TIER_ARCHITECTURE.md` — fast-path and deep-path routing, and how the models were scored
- `EVAL_FRAMEWORK.md` — Phoenix dataset, evaluators, hosting, and the latest scores
- `HIGH_LEVEL_ARCHITECTURE.md` — system overview
- `ARCHITECTURE.md` — detailed architecture
- `techstack_flow_diagram.md`, `techstack_usage.md` — stack and data flow
- `data_ingestion_implementation.md`, `data_ingestion_pipeline_pseudocode.md` — ingestion pipeline
- `AI Soc Portal - Technical Workflow.jpg` — visual workflow

---

## Repository map

```
src/           Frontend application (React + TypeScript), including the Hotjar snippet and /dev/hotjar-insights
backend/       Backend services, including evals/ for the Phoenix dataset and experiments
data/hotjar/   Synthetic Hotjar sessions (50, 250, and 1,000) for the local metrics page
supabase/      Deprecated — previous backend, pending removal
monitoring/    Observability configuration
scripts/       startup.sh, shutdown.sh, and hotjar-seed-sessions.mjs; deploy scripts
docs/          Supplementary documentation
public/        Static assets
```

### Documentation index

**Product and business**
`EXECUTIVE_PITCH.md` · `business_justification.md` · `future_roadmap.md`

**Architecture and implementation**
`TWO_TIER_ARCHITECTURE.md` · `EVAL_FRAMEWORK.md` · `HIGH_LEVEL_ARCHITECTURE.md` · `ARCHITECTURE.md` · `techstack_usage.md` · `techstack_flow_diagram.md` · `COMPONENT_REFERENCE.md` · `data_ingestion_implementation.md`

**AI engineering**
`langchain_implementation.md` · `lang_graph_implementation.md` · `rag_implementation.md` · `ai_reasoning_pseudocode.md` · `prompt_reasoning_logic.md` · `contextualization_pseudocode.md`

**Evaluation, safety, and audit**
`EVAL_FRAMEWORK.md` · `langsmith_ragas_implementation.md` · `langsmith_usage.md` · `langsmith-config.md` · `hall_acc_detect.md` · `ai_explainability.md` · `llm_rubric_implementation.md` · `gen_ai_logging.md` · `llm_operations_logging.md` · `auditability.md`

**Product analytics**
`src/lib/hotjar.ts` · `src/pages/HotjarMetricsPage.tsx` · `data/hotjar/` · `scripts/hotjar-seed-sessions.mjs`

**API and deployment**
`scripts/startup.sh` · `scripts/shutdown.sh` · `API_DOCUMENTATION.md` · `BACKEND_API_REFERENCE.md` · `DEPLOYMENT.md`

**Quality management**
`AI SoC Portal - TQM Process.docx` · `AI SoC Portal - TQM Implementation Guide.docx` · `COMPREHENSIVE_BEST_PRACTICES_ANALYSIS.md`

---

## Getting started

**Prerequisites:** Node.js 18+ and npm ([install via nvm](https://github.com/nvm-sh/nvm#installing-and-updating)).

```bash
git clone https://github.com/mayukhg/ai-soc-portal.git
cd ai-soc-portal
npm install
./scripts/startup.sh
```

[`scripts/startup.sh`](scripts/startup.sh) asks for the OpenRouter API key, saves it in `.env`, and starts Postgres, the API, Vite, and Phoenix. Stop that stack with [`scripts/shutdown.sh`](scripts/shutdown.sh):

```bash
./scripts/shutdown.sh
```

The frontend can also be started on its own with `npm run dev`. Backend services, model provider credentials, and vector store configuration are required for AI features — see `DEPLOYMENT.md`.

With the stack running, the local Hotjar metrics dashboard is at [http://127.0.0.1:8080/dev/hotjar-insights](http://127.0.0.1:8080/dev/hotjar-insights). It does not require the Hotjar website. Set `VITE_HOTJAR_SITE_ID` and `VITE_HOTJAR_VERSION` from `.env.example` before expecting the live snippet to load in the analyst UI.

> **TODO before publishing:** add the required environment variables here (model provider key, Pinecone index and key, database URL, Redis URL) with a matching `.env.example`. Note that a `.env` file is currently committed to this repository — remove it, add it to `.gitignore`, and rotate any keys it contained.

---

## Roadmap

See `future_roadmap.md` for the full plan. Near-term priorities:

1. Complete the migration off Supabase to the Lambda / Aurora / Pinecone / Redis stack
2. Broaden the evaluation set and publish baseline RAGAS scores in-repo. The assistant router already has a Phoenix baseline in `EVAL_FRAMEWORK.md`
3. Detection-engineering integrations (SIEM and EDR ingestion)
4. Multi-tenant isolation

---

## Related work

This repository is one of three in an **AI Defence Ecosystem** exploring how AI both defends the enterprise and becomes something the enterprise must defend:

- [**ai-policy-foundry**](https://github.com/mayukhg/ai-policy-foundry) — *prevent.* Multi-agent generation and validation of cloud security policy from live threat intelligence and an organisation's own risk register.
- [**ai-spm**](https://github.com/mayukhg/ai-spm) — *protect.* Security posture management for AI assets: inventory, adversarial attack detection, data quality and drift monitoring, and NIST AI RMF / EU AI Act / GDPR evidence automation.
- **ai-soc-portal** *(this repository)* — *detect and respond.*

---

## Author

Built by [Mayukh Ghosh](https://github.com/mayukhg) — product management in enterprise AI and cybersecurity.

## License

> **TODO:** no licence file is currently present. Add one (MIT is the convention for portfolio repositories) or state explicitly that the code is unlicensed and provided for review only.
