import mixpanel from 'mixpanel-browser';

const token = import.meta.env.NEXT_PUBLIC_MIXPANEL_TOKEN;

let ready = false;

if (typeof window !== 'undefined' && token) {
  mixpanel.init(token, {
    debug: import.meta.env.MODE !== 'production',
    track_pageview: true,
    persistence: 'localStorage',
    ignore_dnt: true,
  });
  ready = true;
}

export const mp = mixpanel;
export const isMixpanelReady = () => ready;

export function identifyUser(userId: string, traits: Record<string, unknown>) {
  if (!ready || !userId) return;
  mixpanel.identify(userId);
  mixpanel.people.set(traits);
}

export function trackEvent(event: string, props: Record<string, unknown> = {}) {
  if (!ready) return;
  mixpanel.track(event, {
    ...props,
    platform: 'ai_soc',
    timestamp: new Date().toISOString(),
    $insert_id: crypto.randomUUID(),
  });
}

export function resetMixpanel() {
  if (!ready) return;
  mixpanel.reset();
}

/** Map app profile roles onto Mixpanel SOC role taxonomy. */
export function mapSocRole(role?: string | null): string {
  if (!role) return 'soc_analyst';
  const normalized = role.toLowerCase();
  if (normalized.includes('lead') || normalized.includes('tier3') || normalized.includes('senior')) {
    return 'soc_lead';
  }
  if (normalized.includes('incident') || normalized.includes('manager') || normalized.includes('admin')) {
    return 'incident_manager';
  }
  if (normalized.includes('viewer') || normalized.includes('read')) {
    return 'viewer';
  }
  return 'soc_analyst';
}
