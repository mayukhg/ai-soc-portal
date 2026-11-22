# SOC assistant eval scorecard

Run `relevance-ranking-v1` · 2026-11-22 14:06 UTC · deep path routed only · judge off · repeats 1

## Gates

| Suite | Metric | Gate | Level | Value | Result |
|---|---|---|---|---|---|
| retrieval | `avg/retrieval_recall` | >= 0.9 | warn | 0.939 | pass |
| retrieval | `avg/retrieval_matched_flag` | >= 1.0 | warn | 1.000 | pass |

## retrieval (12 cases)

Langfuse: https://us.cloud.langfuse.com/project/cmwrekd19054xad0ehodep2pz/experiments/results?baseline=d3c1ec39870d7eec

| Metric | All | retrieval |
|---|---|---|
| `retrieval_matched_flag` | 1.000 | 1.000 |
| `retrieval_precision` | 0.894 | 0.894 |
| `retrieval_recall` | 0.939 | 0.939 |

Cases below 1.0 (last repeat):

| Case | Score | Value | Why |
|---|---|---|---|
| ret-ledger-fox-campaign | `retrieval_recall` | 0.333 | found 1/3; returned ['Finance workstation beacon to Ledger Fox', 'Payroll phishing mail', 'Large outbound transfer from finance'] |
| ret-ledger-fox-campaign | `retrieval_precision` | 0.333 | returned ['Finance workstation beacon to Ledger Fox', 'Payroll phishing mail', 'Large outbound transfer from finance'] |
| ret-beacon-by-host | `retrieval_precision` | 0.500 | returned ['Finance workstation beacon to Ledger Fox', 'Suspicious Network Traffic Detected'] |
