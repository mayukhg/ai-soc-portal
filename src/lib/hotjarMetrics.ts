export type HotjarSeedSession = {
  userIdHash: string;
  user_role: string;
  account_tier: string;
  device: "desktop" | "mobile";
  synthetic: boolean;
  durationSec: number;
  events: string[];
  rageClicks: number;
  uTurns: number;
};

export type HotjarSeedFile = {
  siteId: number;
  version: number;
  seed: number;
  count: number;
  synthetic: boolean;
  sessions: HotjarSeedSession[];
};

export const HOTJAR_FUNNEL = [
  ["signed_in", "Signed in"],
  ["section_alerts", "Alert feed"],
  ["severity_filtered", "Severity filter"],
  ["search_used", "Search"],
  ["section_incidents", "Incidents"],
  ["incident_opened", "Incident opened"],
  ["incident_closed", "Incident closed"],
  ["section_assistant", "Assistant"],
  ["assistant_lookup", "Lookup answer"],
  ["section_reports", "Reports"],
  ["report_viewed", "Report viewed"],
] as const;

export function isFrustrated(session: HotjarSeedSession) {
  return session.rageClicks > 0 || session.uTurns > 0;
}

export function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}m ${remainder.toString().padStart(2, "0")}s`;
}

export function funnelCounts(sessions: HotjarSeedSession[]) {
  return HOTJAR_FUNNEL.map(([event, label], index) => {
    const reached = sessions.filter((session) => session.events.includes(event)).length;
    const previous = index === 0
      ? sessions.length
      : sessions.filter((session) => session.events.includes(HOTJAR_FUNNEL[index - 1][0])).length;
    return {
      event,
      label,
      reached,
      previous,
      stepRate: previous === 0 ? 0 : reached / previous,
      overallRate: sessions.length === 0 ? 0 : reached / sessions.length,
      dropOff: Math.max(previous - reached, 0),
    };
  });
}

export function averageDuration(sessions: HotjarSeedSession[]) {
  if (sessions.length === 0) return 0;
  const total = sessions.reduce((sum, session) => sum + session.durationSec, 0);
  return Math.round(total / sessions.length);
}
