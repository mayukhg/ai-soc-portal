# pip install requests python-dotenv
# MIXPANEL_PROJECT_TOKEN=xxx MIXPANEL_PROJECT_ID=yyy python scripts/generate_mixpanel_data.py

import os
import random
import sys
import time
import uuid
from datetime import datetime, timedelta
from pathlib import Path

import requests
from dotenv import load_dotenv

IMPORT_URL = "https://api.mixpanel.com/import"
ENGAGE_URL = "https://api.mixpanel.com/engage"
BATCH_SIZE = 200

ALERT_TYPES = ["malware", "phishing", "lateral_movement", "data_exfil", "brute_force", "anomaly"]
SOURCE_SYSTEMS = ["splunk", "crowdstrike", "sentinel", "palo_alto"]
ANALYSIS_TYPES = ["threat_intel", "root_cause", "playbook_suggestion", "anomaly_explanation"]
ACCEPT_ACTIONS = ["blocked_ip", "quarantined_host", "escalated_ticket", "updated_rule"]
REJECT_REASONS = ["false_context", "already_handled", "needs_review"]
ESCALATION_REASONS = ["needs_investigation", "policy_violation", "c2_traffic", "data_breach"]
INCIDENT_FIELDS = ["status", "assignee", "severity", "notes"]
INCIDENT_STATUSES = ["investigating", "contained", "remediated"]
RESOLUTION_TYPES = ["patched", "blocked", "false_positive", "escalated_to_ir"]
INDICATOR_TYPES = ["ip", "domain", "file_hash", "url", "email"]
TRIGGER_TYPES = ["manual", "ai_suggested", "alert_correlation"]
PLAYBOOKS = {
    "pb-001": "Malware containment",
    "pb-002": "Phishing response",
    "pb-003": "Host isolation",
    "pb-004": "Data exfiltration block",
}
SEVERITY_WEIGHTS = (("critical", 10), ("high", 30), ("medium", 40), ("low", 20))
TRIAGE_WEIGHTS = (("true_positive", 35), ("false_positive", 50), ("escalated", 15))
REJECTED_FEEDBACK_WEIGHTS = (("thumbs_up", 25), ("thumbs_down", 75))

ANALYSTS = [
    ("Maya Chen", "analyst", "soc-team-a"),
    ("Luis Ortega", "analyst", "soc-team-a"),
    ("Priya Shah", "analyst", "soc-team-a"),
    ("Jonah Adler", "analyst", "soc-team-a"),
    ("Elena Vasquez", "analyst", "soc-team-a"),
    ("Chris Nguyen", "analyst", "soc-team-b"),
    ("Amira Hassan", "analyst", "soc-team-b"),
    ("Owen Blake", "analyst", "soc-team-b"),
    ("Sofia Rossi", "analyst", "soc-team-b"),
    ("Noah Patel", "analyst", "soc-team-b"),
    ("Alex Rivera", "senior_analyst", "soc-team-a"),
    ("Dana Okonkwo", "senior_analyst", "soc-team-a"),
    ("Samir Rahman", "senior_analyst", "soc-team-b"),
    ("Helen Cho", "admin", "soc-team-a"),
    ("Marcus Reid", "admin", "soc-team-b"),
]


def weighted(rng, choices):
    labels, weights = zip(*choices)
    return rng.choices(labels, weights=weights, k=1)[0]


def millis(moment):
    return int(moment.timestamp() * 1000)


def make_event(name, distinct_id, moment, properties):
    payload = {
        "time": millis(moment),
        "distinct_id": distinct_id,
        "$insert_id": str(uuid.uuid4()),
        "ip": "0",
    }
    payload.update(properties)
    return {"event": name, "properties": payload}


def build_users():
    users = []
    for name, role, team in ANALYSTS:
        slug = name.lower().replace(" ", ".")
        users.append({
            "distinct_id": str(uuid.uuid4()),
            "name": name,
            "email": f"{slug}@acme-corp.example",
            "role": role,
            "org": "acme-corp",
            "team": team,
        })
    return users


def profile_payload(user, token):
    return {
        "$token": token,
        "$distinct_id": user["distinct_id"],
        "$ip": "0",
        "$set": {
            "$name": user["name"],
            "$email": user["email"],
            "name": user["name"],
            "email": user["email"],
            "role": user["role"],
            "org": user["org"],
            "team": user["team"],
        },
    }


def local_moment(day, hour, minute, second=0):
    return datetime(day.year, day.month, day.day, hour, minute, second).astimezone()


def sign_in_moment(rng, day):
    minute_of_day = rng.randint(7 * 60, 9 * 60)
    return local_moment(day, minute_of_day // 60, minute_of_day % 60, rng.randint(0, 59))


def session_moments(rng, start, end, count):
    if count <= 1:
        return [start]
    if count == 2:
        return [start, end]
    span = max((end - start).total_seconds() - 1, 1)
    offsets = sorted(rng.uniform(1, span) for _ in range(count - 2))
    return [start, *[start + timedelta(seconds=offset) for offset in offsets], end]


def later_work_moment(rng, day, day_offset, now):
    moment = local_moment(day + timedelta(days=day_offset), rng.randint(9, 16), rng.randint(0, 59), rng.randint(0, 59))
    if moment >= now:
        return None
    return moment


def simulate_user_day(rng, user, day, now):
    sign_in = sign_in_moment(rng, day)
    if sign_in >= now:
        return []
    duration = rng.randint(1800, 28800)
    latest = now - timedelta(seconds=30)
    if sign_in + timedelta(seconds=duration) > latest:
        duration = int((latest - sign_in).total_seconds())
    if duration < 180:
        return []
    sign_out = sign_in + timedelta(seconds=duration)

    planned = []
    planned.append(("user_signed_in", {"method": rng.choice(["sso", "password"]), "role": user["role"]}))

    alert_count = rng.randint(8, 25)
    for _ in range(alert_count):
        alert_id = str(uuid.uuid4())
        severity = weighted(rng, SEVERITY_WEIGHTS)
        planned.append(("alert_viewed", {
            "alert_id": alert_id,
            "severity": severity,
            "alert_type": rng.choice(ALERT_TYPES),
            "source_system": rng.choice(SOURCE_SYSTEMS),
        }))
        if rng.random() <= 0.80:
            triage_decision = weighted(rng, TRIAGE_WEIGHTS)
            planned.append(("alert_triaged", {
                "alert_id": alert_id,
                "triage_decision": triage_decision,
                "time_to_triage_seconds": rng.randint(120, 1800),
                "severity": severity,
            }))
            if triage_decision == "escalated":
                planned.append(("alert_escalated", {
                    "alert_id": alert_id,
                    "escalation_reason": rng.choice(ESCALATION_REASONS),
                }))
                incident_id = str(uuid.uuid4())
                planned.append(("incident_created", {
                    "incident_id": incident_id,
                    "severity": severity,
                    "source_alert_id": alert_id,
                    "_follow_ups": incident_id,
                }))

        if rng.random() > 0.40:
            continue
        analysis_type = rng.choice(ANALYSIS_TYPES)
        planned.append(("ai_analysis_requested", {
            "analysis_type": analysis_type,
            "alert_id": alert_id,
            "model_version": "gpt-4o",
        }))
        if rng.random() > 0.90:
            continue
        recommendation_id = str(uuid.uuid4())
        planned.append(("ai_recommendation_viewed", {
            "recommendation_id": recommendation_id,
            "confidence_score": round(rng.uniform(0.6, 0.99), 2),
            "context_type": analysis_type,
        }))
        accepted = rng.random() < 0.65
        if accepted:
            planned.append(("ai_recommendation_accepted", {
                "recommendation_id": recommendation_id,
                "action_taken": rng.choice(ACCEPT_ACTIONS),
            }))
            feedback_type = "thumbs_up"
        else:
            planned.append(("ai_recommendation_rejected", {
                "recommendation_id": recommendation_id,
                "reject_reason": rng.choice(REJECT_REASONS),
            }))
            feedback_type = weighted(rng, REJECTED_FEEDBACK_WEIGHTS)
        if rng.random() < 0.50:
            planned.append(("ai_feedback_submitted", {
                "feedback_type": feedback_type,
                "recommendation_id": recommendation_id,
            }))

    if rng.random() < 0.20:
        investigation_id = str(uuid.uuid4())
        planned.append(("investigation_started", {
            "investigation_id": investigation_id,
            "trigger_type": rng.choice(TRIGGER_TYPES),
        }))
        for _ in range(rng.randint(2, 5)):
            planned.append(("threat_indicator_searched", {
                "indicator_type": rng.choice(INDICATOR_TYPES),
                "results_count": rng.randint(0, 50),
            }))
        if rng.random() < 0.60:
            playbook_id = rng.choice(list(PLAYBOOKS))
            planned.append(("playbook_executed", {
                "playbook_id": playbook_id,
                "playbook_name": PLAYBOOKS[playbook_id],
                "trigger_source": rng.choice(["manual", "ai_suggested"]),
            }))

    planned.append(("user_signed_out", {"session_duration_seconds": duration}))

    follow_ups = []
    in_session = []
    for name, properties in planned:
        incident_id = properties.pop("_follow_ups", None)
        in_session.append((name, properties))
        if incident_id:
            follow_ups.append((incident_id, properties["severity"]))

    moments = session_moments(rng, sign_in, sign_out, len(in_session))

    events = [
        make_event(name, user["distinct_id"], moment, properties)
        for (name, properties), moment in zip(in_session, moments)
    ]

    for incident_id, severity in follow_ups:
        update_count = rng.randint(2, 4)
        day_span = rng.randint(1, 3)
        for index in range(update_count):
            moment = later_work_moment(rng, day, max(1, round((index + 1) * day_span / update_count)), now)
            if moment is None:
                continue
            events.append(make_event("incident_updated", user["distinct_id"], moment, {
                "incident_id": incident_id,
                "field_changed": rng.choice(INCIDENT_FIELDS),
                "status": rng.choice(INCIDENT_STATUSES),
            }))
        if rng.random() < 0.85:
            resolve_seconds = rng.randint(3600, 86400)
            resolve_at = sign_out + timedelta(seconds=resolve_seconds)
            if resolve_at < now:
                events.append(make_event("incident_resolved", user["distinct_id"], resolve_at, {
                    "incident_id": incident_id,
                    "resolution_type": rng.choice(RESOLUTION_TYPES),
                    "time_to_resolve_seconds": resolve_seconds,
                    "severity": severity,
                }))
    return events


def simulate(rng, users, now):
    end = now.date()
    start = end - timedelta(days=29)
    events = []
    day = start
    while day <= end:
        active = [user for user in users if rng.random() < 0.60]
        for user in active:
            events.extend(simulate_user_day(rng, user, day, now))
        day += timedelta(days=1)
    events.sort(key=lambda item: item["properties"]["time"])
    return start, end, events


def post_json(session, url, payload, params):
    response = None
    for attempt in range(4):
        response = session.post(url, params=params, json=payload, timeout=60)
        if response.status_code not in {429, 500, 502, 503, 504} or attempt == 3:
            return response
        time.sleep(2 ** attempt)
    return response


def fail(response, label):
    detail = response.text.replace(os.environ.get("MIXPANEL_PROJECT_TOKEN", ""), "[token]")
    sys.exit(f"{label} failed ({response.status_code}): {detail[:500]}")


def create_profiles(session, users, token):
    response = post_json(
        session,
        ENGAGE_URL,
        [profile_payload(user, token) for user in users],
        {"verbose": "1"},
    )
    if response.status_code != 200:
        fail(response, "Profile update")
    body = response.json()
    if body.get("status") != 1 or body.get("error"):
        fail(response, "Profile update")


def import_events(session, events, project_id):
    sent = 0
    for index in range(0, len(events), BATCH_SIZE):
        batch = events[index:index + BATCH_SIZE]
        response = post_json(
            session,
            IMPORT_URL,
            batch,
            {"strict": "1", "project_id": project_id},
        )
        if response.status_code != 200:
            fail(response, f"Batch {index // BATCH_SIZE + 1}")
        body = response.json()
        if body.get("status") not in {"OK", 1} or body.get("code") not in {None, 200}:
            fail(response, f"Batch {index // BATCH_SIZE + 1}")
        sent += len(batch)
        print(f"Sent batch {index // BATCH_SIZE + 1}: {len(batch)} events")
    return sent


def main():
    load_dotenv(Path(__file__).resolve().parents[1] / ".env")
    token = os.environ.get("MIXPANEL_PROJECT_TOKEN", "").strip()
    project_id = os.environ.get("MIXPANEL_PROJECT_ID", "").strip()
    if not token or not project_id:
        sys.exit("MIXPANEL_PROJECT_TOKEN and MIXPANEL_PROJECT_ID are required.")

    rng = random.Random()
    now = datetime.now().astimezone()
    users = build_users()
    start, end, events = simulate(rng, users, now)

    session = requests.Session()
    session.auth = (token, "")
    session.headers["Accept"] = "application/json"
    create_profiles(session, users, token)
    sent = import_events(session, events, project_id)
    print(f"Users created: {len(users)}")
    print(f"Events sent: {sent}")
    print(f"Date range: {start.isoformat()} to {end.isoformat()}")


if __name__ == "__main__":
    main()
