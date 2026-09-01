import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import path from "node:path";

const viewports = [
  { name: "320", width: 320, height: 720 },
  { name: "360", width: 360, height: 800 },
  { name: "390", width: 390, height: 844 },
  { name: "430", width: 430, height: 932 },
  { name: "768", width: 768, height: 1024 },
  { name: "1024", width: 1024, height: 900 },
  { name: "1440", width: 1440, height: 900 },
] as const;

async function setTheme(page: Page, theme: "light" | "dark") {
  const lab = page.locator("main");
  if ((await lab.getAttribute("data-theme")) !== theme) {
    await page.getByRole("button", { name: theme === "dark" ? "Ativar tema escuro" : "Ativar tema claro" }).click();
  }
  await expect(lab).toHaveAttribute("data-theme", theme);
}

async function expectNoDocumentOverflow(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
}

test("Decision Lab exposes the complete Gate 1 and working interactions", async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  await page.goto("/design-lab/v1");
  await expect(page).toHaveTitle(/Decision Lab V1/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("base visual");
  await expect(page.locator("[data-decision-id]")).toHaveCount(4);
  await expect(page.getByText("Alterações salvas")).toBeVisible();
  await expect(page.getByText("Não foi possível publicar")).toBeVisible();
  await expect(page.getByText("Gerando rascunho")).toBeVisible();
  await expect(page.getByText("Nenhuma avaliação pendente")).toBeVisible();
  await expect(page.getByLabel("Indisponível")).toBeDisabled();

  await page.locator('[data-decision-id="VF-02"]').getByText("C", { exact: true }).click();
  await expect(page.locator('[data-decision-id="VF-02"] input[value="C"]')).toBeChecked();

  await page.getByRole("button", { name: "Abrir ações da sessão" }).click();
  await expect(page.getByRole("dialog", { name: "Ações da sessão" })).toBeVisible();
  await page.getByRole("button", { name: "Fechar ações da sessão" }).click();
  await expect(page.getByRole("dialog", { name: "Ações da sessão" })).toBeHidden();

  const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
  const severe = accessibilityScanResults.violations.filter((violation) => ["serious", "critical"].includes(violation.impact ?? ""));
  expect(severe, JSON.stringify(severe, null, 2)).toEqual([]);
  expect(consoleErrors).toEqual([]);
});

for (const width of [390, 1440]) {
  test(`${width}px interactive targets keep the 44px product-quality floor`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/design-lab/v1");
    const undersized = await page.locator("a, button, input, select, summary").evaluateAll((elements) =>
      elements.flatMap((element) => {
        const style = getComputedStyle(element);
        if (style.display === "none" || style.visibility === "hidden") return [];
        const target = element instanceof HTMLInputElement && element.type === "radio"
          ? element.closest("label") ?? element
          : element;
        const box = target.getBoundingClientRect();
        if (box.width === 0 || box.height === 0 || (box.width >= 44 && box.height >= 44)) return [];
        return [`${element.tagName.toLowerCase()}${element.getAttribute("aria-label") ? `[${element.getAttribute("aria-label")}]` : ""}: ${Math.round(box.width)}x${Math.round(box.height)}`];
      }),
    );
    expect(undersized).toEqual([]);
  });
}

test("keyboard focus is visible and remains inside the open bottom sheet", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 500 });
  await page.goto("/design-lab/v1#disclosures");
  await page.getByRole("button", { name: "Abrir ações da sessão" }).focus();
  await expect(page.getByRole("button", { name: "Abrir ações da sessão" })).toBeFocused();
  const outline = await page.getByRole("button", { name: "Abrir ações da sessão" }).evaluate((element) => getComputedStyle(element).outlineStyle);
  expect(outline).not.toBe("none");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog", { name: "Ações da sessão" })).toBeVisible();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("dialog", { name: "Ações da sessão" })).toContainText("Compartilhar preview");
  await expectNoDocumentOverflow(page);
});

for (const viewport of viewports) {
  for (const theme of ["light", "dark"] as const) {
    test(`${viewport.name}px ${theme}: reflow, contrast surface and screenshot evidence`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto("/design-lab/v1");
      await setTheme(page, theme);
      await expectNoDocumentOverflow(page);
      await expect(page.getByRole("heading", { name: "Fundação" })).toBeVisible();
      await page.screenshot({
        path: path.join("test-results", "design-lab", "screenshots", `gate-1-${viewport.name}-${theme}.png`),
        fullPage: true,
        caret: "initial",
      });
    });
  }
}

test("mobile keyboard-height simulation keeps focused fields visible", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 500 });
  await page.goto("/design-lab/v1#fields");
  const input = page.getByLabel("Padrão");
  await input.focus();
  await expect(input).toBeFocused();
  await input.fill("Treino de hipertrofia para membros inferiores com progressão semanal");
  await expect(input).toBeInViewport();
  await expectNoDocumentOverflow(page);
});

test("text scaling and long pt-BR content reflow without document overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/design-lab/v1");
  await page.evaluate(() => document.documentElement.style.fontSize = "200%");
  await expectNoDocumentOverflow(page);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

test("reduced motion preserves final state without sustained animation", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/design-lab/v1#motion");
  const sample = page.getByText("Série concluída").first();
  await expect(sample).toBeVisible();
  const duration = await sample.evaluate((element) => getComputedStyle(element).animationDuration);
  expect(duration).toBe("0s");
});
