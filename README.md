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
| Is it making things up? | Hallucination and accuracy detection on generated output, with grounding checks against retrieved context | `hall_acc_detect.md` |
| Why did it decide that? | Explainability surfaces exposing the reasoning path and the evidence behind each conclusion | `ai_explainability.md`, `prompt_reasoning_logic.md` |
| Can we prove what happened? | Structured logging of LLM operations and generative AI calls, retained for audit | `gen_ai_logging.md`, `llm_operations_logging.md`, `auditability.md` |
| How do we grade quality consistently? | Rubric-based scoring of model output across defined dimensions | `llm_rubric_implementation.md` |

The design principle: **an AI verdict an analyst cannot audit is worth less than no verdict at all**, because it consumes trust without transferring confidence.

---

## Architecture

**Frontend** — React 18 with TypeScript, Vite, Tailwind CSS, shadcn/ui.

**Backend (target state)** — Python on AWS Lambda for serverless compute, Aurora Serverless (PostgreSQL) for relational state, Pinecone for vector search, Redis on ElastiCache for caching and session state.

**AI orchestration** — LangChain and LangGraph for multi-step reasoning, with LangSmith for tracing and RAGAS for retrieval-augmented generation evaluation.

**Observability** — see `monitoring/` and `llm_operations_logging.md`.

Detailed diagrams and component breakdowns:

- `HIGH_LEVEL_ARCHITECTURE.md` — system overview
- `ARCHITECTURE.md` — detailed architecture
- `techstack_flow_diagram.md`, `techstack_usage.md` — stack and data flow
- `data_ingestion_implementation.md`, `data_ingestion_pipeline_pseudocode.md` — ingestion pipeline
- `AI Soc Portal - Technical Workflow.jpg` — visual workflow

---

## Repository map

```
src/           Frontend application (React + TypeScript)
backend/       Backend services
supabase/      Deprecated — previous backend, pending removal
monitoring/    Observability configuration
scripts/       Operational and build scripts
docs/          Supplementary documentation
public/        Static assets
```

### Documentation index

**Product and business**
`EXECUTIVE_PITCH.md` · `business_justification.md` · `future_roadmap.md`

**Architecture and implementation**
`HIGH_LEVEL_ARCHITECTURE.md` · `ARCHITECTURE.md` · `techstack_usage.md` · `techstack_flow_diagram.md` · `COMPONENT_REFERENCE.md` · `data_ingestion_implementation.md`

**AI engineering**
`langchain_implementation.md` · `lang_graph_implementation.md` · `rag_implementation.md` · `ai_reasoning_pseudocode.md` · `prompt_reasoning_logic.md` · `contextualization_pseudocode.md`

**Evaluation, safety, and audit**
`langsmith_ragas_implementation.md` · `langsmith_usage.md` · `langsmith-config.md` · `hall_acc_detect.md` · `ai_explainability.md` · `llm_rubric_implementation.md` · `gen_ai_logging.md` · `llm_operations_logging.md` · `auditability.md`

**API and deployment**
`API_DOCUMENTATION.md` · `BACKEND_API_REFERENCE.md` · `DEPLOYMENT.md`

**Quality management**
`AI SoC Portal - TQM Process.docx` · `AI SoC Portal - TQM Implementation Guide.docx` · `COMPREHENSIVE_BEST_PRACTICES_ANALYSIS.md`

---

## Getting started

**Prerequisites:** Node.js 18+ and npm ([install via nvm](https://github.com/nvm-sh/nvm#installing-and-updating)).

```bash
git clone https://github.com/mayukhg/ai-soc-portal.git
cd ai-soc-portal
npm install
npm run dev
```

The frontend runs standalone with the dev server. Backend services, model provider credentials, and vector store configuration are required for AI features — see `DEPLOYMENT.md`.

> **TODO before publishing:** add the required environment variables here (model provider key, Pinecone index and key, database URL, Redis URL) with a matching `.env.example`. Note that a `.env` file is currently committed to this repository — remove it, add it to `.gitignore`, and rotate any keys it contained.

---

## Roadmap

See `future_roadmap.md` for the full plan. Near-term priorities:

1. Complete the migration off Supabase to the Lambda / Aurora / Pinecone / Redis stack
2. Broaden the evaluation set and publish baseline RAGAS scores in-repo
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
