/**
 * Lightweight Atlas product-analytics client.
 * Fire-and-forget POSTs; never throws into the UI path.
 * Disabled when VITE_ATLAS_API_ENDPOINT or VITE_ATLAS_TOKEN is unset.
 */

const ENDPOINT = (import.meta.env.VITE_ATLAS_API_ENDPOINT || "").replace(/\/$/, "");
const TOKEN = import.meta.env.VITE_ATLAS_TOKEN || "";

const DISTINCT_KEY = "atlas_distinct_id";
const TRAITS_KEY = "atlas_traits";

export const isAtlasReady = () =>
  typeof window !== "undefined" && Boolean(ENDPOINT && TOKEN);

function getDistinctId(): string | undefined {
  if (typeof window === "undefined") return undefined;
  return sessionStorage.getItem(DISTINCT_KEY) || localStorage.getItem(DISTINCT_KEY) || undefined;
}

function setDistinctId(userId: string) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(DISTINCT_KEY, userId);
  localStorage.setItem(DISTINCT_KEY, userId);
}

function clearDistinctId() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(DISTINCT_KEY);
  localStorage.removeItem(DISTINCT_KEY);
  sessionStorage.removeItem(TRAITS_KEY);
  localStorage.removeItem(TRAITS_KEY);
}

async function postAtlas(path: string, body: Record<string, unknown>) {
  if (!isAtlasReady()) return;
  try {
    const response = await fetch(`${ENDPOINT}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${TOKEN}`,
        "X-API-Key": TOKEN,
      },
      body: JSON.stringify(body),
      keepalive: true,
    });
    if (!response.ok && import.meta.env.MODE !== "production") {
      console.debug("[atlas] request failed", path, response.status);
    }
  } catch (error) {
    if (import.meta.env.MODE !== "production") {
      console.debug("[atlas] request error", path, error);
    }
  }
}

/** Track an event with the same property bag Mixpanel receives. */
export function atlasTrack(event: string, properties: Record<string, unknown> = {}) {
  if (!isAtlasReady()) return;
  const distinctId = (properties.distinct_id as string | undefined) || getDistinctId();
  void postAtlas("/track", {
    event,
    distinct_id: distinctId,
    properties: {
      ...properties,
      distinct_id: distinctId,
      platform: "ai_soc",
      timestamp: properties.timestamp || new Date().toISOString(),
    },
    token: TOKEN,
  });
}

/** Identify / upsert a user profile in Atlas. */
export function atlasIdentify(userId: string, traits: Record<string, unknown> = {}) {
  if (!isAtlasReady() || !userId) return;
  setDistinctId(userId);
  if (typeof window !== "undefined") {
    localStorage.setItem(TRAITS_KEY, JSON.stringify(traits));
  }
  void postAtlas("/identify", {
    distinct_id: userId,
    traits: {
      ...traits,
      platform: "ai_soc",
    },
    token: TOKEN,
  });
}

/** Clear local Atlas identity (mirrors Mixpanel reset). */
export function atlasReset() {
  if (!isAtlasReady()) {
    clearDistinctId();
    return;
  }
  const distinctId = getDistinctId();
  clearDistinctId();
  if (distinctId) {
    void postAtlas("/reset", { distinct_id: distinctId, token: TOKEN });
  }
}
