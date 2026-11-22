# SOC assistant eval scorecard

Run `route-check-v1` · 2026-11-22 14:42 UTC · deep path called · judge on · repeats 2

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
| golden | `avg/answer_complete` | >= 0.95 | warn | 1.000 | pass |
| golden | `avg/length_ok` | >= 0.95 | warn | 1.000 | pass |
| golden | `avg/deep_structure` | >= 0.9 | warn | 1.000 | pass |
| golden | `avg/judge_groundedness` | >= 0.8 | warn | 0.893 | pass |
| golden | `avg/judge_usefulness` | >= 0.7 | warn | 0.964 | pass |
| golden | `consistency` | >= 0.95 | warn | 0.941 | warn |
| golden | `latency_p95_s` | <= 15.0 | warn | 10.649 | pass |
| routing_challenge | `avg/no_under_escalation` | >= 0.75 | block | 0.833 | pass |
| routing_challenge | `avg/no_under_escalation` | >= 1.0 | warn | 0.833 | warn |
| routing_challenge | `avg/no_over_escalation` | >= 1.0 | warn | 1.000 | pass |

## routing_challenge (17 cases)

Langfuse: https://us.cloud.langfuse.com/project/cmwrekd19054xad0ehodep2pz/experiments/results?baseline=72f84e1bd3828210
Langfuse: https://us.cloud.langfuse.com/project/cmwrekd19054xad0ehodep2pz/experiments/results?baseline=19b6a6dc3657cd03

| Metric | All | Critical | email | endpoint | multi-source | network |
|---|---|---|---|---|---|---|
| `answer_complete` | 1.000 | 1.000 | — | 1.000 | 1.000 | — |
| `deep_structure` | 1.000 | 1.000 | — | 1.000 | 1.000 | — |
| `judge_groundedness` | 1.000 | 1.000 | — | 1.000 | 1.000 | — |
| `judge_usefulness` | 0.924 | 0.985 | — | 0.781 | 1.000 | — |
| `length_ok` | 1.000 | 1.000 | — | 1.000 | 1.000 | — |
| `models_match` | 0.912 | 0.875 | 1.000 | 1.000 | 0.833 | 1.000 |
| `no_instruction_echo` | 1.000 | 1.000 | — | 1.000 | 1.000 | — |
| `no_invented_entities` | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 |
| `no_over_escalation` | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 |
| `no_under_escalation` | 0.833 | 0.833 | — | 1.000 | 0.812 | — |
| `route_accuracy` | 0.912 | 0.875 | 1.000 | 1.000 | 0.833 | 1.000 |
| `safe_actions` | 1.000 | 1.000 | — | 1.000 | 1.000 | — |
| `severity_fidelity` | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 |
| `status_fidelity` | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 |

`consistency` 0.824 · `latency_p95_s` 10.037 · `cost_usd_total` 0.126

Cases below 1.0 (last repeat):

| Case | Score | Value | Why |
|---|---|---|---|
| rc-simple-status-stays-fast | `judge_usefulness` | 0.750 | The reply accurately summarizes the alert details and provides relevant context, but does not suggest a next step for the analyst. |
| rc2-explain-powershell-stays-fast | `judge_usefulness` | 0.750 | The reply accurately summarizes the alert details and explains the significance of encoded PowerShell, but could be more actionable by suggesting the next investigative step. |
| rc2-close-low-alert-stays-fast | `judge_usefulness` | 0.750 | The reply accurately summarizes the alert record and provides appropriate guidance for next steps, but could be more explicit about what the next check should be (e.g., investigate the user or device involved). |
| rc2-part-of-something-bigger | `route_accuracy` | 0.000 | tier fast vs labeled deep |
| rc2-part-of-something-bigger | `no_under_escalation` | 0.000 | deep question sent to fast path |
| rc2-part-of-something-bigger | `models_match` | 0.000 | deep path is the correlator then the planner; got [] |
| rc2-reach-other-hosts | `route_accuracy` | 0.000 | tier fast vs labeled deep |
| rc2-reach-other-hosts | `no_under_escalation` | 0.000 | deep question sent to fast path |
| rc2-reach-other-hosts | `models_match` | 0.000 | deep path is the correlator then the planner; got [] |
| rc2-isolate-host | `judge_usefulness` | 0.750 | The reply accurately summarizes the alert record details and provides actionable next steps, but could be more decisive about isolation given the critical severity and active beaconing described in the records. |

## golden (17 cases)

Langfuse: https://us.cloud.langfuse.com/project/cmwrekd19054xad0ehodep2pz/experiments/results?baseline=a3e698c5351d4bf7
Langfuse: https://us.cloud.langfuse.com/project/cmwrekd19054xad0ehodep2pz/experiments/results?baseline=54fbc87f76740f55

| Metric | All | Critical | email | endpoint | identity | multi-source | network |
|---|---|---|---|---|---|---|---|
| `answer_complete` | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 |
| `deep_structure` | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | — |
| `fact_recall` | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 |
| `judge_groundedness` | 0.893 | 0.975 | 0.750 | 0.833 | 0.875 | 0.969 | 1.000 |
| `judge_usefulness` | 0.964 | 1.000 | 0.875 | 1.000 | 0.938 | 1.000 | 1.000 |
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

`consistency` 0.941 · `latency_p95_s` 10.649 · `cost_usd_total` 0.113

Cases below 1.0 (last repeat):

| Case | Score | Value | Why |
|---|---|---|---|
| deep-root-cause | `judge_groundedness` | 0.750 | The reply accurately summarizes the alert record and avoids unsupported claims, but it speculates on possible infection vectors and user context not present in the records; it provides a thorough, actionable response plan for a Tier 2 analyst. |
| deep-threat-hunting-context | `judge_groundedness` | 0.750 | The reply accurately summarizes the alert record and avoids inventing details, but some suggested next steps (e.g., lateral movement, privilege escalation) are not directly supported by the record; however, the response is highly actionable for a Tier 2 analyst. |
| deep-containment-playbook | `judge_groundedness` | 0.750 | The reply accurately summarizes the alert records and does not invent facts, but some containment steps (e.g., credential resets, email quarantine) are not directly supported by the records; however, the playbook is actionable and prioritizes containment and investigation steps relevant to the incid |
| fast-explain-phish | `judge_groundedness` | 0.750 | The reply accurately summarizes the alert details and provides context about the phishing technique, but the claim about a 'look-alike sender domain' is not explicitly supported by the alert records. |
| fast-explain-phish | `judge_usefulness` | 0.750 | The reply accurately summarizes the alert details and provides context about the phishing technique, but the claim about a 'look-alike sender domain' is not explicitly supported by the alert records. |
