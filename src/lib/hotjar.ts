import Hotjar from "@hotjar/browser";

const DEFAULT_VERSION = 6;

/** Fixed event names. Callers cannot pass alert text, search text, or an address. */
export const HOTJAR_EVENTS = [
  "sign_in_failed",
  "signed_in",
  "signed_out",
  "section_alerts",
  "section_incidents",
  "section_assistant",
  "section_collaboration",
  "section_kpis",
  "section_threats",
  "section_reports",
  "severity_filtered",
  "search_used",
  "incident_opened",
  "incident_closed",
  "assistant_lookup",
  "assistant_fast_path",
  "report_viewed",
] as const;

export type HotjarEventName = (typeof HOTJAR_EVENTS)[number];

const EVENT_NAMES = new Set<string>(HOTJAR_EVENTS);

export const DASHBOARD_SECTION_EVENTS: Record<string, HotjarEventName> = {
  alerts: "section_alerts",
  incidents: "section_incidents",
  "ai-assistant": "section_assistant",
  collaboration: "section_collaboration",
  metrics: "section_kpis",
  threats: "section_threats",
  reports: "section_reports",
};

const ALLOWED_ATTRIBUTE_KEYS = new Set(["user_role", "account_tier", "device", "synthetic"]);
const PII_KEY_PATTERN = /e-?mail|name|phone|address|dob|birth|ssn|ip_?addr|token|secret|password/i;

type HotjarAttributeValue = string | number | boolean;
type HotjarFn = ((...args: unknown[]) => void) & { q?: unknown[] };

declare global {
  interface Window {
    hj?: HotjarFn;
  }
}

export function getHotjarConfig() {
  const rawId = import.meta.env.VITE_HOTJAR_SITE_ID;
  const siteId = rawId ? Number.parseInt(rawId, 10) : Number.NaN;
  const rawVersion = Number.parseInt(import.meta.env.VITE_HOTJAR_VERSION ?? "", 10);
  return {
    siteId: Number.isFinite(siteId) && siteId > 0 ? siteId : null,
    version: Number.isFinite(rawVersion) ? rawVersion : DEFAULT_VERSION,
  };
}

let initialized = false;
let identifiedSignature = "";

export function initHotjar(): boolean {
  if (typeof window === "undefined" || initialized) return initialized;
  const { siteId, version } = getHotjarConfig();
  if (siteId === null) return false;
  initialized = Hotjar.init(siteId, version, { debug: false });
  return initialized;
}

export function isHotjarActive(): boolean {
  return initialized && typeof window !== "undefined" && typeof window.hj === "function";
}

export function sanitizeHotjarAttributes(
  attributes: Record<string, unknown>,
): Record<string, HotjarAttributeValue> {
  const out: Record<string, HotjarAttributeValue> = {};
  for (const [key, value] of Object.entries(attributes)) {
    if (!ALLOWED_ATTRIBUTE_KEYS.has(key) || PII_KEY_PATTERN.test(key)) continue;
    if (key === "synthetic") {
      if (value === true) out[key] = true;
      continue;
    }
    if (key === "device" && (value === "desktop" || value === "mobile")) {
      out[key] = value;
      continue;
    }
    if ((key === "user_role" || key === "account_tier") && typeof value === "string" && /^[a-z0-9_]{1,40}$/.test(value)) {
      out[key] = value;
    }
  }
  return out;
}

export async function hashUserId(userId: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(userId));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function currentDevice(): "desktop" | "mobile" {
  if (typeof window === "undefined") return "desktop";
  return window.matchMedia("(max-width: 767px)").matches ? "mobile" : "desktop";
}

export async function identifyUser(
  userId: string,
  attributes: Record<string, unknown> = {},
): Promise<boolean> {
  if (typeof window === "undefined" || !userId) return false;
  initHotjar();
  if (!isHotjarActive()) return false;
  const userIdHash = await hashUserId(userId);
  const safe = sanitizeHotjarAttributes({ ...attributes, synthetic: true });
  const signature = `${userIdHash}:${JSON.stringify(safe)}`;
  if (signature === identifiedSignature) return true;
  const sent = Hotjar.identify(userIdHash, safe);
  if (sent) identifiedSignature = signature;
  return sent;
}

export function trackHotjarEvent(eventName: string): boolean {
  if (!EVENT_NAMES.has(eventName) || typeof window === "undefined") return false;
  initHotjar();
  if (!isHotjarActive()) return false;
  return Hotjar.event(eventName);
}

export function resetHotjarUser(): boolean {
  identifiedSignature = "";
  if (typeof window === "undefined" || !isHotjarActive()) return false;
  window.hj?.("identify", null, {});
  return true;
}

/** Pathname only. Query strings can carry search text. */
export function trackHotjarStateChange(path: string): boolean {
  if (typeof window === "undefined") return false;
  const pathname = path.split("?")[0] || "/";
  initHotjar();
  if (!isHotjarActive()) return false;
  return Hotjar.stateChange(pathname);
}

export function assistantHotjarEvent(routing: {
  tier?: string;
  models?: unknown;
} | null | undefined): HotjarEventName | null {
  if (!routing || routing.tier !== "fast") return null;
  const models = Array.isArray(routing.models) ? routing.models : [];
  return models.length === 0 ? "assistant_lookup" : "assistant_fast_path";
}
