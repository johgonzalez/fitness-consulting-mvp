/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("node:fs");
const path = require("node:path");

const playwrightModule = process.env.PPERFIL_PLAYWRIGHT_MODULE || "playwright";
const { chromium } = require(playwrightModule);

const baseUrl = process.env.PPERFIL_QA_URL || "http://localhost:3000/p/thiago-costa/";
const outputDir = path.resolve(process.cwd(), "docs", "screenshots", "motion");
fs.mkdirSync(outputDir, { recursive: true });

async function revealPage(page) {
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < height; y += 650) {
    await page.evaluate((scrollY) => window.scrollTo(0, scrollY), y);
    await page.waitForTimeout(80);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(250);
}

async function capture(browser, name, viewport) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));

  const response = await page.goto(baseUrl, { waitUntil: "networkidle", timeout: 45000 });
  await page.waitForTimeout(850);
  await page.screenshot({ path: path.join(outputDir, `${name}-hero.png`) });

  const initial = await page.evaluate(() => ({
    status: document.readyState,
    title: document.title,
    h1: document.querySelector("h1")?.textContent?.trim(),
    pageWidth: document.documentElement.scrollWidth,
    viewportWidth: window.innerWidth,
    bodyHeight: document.documentElement.scrollHeight,
  }));

  await revealPage(page);
  await page.screenshot({ path: path.join(outputDir, `${name}-full.png`), fullPage: true });

  const controls = await page.locator("a,button").evaluateAll((elements) => elements
    .map((element) => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return { label: (element.textContent || element.getAttribute("aria-label") || "").trim().slice(0, 60), width: rect.width, height: rect.height, display: style.display, visibility: style.visibility };
    })
    .filter((item) => item.width > 0 && item.height > 0 && item.display !== "none" && item.visibility !== "hidden")
    .filter((item) => item.width < 44 || item.height < 44));

  const progressTab = page.getByRole("tab", { name: "Progresso" });
  await progressTab.scrollIntoViewIfNeeded();
  await progressTab.click();
  await page.waitForTimeout(300);
  const selectedProgress = await progressTab.getAttribute("aria-selected");
  await page.locator("section").filter({ has: progressTab }).screenshot({ path: path.join(outputDir, `${name}-interactive.png`) }).catch(() => {});

  await context.close();
  return { name, httpStatus: response?.status(), initial, smallControls: controls, selectedProgress, consoleErrors, pageErrors };
}

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.PPERFIL_BROWSER_EXECUTABLE });
  try {
    const mobile = await capture(browser, "motion-mobile-390x844", { width: 390, height: 844 });
    const desktop = await capture(browser, "motion-desktop-1440x900", { width: 1440, height: 900 });
    process.stdout.write(`${JSON.stringify({ baseUrl, mobile, desktop }, null, 2)}\n`);
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
