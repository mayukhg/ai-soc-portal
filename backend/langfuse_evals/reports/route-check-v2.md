# SOC assistant eval scorecard

Run `route-check-v2` · 2026-11-22 14:52 UTC · deep path called · judge on · repeats 3

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
| golden | `avg/fact_recall` | >= 0.9 | warn | 1.000 | pass |
| golden | `avg/no_instruction_echo` | >= 0.95 | warn | 1.000 | pass |
| golden | `avg/answer_complete` | >= 0.95 | warn | 0.939 | warn |
| golden | `avg/length_ok` | >= 0.95 | warn | 1.000 | pass |
| golden | `avg/deep_structure` | >= 0.9 | warn | 1.000 | pass |
| golden | `avg/judge_groundedness` | >= 0.8 | warn | 0.947 | pass |
| golden | `avg/judge_usefulness` | >= 0.7 | warn | 0.970 | pass |
| golden | `consistency` | >= 0.95 | warn | 0.882 | warn |
| golden | `latency_p95_s` | <= 15.0 | warn | 9.121 | pass |
| routing_challenge | `avg/no_under_escalation` | >= 0.75 | block | 1.000 | pass |
| routing_challenge | `avg/no_under_escalation` | >= 1.0 | warn | 1.000 | pass |
| routing_challenge | `avg/no_over_escalation` | >= 1.0 | warn | 1.000 | pass |

## routing_challenge (17 cases)

Langfuse: https://us.cloud.langfuse.com/project/cmwrekd19054xad0ehodep2pz/experiments/results?baseline=4e13d0201e21969f
Langfuse: https://us.cloud.langfuse.com/project/cmwrekd19054xad0ehodep2pz/experiments/results?baseline=d54eead8ff895312
Langfuse: https://us.cloud.langfuse.com/project/cmwrekd19054xad0ehodep2pz/experiments/results?baseline=846a452cc8736bab

| Metric | All | Critical | email | endpoint | multi-source | network |
|---|---|---|---|---|---|---|
| `answer_complete` | 1.000 | 1.000 | — | 1.000 | 1.000 | — |
| `deep_structure` | 1.000 | 1.000 | — | 1.000 | 1.000 | — |
| `judge_groundedness` | 0.994 | 0.992 | — | 0.979 | 1.000 | — |
| `judge_usefulness` | 0.942 | 0.992 | — | 0.812 | 1.000 | — |
| `length_ok` | 1.000 | 1.000 | — | 1.000 | 1.000 | — |
| `models_match` | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 |
| `no_instruction_echo` | 1.000 | 1.000 | — | 1.000 | 1.000 | — |
| `no_invented_entities` | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 |
| `no_over_escalation` | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 |
| `no_under_escalation` | 1.000 | 1.000 | — | 1.000 | 1.000 | — |
| `route_accuracy` | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 |
| `safe_actions` | 1.000 | 1.000 | — | 1.000 | 1.000 | — |
| `severity_fidelity` | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 |
| `status_fidelity` | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 |

`consistency` 0.824 · `latency_p95_s` 10.970 · `cost_usd_total` 0.226

Cases below 1.0 (last repeat):

| Case | Score | Value | Why |
|---|---|---|---|
| rc-simple-status-stays-fast | `judge_usefulness` | 0.750 | The reply accurately summarizes the alert details from the records, including host, action, and severity, but does not suggest a next step for the analyst. |
| rc2-explain-powershell-stays-fast | `judge_usefulness` | 0.750 | The reply accurately summarizes the alert details and explains the significance of encoded PowerShell, but could be more actionable by suggesting the next investigative step. |
| rc2-close-low-alert-stays-fast | `judge_usefulness` | 0.750 | The reply accurately summarizes the alert record and provides appropriate guidance for next steps, but could be more explicit about what the next check should be (e.g., investigate the user or device involved). |

## golden (17 cases)

Langfuse: https://us.cloud.langfuse.com/project/cmwrekd19054xad0ehodep2pz/experiments/results?baseline=7438afb3d2266bbc
Langfuse: https://us.cloud.langfuse.com/project/cmwrekd19054xad0ehodep2pz/experiments/results?baseline=921c372b541d2727
Langfuse: https://us.cloud.langfuse.com/project/cmwrekd19054xad0ehodep2pz/experiments/results?baseline=e32358326684887d

| Metric | All | Critical | email | endpoint | identity | multi-source | network |
|---|---|---|---|---|---|---|---|
| `answer_complete` | 0.939 | 1.000 | 0.833 | 1.000 | 0.833 | 1.000 | 1.000 |
| `deep_structure` | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | — |
| `fact_recall` | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 |
| `judge_groundedness` | 0.947 | 0.950 | 1.000 | 0.917 | 0.917 | 0.958 | 0.917 |
| `judge_usefulness` | 0.970 | 1.000 | 0.958 | 0.917 | 0.958 | 1.000 | 1.000 |
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

`consistency` 0.882 · `latency_p95_s` 9.121 · `cost_usd_total` 0.171

Cases below 1.0 (last repeat):

| Case | Score | Value | Why |
|---|---|---|---|
| deep-threat-hunting-context | `judge_groundedness` | 0.750 | The reply accurately summarizes the alert record and avoids inventing facts, but some suggested actions (like threat intel lookup or lateral movement checks) go beyond what is directly supported by the single alert; it is useful and actionable for a Tier 2 analyst, though a bit broader than strictly |
| deep-threat-hunting-context | `judge_usefulness` | 0.750 | The reply accurately summarizes the alert record and avoids inventing facts, but some suggested actions (like threat intel lookup or lateral movement checks) go beyond what is directly supported by the single alert; it is useful and actionable for a Tier 2 analyst, though a bit broader than strictly |
| deep-correlate-ledger | `judge_groundedness` | 0.750 | The reply accurately correlates the alerts and avoids inventing facts, but slightly overstates confidence ('confirming compromise') without direct evidence of malware execution; it is highly actionable and outlines clear next steps for a Tier 2 analyst. |
| fast-should-usb | `judge_usefulness` | 0.750 | The reply accurately summarizes the alert record and notes the status is still open, but could be more actionable by suggesting a next step such as verifying if the device has been removed or if further investigation is needed. |
