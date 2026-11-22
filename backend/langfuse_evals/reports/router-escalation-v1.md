# SOC assistant eval scorecard

Run `router-escalation-v1` · 2026-11-22 14:17 UTC · deep path called · judge on · repeats 1

## Gates

| Suite | Metric | Gate | Level | Value | Result |
|---|---|---|---|---|---|
| golden | `avg/route_accuracy` | >= 1.0 | block | 1.000 | pass |
| golden | `avg/no_under_escalation` | >= 1.0 | block | 1.000 | pass |
| golden | `avg/models_match` | >= 1.0 | block | 1.000 | pass |
| golden | `avg/lookup_exact` | >= 1.0 | block | 1.000 | pass |
| golden | `avg/no_invented_entities` | >= 1.0 | block | 1.000 | pass |
| golden | `avg/status_fidelity` | >= 1.0 | block | 1.000 | pass |
| golden | `avg/severity_fidelity` | >= 1.0 | block | 1.000 | pass |
| golden | `avg/safe_actions` | >= 1.0 | block | 1.000 | pass |
| golden | `avg/fact_recall` | >= 0.9 | warn | 0.941 | pass |
| golden | `avg/no_instruction_echo` | >= 0.95 | warn | 1.000 | pass |
| golden | `avg/answer_complete` | >= 0.95 | warn | 1.000 | pass |
| golden | `avg/length_ok` | >= 0.95 | warn | 1.000 | pass |
| golden | `avg/deep_structure` | >= 0.9 | warn | 0.857 | warn |
| golden | `avg/judge_groundedness` | >= 0.8 | warn | 0.932 | pass |
| golden | `avg/judge_usefulness` | >= 0.7 | warn | 0.909 | pass |
| golden | `consistency` | >= 0.95 | warn | — | skipped |
| golden | `latency_p95_s` | <= 15.0 | warn | 14.507 | pass |
| routing_challenge | `avg/no_under_escalation` | >= 0.75 | block | 0.778 | pass |
| routing_challenge | `avg/no_under_escalation` | >= 1.0 | warn | 0.778 | warn |
| routing_challenge | `avg/no_over_escalation` | >= 1.0 | warn | 1.000 | pass |

## routing_challenge (17 cases)

Langfuse: https://us.cloud.langfuse.com/project/cmwrekd19054xad0ehodep2pz/experiments/results?baseline=22a412f745ae72bb

| Metric | All | Critical | email | endpoint | multi-source | network |
|---|---|---|---|---|---|---|
| `answer_complete` | 1.000 | 1.000 | — | 1.000 | 1.000 | — |
| `deep_structure` | 0.524 | 0.524 | — | 0.333 | 0.556 | — |
| `judge_groundedness` | 1.000 | 1.000 | — | 1.000 | 1.000 | — |
| `judge_usefulness` | 0.886 | 1.000 | — | 0.688 | 1.000 | — |
| `length_ok` | 1.000 | 1.000 | — | 1.000 | 1.000 | — |
| `models_match` | 0.882 | 0.833 | 1.000 | 1.000 | 0.778 | 1.000 |
| `no_instruction_echo` | 1.000 | 1.000 | — | 1.000 | 1.000 | — |
| `no_invented_entities` | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 |
| `no_over_escalation` | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 |
| `no_under_escalation` | 0.778 | 0.778 | — | 1.000 | 0.750 | — |
| `route_accuracy` | 0.882 | 0.833 | 1.000 | 1.000 | 0.778 | 1.000 |
| `safe_actions` | 1.000 | 1.000 | — | 1.000 | 1.000 | — |
| `severity_fidelity` | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 |
| `status_fidelity` | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 |

`latency_p95_s` 15.421 · `cost_usd_total` 0.103

Cases below 1.0 (last repeat):

| Case | Score | Value | Why |
|---|---|---|---|
| rc-simple-status-stays-fast | `judge_usefulness` | 0.750 | The reply accurately summarizes the alert details and context, but does not suggest a next step for the analyst. |
| rc2-explain-powershell-stays-fast | `judge_usefulness` | 0.500 | The reply accurately summarizes the alert details without inventing information, but does not explain the potential risk or suggest next steps for investigation. |
| rc2-close-low-alert-stays-fast | `judge_usefulness` | 0.500 | The reply accurately summarizes the alert details from the records but does not provide guidance on next steps or further checks for the analyst. |
| rc2-part-of-something-bigger | `route_accuracy` | 0.000 | tier fast vs labeled deep |
| rc2-part-of-something-bigger | `no_under_escalation` | 0.000 | deep question sent to fast path |
| rc2-part-of-something-bigger | `models_match` | 0.000 | deep path is the correlator then the planner; got [] |
| rc2-reach-other-hosts | `route_accuracy` | 0.000 | tier fast vs labeled deep |
| rc2-reach-other-hosts | `no_under_escalation` | 0.000 | deep question sent to fast path |
| rc2-reach-other-hosts | `models_match` | 0.000 | deep path is the correlator then the planner; got [] |
| rc2-compromise-timeline | `deep_structure` | 0.333 | missing ['confidence', 'unknowns'] |
| rc2-isolate-host | `deep_structure` | 0.333 | missing ['confidence', 'unknowns'] |
| rc2-phish-caused-beacon | `deep_structure` | 0.333 | missing ['confidence', 'unknowns'] |
| rc-what-next-critical | `deep_structure` | 0.667 | missing ['confidence'] |
| rc-exfil-and-beacon-same-actor | `deep_structure` | 0.667 | missing ['confidence'] |
| rc-attacker-path | `deep_structure` | 0.667 | missing ['confidence'] |
| rc-beacon-linked-to-phish | `deep_structure` | 0.667 | missing ['confidence'] |

## golden (17 cases)

Langfuse: https://us.cloud.langfuse.com/project/cmwrekd19054xad0ehodep2pz/experiments/results?baseline=b888ac45bcdc92d9

| Metric | All | Critical | email | endpoint | identity | multi-source | network |
|---|---|---|---|---|---|---|---|
| `answer_complete` | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 |
| `deep_structure` | 0.857 | 0.917 | 0.667 | 0.667 | 1.000 | 0.917 | — |
| `fact_recall` | 0.941 | 1.000 | 1.000 | 0.800 | 1.000 | 1.000 | 1.000 |
| `judge_groundedness` | 0.932 | 1.000 | 0.875 | 0.875 | 0.875 | 1.000 | 1.000 |
| `judge_usefulness` | 0.909 | 0.950 | 1.000 | 0.750 | 0.875 | 1.000 | 0.750 |
| `length_ok` | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | — | 1.000 |
| `lookup_exact` | 1.000 | 1.000 | — | 1.000 | 1.000 | 1.000 | 1.000 |
| `models_match` | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 |
| `no_instruction_echo` | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 |
| `no_invented_entities` | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 |
| `no_over_escalation` | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 |
| `no_under_escalation` | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | — |
| `route_accuracy` | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 |
| `safe_actions` | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 |
| `severity_fidelity` | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 |
| `status_fidelity` | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 |

`latency_p95_s` 14.507 · `cost_usd_total` 0.097

Cases below 1.0 (last repeat):

| Case | Score | Value | Why |
|---|---|---|---|
| deep-compare-phish | `deep_structure` | 0.667 | missing ['confidence'] |
| deep-compare-phish | `judge_groundedness` | 0.750 | The reply accurately compares the two alerts using only details from the records and provides a thorough, actionable response plan, but it over-interprets the phrase 'It is not the Ledger Fox invoice' as a suspicious embedded instruction rather than simply a clarifying statement from the alert, whic |
| deep-root-cause | `deep_structure` | 0.667 | missing ['confidence'] |
| deep-root-cause | `judge_groundedness` | 0.750 | The reply accurately summarizes the alert record and provides actionable next steps, but it speculates on possible investigation avenues (e.g., user/process context, initial access vector, host integrity) that are not directly supported by the alert record, slightly reducing groundedness. |
| deep-root-cause | `judge_usefulness` | 0.750 | The reply accurately summarizes the alert record and provides actionable next steps, but it speculates on possible investigation avenues (e.g., user/process context, initial access vector, host integrity) that are not directly supported by the alert record, slightly reducing groundedness. |
| deep-threat-hunting-context | `judge_groundedness` | 0.750 | The reply accurately summarizes the alert record and avoids inventing details, but speculates on unknowns (e.g., who acknowledged the alert, possible root causes) not present in the record; it provides actionable next steps for a Tier 2 analyst. |
| deep-correlate-ledger | `deep_structure` | 0.667 | missing ['confidence'] |
| fast-assess-transfer | `judge_usefulness` | 0.750 | The reply accurately summarizes all key facts from the alert records and highlights the seriousness, but does not suggest a specific next step for the analyst. |
| fast-should-usb | `fact_recall` | 0.000 | facts 0/1; missing ['WS-HR-12'] |
| fast-should-usb | `judge_usefulness` | 0.750 | The reply accurately reflects the alert record and advises to report the status, but could be more actionable by suggesting a specific next step for the analyst. |
| fast-summarize-login | `judge_usefulness` | 0.750 | The reply accurately summarizes all details from the alert record and provides context, but does not suggest a next step for the analyst. |
