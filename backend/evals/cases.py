"""Synthetic questions for the SOC assistant.

Each case names the route the router should pick and the facts an answer
may use. Lookup references are the alert-store formatter. Fast and deep
references are short gold answers written from those same records. The
deep path is labeled here and is not called when the experiment runs.
"""

from model_router import _lookup_answer, choose_route


def _alert(title, description, severity, status, source, alert_type):
    return {
        "title": title,
        "description": description,
        "severity": severity,
        "status": status,
        "source": source,
        "alert_type": alert_type,
    }


FAILED_LOGIN = _alert(
    "Failed Login Attempts",
    "Multiple failed login attempts for the administrator account from 203.0.113.42 against DC-PRIMARY.",
    "medium",
    "acknowledged",
    "Domain Controller",
    "Authentication Anomaly",
)
MALWARE = _alert(
    "Malware Detection on Endpoint",
    "Trojan.Win32.Agent was detected and quarantined on WS-USER-045. The file hash matches the endpoint malware indicator.",
    "critical",
    "resolved",
    "EDR System",
    "Malware Detection",
)
USB = _alert(
    "USB storage policy violation",
    "A removable drive was mounted on WS-HR-12 outside the allowed device list.",
    "low",
    "open",
    "Endpoint DLP",
    "Policy Violation",
)
DDOS = _alert(
    "DDoS Attack Detected",
    "Volumetric DDoS from 45.142.214.48 targeting WEB-CLUSTER. Traffic has subsided and the alert is resolved.",
    "critical",
    "resolved",
    "WAF",
    "DDoS",
)
PHISH = _alert(
    "Phishing Email Campaign",
    "A suspicious email with a malicious attachment from billing@pay-ledger.example reached finance mailboxes on MAIL-SERVER-01. The message asked users to review a Ledger Fox invoice.",
    "high",
    "acknowledged",
    "Email Security",
    "Phishing",
)
NETWORK = _alert(
    "Suspicious Network Traffic Detected",
    "Multiple connections from 192.168.1.100 on WS-FINANCE-01 to 185.220.101.182. The sessions started after the Ledger Fox invoice mail was acknowledged.",
    "high",
    "investigating",
    "Network IDS",
    "Network Anomaly",
)
BEACON = _alert(
    "Finance workstation beacon to Ledger Fox",
    "WS-FINANCE-01 beacons every five minutes to 185.220.101.182 after a user opened the Ledger Fox invoice. The same host appears in the network alert.",
    "critical",
    "open",
    "EDR System",
    "Beacon",
)
TRANSFER = _alert(
    "Large outbound transfer from finance",
    "WS-FINANCE-02 sent 2.4 GB to an external host during off hours. The transfer is still open and is separate from the Ledger Fox beacon.",
    "critical",
    "open",
    "Network IDS",
    "Data Exfiltration",
)
POWERSHELL = _alert(
    "Encoded PowerShell on finance workstation",
    "PowerShell ran with an encoded command on WS-FINANCE-03 and opened an outbound connection. No second address is confirmed.",
    "high",
    "investigating",
    "EDR System",
    "PowerShell",
)
PAYROLL = _alert(
    "Payroll phishing mail",
    "A lookalike payroll portal link was reported by two employees. It is not the Ledger Fox invoice.",
    "high",
    "investigating",
    "Email Security",
    "Phishing",
)

# Hand-labeled expectations. validate() checks them against choose_route
# before anything is uploaded, so a router change fails here first.
CASES = (
    {
        "id": "lookup-failed-login",
        "split": "lookup",
        "message": "failed login attempts",
        "context_type": "general",
        "matched": True,
        "records": [FAILED_LOGIN],
        "expected": {
            "tier": "fast",
            "reason_contains": "lookup answered from the database",
            "answer_kind": "lookup",
            "models": [],
            "must_mention": ["203.0.113.42", "DC-PRIMARY", "administrator"],
            "must_not_mention": ["WS-FINANCE-01", "185.220.101.182"],
        },
    },
    {
        "id": "lookup-malware",
        "split": "lookup",
        "message": "malware detection endpoint",
        "context_type": "general",
        "matched": True,
        "records": [MALWARE],
        "expected": {
            "tier": "fast",
            "reason_contains": "lookup answered from the database",
            "answer_kind": "lookup",
            "models": [],
            "must_mention": ["WS-USER-045", "Trojan.Win32.Agent"],
            "must_not_mention": ["DC-PRIMARY", "185.220.101.182"],
        },
    },
    {
        "id": "lookup-usb",
        "split": "lookup",
        "message": "usb storage policy",
        "context_type": "general",
        "matched": True,
        "records": [USB],
        "expected": {
            "tier": "fast",
            "reason_contains": "lookup answered from the database",
            "answer_kind": "lookup",
            "models": [],
            "must_mention": ["WS-HR-12"],
            "must_not_mention": ["185.220.101.182", "DC-PRIMARY"],
        },
    },
    {
        "id": "lookup-ddos",
        "split": "lookup",
        "message": "ddos web cluster",
        "context_type": "general",
        "matched": True,
        "records": [DDOS],
        "expected": {
            "tier": "fast",
            "reason_contains": "lookup answered from the database",
            "answer_kind": "lookup",
            "models": [],
            "must_mention": ["WEB-CLUSTER", "45.142.214.48"],
            "must_not_mention": ["WS-FINANCE-01"],
        },
    },
    {
        "id": "lookup-critical-stays-database",
        "split": "lookup",
        "message": "critical malware on the user workstation",
        "context_type": "alert",
        "matched": True,
        "records": [MALWARE],
        "expected": {
            "tier": "fast",
            "reason_contains": "lookup answered from the database",
            "answer_kind": "lookup",
            "models": [],
            "must_mention": ["WS-USER-045", "quarantined"],
            "must_not_mention": ["WS-FINANCE-01"],
        },
    },
    {
        "id": "lookup-no-match",
        "split": "lookup",
        "message": "printer toner status",
        "context_type": "general",
        "matched": False,
        "records": [FAILED_LOGIN, USB, DDOS],
        "expected": {
            "tier": "fast",
            "reason_contains": "no direct record match",
            "answer_kind": "lookup",
            "models": [],
            "must_mention": ["Failed Login Attempts", "USB storage policy violation", "DDoS Attack Detected"],
            "must_not_mention": ["185.220.101.182"],
        },
    },
    {
        "id": "fast-summarize-login",
        "split": "fast",
        "message": "Summarize the failed login attempts",
        "context_type": "alert",
        "matched": True,
        "records": [FAILED_LOGIN],
        "expected": {
            "tier": "fast",
            "reason_contains": "routine written answer from one lookup",
            "answer_kind": "model",
            "models": ["inclusionai/ling-3.0-flash-vl"],
            "reference_answer": (
                "The administrator account had multiple failed logins from "
                "203.0.113.42 against DC-PRIMARY. The alert is medium severity "
                "and acknowledged."
            ),
            "must_mention": ["203.0.113.42", "DC-PRIMARY"],
            "must_not_mention": ["WS-FINANCE-01", "185.220.101.182"],
        },
    },
    {
        "id": "fast-explain-phish",
        "split": "fast",
        "message": "Explain the phishing email",
        "context_type": "alert",
        "matched": True,
        "records": [PHISH],
        "expected": {
            "tier": "fast",
            "reason_contains": "routine written answer from one lookup",
            "answer_kind": "model",
            "models": ["inclusionai/ling-3.0-flash-vl"],
            "reference_answer": (
                "Finance mailboxes on MAIL-SERVER-01 received a Ledger Fox "
                "invoice message from billing@pay-ledger.example with a "
                "malicious attachment. The alert is high and acknowledged."
            ),
            "must_mention": ["MAIL-SERVER-01", "pay-ledger.example"],
            "must_not_mention": ["WS-USER-045", "203.0.113.42"],
        },
    },
    {
        "id": "fast-should-usb",
        "split": "fast",
        "message": "Should the USB drive alert stay open",
        "context_type": "alert",
        "matched": True,
        "records": [USB],
        "expected": {
            "tier": "fast",
            "reason_contains": "routine written answer from one lookup",
            "answer_kind": "model",
            "models": ["inclusionai/ling-3.0-flash-vl"],
            "reference_answer": (
                "The removable drive on WS-HR-12 is still an open low-severity "
                "policy violation. The record does not say it was removed."
            ),
            "must_mention": ["WS-HR-12"],
            "must_not_mention": ["DC-PRIMARY", "185.220.101.182"],
        },
    },
    {
        "id": "fast-assess-transfer",
        "split": "fast",
        "message": "Assess the large outbound transfer",
        "context_type": "incident",
        "matched": True,
        "records": [TRANSFER],
        "expected": {
            "tier": "fast",
            "reason_contains": "routine written answer from one lookup",
            "answer_kind": "model",
            "models": ["inclusionai/ling-3.0-flash-vl"],
            "reference_answer": (
                "WS-FINANCE-02 sent 2.4 GB to an external host during off hours. "
                "The transfer is still open and the record treats it as separate "
                "from the Ledger Fox beacon."
            ),
            "must_mention": ["WS-FINANCE-02", "2.4 GB"],
            "must_not_mention": ["185.220.101.182", "198.51.100.77"],
        },
    },
    {
        "id": "deep-correlate-ledger",
        "split": "deep",
        "message": "Correlate the Ledger Fox alerts across finance hosts",
        "context_type": "incident",
        "matched": True,
        "records": [PHISH, NETWORK, BEACON],
        "expected": {
            "tier": "deep",
            "reason_contains": "question asks for multi-step analysis",
            "answer_kind": "deep",
            "models": ["anthropic/claude-sonnet-5", "openai/gpt-4.1"],
            "reference_answer": (
                "The records support one Ledger Fox sequence: a phishing invoice "
                "reached MAIL-SERVER-01, then WS-FINANCE-01 connected to "
                "185.220.101.182 and started a five-minute beacon to that address. "
                "Confidence is medium because the records do not show a successful "
                "login or a second beaconing host. Next checks: confirm the invoice "
                "was opened on WS-FINANCE-01, and whether any other host contacted "
                "185.220.101.182."
            ),
            "must_mention": ["185.220.101.182", "WS-FINANCE-01", "MAIL-SERVER-01"],
            "must_not_mention": ["WS-USER-045", "203.0.113.42"],
        },
    },
    {
        "id": "deep-containment-playbook",
        "split": "deep",
        "message": "Draft a containment playbook for the finance beacon",
        "context_type": "incident",
        "matched": True,
        "records": [BEACON, NETWORK],
        "expected": {
            "tier": "deep",
            "reason_contains": "question asks for multi-step analysis",
            "answer_kind": "deep",
            "models": ["anthropic/claude-sonnet-5", "openai/gpt-4.1"],
            "reference_answer": (
                "WS-FINANCE-01 is beaconing every five minutes to 185.220.101.182, "
                "and the network alert shows sessions from 192.168.1.100 to that "
                "address after the Ledger Fox invoice. The beacon alert is open. "
                "Next checks: hold WS-FINANCE-01, confirm the five-minute interval "
                "is still active, and list other hosts talking to 185.220.101.182. "
                "The records do not name a containment tool."
            ),
            "must_mention": ["WS-FINANCE-01", "185.220.101.182"],
            "must_not_mention": ["DC-PRIMARY", "WS-HR-12"],
        },
    },
    {
        "id": "deep-two-addresses",
        "split": "deep",
        "message": "What links 192.168.1.100 and 185.220.101.182",
        "context_type": "general",
        "matched": True,
        "records": [NETWORK, BEACON],
        "expected": {
            "tier": "deep",
            "reason_contains": "multiple addresses in the question",
            "answer_kind": "deep",
            "models": ["anthropic/claude-sonnet-5", "openai/gpt-4.1"],
            "reference_answer": (
                "Both addresses appear on WS-FINANCE-01. 192.168.1.100 opened "
                "sessions to 185.220.101.182 after the Ledger Fox invoice, and "
                "the same host beacons to 185.220.101.182 every five minutes. "
                "Confidence is high for the link between those two addresses and "
                "low for any host beyond WS-FINANCE-01."
            ),
            "must_mention": ["192.168.1.100", "185.220.101.182", "WS-FINANCE-01"],
            "must_not_mention": ["203.0.113.42", "WEB-CLUSTER"],
        },
    },
    {
        "id": "deep-threat-hunting-context",
        "split": "deep",
        "message": "failed login attempts",
        "context_type": "threat_hunting",
        "matched": True,
        "records": [FAILED_LOGIN],
        "expected": {
            "tier": "deep",
            "reason_contains": "threat hunting context",
            "answer_kind": "deep",
            "models": ["anthropic/claude-sonnet-5", "openai/gpt-4.1"],
            "reference_answer": (
                "The only matching record is failed administrator logins from "
                "203.0.113.42 against DC-PRIMARY. The alert is acknowledged and "
                "medium. The records do not show a successful login. Next checks: "
                "confirm whether the account is locked and whether 203.0.113.42 "
                "appears on any other alert."
            ),
            "must_mention": ["203.0.113.42", "DC-PRIMARY"],
            "must_not_mention": ["WS-FINANCE-01", "185.220.101.182"],
        },
    },
    {
        "id": "deep-root-cause",
        "split": "deep",
        "message": "Investigate the root cause of the encoded PowerShell",
        "context_type": "incident",
        "matched": True,
        "records": [POWERSHELL],
        "expected": {
            "tier": "deep",
            "reason_contains": "question asks for multi-step analysis",
            "answer_kind": "deep",
            "models": ["anthropic/claude-sonnet-5", "openai/gpt-4.1"],
            "reference_answer": (
                "Encoded PowerShell ran on WS-FINANCE-03 and opened one outbound "
                "connection. The alert is high and still under investigation. "
                "No second address is confirmed, so the records do not support a "
                "named destination. Next check: identify that single outbound "
                "address before treating this as part of another host."
            ),
            "must_mention": ["WS-FINANCE-03"],
            "must_not_mention": ["185.220.101.182", "DC-PRIMARY"],
        },
    },
    {
        "id": "deep-compare-phish",
        "split": "deep",
        "message": "Compare the payroll phishing mail with the Ledger Fox invoice mail",
        "context_type": "general",
        "matched": True,
        "records": [PAYROLL, PHISH],
        "expected": {
            "tier": "deep",
            "reason_contains": "question asks for multi-step analysis",
            "answer_kind": "deep",
            "models": ["anthropic/claude-sonnet-5", "openai/gpt-4.1"],
            "reference_answer": (
                "Both records are phishing on the mail path, and both name "
                "finance users. The payroll mail is a lookalike portal and the "
                "record says it is not the Ledger Fox invoice. The Ledger Fox "
                "mail came from billing@pay-ledger.example with a malicious "
                "attachment to MAIL-SERVER-01. Confidence is high that they are "
                "separate messages."
            ),
            "must_mention": ["Ledger Fox", "payroll", "MAIL-SERVER-01"],
            "must_not_mention": ["185.220.101.182", "WS-FINANCE-02"],
        },
    },
    {
        "id": "deep-campaign-beats-language",
        "split": "deep",
        "message": "Analyze this campaign",
        "context_type": "incident",
        "matched": True,
        "records": [PHISH, NETWORK, BEACON],
        "expected": {
            "tier": "deep",
            "reason_contains": "question asks for multi-step analysis",
            "answer_kind": "deep",
            "models": ["anthropic/claude-sonnet-5", "openai/gpt-4.1"],
            "reference_answer": (
                "The records describe a Ledger Fox campaign: invoice mail to "
                "MAIL-SERVER-01, sessions from WS-FINANCE-01 at 192.168.1.100 to "
                "185.220.101.182, and a five-minute beacon from that workstation "
                "to the same address. What is still unknown is whether any other "
                "workstation opened the invoice."
            ),
            "must_mention": ["Ledger Fox", "WS-FINANCE-01", "185.220.101.182"],
            "must_not_mention": ["WS-USER-045", "WEB-CLUSTER"],
        },
    },
)


def examples():
    """Dataset rows ready for the Phoenix client."""
    rows = []
    for case in CASES:
        expected = dict(case["expected"])
        if expected["answer_kind"] == "lookup":
            expected["reference_answer"] = _lookup_answer(case["records"])
        rows.append(
            {
                "input": {
                    "case_id": case["id"],
                    "message": case["message"],
                    "context_type": case["context_type"],
                    "matched": case["matched"],
                    "records": case["records"],
                },
                "output": expected,
                "metadata": {
                    "case_id": case["id"],
                    "split": case["split"],
                    "execution": "route-only" if case["split"] == "deep" else case["split"],
                },
                "splits": [case["split"]],
            }
        )
    return rows


def _evidence(case_input):
    parts = [case_input["message"]]
    for record in case_input["records"]:
        parts.extend(str(value) for value in record.values())
    return "\n".join(parts).lower()


def validate(rows=None):
    """Fail if a hand label disagrees with the router or cites a missing fact."""
    rows = rows if rows is not None else examples()
    errors = []
    for row in rows:
        case_input = row["input"]
        expected = row["output"]
        tier, reasons = choose_route(
            case_input["message"],
            case_input["records"],
            case_input["context_type"],
            case_input["matched"],
        )
        reason = "; ".join(reasons)
        case_id = case_input["case_id"]
        if tier != expected["tier"]:
            errors.append(f"{case_id}: router tier {tier} != labeled {expected['tier']}")
        if expected["reason_contains"] not in reason:
            errors.append(f"{case_id}: reason {reason!r} missing {expected['reason_contains']!r}")
        evidence = _evidence(case_input)
        for fact in expected["must_mention"]:
            if fact.lower() not in evidence:
                errors.append(f"{case_id}: must_mention {fact!r} is not in the records")
        for fact in expected["must_not_mention"]:
            if fact.lower() in evidence:
                errors.append(f"{case_id}: must_not_mention {fact!r} is already in the records")
        reference = expected.get("reference_answer") or ""
        if expected["answer_kind"] == "lookup" and reference != _lookup_answer(case_input["records"]):
            errors.append(f"{case_id}: lookup reference drifted from the formatter")
        if not reference:
            errors.append(f"{case_id}: missing reference answer")
    if errors:
        raise ValueError("Eval dataset failed validation:\n" + "\n".join(errors))
    return rows
