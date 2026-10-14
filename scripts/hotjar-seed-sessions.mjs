#!/usr/bin/env node
/**
 * Local Hotjar seed fixtures for this portal.
 * These sessions are not sent to Hotjar. Personas are tagged synthetic.
 *
 *   node scripts/hotjar-seed-sessions.mjs          # 50 sessions
 *   node scripts/hotjar-seed-sessions.mjs 250
 *   node scripts/hotjar-seed-sessions.mjs 1000
 */
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SITE_ID = 1058676;
const VERSION = 6;
const SEED = 1058676;
const ALLOWED_COUNTS = new Set([50, 250, 1000]);

const FUNNEL = [
  "signed_in",
  "section_alerts",
  "severity_filtered",
  "search_used",
  "section_incidents",
  "incident_opened",
  "incident_closed",
  "section_assistant",
  "assistant_lookup",
  "section_reports",
  "report_viewed",
];

function mulberry32(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function hashFor(index) {
  return createHash("sha256").update(`soc-hotjar-synthetic:${SEED}:${index}`).digest("hex");
}

export function generateSyntheticHotjarSessions(count = 50, seed = SEED) {
  const random = mulberry32(seed);
  return Array.from({ length: count }, (_, index) => {
    const roll = random();
    const stopAt = roll < 0.15 ? 1 : roll < 0.35 ? 4 : roll < 0.6 ? 7 : FUNNEL.length;
    const mobile = random() < 0.3;
    const rageClicks = mobile && random() < 0.45 ? 1 + Math.floor(random() * 3) : random() < 0.08 ? 1 : 0;
    const uTurns = random() < 0.2 ? 1 : 0;
    const events = FUNNEL.slice(0, stopAt);
    if (uTurns > 0 && events.includes("section_incidents")) events.push("section_alerts");
    return {
      userIdHash: hashFor(index),
      user_role: "analyst_tier2",
      account_tier: "tier2",
      device: mobile ? "mobile" : "desktop",
      synthetic: true,
      durationSec: 30 + Math.floor(random() * 870),
      events,
      rageClicks,
      uTurns,
    };
  });
}

async function main() {
  const requested = Number.parseInt(process.argv[2] ?? "50", 10);
  if (!ALLOWED_COUNTS.has(requested)) {
    console.error("Session count must be 50, 250, or 1000.");
    process.exit(1);
  }
  const sessions = generateSyntheticHotjarSessions(requested, SEED);
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const directory = path.join(root, "data", "hotjar");
  await mkdir(directory, { recursive: true });
  const file = path.join(directory, `sessions-${requested}.json`);
  const reachedReport = sessions.filter((session) => session.events.includes("report_viewed")).length;
  const body = {
    siteId: SITE_ID,
    version: VERSION,
    seed: SEED,
    count: sessions.length,
    synthetic: true,
    note: "Local fixtures only. Not uploaded to Hotjar. No alert text, addresses, or email.",
    sessions,
  };
  await writeFile(file, `${JSON.stringify(body, null, 2)}\n`);
  console.log(
    `Wrote ${sessions.length} synthetic sessions to ${path.relative(root, file)}. ${reachedReport} reach report_viewed.`,
  );
}

const invokedDirectly = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (invokedDirectly) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
