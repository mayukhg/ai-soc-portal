import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium, expect } from "@playwright/test";

const baseURL = process.env.SOC_BASE_URL || "http://127.0.0.1:8080";
const outDir = path.resolve("recordings");
const webmPath = path.join(outDir, "soc-pm-interview-demo.webm");
const cuePath = path.join(outDir, "soc-pm-interview-demo.cues.json");

const cues = [];
let started = 0;

async function cue(page, text) {
  const at = Date.now() - started;
  cues.push({ at, text });
  console.log(`${(at / 1000).toFixed(1)}s  ${text.split("\n")[0]}`);
  await page.evaluate((value) => {
    const el = document.getElementById("pm-caption-text");
    if (el) el.textContent = value;
  }, text);
}

async function hold(page, ms = 5600) {
  await page.waitForTimeout(ms);
}

async function typeInto(locator, value) {
  await locator.click();
  await locator.fill("");
  await locator.pressSequentially(value, { delay: 35 });
}

async function record() {
  await mkdir(outDir, { recursive: true });
  const browser = await chromium.launch({ headless: true, slowMo: 40 });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    recordVideo: { dir: outDir, size: { width: 1440, height: 900 } },
  });
  const page = await context.newPage();
  await page.addInitScript(() => {
    const mount = () => {
      if (document.getElementById("pm-caption")) return;
      const bar = document.createElement("div");
      bar.id = "pm-caption";
      bar.style.cssText = "position:fixed;left:40px;right:40px;bottom:24px;z-index:2147483647;pointer-events:none;display:flex;justify-content:center;";
      const box = document.createElement("div");
      box.id = "pm-caption-text";
      box.style.cssText = "max-width:1040px;background:rgba(8,10,14,0.9);color:#f5f7fb;font:600 24px/1.35 Helvetica,Arial,sans-serif;padding:14px 22px;border-radius:12px;text-align:center;white-space:pre-line;";
      bar.appendChild(box);
      document.body.appendChild(bar);
    };
    if (document.body) mount();
    else document.addEventListener("DOMContentLoaded", mount);
  });
  const video = page.video();
  started = Date.now();
  let failure = null;

  try {
    await page.goto(`${baseURL}/auth`);
    await expect(page.locator("#signin-email")).toBeVisible();
    await cue(page, "The job is triage under alert fatigue.\nAnalysts were losing the incident across the SIEM, the mailbox, and the ticket.");
    await hold(page);

    await typeInto(page.locator("#signin-email"), "analyst@soc.local");
    await typeInto(page.locator("#signin-password"), "not-the-password");
    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(page.getByText("Invalid email or password")).toBeVisible();
    await cue(page, "Access is role-based.\nA failed sign-in stays on this screen, so the queue is never exposed.");
    await hold(page, 4200);

    await typeInto(page.locator("#signin-password"), "analyst123");
    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(page.getByRole("heading", { name: "Alert Feed" })).toBeVisible();
    await expect(page.getByRole("banner").getByText("Alex Rivera", { exact: true })).toBeVisible();
    await cue(page, "Alex is the tier-2 analyst.\nThe home screen is the queue, and the red badge is the critical count.");
    await hold(page);

    await page.getByRole("button", { name: "Low", exact: true }).click();
    await expect(page.getByRole("heading", { name: "USB storage policy violation" })).toBeVisible();
    await cue(page, "Severity is the first prioritization cut.\nLow stays in the product, but it does not sit on top of an active intrusion.");
    await hold(page);

    await page.getByRole("button", { name: "Critical", exact: true }).click();
    await expect(page.getByRole("heading", { name: "DDoS Attack Detected" })).toBeVisible();
    await cue(page, "Critical is the interrupt.\nThe filter is a product choice: fewer cards, faster judgment.");
    await hold(page);

    await page.getByRole("button", { name: "All", exact: true }).click();
    const beacon = page.getByRole("heading", { name: "Finance workstation beacon to Ledger Fox" });
    await expect(beacon).toBeVisible();
    await beacon.scrollIntoViewIfNeeded();
    await cue(page, "Owner, source, and asset are on the card.\nThe next click should be a decision, not a lookup in another tool.");
    await hold(page);

    const search = page.getByPlaceholder("Search alerts, IOCs, incidents...");
    await typeInto(search, "ledger");
    const menu = page.locator("div.absolute.top-11");
    await expect(menu.getByRole("button", { name: /Ledger Fox intrusion/ })).toBeVisible();
    await expect(menu.getByRole("button", { name: /Ledger Fox indicator/ })).toBeVisible();
    await cue(page, "One search returns the incident, the alert, and the indicator.\nThat is the response to switching between tools.");
    await hold(page);
    await menu.getByRole("button", { name: /Ledger Fox intrusion/ }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText("Finance workstation beacon to Ledger Fox")).toBeVisible();
    await cue(page, "Ledger Fox is one campaign.\nThe invoice mail, the beacon, and the network sessions are linked here instead of in a spreadsheet.");
    await hold(page, 6200);
    await dialog.getByText("Priya Shah").first().scrollIntoViewIfNeeded();
    await cue(page, "Ownership is explicit. Priya leads the case.\nThe notes stay on the incident, so the handoff is not a side channel.");
    await hold(page);

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(page.getByRole("heading", { name: "Incident Management" })).toBeVisible();
    await cue(page, "The list is what a lead scans.\nSeverity, status, owner, and how many alerts sit under the case.");
    await hold(page, 4800);

    await page.getByRole("button", { name: "AI Assistant" }).click();
    await expect(page.getByRole("heading", { name: "AI Assistant", exact: true })).toBeVisible();
    const box = page.getByPlaceholder("Ask me about security incidents, threats, or analysis...");
    await box.scrollIntoViewIfNeeded();
    await typeInto(box, "failed login attempts");
    const answer = page.waitForResponse(
      (response) => response.url().includes("/api/functions/ai-assistant") && response.ok(),
      { timeout: 20_000 },
    );
    await box.locator("xpath=ancestor::form").locator('button[type="submit"]').click();
    await answer;
    const lookup = page.locator("div.whitespace-pre-wrap").filter({ hasText: "From the alert store:" }).last();
    await expect(lookup).toBeVisible();
    await page.evaluate(() => {
      const rows = [...document.querySelectorAll("div.whitespace-pre-wrap")]
        .map((node) => node.closest("div.flex.items-start"))
        .filter(Boolean);
      const unique = [...new Set(rows)];
      unique.slice(0, -2).forEach((row) => {
        row.style.display = "none";
      });
    });
    await lookup.scrollIntoViewIfNeeded();
    await cue(page, "This question does not spend a model.\nIt is answered from the alert store and labeled database, so a lookup stays cheap and checkable.");
    await hold(page, 6400);
    await cue(page, "Language summaries use a low-cost model.\nOnly campaign and correlation questions earn the expensive models. Cost and trust were separate decisions.");
    await hold(page, 6400);

    await page.getByRole("button", { name: "Collaboration" }).click();
    const note = page.getByText("Holding the host for containment review");
    await expect(note).toBeVisible();
    await note.scrollIntoViewIfNeeded();
    await cue(page, "Handoff has types, not a single chat box.\nA note, a question, an escalation to tier 3, and a resolution.");
    await hold(page, 6400);

    await page.getByRole("button", { name: "KPI Metrics" }).click();
    const detect = page.getByText("Mean Time to Detect", { exact: true }).first();
    await expect(detect).toBeVisible();
    await detect.scrollIntoViewIfNeeded();
    await cue(page, "These are the outcomes for a SOC manager.\nDetect time, response time, and the false-positive rate. Volume alone is not progress.");
    await hold(page, 6400);

    await page.getByRole("button", { name: "Threat Map" }).click();
    await expect(page.getByText("14 Active Indicators")).toBeVisible();
    await page.getByText("185.220.101.182").first().scrollIntoViewIfNeeded();
    await cue(page, "Indicators stay with the campaign.\nThe invoice site, the billing address, and the beacon address are in one place.");
    await hold(page);
    const graph = page.locator(".react-flow");
    await graph.scrollIntoViewIfNeeded();
    await expect(graph).toBeVisible();
    await cue(page, "The graph is the correlation analysts used to do by hand.\nA relationship should be visible without opening a second console.");
    await hold(page, 6200);

    await page.getByRole("button", { name: "Reports" }).click();
    await expect(page.getByText("Executive Security Summary").first()).toBeVisible();
    await cue(page, "Reports are split by the reader.\nManagement gets the executive summary. Every role does not get the same document.");
    await hold(page);
    await page.getByRole("combobox").first().click();
    await page.getByRole("option", { name: "Tier 3 Analysts" }).click();
    await expect(page.getByText("Incident Analysis Report")).toBeVisible();
    await cue(page, "Tier 3 gets the incident write-up and the threat summary.\nSame underlying records, a different job to be done.");
    await hold(page);
    await page.getByRole("tab", { name: "Scheduled Reports" }).click();
    await expect(page.getByText("ciso@soc.local")).toBeVisible();
    await cue(page, "The cadence goes to the CISO and the SOC manager.\nThe analyst is not the person who should remember the export.");
    await hold(page, 6200);

    await page.getByRole("button", { name: "Sign Out" }).click();
    await expect(page.locator("#signin-email")).toBeVisible();
    await cue(page, "The loop is triage, correlate, hand off, measure, and report.\nEach screen exists because it removes a wait or a tool switch.");
    await hold(page, 5200);
    console.log("done");
  } catch (error) {
    failure = error;
    console.error(error);
    await page.screenshot({ path: path.join(outDir, "pm-demo-failure.png"), fullPage: true }).catch(() => {});
  } finally {
    const ended = Date.now() - started;
    await writeFile(cuePath, JSON.stringify({ started, ended, cues }, null, 2));
    await context.close();
    if (video) await video.saveAs(webmPath);
    await browser.close();
  }
  if (failure) throw failure;
}

record()
  .then(() => console.log(webmPath))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
