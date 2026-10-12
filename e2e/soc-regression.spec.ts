import { expect, test, type Page } from "@playwright/test";

const EMAIL = "analyst@soc.local";
const PASSWORD = "analyst123";

async function signIn(page: Page) {
  await page.goto("/auth");
  await page.locator("#signin-email").fill(EMAIL);
  await page.locator("#signin-password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign In" }).click();
  await expect(page.getByRole("heading", { name: "SoC-AI Portal" })).toBeVisible();
  await expect(page.getByRole("banner").getByText("Alex Rivera", { exact: true })).toBeVisible();
}

test.describe("authentication", () => {
  test("rejects a wrong password and keeps the analyst on the sign-in form", async ({ page }) => {
    await page.goto("/auth");
    await page.locator("#signin-email").fill(EMAIL);
    await page.locator("#signin-password").fill("not-the-password");
    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(page.getByText("Invalid email or password")).toBeVisible();
    await expect(page).toHaveURL(/\/auth$/);
    await expect(page.getByRole("heading", { name: "Alert Feed" })).toHaveCount(0);
  });

  test("signs in with the demo account and shows the analyst identity", async ({ page }) => {
    await signIn(page);
    await expect(page.getByRole("button", { name: "Sign Out" })).toBeVisible();
    await expect(page.getByText("Quick Stats")).toBeVisible();
  });

  test("signs out and returns to the sign-in form", async ({ page }) => {
    await signIn(page);
    await page.getByRole("button", { name: "Sign Out" }).click();
    await expect(page).toHaveURL(/\/auth$/);
    await expect(page.locator("#signin-email")).toBeVisible();
  });
});

test.describe("alert feed", () => {
  test.beforeEach(({ page }) => signIn(page));

  test("shows the synthetic feed and the active-alert counts", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Alert Feed" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Finance workstation beacon to Ledger Fox" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "USB storage policy violation" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Alert Feed/ })).toContainText("2");
    await expect(page.getByRole("button", { name: /Incidents/ })).toContainText("8");
    await expect(page.getByText("Total Alerts").locator("xpath=..")).toContainText("9");
  });

  test("severity filter hides alerts outside the selected level", async ({ page }) => {
    await page.getByRole("button", { name: "Low", exact: true }).click();
    await expect(page.getByRole("heading", { name: "USB storage policy violation" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Finance workstation beacon to Ledger Fox" })).toHaveCount(0);
    await page.getByRole("button", { name: "Critical", exact: true }).click();
    await expect(page.getByRole("heading", { name: "DDoS Attack Detected" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "USB storage policy violation" })).toHaveCount(0);
  });
});

test.describe("search and incidents", () => {
  test.beforeEach(({ page }) => signIn(page));

  test("header search finds alerts, incidents, and indicators", async ({ page }) => {
    await page.getByPlaceholder("Search alerts, IOCs, incidents...").fill("ledger");
    const menu = page.locator("div.absolute.top-11");
    await expect(menu.getByRole("button", { name: /Ledger Fox intrusion/ })).toBeVisible();
    await expect(menu.getByRole("button", { name: /Finance workstation beacon/ })).toBeVisible();
    await expect(menu.getByRole("button", { name: /Ledger Fox indicator/ })).toBeVisible();
  });

  test("opening an incident shows linked alerts and comments, then Escape closes it", async ({ page }) => {
    await page.getByRole("button", { name: /Incidents/ }).click();
    await expect(page.getByRole("heading", { name: "Incident Management" })).toBeVisible();
    await expect(page.getByText("Ledger Fox intrusion across finance hosts").first()).toBeVisible();
    const card = page
      .getByRole("heading", { name: "Ledger Fox intrusion across finance hosts" })
      .locator("xpath=ancestor::*[contains(@class,'p-6')][1]");
    await card.getByRole("button", { name: "View Details" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("heading", { name: "Ledger Fox intrusion across finance hosts" })).toBeVisible();
    await expect(dialog.getByText("Finance workstation beacon to Ledger Fox")).toBeVisible();
    await expect(dialog.getByText("Priya Shah").first()).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
  });
});

test.describe("collaboration, metrics, threats, and reports", () => {
  test.beforeEach(({ page }) => signIn(page));

  test("collaboration shows every comment type on the network alert", async ({ page }) => {
    await page.getByRole("button", { name: "Collaboration" }).click();
    await expect(page.getByText("Network alert discussion")).toBeVisible();
    await expect(page.getByText("Holding the host for containment review")).toBeVisible();
    await expect(page.getByText("Did the user open the attachment")).toBeVisible();
    await expect(page.getByText("Escalating to Tier 3")).toBeVisible();
    await expect(page.getByText("Containment is approved")).toBeVisible();
    await expect(page.getByPlaceholder("Add a comment...")).toBeVisible();
  });

  test("KPI cards show the dataset metrics", async ({ page }) => {
    await page.getByRole("button", { name: "KPI Metrics" }).click();
    for (const name of ["Total Alerts", "Critical Alerts", "Active Threat Indicators", "Open Incidents", "Mean Time to Detect", "Mean Time to Respond", "Resolution Rate", "False Positive Rate"]) {
      await expect(page.getByText(name, { exact: true }).first()).toBeVisible();
    }
    await expect(page.getByRole("button", { name: "Recalculate" })).toBeVisible();
  });

  test("threat map lists indicators and the correlation graph", async ({ page }) => {
    await page.getByRole("button", { name: "Threat Map" }).click();
    await expect(page.getByRole("heading", { name: "Global Threat Intelligence" })).toBeVisible();
    await expect(page.getByText("14 Active Indicators")).toBeVisible();
    await expect(page.getByText("185.220.101.182").first()).toBeVisible();
    await expect(page.getByText("Threat Correlation Analysis")).toBeVisible();
    await expect(page.locator(".react-flow")).toBeVisible();
  });

  test("reports load management and tier 3 templates, then the schedules", async ({ page }) => {
    await page.getByRole("button", { name: "Reports" }).click();
    await expect(page.getByRole("heading", { name: "Report Generator" })).toBeVisible();
    await expect(page.getByText("Executive Security Summary").first()).toBeVisible();
    await expect(page.getByText("SOC Performance Dashboard").first()).toBeVisible();
    await page.getByRole("combobox").first().click();
    await page.getByRole("option", { name: "Tier 3 Analysts" }).click();
    await expect(page.getByText("Incident Analysis Report")).toBeVisible();
    await expect(page.getByText("Threat Intelligence Summary")).toBeVisible();
    await page.getByRole("tab", { name: "Scheduled Reports" }).click();
    await expect(page.getByText("ciso@soc.local")).toBeVisible();
    await expect(page.getByText("soc-manager@soc.local")).toBeVisible();
  });
});

test.describe("assistant", () => {
  test.beforeEach(({ page }) => signIn(page));

  test("a lookup question is answered from the database without a model name", async ({ page }) => {
    await page.getByRole("button", { name: "AI Assistant" }).click();
    const box = page.getByPlaceholder("Ask me about security incidents, threats, or analysis...");
    await box.fill("failed login attempts");
    await box.locator("xpath=ancestor::form").locator('button[type="submit"]').click();
    await expect(page.getByText("From the alert store:").last()).toBeVisible();
    await expect(page.getByText("Failed Login Attempts").last()).toBeVisible();
    await expect(page.getByText("Fast path").last()).toBeVisible();
    await expect(page.getByText("database").last()).toBeVisible();
  });

  test("a summary question uses the fast-path model", async ({ page }) => {
    test.setTimeout(45_000);
    await page.getByRole("button", { name: "AI Assistant" }).click();
    const box = page.getByPlaceholder("Ask me about security incidents, threats, or analysis...");
    await box.fill("Summarize the phishing alert");
    await box.locator("xpath=ancestor::form").locator('button[type="submit"]').click();
    const reply = page.locator("div.bg-accent\\/50").filter({ hasText: "inclusionai/ling-3.0-flash-vl" }).last();
    await expect(reply.locator("div.whitespace-pre-wrap")).toContainText(/phish|mail|invoice|Email Security/i, { timeout: 30_000 });
    await expect(reply).toContainText("inclusionai/ling-3.0-flash-vl");
  });
});

test.describe("ux", () => {
  test("desktop layout does not scroll sideways and every section has a heading", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await signIn(page);
    const sections: Array<[string, string]> = [
      ["Alert Feed", "Alert Feed"],
      ["Incidents", "Incident Management"],
      ["AI Assistant", "AI Assistant"],
      ["Collaboration", "Network alert discussion"],
      ["KPI Metrics", "KPI Metrics"],
      ["Threat Map", "Global Threat Intelligence"],
      ["Reports", "Report Generator"],
    ];
    for (const [nav, heading] of sections) {
      await page.getByRole("button", { name: new RegExp(nav) }).click();
      const title = page.getByRole("heading", { name: heading }).or(page.getByText(heading, { exact: true }));
      await expect(title.first()).toBeVisible();
    }
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
    expect(errors).toEqual([]);
  });

  test("a narrow viewport keeps the alert heading reachable without a sideways page scroll", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await signIn(page);
    await expect(page.getByRole("heading", { name: "Alert Feed" })).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });

  test("icon-only controls expose an accessible name", async ({ page }) => {
    await signIn(page);
    const headerButtons = page.locator("header").getByRole("button");
    const count = await headerButtons.count();
    const unnamed: string[] = [];
    for (let index = 0; index < count; index += 1) {
      const button = headerButtons.nth(index);
      const name = (await button.getAttribute("aria-label")) || (await button.getAttribute("title")) || (await button.innerText());
      if (!name.trim()) unnamed.push(`header button ${index + 1}`);
    }
    await page.getByRole("button", { name: "AI Assistant" }).click();
    const send = page.locator('form button[type="submit"]');
    const sendName = (await send.getAttribute("aria-label")) || (await send.getAttribute("title")) || (await send.innerText());
    if (!sendName.trim()) unnamed.push("assistant send");
    expect(unnamed).toEqual([]);
  });

  test("an unknown route shows the not-found page", async ({ page }) => {
    await page.goto("/this-route-does-not-exist");
    await expect(page.getByRole("heading", { name: "404" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Return to Home" })).toBeVisible();
  });
});
