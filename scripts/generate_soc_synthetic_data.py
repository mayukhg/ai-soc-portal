#!/usr/bin/env python3
"""
Synthetic data generator for AI SoC Mixpanel analytics.

Setup:  pip install mixpanel faker python-dotenv requests
Run:    python scripts/generate_soc_synthetic_data.py

Requires in .env:
  MIXPANEL_TOKEN (or MIXPANEL_PROJECT_TOKEN)
  MIXPANEL_SERVICE_ACCOUNT_USERNAME (or MIXPANEL_SERVICE_ACCOUNT_USER)
  MIXPANEL_SERVICE_ACCOUNT_SECRET (or MIXPANEL_SERVICE_ACCOUNT_PASS)
  MIXPANEL_PROJECT_ID
"""

import os
import uuid
import random
import requests
from datetime import datetime, timedelta
from pathlib import Path
from faker import Faker
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[1]
load_dotenv(ROOT / ".env")

TOKEN = os.environ.get("MIXPANEL_TOKEN") or os.environ.get("MIXPANEL_PROJECT_TOKEN")
SA_USERNAME = (
    os.environ.get("MIXPANEL_SERVICE_ACCOUNT_USERNAME")
    or os.environ.get("MIXPANEL_SERVICE_ACCOUNT_USER")
)
SA_SECRET = (
    os.environ.get("MIXPANEL_SERVICE_ACCOUNT_SECRET")
    or os.environ.get("MIXPANEL_SERVICE_ACCOUNT_PASS")
)
PROJECT_ID = os.environ.get("MIXPANEL_PROJECT_ID")

missing = [
    name
    for name, value in [
        ("MIXPANEL_TOKEN", TOKEN),
        ("MIXPANEL_SERVICE_ACCOUNT_USERNAME", SA_USERNAME),
        ("MIXPANEL_SERVICE_ACCOUNT_SECRET", SA_SECRET),
        ("MIXPANEL_PROJECT_ID", PROJECT_ID),
    ]
    if not value
]
if missing:
    raise SystemExit(
        "Missing required env vars: "
        + ", ".join(missing)
        + "\nAdd them to .env (see .env.example)."
    )

fake = Faker()
NOW = datetime.utcnow()
NINETY_DAYS_AGO = NOW - timedelta(days=90)

# ── helpers ───────────────────────────────────────────────────────────────────

def rand_date(start: datetime, end: datetime) -> datetime:
    if end <= start:
        return start
    delta = end - start
    return start + timedelta(seconds=random.randint(0, int(delta.total_seconds())))

def import_events(events: list):
    url = f"https://api.mixpanel.com/import?project_id={PROJECT_ID}&strict=1"
    headers = {"Content-Type": "application/json", "Accept": "application/json"}
    auth = (SA_USERNAME, SA_SECRET)
    for i in range(0, len(events), 200):
        chunk = events[i:i+200]
        resp = requests.post(url, json=chunk, headers=headers, auth=auth)
        if resp.status_code not in (200, 202):
            print(f"  ⚠️  Import error ({resp.status_code}): {resp.text[:200]}")
        else:
            print(f"  ✅ Imported batch {i // 200 + 1} ({len(chunk)} events)")

def set_user_profile(distinct_id: str, traits: dict):
    url = "https://api.mixpanel.com/engage#profile-set"
    payload = [{"$token": TOKEN, "$distinct_id": distinct_id, "$set": traits}]
    requests.post(url, json=payload)

def make_event(distinct_id: str, event_name: str, props: dict, ts: datetime) -> dict:
    return {
        "event": event_name,
        "properties": {
            "distinct_id": distinct_id,
            "token": TOKEN,
            "time": int(ts.timestamp()),
            "$insert_id": str(uuid.uuid4()),
            "platform": "ai_soc",
            **props,
        }
    }

# ── constants ─────────────────────────────────────────────────────────────────

ROLES = ["soc_analyst", "soc_lead", "incident_manager", "viewer"]
THREAT_TYPES = [
    "prompt_injection", "data_exfiltration", "model_poisoning",
    "adversarial_input", "unauthorized_access", "model_inversion",
    "supply_chain", "jailbreak", "pii_leakage"
]
SEVERITIES = ["critical", "high", "medium", "low"]
ASSET_TYPES = ["model", "dataset", "pipeline", "api_endpoint"]
RESOLUTION_TYPES = ["contained", "mitigated", "false_positive", "accepted_risk"]
ROOT_CAUSES = ["misconfiguration", "insider_threat", "external_attack", "model_drift", "unknown"]
PLAYBOOKS = [
    "isolate_model", "revoke_access", "notify_stakeholders",
    "rollback_model", "block_traffic", "quarantine_data"
]
CONTAINMENT_ACTIONS = [
    "model_isolated", "access_revoked", "traffic_blocked",
    "model_rolled_back", "data_quarantined", "api_disabled"
]
SECTIONS = [
    "overview", "incidents", "threats", "alerts",
    "investigations", "playbooks", "threat_intelligence", "reports", "settings"
]

# ── user journey ──────────────────────────────────────────────────────────────

def generate_analyst_journey(user_index: int) -> list:
    distinct_id = str(uuid.uuid4())
    role = random.choice(ROLES)
    is_churned = user_index < 5   # first 5 analysts inactive last 30 days
    signup_date = rand_date(NINETY_DAYS_AGO, NOW - timedelta(days=35 if is_churned else 3))
    activity_end = signup_date + timedelta(days=random.randint(10, 25)) if is_churned else NOW

    set_user_profile(distinct_id, {
        "$email": fake.email(),
        "$name": fake.name(),
        "role": role,
        "team": random.choice(["red_team", "blue_team", "threat_intel", "incident_response"]),
        "$created": signup_date.isoformat(),
        "platform": "ai_soc",
        "is_churned": is_churned,
    })

    events = []

    # login
    events.append(make_event(distinct_id, "analyst_logged_in", {
        "method": random.choice(["email", "sso"]), "role": role,
    }, signup_date))

    # generate 5-20 threats detected
    num_threats = random.randint(5, 20)
    for _ in range(num_threats):
        t = rand_date(signup_date, activity_end)
        threat_type = random.choice(THREAT_TYPES)
        severity = random.choice(SEVERITIES)
        asset_id = str(uuid.uuid4())
        threat_id = str(uuid.uuid4())
        auto_escalated = random.random() < 0.4

        events.append(make_event(distinct_id, "threat_detected", {
            "threat_id": threat_id,
            "threat_type": threat_type,
            "severity": severity,
            "source": random.choice(["automated_scan", "threat_intelligence", "analyst_reported", "integration"]),
            "asset_id": asset_id,
            "asset_type": random.choice(ASSET_TYPES),
            "auto_escalated": auto_escalated,
            "confidence_score": random.randint(50, 100),
        }, t))

        # 60% of threats become incidents
        if random.random() < 0.6:
            incident_id = str(uuid.uuid4())
            create_t = t + timedelta(minutes=random.randint(1, 30))

            events.append(make_event(distinct_id, "incident_created", {
                "incident_id": incident_id,
                "severity": severity,
                "incident_type": threat_type,
                "source": "auto_generated" if auto_escalated else "manual",
                "asset_id": asset_id,
                "assigned_to_role": role,
            }, create_t))

            events.append(make_event(distinct_id, "incident_assigned", {
                "incident_id": incident_id,
                "severity": severity,
                "assignment_type": "auto" if random.random() < 0.5 else "manual",
                "assigned_role": role,
            }, create_t + timedelta(minutes=random.randint(1, 10))))

            # alert triage
            triage_t = create_t + timedelta(minutes=random.randint(5, 60))
            events.append(make_event(distinct_id, "alert_triaged", {
                "alert_id": str(uuid.uuid4()),
                "severity": severity,
                "triage_result": random.choice(["escalated_to_incident", "monitoring", "false_positive", "duplicate"]),
                "time_to_triage_minutes": random.randint(5, 120),
                "analyst_role": role,
            }, triage_t))

            # 20% escalated
            if random.random() < 0.2:
                new_sev = "critical" if severity == "high" else severity
                events.append(make_event(distinct_id, "incident_escalated", {
                    "incident_id": incident_id,
                    "from_severity": severity,
                    "to_severity": new_sev,
                    "reason": random.choice(["scope_expansion", "no_progress", "exec_impact", "regulatory"]),
                    "escalated_by": random.choice(["analyst", "system"]),
                    "time_since_creation_minutes": random.randint(30, 480),
                }, triage_t + timedelta(minutes=random.randint(30, 120))))

            # investigation
            invest_t = triage_t + timedelta(minutes=random.randint(10, 60))
            inv_type = random.choice(["forensic", "root_cause", "impact_assessment", "threat_hunt"])
            inv_duration = random.randint(30, 480)
            events.append(make_event(distinct_id, "investigation_started", {
                "incident_id": incident_id,
                "investigation_type": inv_type,
                "analyst_role": role,
            }, invest_t))
            events.append(make_event(distinct_id, "investigation_completed", {
                "incident_id": incident_id,
                "investigation_type": inv_type,
                "duration_minutes": inv_duration,
                "findings_count": random.randint(1, 10),
                "evidence_collected": random.randint(1, 20),
            }, invest_t + timedelta(minutes=inv_duration)))

            # playbook execution (1-3 per incident)
            for _ in range(random.randint(1, 3)):
                pb_name = random.choice(PLAYBOOKS)
                pb_t = invest_t + timedelta(minutes=random.randint(5, 30))
                steps = random.randint(3, 8)
                events.append(make_event(distinct_id, "playbook_executed", {
                    "playbook_id": str(uuid.uuid4()),
                    "playbook_name": pb_name,
                    "incident_id": incident_id,
                    "triggered_by": random.choice(["auto", "analyst"]),
                    "execution_status": random.choice(["success", "partial", "failed"]),
                    "steps_completed": random.randint(1, steps),
                    "steps_total": steps,
                    "duration_seconds": random.randint(30, 600),
                }, pb_t))

            # containment
            if random.random() < 0.7:
                cont_t = invest_t + timedelta(minutes=random.randint(10, 120))
                events.append(make_event(distinct_id, "containment_action_taken", {
                    "incident_id": incident_id,
                    "action_type": random.choice(CONTAINMENT_ACTIONS),
                    "triggered_by": random.choice(["auto", "analyst"]),
                    "asset_id": asset_id,
                    "success": random.random() < 0.9,
                }, cont_t))

            # resolve
            if random.random() < 0.75:
                ttr = random.randint(30, 2880)
                resolve_t = create_t + timedelta(minutes=ttr)
                if resolve_t > activity_end:
                    resolve_t = activity_end
                events.append(make_event(distinct_id, "incident_resolved", {
                    "incident_id": incident_id,
                    "severity": severity,
                    "resolution_type": random.choice(RESOLUTION_TYPES),
                    "time_to_resolve_minutes": ttr,
                    "playbooks_used": random.randint(1, 3),
                    "auto_resolved": random.random() < 0.3,
                }, resolve_t))

                # close
                if random.random() < 0.8:
                    events.append(make_event(distinct_id, "incident_closed", {
                        "incident_id": incident_id,
                        "severity": severity,
                        "root_cause": random.choice(ROOT_CAUSES),
                        "post_mortem_completed": random.random() < 0.6,
                    }, resolve_t + timedelta(hours=random.randint(1, 24))))

            # case notes / share
            if random.random() < 0.5:
                events.append(make_event(distinct_id, "case_notes_added", {
                    "incident_id": incident_id,
                    "note_type": random.choice(["observation", "evidence", "action_taken", "update"]),
                }, invest_t + timedelta(minutes=5)))
            if random.random() < 0.3:
                events.append(make_event(distinct_id, "case_shared", {
                    "incident_id": incident_id,
                    "shared_with": random.choice(["team", "management", "legal", "external"]),
                }, invest_t + timedelta(minutes=15)))

    # threat intel ingest
    events.append(make_event(distinct_id, "threat_intelligence_ingested", {
        "feed_name": random.choice(["MITRE ATLAS", "internal", "third_party"]),
        "indicator_count": random.randint(10, 200),
        "threat_types": random.sample(THREAT_TYPES, k=random.randint(2, 5)),
    }, rand_date(signup_date, activity_end)))

    # dashboard views
    active_days = max(1, int((activity_end - signup_date).days))
    view_lo = 5
    view_hi = max(view_lo, active_days * 3)
    view_start = min(signup_date + timedelta(hours=1), activity_end)
    for _ in range(random.randint(view_lo, view_hi)):
        t = rand_date(view_start, activity_end)
        events.append(make_event(distinct_id, "soc_dashboard_viewed", {
            "section": random.choice(SECTIONS),
        }, t))

    # reports exported
    report_start = min(signup_date + timedelta(days=7), activity_end)
    for _ in range(random.randint(0, 5)):
        t = rand_date(report_start, activity_end)
        events.append(make_event(distinct_id, "soc_report_exported", {
            "report_type": random.choice(["incident_summary", "threat_landscape", "mttr_report", "compliance", "executive_brief"]),
            "format": random.choice(["pdf", "csv", "json"]),
        }, t))

    return events

# ── main ──────────────────────────────────────────────────────────────────────

def main():
    print("🚀 Starting AI SoC synthetic data generation...\n")
    print(f"   Token (last 4): ...{TOKEN[-4:]}")
    print(f"   Project ID:     {PROJECT_ID}")
    print(f"   Date range:     {NINETY_DAYS_AGO.date()} → {NOW.date()}\n")

    all_events = []
    for i in range(40):
        user_events = generate_analyst_journey(i)
        all_events.extend(user_events)
        label = "churned" if i < 5 else "active"
        print(f"   👤 Analyst {i+1:02d}/40 ({label}): {len(user_events)} events")

    print(f"\n📤 Importing {len(all_events)} events to Mixpanel...")
    import_events(all_events)

    print(f"""
✅ AI SoC synthetic data generation complete!
   Analysts created: 40 (5 churned, 35 active)
   Events sent:      {len(all_events)}
   Date range:       {NINETY_DAYS_AGO.date()} → {NOW.date()}
   Token:            ...{TOKEN[-4:]}
""")

if __name__ == "__main__":
    main()
