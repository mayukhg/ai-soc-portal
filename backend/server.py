"""Local SOC API backed by PostgreSQL.

Replaces the Supabase client, auth, and edge functions for local development.
Authorization is the session row: the API sets user_id from the session on
writes that the old row-level policies tied to auth.uid().
"""

import hashlib
import hmac
import json
import os
import re
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

import psycopg2
from psycopg2.extras import Json, RealDictCursor

ROOT = Path(__file__).resolve().parent
DATABASE_URL = os.environ.get(
    "DATABASE_URL", "postgresql://soc:soc@127.0.0.1:5433/soc_ai"
)
DEMO_USER_ID = "00000000-0000-4000-8000-000000000001"
DEMO_EMAIL = "analyst@soc.local"
DEMO_PASSWORD = "analyst123"
HOST = os.environ.get("SOC_API_HOST", "127.0.0.1")
PORT = int(os.environ.get("SOC_API_PORT", "8000"))

TABLES = {
    "profiles": {
        "id", "user_id", "username", "full_name", "avatar_url", "role",
        "department", "created_at", "updated_at",
    },
    "alerts": {
        "id", "title", "description", "severity", "status", "source",
        "alert_type", "source_ip", "destination_ip", "affected_systems",
        "indicators", "assigned_to", "incident_id", "created_at", "updated_at",
        "resolved_at", "metadata",
    },
    "incidents": {
        "id", "title", "description", "severity", "status", "assignee",
        "alert_count", "tags", "created_at", "updated_at",
    },
    "comments": {
        "id", "incident_id", "alert_id", "user_id", "content",
        "comment_type", "is_internal", "created_at", "updated_at",
    },
    "threat_intelligence": {
        "id", "indicator_value", "indicator_type", "threat_type",
        "confidence_score", "country_code", "latitude", "longitude",
        "source", "first_seen", "last_seen", "is_active", "tags",
        "metadata", "created_at", "updated_at",
    },
    "kpi_metrics": {
        "id", "metric_name", "metric_category", "current_value",
        "previous_value", "target_value", "unit", "trend",
        "period_start", "period_end", "calculated_at", "metadata",
    },
    "reports": {
        "id", "title", "report_type", "template_id", "content",
        "generated_by", "generated_for", "status", "scheduled_for",
        "is_recurring", "recurrence_pattern", "file_url",
        "created_at", "updated_at",
    },
    "ai_interactions": {
        "id", "user_id", "session_id", "message_type", "content",
        "context_type", "context_id", "metadata", "created_at",
    },
}

JSON_COLUMNS = {"metadata", "content", "raw_user_meta_data"}
OWNED_TABLES = {"comments", "ai_interactions"}


def connect():
    return psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)


def split_sql(sql):
    statements = []
    buffer = []
    in_dollar = False
    i = 0
    while i < len(sql):
        if sql.startswith("$$", i):
            in_dollar = not in_dollar
            buffer.append("$$")
            i += 2
            continue
        if sql[i] == ";" and not in_dollar:
            statement = "".join(buffer).strip()
            if statement:
                statements.append(statement)
            buffer = []
            i += 1
            continue
        buffer.append(sql[i])
        i += 1
    tail = "".join(buffer).strip()
    if tail:
        statements.append(tail)
    return statements


def apply_sql_file(path):
    sql = path.read_text()
    with connect() as conn:
        with conn.cursor() as cur:
            for statement in split_sql(sql):
                cur.execute(statement)


def hash_password(password, salt=None):
    if salt is None:
        salt = os.urandom(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 200_000)
    return f"pbkdf2_sha256$200000${salt.hex()}${digest.hex()}"


def verify_password(password, stored):
    try:
        _algo, rounds, salt_hex, expected = stored.split("$")
        digest = hashlib.pbkdf2_hmac(
            "sha256", password.encode(), bytes.fromhex(salt_hex), int(rounds)
        )
    except (ValueError, TypeError):
        return False
    return hmac.compare_digest(digest.hex(), expected)


def token_hash(token):
    return hashlib.sha256(token.encode()).hexdigest()


def json_ready(value):
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, Decimal):
        return float(value)
    if isinstance(value, uuid.UUID):
        return str(value)
    if isinstance(value, dict):
        return {key: json_ready(item) for key, item in value.items()}
    if isinstance(value, list):
        return [json_ready(item) for item in value]
    return value


def rows_ready(rows):
    return [json_ready(dict(row)) for row in rows]


def adapt_value(column, value):
    if isinstance(value, dict) or column in JSON_COLUMNS and isinstance(value, (dict, list)):
        return Json(value)
    return value


def quote_column(table, column):
    if column not in TABLES[table]:
        raise ValueError(f"Unknown column {column}")
    return f'"{column}"'


def ensure_demo_user():
    with connect() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT id FROM public.users WHERE email = %s", (DEMO_EMAIL,))
            row = cur.fetchone()
            user_id = row["id"] if row else DEMO_USER_ID
            if row is None:
                cur.execute(
                    """
                    INSERT INTO public.users (id, email, password_hash, raw_user_meta_data)
                    VALUES (%s, %s, %s, %s)
                    """,
                    (
                        DEMO_USER_ID,
                        DEMO_EMAIL,
                        hash_password(DEMO_PASSWORD),
                        Json({"full_name": "Alex Rivera", "username": "arivera"}),
                    ),
                )
            cur.execute(
                """
                INSERT INTO public.profiles (user_id, username, full_name, role, department)
                VALUES (%s, %s, %s, %s, %s)
                ON CONFLICT (user_id) DO NOTHING
                """,
                (user_id, "arivera", "Alex Rivera", "analyst_tier2", "security"),
            )
            cur.execute(
                """
                INSERT INTO public.comments (alert_id, user_id, content, comment_type, is_internal)
                SELECT %s, %s, %s, 'note', true
                WHERE NOT EXISTS (
                  SELECT 1 FROM public.comments WHERE alert_id = %s
                )
                """,
                (
                    "11111111-1111-4111-8111-111111111111",
                    user_id,
                    "Outbound sessions to 185.220.101.182 line up with the finance segment. Holding the hosts for containment review.",
                    "11111111-1111-4111-8111-111111111111",
                ),
            )


def public_user(row):
    meta = row.get("raw_user_meta_data") or {}
    return {
        "id": str(row["id"]),
        "email": row["email"],
        "aud": "authenticated",
        "role": "authenticated",
        "created_at": json_ready(row["created_at"]),
        "app_metadata": {},
        "user_metadata": meta,
    }


def issue_session(cur, user_row):
    token = secrets.token_urlsafe(32)
    expires = datetime.now(timezone.utc) + timedelta(days=7)
    cur.execute(
        """
        INSERT INTO public.sessions (token_hash, user_id, expires_at)
        VALUES (%s, %s, %s)
        """,
        (token_hash(token), user_row["id"], expires),
    )
    user = public_user(user_row)
    return {
        "access_token": token,
        "token_type": "bearer",
        "expires_at": int(expires.timestamp()),
        "user": user,
    }, user


def user_from_token(token):
    if not token:
        return None
    with connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT u.id, u.email, u.raw_user_meta_data, u.created_at
                FROM public.sessions s
                JOIN public.users u ON u.id = s.user_id
                WHERE s.token_hash = %s AND s.expires_at > now()
                """,
                (token_hash(token),),
            )
            row = cur.fetchone()
    return public_user(row) if row else None


def create_account(email, password, full_name, username):
    email = (email or "").strip().lower()
    if not email or "@" not in email:
        return None, None, "Enter a valid email address"
    if not password or len(password) < 6:
        return None, None, "Password must be at least 6 characters long"
    with connect() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT id FROM public.users WHERE email = %s", (email,))
            if cur.fetchone():
                return None, None, "User already registered"
            cur.execute(
                """
                INSERT INTO public.users (email, password_hash, raw_user_meta_data)
                VALUES (%s, %s, %s)
                RETURNING id, email, raw_user_meta_data, created_at
                """,
                (
                    email,
                    hash_password(password),
                    Json({"full_name": full_name or "", "username": username or email.split("@")[0]}),
                ),
            )
            user_row = cur.fetchone()
            cur.execute(
                """
                INSERT INTO public.profiles (user_id, username, full_name, role)
                VALUES (%s, %s, %s, 'analyst_tier1')
                """,
                (
                    user_row["id"],
                    username or email.split("@")[0],
                    full_name or email.split("@")[0],
                ),
            )
            session, user = issue_session(cur, user_row)
    return session, user, None


def sign_in(email, password):
    email = (email or "").strip().lower()
    with connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, email, password_hash, raw_user_meta_data, created_at
                FROM public.users WHERE email = %s
                """,
                (email,),
            )
            row = cur.fetchone()
            if row is None or not verify_password(password or "", row["password_hash"]):
                return None, None, "Invalid login credentials"
            session, user = issue_session(cur, row)
    return session, user, None


def sign_out(token):
    if not token:
        return
    with connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "DELETE FROM public.sessions WHERE token_hash = %s",
                (token_hash(token),),
            )


def run_query(body, user_id):
    table = body.get("table")
    action = body.get("action") or "select"
    if table not in TABLES:
        return {"data": None, "error": {"message": "Unknown table", "code": "PGRST205"}}

    filters = body.get("filters") or []
    payload = body.get("payload")
    order = body.get("order")
    limit = body.get("limit")
    single = bool(body.get("single"))
    select = body.get("select") or "*"
    allowed = TABLES[table]

    where = []
    params = []
    for item in filters:
        column = item.get("column")
        op = item.get("op")
        if column not in allowed or op not in {"eq", "gte"}:
            return {"data": None, "error": {"message": "Invalid filter", "code": "42703"}}
        sql_op = "=" if op == "eq" else ">="
        where.append(f'{quote_column(table, column)} {sql_op} %s')
        params.append(item.get("value"))

    if action in {"update", "delete"} and table in OWNED_TABLES and user_id:
        if not any(item.get("column") == "user_id" and item.get("op") == "eq" for item in filters):
            where.append(f'{quote_column(table, "user_id")} = %s')
            params.append(user_id)

    where_sql = f" WHERE {' AND '.join(where)}" if where else ""

    with connect() as conn:
        with conn.cursor() as cur:
            if action == "select":
                join = ""
                columns = f"{table}.*"
                if table == "comments" and "profile:" in select:
                    columns = (
                        "comments.*, "
                        "json_build_object("
                        "'username', profiles.username, "
                        "'full_name', profiles.full_name, "
                        "'role', profiles.role"
                        ") AS profile"
                    )
                    join = " LEFT JOIN public.profiles ON profiles.user_id = comments.user_id"
                order_sql = ""
                if order and order.get("column") in allowed:
                    direction = "ASC" if order.get("ascending", True) else "DESC"
                    order_sql = f' ORDER BY {quote_column(table, order["column"])} {direction}'
                limit_sql = ""
                if isinstance(limit, int) and limit > 0:
                    limit_sql = " LIMIT %s"
                    params.append(min(limit, 200))
                cur.execute(
                    f"SELECT {columns} FROM public.{table}{join}{where_sql}{order_sql}{limit_sql}",
                    params,
                )
                rows = rows_ready(cur.fetchall())
                if single:
                    if len(rows) == 1:
                        return {"data": rows[0], "error": None}
                    return {
                        "data": None,
                        "error": {
                            "message": "JSON object requested, multiple (or no) rows returned",
                            "code": "PGRST116",
                        },
                    }
                return {"data": rows, "error": None}

            if action == "insert":
                records = payload if isinstance(payload, list) else [payload]
                inserted = []
                for record in records:
                    if not isinstance(record, dict):
                        return {"data": None, "error": {"message": "Invalid insert payload"}}
                    if table in OWNED_TABLES and user_id:
                        record = {**record, "user_id": user_id}
                    if table == "ai_interactions":
                        record["context_id"] = valid_uuid(record.get("context_id"))
                        record["session_id"] = valid_uuid(record.get("session_id")) or str(uuid.uuid4())
                    columns = [column for column in record.keys() if column in allowed]
                    if not columns:
                        return {"data": None, "error": {"message": "No writable columns"}}
                    values = [adapt_value(column, record[column]) for column in columns]
                    names = ", ".join(quote_column(table, column) for column in columns)
                    placeholders = ", ".join(["%s"] * len(columns))
                    cur.execute(
                        f"INSERT INTO public.{table} ({names}) VALUES ({placeholders}) RETURNING *",
                        values,
                    )
                    inserted.extend(rows_ready(cur.fetchall()))
                return {"data": inserted, "error": None}

            if action == "update":
                if not isinstance(payload, dict):
                    return {"data": None, "error": {"message": "Invalid update payload"}}
                columns = [column for column in payload.keys() if column in allowed and column != "id"]
                if not columns:
                    return {"data": None, "error": {"message": "No writable columns"}}
                assignments = ", ".join(
                    f"{quote_column(table, column)} = %s" for column in columns
                )
                values = [adapt_value(column, payload[column]) for column in columns]
                cur.execute(
                    f"UPDATE public.{table} SET {assignments}{where_sql} RETURNING *",
                    values + params,
                )
                return {"data": rows_ready(cur.fetchall()), "error": None}

            if action == "delete":
                cur.execute(
                    f"DELETE FROM public.{table}{where_sql} RETURNING *",
                    params,
                )
                return {"data": rows_ready(cur.fetchall()), "error": None}

    return {"data": None, "error": {"message": "Unsupported action"}}


def valid_uuid(value):
    if not value or not isinstance(value, str):
        return None
    if re.fullmatch(r"[0-9a-fA-F-]{36}", value) is None:
        return None
    try:
        uuid.UUID(value)
    except ValueError:
        return None
    return value


def function_get_alerts(body):
    limit = int(body.get("limit") or 50)
    offset = int(body.get("offset") or 0)
    filters = body.get("filters") or {}
    clauses = []
    params = []
    for column in ("severity", "status", "source"):
        if filters.get(column):
            clauses.append(f"a.{column} = %s")
            params.append(filters[column])
    where = f" WHERE {' AND '.join(clauses)}" if clauses else ""
    params.extend([limit, offset])
    with connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"""
                SELECT a.id, a.title, a.description, a.severity, a.status, a.source, a.alert_type,
                       host(a.source_ip) AS source_ip, host(a.destination_ip) AS destination_ip,
                       a.affected_systems, a.indicators, a.assigned_to, a.incident_id,
                       profiles.full_name AS assignee_name,
                       a.created_at, a.updated_at, a.resolved_at, a.metadata
                FROM public.alerts a
                LEFT JOIN public.profiles ON profiles.user_id = a.assigned_to
                {where}
                ORDER BY a.created_at DESC
                LIMIT %s OFFSET %s
                """,
                params,
            )
            return {"success": True, "data": rows_ready(cur.fetchall())}


def related_alerts(cur, message):
    tokens = [token for token in re.split(r"\s+", message.lower()) if len(token) > 2]
    if not tokens:
        cur.execute(
            """
            SELECT title, severity, status, description, alert_type, source
            FROM public.alerts
            ORDER BY created_at DESC
            LIMIT 3
            """
        )
        return cur.fetchall()
    clauses = []
    params = []
    for token in tokens[:6]:
        clauses.append(
            "(lower(title) LIKE %s OR lower(coalesce(description, '')) LIKE %s OR lower(alert_type) LIKE %s)"
        )
        like = f"%{token}%"
        params.extend([like, like, like])
    cur.execute(
        f"""
        SELECT title, severity, status, description, alert_type, source
        FROM public.alerts
        WHERE {' OR '.join(clauses)}
        ORDER BY created_at DESC
        LIMIT 3
        """,
        params,
    )
    found = cur.fetchall()
    if found:
        return found
    cur.execute(
        """
        SELECT title, severity, status, description, alert_type, source
        FROM public.alerts
        WHERE status <> 'resolved'
        ORDER BY created_at DESC
        LIMIT 3
        """
    )
    return cur.fetchall()


def function_ai_assistant(body, user_id):
    message = (body.get("message") or "").strip()
    if not message:
        return {"success": False, "error": "Message is required"}
    if not user_id:
        return {"success": False, "error": "Sign in before using the assistant"}
    session_id = valid_uuid(body.get("sessionId")) or str(uuid.uuid4())
    context_type = body.get("contextType") if body.get("contextType") in {
        "general", "incident", "alert", "threat_hunting"
    } else "general"
    context_id = valid_uuid(body.get("contextId"))
    with connect() as conn:
        with conn.cursor() as cur:
            matches = related_alerts(cur, message)
            if matches:
                lines = [
                    f"- {row['title']} ({row['severity']}, {row['status']}, {row['source']}): {row['description']}"
                    for row in matches
                ]
                reply = (
                    "From the Postgres alert store, these records match that question:\n"
                    + "\n".join(lines)
                    + "\n\nNext step: confirm the source address against threat intelligence, then contain the affected hosts if the indicator is still active."
                )
            else:
                reply = "The Postgres alert store has no open records that match that question."
            for message_type, content in (("user", message), ("assistant", reply)):
                cur.execute(
                    """
                    INSERT INTO public.ai_interactions
                      (user_id, session_id, message_type, content, context_type, context_id)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    """,
                    (user_id, session_id, message_type, content, context_type, context_id),
                )
    return {"success": True, "message": reply}


def function_calculate_kpis():
    with connect() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) AS count FROM public.alerts")
            total = cur.fetchone()["count"]
            cur.execute(
                """
                SELECT COUNT(*) AS count FROM public.alerts
                WHERE severity = 'critical' AND status NOT IN ('resolved', 'false_positive')
                """
            )
            critical = cur.fetchone()["count"]
            cur.execute("SELECT COUNT(*) AS count FROM public.threat_intelligence WHERE is_active")
            indicators = cur.fetchone()["count"]
            updates = {
                "Total Alerts": total,
                "Critical Alerts": critical,
                "Active Threat Indicators": indicators,
            }
            for name, value in updates.items():
                cur.execute(
                    """
                    UPDATE public.kpi_metrics
                    SET previous_value = current_value,
                        trend = CASE
                          WHEN %s > current_value THEN 'up'
                          WHEN %s < current_value THEN 'down'
                          ELSE 'stable'
                        END,
                        current_value = %s,
                        calculated_at = now(),
                        period_end = now()
                    WHERE metric_name = %s
                    """,
                    (value, value, value, name),
                )
    return {"success": True}


def function_generate_report(body, user_id):
    if not user_id:
        return {"success": False, "error": "Sign in before generating a report"}
    title = body.get("title") or "Generated Report"
    report_type = body.get("reportType") or "custom"
    if report_type not in {
        "incident_summary", "threat_analysis", "performance_metrics",
        "compliance", "executive_summary", "custom",
    }:
        report_type = "custom"
    with connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT title, severity, status, source
                FROM public.alerts
                ORDER BY created_at DESC
                LIMIT 8
                """
            )
            alerts = cur.fetchall()
            cur.execute(
                """
                SELECT title, severity, status, assignee
                FROM public.incidents
                ORDER BY created_at DESC
                LIMIT 8
                """
            )
            incidents = cur.fetchall()
            alert_lines = "\n".join(
                f"- {row['severity'].upper()} {row['title']} ({row['status']}, {row['source']})"
                for row in alerts
            )
            incident_lines = "\n".join(
                f"- {row['severity'].upper()} {row['title']} ({row['status']}, {row['assignee'] or 'Unassigned'})"
                for row in incidents
            )
            content = (
                f"# {title}\n\n"
                f"Source: PostgreSQL soc_ai\n"
                f"Window: {body.get('timeRange') or '7d'}\n\n"
                f"## Alerts ({len(alerts)})\n{alert_lines or '- None'}\n\n"
                f"## Incidents ({len(incidents)})\n{incident_lines or '- None'}\n"
            )
            cur.execute(
                """
                INSERT INTO public.reports
                  (title, report_type, template_id, content, generated_by, generated_for, status)
                VALUES (%s, %s, %s, %s, %s, %s, 'completed')
                """,
                (
                    title,
                    report_type,
                    body.get("templateId"),
                    Json({"text": content}),
                    user_id,
                    body.get("generatedFor") or ["analyst_tier2"],
                ),
            )
    return {
        "success": True,
        "content": content,
        "summary": {"alerts": len(alerts), "incidents": len(incidents)},
    }


def function_generate_embeddings(body):
    incident_id = valid_uuid(body.get("incidentId"))
    if incident_id is None:
        return {"success": False, "error": "A valid incident id is required"}
    with connect() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT id FROM public.incidents WHERE id = %s", (incident_id,))
            if cur.fetchone() is None:
                return {"success": False, "error": "Incident not found"}
            cur.execute(
                """
                UPDATE public.incidents
                SET updated_at = now()
                WHERE id = %s
                """,
                (incident_id,),
            )
    return {
        "success": True,
        "indexed": "postgres-text",
        "detail": "Incident is searchable through search_incidents_text. No embedding model is configured.",
    }


def semantic_search(body):
    query = (body.get("query") or "").strip()
    if not query:
        return 400, {"error": "Query is required"}
    threshold = float(body.get("matchThreshold", 0.7))
    count = int(body.get("matchCount", 10))
    with connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT * FROM public.search_incidents_text(%s, %s, %s)",
                (query, threshold, count),
            )
            results = rows_ready(cur.fetchall())
    return 200, {
        "success": True,
        "results": results,
        "query": query,
        "matchThreshold": threshold,
        "matchCount": len(results),
        "engine": "postgres.search_incidents_text",
    }


def health():
    with connect() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT version() AS version")
            version = cur.fetchone()["version"]
            cur.execute(
                """
                SELECT
                  (SELECT COUNT(*) FROM public.alerts) AS alerts,
                  (SELECT COUNT(*) FROM public.incidents) AS incidents,
                  (SELECT COUNT(*) FROM public.users) AS users
                """
            )
            counts = cur.fetchone()
    return {
        "status": "healthy",
        "service": "soc-postgres-api",
        "database": "postgresql",
        "version": version.split(",")[0],
        "counts": json_ready(dict(counts)),
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


def contains_pattern(query):
    cleaned = query.strip().lower().replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
    return f"%{cleaned}%"


def global_search(query):
    pattern = contains_pattern(query)
    if len(query.strip()) < 2:
        return {"results": []}
    with connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT 'alert' AS kind, id::text AS id, title,
                       severity || ' · ' || status AS detail
                FROM public.alerts
                WHERE lower(title) LIKE %s ESCAPE '\\'
                   OR lower(coalesce(description, '')) LIKE %s ESCAPE '\\'
                   OR lower(alert_type) LIKE %s ESCAPE '\\'
                   OR EXISTS (
                     SELECT 1 FROM unnest(coalesce(indicators, ARRAY[]::text[])) AS indicator
                     WHERE lower(indicator) LIKE %s ESCAPE '\\'
                   )
                ORDER BY created_at DESC
                LIMIT 5
                """,
                (pattern, pattern, pattern, pattern),
            )
            alerts = rows_ready(cur.fetchall())
            cur.execute(
                """
                SELECT 'incident' AS kind, id::text AS id, title,
                       severity || ' · ' || status AS detail
                FROM public.incidents
                WHERE lower(title) LIKE %s ESCAPE '\\'
                   OR lower(coalesce(description, '')) LIKE %s ESCAPE '\\'
                   OR EXISTS (
                     SELECT 1 FROM unnest(coalesce(tags, ARRAY[]::text[])) AS tag
                     WHERE lower(tag) LIKE %s ESCAPE '\\'
                   )
                ORDER BY created_at DESC
                LIMIT 5
                """,
                (pattern, pattern, pattern),
            )
            incidents = rows_ready(cur.fetchall())
            cur.execute(
                """
                SELECT 'indicator' AS kind, id::text AS id, indicator_value AS title,
                       threat_type || ' · ' || coalesce(country_code, source) AS detail
                FROM public.threat_intelligence
                WHERE is_active
                  AND (
                    lower(indicator_value) LIKE %s ESCAPE '\\'
                    OR lower(threat_type) LIKE %s ESCAPE '\\'
                    OR EXISTS (
                      SELECT 1 FROM unnest(coalesce(tags, ARRAY[]::text[])) AS tag
                      WHERE lower(tag) LIKE %s ESCAPE '\\'
                    )
                  )
                ORDER BY created_at DESC
                LIMIT 5
                """,
                (pattern, pattern, pattern),
            )
            indicators = rows_ready(cur.fetchall())
    return {"results": alerts + incidents + indicators}


def alert_counts():
    with connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                  count(*) FILTER (
                    WHERE status NOT IN ('resolved', 'false_positive')
                  ) AS total,
                  count(*) FILTER (
                    WHERE severity = 'critical' AND status NOT IN ('resolved', 'false_positive')
                  ) AS critical,
                  count(*) FILTER (
                    WHERE severity = 'high' AND status NOT IN ('resolved', 'false_positive')
                  ) AS high,
                  count(*) FILTER (
                    WHERE severity = 'medium' AND status NOT IN ('resolved', 'false_positive')
                  ) AS medium,
                  count(*) FILTER (
                    WHERE severity = 'low' AND status NOT IN ('resolved', 'false_positive')
                  ) AS low,
                  (SELECT count(*) FROM public.incidents) AS incidents
                FROM public.alerts
                """
            )
            return json_ready(dict(cur.fetchone()))


def rows_as_csv(rows, columns):
    import csv
    import io

    buffer = io.StringIO()
    writer = csv.DictWriter(buffer, fieldnames=columns)
    writer.writeheader()
    for row in rows:
        prepared = {}
        for column in columns:
            value = row.get(column)
            if isinstance(value, list):
                value = ", ".join(str(item) for item in value)
            prepared[column] = "" if value is None else value
        writer.writerow(prepared)
    return buffer.getvalue()


def export_alerts_csv():
    with connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT a.id::text AS id, a.title, a.description, a.severity, a.status,
                       a.source, a.alert_type, host(a.source_ip) AS source_ip,
                       profiles.full_name AS assignee_name, a.created_at
                FROM public.alerts a
                LEFT JOIN public.profiles ON profiles.user_id = a.assigned_to
                ORDER BY a.created_at DESC
                """
            )
            rows = rows_ready(cur.fetchall())
    columns = [
        "id", "title", "description", "severity", "status", "source",
        "alert_type", "source_ip", "assignee_name", "created_at",
    ]
    return rows_as_csv(rows, columns)


def export_incidents_csv():
    with connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id::text AS id, title, description, severity, status, assignee,
                       alert_count, tags, created_at, updated_at
                FROM public.incidents
                ORDER BY created_at DESC
                """
            )
            rows = rows_ready(cur.fetchall())
    columns = [
        "id", "title", "description", "severity", "status", "assignee",
        "alert_count", "tags", "created_at", "updated_at",
    ]
    return rows_as_csv(rows, columns)


def incident_detail(incident_id):
    with connect() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM public.incidents WHERE id = %s", (incident_id,))
            incident = cur.fetchone()
            if incident is None:
                return None
            incident = dict(incident)
            incident.pop("embedding", None)
            cur.execute(
                """
                SELECT comments.id, comments.content, comments.comment_type,
                       comments.created_at, comments.is_internal,
                       json_build_object(
                         'username', profiles.username,
                         'full_name', profiles.full_name,
                         'role', profiles.role
                       ) AS profile
                FROM public.comments
                LEFT JOIN public.profiles ON profiles.user_id = comments.user_id
                WHERE comments.incident_id = %s
                ORDER BY comments.created_at
                """,
                (incident_id,),
            )
            comments = cur.fetchall()
            cur.execute(
                """
                SELECT id, title, severity, status, source
                FROM public.alerts
                WHERE incident_id = %s
                ORDER BY created_at DESC
                """,
                (incident_id,),
            )
            alerts = cur.fetchall()
    return {
        "incident": json_ready(dict(incident)),
        "comments": rows_ready(comments),
        "alerts": rows_ready(alerts),
    }


class Handler(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        print(f"[soc-api] {self.address_string()} {fmt % args}")

    def _send(self, status, payload):
        body = json.dumps(payload).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.end_headers()
        self.wfile.write(body)

    def _send_csv(self, filename, text):
        body = text.encode()
        self.send_response(200)
        self.send_header("Content-Type", "text/csv; charset=utf-8")
        self.send_header("Content-Disposition", f'attachment; filename="{filename}"')
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)

    def _read_json(self):
        length = int(self.headers.get("Content-Length") or 0)
        if length == 0:
            return {}
        raw = self.rfile.read(length)
        return json.loads(raw.decode() or "{}")

    def _token(self):
        header = self.headers.get("Authorization") or ""
        if header.lower().startswith("bearer "):
            return header[7:].strip()
        return None

    def do_OPTIONS(self):
        self._send(204, {})

    def do_GET(self):
        path = self.path.split("?", 1)[0]
        try:
            if path in {"/api/health", "/health"}:
                self._send(200, health())
                return
            if path == "/api/auth/session":
                user = user_from_token(self._token())
                if user is None:
                    self._send(401, {"session": None})
                    return
                self._send(200, {"session": {"access_token": self._token(), "user": user}})
                return
            if user_from_token(self._token()) is None:
                self._send(401, {"error": "Not authenticated"})
                return
            if path == "/api/alerts/counts":
                self._send(200, alert_counts())
                return
            if path == "/api/alerts/export":
                self._send_csv("alerts.csv", export_alerts_csv())
                return
            if path == "/api/incidents/export":
                self._send_csv("incidents.csv", export_incidents_csv())
                return
            if path.startswith("/api/incidents/"):
                incident_id = valid_uuid(path.rsplit("/", 1)[-1])
                if incident_id is None:
                    self._send(404, {"error": "Incident not found"})
                    return
                detail = incident_detail(incident_id)
                if detail is None:
                    self._send(404, {"error": "Incident not found"})
                    return
                self._send(200, detail)
                return
            self._send(404, {"error": "Not found"})
        except Exception as exc:
            self._send(500, {"error": str(exc)})

    def do_POST(self):
        path = self.path.split("?", 1)[0]
        try:
            body = self._read_json()
            token = self._token()
            user = user_from_token(token)
            user_id = user["id"] if user else None

            if path == "/api/auth/signin":
                session, signed_in, error = sign_in(body.get("email"), body.get("password"))
                if error:
                    self._send(401, {"error": error})
                    return
                self._send(200, {"session": session, "user": signed_in})
                return

            if path == "/api/auth/signup":
                session, signed_in, error = create_account(
                    body.get("email"),
                    body.get("password"),
                    body.get("full_name") or (body.get("data") or {}).get("full_name"),
                    body.get("username") or (body.get("data") or {}).get("username"),
                )
                if error:
                    status = 409 if error == "User already registered" else 400
                    self._send(status, {"error": error})
                    return
                self._send(200, {"session": session, "user": signed_in})
                return

            if path == "/api/auth/signout":
                sign_out(token)
                self._send(200, {"success": True})
                return

            if path == "/api/query":
                if user_id is None:
                    self._send(401, {"data": None, "error": {"message": "Not authenticated"}})
                    return
                self._send(200, run_query(body, user_id))
                return

            if path == "/api/semantic-search":
                status, payload = semantic_search(body)
                self._send(status, payload)
                return

            if path == "/api/search":
                if user_id is None:
                    self._send(401, {"error": "Not authenticated"})
                    return
                self._send(200, global_search(body.get("query") or ""))
                return

            if path.startswith("/api/functions/"):
                name = path.rsplit("/", 1)[-1]
                if user_id is None:
                    self._send(401, {"success": False, "error": "Not authenticated"})
                    return
                if name == "get-alerts":
                    self._send(200, function_get_alerts(body))
                elif name == "ai-assistant":
                    self._send(200, function_ai_assistant(body, user_id))
                elif name == "calculate-kpis":
                    self._send(200, function_calculate_kpis())
                elif name == "generate-report":
                    self._send(200, function_generate_report(body, user_id))
                elif name == "generate-embeddings":
                    self._send(200, function_generate_embeddings(body))
                else:
                    self._send(404, {"success": False, "error": "Unknown function"})
                return

            self._send(404, {"error": "Not found"})
        except psycopg2.Error as exc:
            self._send(400, {"data": None, "error": {"message": exc.pgerror or str(exc)}})
        except Exception as exc:
            self._send(500, {"error": str(exc)})


def main():
    print("Applying schema and seed...")
    apply_sql_file(ROOT / "sql" / "schema.sql")
    apply_sql_file(ROOT / "sql" / "seed.sql")
    ensure_demo_user()
    print(f"PostgreSQL ready. Demo analyst: {DEMO_EMAIL} / {DEMO_PASSWORD}")
    server = ThreadingHTTPServer((HOST, PORT), Handler)
    print(f"SOC API listening on http://{HOST}:{PORT}")
    server.serve_forever()


if __name__ == "__main__":
    main()
