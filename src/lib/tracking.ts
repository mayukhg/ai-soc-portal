import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import mixpanel from "mixpanel-browser";

const TOKEN = import.meta.env.NEXT_PUBLIC_MIXPANEL_TOKEN;
const SIGNED_IN_AT = "mp_signed_in_at";

let ready = false;

if (typeof window !== "undefined" && TOKEN) {
  mixpanel.init(TOKEN, { track_pageview: true, persistence: "localStorage" });
  ready = true;
}

export function identify(userId: string, traits: { email?: string; role?: string; org?: string } = {}) {
  if (!ready || !userId) return;
  mixpanel.identify(userId);
  const people: Record<string, string> = {};
  if (traits.email) people.$email = traits.email;
  if (traits.role) people.role = traits.role;
  if (traits.org) people.org = traits.org;
  if (Object.keys(people).length > 0) mixpanel.people.set(people);
}

export const ESCALATION_REASONS = ["tier3", "incident", "threat_hunt"] as const;
export const DISMISS_REASONS = ["false_positive", "duplicate", "benign"] as const;
export const ACCEPT_ACTIONS = ["acknowledge_alert", "open_incident"] as const;
export const REJECT_REASONS = ["not_relevant", "incorrect", "incomplete"] as const;
export const FEEDBACK_TYPES = ["helpful", "not_helpful"] as const;
export const PLAYBOOKS = [
  { id: "finance-beacon-containment", name: "Finance beacon containment" },
] as const;

const LIMITED_EVENT_KEYS: Record<string, readonly string[]> = {
  alert_escalated: ["alert_id", "escalation_reason"],
  alert_dismissed: ["alert_id", "dismiss_reason"],
  ai_recommendation_accepted: ["recommendation_id", "action_taken"],
  ai_recommendation_rejected: ["recommendation_id", "reject_reason"],
  ai_feedback_submitted: ["recommendation_id", "feedback_type"],
  playbook_executed: ["playbook_id", "playbook_name", "trigger_source"],
};

const ALLOWED_VALUES: Record<string, readonly string[]> = {
  escalation_reason: ESCALATION_REASONS,
  dismiss_reason: DISMISS_REASONS,
  action_taken: ACCEPT_ACTIONS,
  reject_reason: REJECT_REASONS,
  feedback_type: FEEDBACK_TYPES,
  playbook_id: PLAYBOOKS.map((playbook) => playbook.id),
  playbook_name: PLAYBOOKS.map((playbook) => playbook.name),
  trigger_source: ["assistant", "incident"],
};

const BLOCKED_PROPERTY = /^(title|description|message|query|search|address|content|text|email|ip|ip_address|alert_text|search_text|reason_note)$/i;
const IPV4 = /\b\d{1,3}(?:\.\d{1,3}){3}\b/;

export function sanitizeEventProperties(eventName: string, properties?: Record<string, unknown>) {
  const allowedKeys = LIMITED_EVENT_KEYS[eventName];
  const safe: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(properties || {})) {
    if (BLOCKED_PROPERTY.test(key)) continue;
    if (allowedKeys && !allowedKeys.includes(key)) continue;
    if (typeof value === "string" && IPV4.test(value)) continue;
    const allowed = ALLOWED_VALUES[key];
    if (allowed && (typeof value !== "string" || !allowed.includes(value))) continue;
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      safe[key] = value;
    }
  }
  return safe;
}

export function track(eventName: string, properties?: Record<string, unknown>) {
  if (!ready) return;
  mixpanel.track(eventName, sanitizeEventProperties(eventName, properties));
}

export function reset() {
  if (!ready) return;
  mixpanel.reset();
}

export function markSignedIn() {
  if (typeof window === "undefined") return;
  if (!sessionStorage.getItem(SIGNED_IN_AT)) {
    sessionStorage.setItem(SIGNED_IN_AT, String(Date.now()));
  }
}

export function consumeSessionDuration(): number {
  if (typeof window === "undefined") return 0;
  const started = Number(sessionStorage.getItem(SIGNED_IN_AT) || Date.now());
  sessionStorage.removeItem(SIGNED_IN_AT);
  if (!Number.isFinite(started)) return 0;
  return Math.max(0, Math.round((Date.now() - started) / 1000));
}

export function secondsSince(iso?: string) {
  if (!iso) return 0;
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return 0;
  return Math.max(0, Math.round((Date.now() - then) / 1000));
}

/** Type only. The query string itself is not returned. */
export function indicatorType(query: string) {
  const value = query.trim();
  if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(value)) return "ip";
  if (/^[a-f0-9]{32,64}$/i.test(value)) return "hash";
  if (/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(value)) return "domain";
  return "keyword";
}

export function MixpanelRouteListener() {
  const location = useLocation();
  const previous = useRef("");

  useEffect(() => {
    if (location.pathname === "/") return;
    track("page_viewed", { page_name: location.pathname, referrer_page: previous.current });
    previous.current = location.pathname;
  }, [location.pathname]);

  return null;
}
