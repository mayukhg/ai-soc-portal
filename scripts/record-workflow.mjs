import { mkdir } from "node:fs/promises";
import path from "node:path";
import { chromium, expect } from "@playwright/test";

const baseURL = process.env.SOC_BASE_URL || "http://127.0.0.1:8080";
const outDir = path.resolve("recordings");
const webmPath = path.join(outDir, "ai-soc-portal-end-to-end.webm");

async function hold(page, ms = 1400) {
  await page.waitForTimeout(ms);
}

async function typeInto(locator, value) {
  await locator.click();
  await locator.fill("");
  await locator.pressSequentially(value, { delay: 45 });
}

async function ask(page, question) {
  const box = page.getByPlaceholder("Ask me about security incidents, threats, or analysis...");
  await box.scrollIntoViewIfNeeded();
  await typeInto(box, question);
  await hold(page, 500);
  const answer = page.waitForResponse(
    (response) => response.url().includes("/api/functions/ai-assistant") && response.ok(),
    { timeout: 35_000 },
  );
  await box.locator("xpath=ancestor::form").locator('button[type="submit"]').click();
  await answer;
}

async function record() {
  await mkdir(outDir, { recursive: true });
  const browser = await chromium.launch({ headless: true, slowMo: 60 });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    recordVideo: { dir: outDir, size: { width: 1440, height: 900 } },
  });
  const page = await context.newPage();
  const video = page.video();
  let failure = null;

  try {
    console.log("sign-in");
    await page.goto(`${baseURL}/auth`);
    await expect(page.locator("#signin-email")).toBeVisible();
    await hold(page, 1200);

    await typeInto(page.locator("#signin-email"), "analyst@soc.local");
    await typeInto(page.locator("#signin-password"), "not-the-password");
    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(page.getByText("Invalid email or password")).toBeVisible();
    await hold(page, 1600);

    await typeInto(page.locator("#signin-password"), "analyst123");
    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(page.getByRole("heading", { name: "Alert Feed" })).toBeVisible();
    await expect(page.getByRole("banner").getByText("Alex Rivera", { exact: true })).toBeVisible();
    await hold(page, 1600);

    console.log("alerts");
    await page.getByRole("heading", { name: "Finance workstation beacon to Ledger Fox" }).scrollIntoViewIfNeeded();
    await hold(page, 1200);
    await page.getByRole("button", { name: "Low", exact: true }).click();
    await expect(page.getByRole("heading", { name: "USB storage policy violation" })).toBeVisible();
    await hold(page, 1400);
    await page.getByRole("button", { name: "Critical", exact: true }).click();
    await expect(page.getByRole("heading", { name: "DDoS Attack Detected" })).toBeVisible();
    await hold(page, 1400);
    await page.getByRole("button", { name: "All", exact: true }).click();
    await hold(page, 800);

    console.log("search");
    const search = page.getByPlaceholder("Search alerts, IOCs, incidents...");
    await typeInto(search, "ledger");
    const menu = page.locator("div.absolute.top-11");
    await expect(menu.getByRole("button", { name: /Ledger Fox intrusion/ })).toBeVisible();
    await expect(menu.getByRole("button", { name: /Finance workstation beacon/ })).toBeVisible();
    await expect(menu.getByRole("button", { name: /Ledger Fox indicator/ })).toBeVisible();
    await hold(page, 1800);
    await menu.getByRole("button", { name: /Ledger Fox intrusion/ }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("heading", { name: "Ledger Fox intrusion across finance hosts" })).toBeVisible();
    await expect(dialog.getByText("Finance workstation beacon to Ledger Fox")).toBeVisible();
    await expect(dialog.getByText("Priya Shah").first()).toBeVisible();
    await hold(page, 2200);
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(page.getByRole("heading", { name: "Incident Management" })).toBeVisible();
    await hold(page, 1400);

    console.log("assistant");
    await page.getByRole("button", { name: "AI Assistant" }).click();
    await expect(page.getByRole("heading", { name: "AI Assistant", exact: true })).toBeVisible();
    await hold(page, 800);
    await ask(page, "failed login attempts");
    const lookup = page.locator("div.whitespace-pre-wrap").filter({ hasText: "From the alert store:" }).last();
    await expect(lookup).toBeVisible();
    await lookup.scrollIntoViewIfNeeded();
    await hold(page, 2000);

    await ask(page, "Summarize the phishing alert");
    const reply = page.locator("div.bg-accent\\/50").filter({ hasText: "inclusionai/ling-3.0-flash-vl" }).last();
    await expect(reply).toBeVisible({ timeout: 30_000 });
    await reply.scrollIntoViewIfNeeded();
    await hold(page, 2500);

    console.log("collaboration");
    await page.getByRole("button", { name: "Collaboration" }).click();
    const note = page.getByText("Holding the host for containment review");
    await expect(note).toBeVisible();
    await note.scrollIntoViewIfNeeded();
    await expect(page.getByText("Containment is approved")).toBeVisible();
    await hold(page, 2000);

    await page.getByRole("button", { name: "KPI Metrics" }).click();
    await expect(page.getByText("Mean Time to Detect", { exact: true }).first()).toBeVisible();
    await page.getByText("False Positive Rate", { exact: true }).first().scrollIntoViewIfNeeded();
    await hold(page, 2000);

    await page.getByRole("button", { name: "Threat Map" }).click();
    await expect(page.getByText("14 Active Indicators")).toBeVisible();
    await hold(page, 1400);
    const graph = page.locator(".react-flow");
    await graph.scrollIntoViewIfNeeded();
    await expect(graph).toBeVisible();
    await hold(page, 2000);

    await page.getByRole("button", { name: "Reports" }).click();
    await expect(page.getByText("Executive Security Summary").first()).toBeVisible();
    await hold(page, 1400);
    await page.getByRole("combobox").first().click();
    await page.getByRole("option", { name: "Tier 3 Analysts" }).click();
    await expect(page.getByText("Incident Analysis Report")).toBeVisible();
    await hold(page, 1600);
    await page.getByRole("tab", { name: "Scheduled Reports" }).click();
    await expect(page.getByText("ciso@soc.local")).toBeVisible();
    await hold(page, 1800);

    await page.getByRole("button", { name: "Sign Out" }).click();
    await expect(page.locator("#signin-email")).toBeVisible();
    await hold(page, 1400);
    console.log("done");
  } catch (error) {
    failure = error;
    console.error(error);
    await page.screenshot({ path: path.join(outDir, "record-failure.png"), fullPage: true }).catch(() => {});
  } finally {
    await context.close();
    if (video) await video.saveAs(webmPath);
    await browser.close();
  }
  if (failure) throw failure;
}

record()
  .then(() => {
    console.log(webmPath);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
