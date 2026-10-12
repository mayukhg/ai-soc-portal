# Two-tier model architecture

The SOC assistant answers analyst questions in two tiers. A local gate decides the tier before any model is called. Only the questions that need written language reach OpenRouter. Every model HTTP call is `POST https://openrouter.ai/api/v1/chat/completions`. The key is `OPENROUTER_API_KEY` in the project `.env` file. The running code is `backend/model_router.py`, called from `function_ai_assistant` in `backend/server.py`.

The split exists so the common case stays cheap and fast, and the uncommon case can spend more on a second pass. About four in five analyst questions are routine: find the matching alerts, or write a short answer from those rows. The rest ask for correlation, a campaign read, or a response plan. Those go through two models in sequence.

```text
Analyst question
        |
        v
Load up to 3 matching alert rows from PostgreSQL
        |
        v
Local gate (no model call)
        |
        +-- lookup -------- answer from the rows, $0
        |
        +-- fast path ----- Ling 3.0 Flash VL
        |                   failover: Gemini 2.5 Flash Lite
        |
        +-- deep path ----- Claude Sonnet 5 correlates the rows
                            GPT-4.1 writes the response plan
```

## What the gate looks at

`choose_route` never calls a model. It returns `fast` or `deep` and a reason string that is stored on the assistant message.

A question is **deep** when any of these are true:

- The assistant context is `threat_hunting`.
- The text matches the deep pattern: correlate, attribute, campaign, lateral, playbook, root cause, containment, investigate, compare, ambiguous, multi-stage, kill chain, across, threat report, or intelligence report.
- The question contains two or more IPv4 addresses.

Otherwise a question that asks to analyze, explain, summarize, recommend, assess, draft, or explain what something means is **fast**. A question with no language verb is a **lookup**: the API returns the matching alert lines and does not call OpenRouter. If the search does not hit a row, the gate still stays on the fast path and shows recent alerts. A pile of high-severity rows alone does not escalate. That rule was removed because fallback “recent alerts” were making ordinary lookups deep.

The assistant UI shows the tier and the model ids under the reply. A lookup shows the tier with “database” because the model list is empty.

## What each tier sends

Both model tiers are grounded on the same alert block: title, severity, status, source, type, and description. At most three rows are included. The prompts tell the model to use only those rows and not to invent hosts, indicators, or actions.

| Tier | Calls | Output cap | Timeout | Typical spend |
|---|---|---|---|---|
| Lookup | 0 | — | — | $0 |
| Fast | 1 | 220 tokens | 20s primary, 8s failover | about $0.000022 |
| Deep | 2, in order | 450 tokens each | 30s each | about $0.006, about $0.010 at the cap |

Prices are USD per million tokens from the OpenRouter catalog on 12 Oct 2026. Temperature is 0.

**Fast path.** Primary model `inclusionai/ling-3.0-flash-vl` at $0.021 input and $0.0616 output per million tokens. If that call fails for a reason other than a missing or rejected key, the router tries `google/gemini-2.5-flash-lite` at $0.10 / $0.40. A missing key or an HTTP 401 is returned to the analyst. The key is not logged, and the router does not fail over to the second model in those two cases.

The cost figure uses a planning budget of 600 input tokens and 150 output tokens, which matches a short system prompt, one question, and three alert lines, with an answer under the 120-word instruction:

`600 × $0.021 / 1,000,000 + 150 × $0.0616 / 1,000,000 = $0.0000218` per call, or **$0.022 per 1,000 calls**.

**Deep path.** The correlator is `anthropic/claude-sonnet-5` at $2 input and $10 output. It states what the records support, what is still unknown, and a confidence of high, medium, or low. The planner is `openai/gpt-4.1` at $2 input and $8 output. It receives the question, the same alert rows, and the correlation text, then writes a short response plan and the next checks.

With the current three-alert lookup, the correlator input is about 200 tokens. If it writes about 250 tokens, the planner input is about 450 tokens because it also receives that correlation. At those lengths one deep question is about **$0.006**. If both models use the full 450-token output cap, it is about **$0.010**. Per 1,000 deep questions that is about $6 typically and about $10 at the cap. The router does not store OpenRouter’s billed token counts, so these are prompt-size estimates, not invoices.

Reports, KPI recalculation, header search, and incident semantic search do not call a model. Semantic search is token overlap in `search_incidents_text`.

## How the fast-path model was selected

The fast path runs on most written questions, so unit cost dominates the choice, and a cheap model that invents hosts is still the wrong model. The shortlist was built in two steps.

1. **Cost screen.** Comparable paid text models on the OpenRouter catalog were priced for the 600 / 150 token budget above. Routers with negative prices, alias models, batch and free variants, and image, audio, embedding, and moderation models were left out. The five cheapest were kept.
2. **Equal-weight score.** Each of cost, performance, trust, and hallucinations can contribute 0 to 25 points. The rank is the total out of 100. A criterion with no published figure scores 0 and is marked unpublished. It is not treated as a measured zero on the underlying test.

| Criterion | Score |
|---|---|
| Cost | `25 × (cheapest cost per 1,000 calls) / (this model’s cost per 1,000)` |
| Performance | Artificial Analysis Intelligence Index. On this shortlist the index already sits on a 0–25 scale. |
| Trust | `25 × (Omniscience Index + 100) / 200`. The index runs from −100 to +100. |
| Hallucinations | `25 × (1 − AA-Omniscience hallucination rate)`. Lower rates score higher. |

The hallucination rate is incorrect answers divided by incorrect, partial, and not-attempted answers among responses that were not correct. These are open-domain knowledge tests. They are not a measurement of whether the model stayed inside the SOC alert rows.

Published figures used here are from 10–12 Oct 2026.

| Rank | Model | Per 1,000 fast calls | Cost | Performance | Trust | Hallucinations | Total |
|---|---|---:|---:|---:|---:|---:|---:|
| 1 | Ling 3.0 Flash VL | $0.0218 | 25.0 | 25.0 | 11.9 | 19.5 | **81.4** |
| 2 | Ling 3.0 Flash | $0.0221 | 24.8 | 20.1 | 10.3 | 14.0 | **69.2** |
| 3 | GPT-OSS 20B (high) | $0.0243 | 22.5 | 9.0 | 4.6 | 1.5 | **37.6** |
| 4 | Granite 4.0 H Micro | $0.0270 | 20.2 | 5.0 | 0 unpublished | 2.8 | **28.0** |
| 5 | Mistral Nemo | $0.0219 | 24.9 | 0 unpublished | 0 unpublished | 0 unpublished | **24.9** |

The inputs behind those cells:

- **Ling 3.0 Flash VL.** Intelligence Index 25. Hallucination rate 22.0%, so the non-hallucination score is 19.5. Omniscience Index about −4.5, which is a trust score of 11.9. Reported accuracy is about 14.4%. It is the only model on the shortlist that leads performance, trust, and hallucinations at the same time, and it is also the cheapest.
- **Ling 3.0 Flash.** Intelligence Index 20.1. Hallucination rate 44.1%. Omniscience Index about −18. Almost the same price as the VL model, and behind it on every quality criterion.
- **GPT-OSS 20B (high).** Intelligence Index 9. Hallucination rate 94.1% on the BenchLM board (rank 178 of 183). Omniscience Index −63. The model card’s SimpleQA figure, without browsing, is 6.7% accuracy and 91.4% hallucination. The price is close to Ling. The quality scores are not.
- **Granite 4.0 H Micro.** Intelligence Index 5 (estimated). Omniscience Index −78, so trust scores 2.8. A hallucination rate for this exact 3B model was not on the 183-model board, so that cell is 0. Granite-4.0-H-1B’s 81.7% rate was not substituted. If this model’s hallucination score matched Ling Flash (14), its total would be 42.0. It would pass GPT-OSS 20B and would still trail both Ling models.
- **Mistral Nemo.** A 2024 12B model. TruthfulQA 50.3%, HellaSwag 83.5%, and Natural Questions 31.2% are older exams. It has no Artificial Analysis Intelligence Index, Omniscience Index, or hallucination rate in this comparison. Scoring it from those older exams would place it near Ling without a shared test. Three unpublished cells keep it last.

The previous fast-path primary, GPT-4.1 Nano, and the current failover, Gemini 2.5 Flash Lite, are both $0.10 / $0.40 per million tokens. On the same budget that is **$0.120 per 1,000 calls**, about 5.5 times Ling VL, and about rank 64 of 326 paid text models. Gemini remains the failover because a failed Ling call should still return an answer, not because it won the ranking.

Ling 3.0 Flash VL is the fast-path primary for that total. The system prompt asks for an analyst answer only and forbids restating the instructions or listing reasoning steps. Ling has still echoed those steps on some calls. That is a behavior of this model on the current prompt, and it is why the failover exists.

## How the deep-path models were selected

The deep path was not chosen by re-running the cheap-model ranking. The five models above were screened for a 220-token answer to one lookup. A deep question needs a different job: say what the records do not support, then turn that into a plan. Using the fast-path winner for both jobs would keep the unit cost down and would also ask a 220-token model to do the work the gate was built to withhold.

The same four criteria were applied at that operating point.

**Cost.** Sonnet 5 is $2 / $10 per million tokens. GPT-4.1 is $2 / $8. A single fast-path-sized call on Sonnet 5 would be about $2.70 per 1,000 calls, roughly 120 times Ling VL. That price is acceptable on the deep path because the local gate is the cost control. The loop runs only for the correlation, campaign, multi-address, and threat-hunting questions, each call is capped at 450 output tokens, and one question is about one cent at the cap. The correlator and the planner are different models so a long correlation cannot be billed at the planner’s output price, and a planning failure does not require a second correlation.

**Performance.** The deep path is the place the assistant is allowed to spend on a stronger model. The cheap shortlist’s Intelligence Index runs from an unpublished score up to 25, and those figures are open-domain indexes, not a SOC grading of Sonnet 5 or GPT-4.1. Sonnet 5 is the correlator because the first pass has to hold several alert rows, separate what is supported from what is unknown, and attach a confidence. GPT-4.1 is the planner because the second pass is a shorter operational note: next checks, no invented tools or hosts. Splitting the work means the plan is written against an explicit correlation rather than against the raw rows alone.

**Trust.** Trust on this path is the shape of the handoff, not an Omniscience Index for these two models. That index was not part of the deep-path selection, and this document does not invent one. The correlator must name the unknown items and a confidence. The planner must see both the rows and that correlation. An analyst reading the reply can see the correlation and the plan as two blocks. The stored message metadata records both model ids and the gate reason.

**Hallucinations.** No AA-Omniscience hallucination rate for Sonnet 5 or GPT-4.1 is cited here, because the fast-path board was not used to rank them. The control in the product is the prompt and the evidence window: both calls are told to use only the alert rows, and the planner is told not to invent tools or hosts. The same three-row window is a limit. A question about an incident title can miss the incident when the linked alert title is different, because grounding is alert title, description, and alert type. A published open-domain hallucination rate would not measure that failure.

## What is stored

On success the API inserts the analyst message and the assistant message. The assistant row’s metadata is `{tier, models, reason}`. On a router error the API returns the error and the planned model ids and does not insert a fabricated reply.

Lookups start with “From the alert store:”. Deep replies are the correlation text, then a “Response plan:” section. Fast replies are the single model answer.

## What this design leaves out

The LangGraph, RAG, and explainability modules in the repository describe a broader agent design. They are not the path that answers the assistant today. The live path is the local gate plus the OpenRouter calls above. Embeddings are not generated. There is no separate hallucination grader on the SOC prompt. The scores in the fast-path table are the public evaluations available on 12 Oct 2026, and cells without a published figure stay at zero so an older exam cannot outrank a model that was actually measured.
