import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const baseUrl = process.env.PPERFIL_QA_BASE_URL ?? "http://localhost:3000";
const chromePath = process.env.PPERFIL_QA_CHROME ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";
const output = path.resolve("docs/screenshots/sprint3b");
const errors = [];
const scope = process.env.PPERFIL_QA_SCOPE ?? "all";

const trainerScreens = [
  ["list", "/dashboard/assessments"],
  ["new", "/dashboard/assessments/new"],
  ["draft", "/dashboard/assessments/d3100000-0000-4000-8000-000000000001"],
  ["sent", "/dashboard/assessments/d3100000-0000-4000-8000-000000000002"],
  ["answered", "/dashboard/assessments/d3100000-0000-4000-8000-000000000003"],
  ["completed", "/dashboard/assessments/d3100000-0000-4000-8000-000000000004"],
];

async function hideDevTools(page) {
  await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });
}

async function openDemo(page, theme) {
  await page.addInitScript((selectedTheme) => localStorage.setItem("pperfil-theme", selectedTheme), theme);
  await page.goto(`${baseUrl}/demo`, { waitUntil: "networkidle" });
}

async function capture(page, filename) {
  await hideDevTools(page);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  if (overflow) errors.push(`horizontal-overflow:${filename}`);
  await page.screenshot({ path: path.join(output, filename), fullPage: false });
}

async function captureTrainer(browser, theme, viewport, label) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  page.on("console", (message) => { if (message.type() === "error") errors.push(`console:${label}:${message.text()}`); });
  page.on("pageerror", (error) => errors.push(`page:${label}:${error.message}`));
  await openDemo(page, theme);
  for (const [name, route] of trainerScreens) {
    await page.goto(`${baseUrl}${route}`, { waitUntil: "networkidle" });
    await capture(page, `trainer-${name}-${label}-${theme}.png`);
  }
  await context.close();
}

async function advanceStudentFlow(page) {
  await page.getByRole("button", { name: "Começar" }).click();
  await capture(page, `student-question-390x844-${await page.evaluate(() => document.documentElement.dataset.theme)}.png`);
  await page.locator("input[type=number]").fill("10");
  await page.getByRole("button", { name: /Continuar/ }).click();
  await page.getByRole("button", { name: "7" }).click();
  await page.getByRole("button", { name: /Continuar/ }).click();
  await page.getByRole("button", { name: "8" }).click();
  await page.getByRole("button", { name: /Continuar/ }).click();
  await page.getByRole("button", { name: /Continuar/ }).click();
  await page.getByRole("button", { name: /Continuar/ }).click();
  await page.getByRole("button", { name: "9" }).click();
  await page.getByRole("button", { name: /Continuar/ }).click();
  await page.getByRole("button", { name: /Continuar/ }).click();
  await page.locator("textarea").fill("Manter três treinos por semana com boa execução.");
  await page.getByRole("button", { name: /Continuar/ }).click();
  await capture(page, `student-measurement-390x844-${await page.evaluate(() => document.documentElement.dataset.theme)}.png`);
  await page.getByRole("button", { name: /Continuar/ }).click();
  await page.getByRole("button", { name: /Revisar/ }).click();
  await capture(page, `student-review-390x844-${await page.evaluate(() => document.documentElement.dataset.theme)}.png`);
  await page.getByRole("button", { name: "Enviar avaliação" }).click();
  await page.getByRole("button", { name: "Confirmar envio" }).click();
  await page.getByText("Avaliação concluída com sucesso").waitFor();
  await capture(page, `student-success-390x844-${await page.evaluate(() => document.documentElement.dataset.theme)}.png`);
}

async function captureStudent(browser, theme) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  page.on("console", (message) => { if (message.type() === "error") errors.push(`console:student:${theme}:${message.text()}`); });
  page.on("pageerror", (error) => errors.push(`page:student:${theme}:${error.message}`));
  await openDemo(page, theme);
  await page.goto(`${baseUrl}/student/assessments/d3100000-0000-4000-8000-000000000002`, { waitUntil: "networkidle" });
  await page.evaluate(() => localStorage.removeItem("pperfil-demo-assessment:d3100000-0000-4000-8000-000000000002"));
  await page.reload({ waitUntil: "networkidle" });
  await capture(page, `student-intro-390x844-${theme}.png`);
  await advanceStudentFlow(page);
  await page.goto(`${baseUrl}/student/assessments/d3100000-0000-4000-8000-000000000004`, { waitUntil: "networkidle" });
  await capture(page, `student-completed-390x844-${theme}.png`);
  await context.close();
}

const browser = await chromium.launch({ headless: true, executablePath: chromePath });
try {
  for (const theme of ["light", "dark"]) {
    if (scope !== "student") {
      await captureTrainer(browser, theme, { width: 1440, height: 900 }, "1440x900");
      await captureTrainer(browser, theme, { width: 390, height: 844 }, "390x844");
    }
    if (scope !== "trainer") await captureStudent(browser, theme);
  }
} finally {
  await browser.close();
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
} else {
  console.log("Sprint 3B visual QA captures completed without console errors or horizontal overflow.");
}
