import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import path from "node:path";
import type { ApprovalArtifact } from "../../src/app/design-lab/v1/gate-1b";

const viewports = [{width:320,height:720},{width:360,height:800},{width:390,height:844},{width:430,height:932},{width:768,height:1024},{width:1024,height:900},{width:1440,height:900}] as const;
const decisions = { visualTerritory:"D", primaryButton:"B01", fieldSystem:"F02", iconography:"I02" } as const;

async function chooseAll(page: Page) {
  for (const [name,value] of [["visual-territory","D"],["primary-button","B01"],["field-system","F02"],["iconography","I02"]] as const) await page.locator(`input[name="${name}"][value="${value}"]`).check({force:true});
}
async function noOverflow(page: Page) { expect(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBeLessThanOrEqual(1); }
async function theme(page:Page,value:"light"|"dark") { const main=page.locator("main").first(); if(await main.getAttribute("data-theme")!==value) await page.getByRole("button",{name:value==="dark"?"Ativar tema escuro":"Ativar tema claro",exact:true}).click(); await expect(main).toHaveAttribute("data-theme",value); }

test("Gate 1B starts unbiased, requires all decisions and persists its draft", async ({page}) => {
  await page.goto("/design-lab/v1?gate1=draft");
  const lab=page.locator("main").first();
  await expect(page).toHaveTitle(/Decision Lab V1/);
  await expect(lab.getByRole("heading",{level:1})).toContainText("Escolha o sistema");
  await expect(lab.getByRole("radio")).toHaveCount(16);
  await expect(lab.getByRole("radio",{checked:true})).toHaveCount(0);
  await expect(lab.getByRole("button",{name:"Aprovar Gate 1B"})).toBeDisabled();
  await page.locator('input[name="visual-territory"][value="B"]').check({force:true});
  await page.reload();
  await expect(page.locator('input[name="visual-territory"][value="B"]')).toBeChecked();
  await chooseAll(page);
  await expect(page.getByRole("button",{name:"Aprovar Gate 1B"})).toBeEnabled();
});

test("combined preview keeps one system across Login, Dashboard and Workout", async ({page}) => {
  await page.goto("/design-lab/v1?gate1=draft"); await chooseAll(page);
  const preview=page.locator('[class*="productPreview"]');
  await expect(preview).toHaveAttribute("data-territory","D"); await expect(preview).toHaveAttribute("data-button","B01"); await expect(preview).toHaveAttribute("data-field","F02"); await expect(preview).toHaveAttribute("data-icons","I02");
  await expect(preview.getByText("Entre para continuar.")).toBeVisible();
  await page.getByRole("tab",{name:"Dashboard"}).click(); await expect(preview.getByText("O que precisa da sua atenção")).toBeVisible();
  await page.getByRole("tab",{name:"Workout",exact:true}).click(); await expect(preview.getByText("Agachamento livre")).toBeVisible();
});

test("approval confirmation locks controls and reopening requires its own confirmation", async ({page}) => {
  const artifact=(status:"APPROVED"|"REOPENED",revision:number):ApprovalArtifact=>({schemaVersion:1,gateId:"GATE_1B",revision,status,approvedAt:"2026-09-01T12:00:00.000Z",...(status==="REOPENED"?{reopenedAt:"2026-09-02T12:00:00.000Z"}:{}),branch:"codex/product-visual-foundation-v1",sourceCommit:"a".repeat(40),labVersion:"gate-1b.v1",labFingerprint:"b".repeat(64),decisions,preservedDecisions:{operationalRows:true,feedbackArchitecture:true,navigationArchitecture:true,motionDirection:true}});
  await page.route("**/api/design-lab/approval",async route=>{const body=route.request().postDataJSON() as {action:string};await route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({artifact:artifact(body.action==="approve"?"APPROVED":"REOPENED",body.action==="approve"?1:2)})});});
  await page.goto("/design-lab/v1?gate1=draft"); await chooseAll(page);
  const trigger=page.getByRole("button",{name:"Aprovar Gate 1B"}); await trigger.click();
  const dialog=page.getByRole("dialog",{name:/Você está aprovando/}); await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape"); await expect(dialog).toBeHidden(); await expect(trigger).toBeFocused();
  await trigger.click(); await dialog.getByRole("button",{name:"Aprovar fundação visual"}).click();
  await expect(page.getByText("Gate 1B aprovado. Fundação visual registrada.")).toBeVisible(); await expect(page.locator("main").first().getByRole("radio").first()).toBeDisabled();
  const reopen=page.locator("#approval").getByRole("button",{name:"Reabrir decisões"}); await reopen.click(); const reopenDialog=page.getByRole("dialog",{name:"Reabrir decisões?"}); await expect(reopenDialog).toBeVisible();
  await reopenDialog.getByRole("button",{name:"Reabrir Gate 1B"}).click(); await expect(page.getByText(/Gate 1B reaberto/)).toBeVisible(); await expect(page.locator("main").first().getByRole("radio").first()).toBeEnabled();
});

test("keyboard selection, dialogs and serious accessibility violations", async ({page}) => {
  await page.setViewportSize({width:390,height:844}); await page.goto("/design-lab/v1?gate1=draft");
  const radio=page.locator('input[name="visual-territory"][value="A"]'); await radio.focus(); await page.keyboard.press("Space"); await expect(radio).toBeChecked();
  const scan=await new AxeBuilder({page}).analyze(); expect(scan.violations.filter(v=>["serious","critical"].includes(v.impact??"")),JSON.stringify(scan.violations,null,2)).toEqual([]);
});

for (const viewport of viewports) for (const mode of ["light","dark"] as const) test(`${viewport.width}px ${mode}: responsive system`,async({page})=>{await page.setViewportSize(viewport);await page.goto("/design-lab/v1?gate1=draft");await theme(page,mode);await noOverflow(page);await expect(page.getByRole("heading",{name:"Territórios visuais"})).toBeVisible();});

test("200% text and keyboard-height mobile states reflow",async({page})=>{await page.setViewportSize({width:390,height:500});await page.goto("/design-lab/v1?gate1=draft#fields");await page.evaluate(()=>document.documentElement.style.fontSize="200%");await noOverflow(page);const input=page.getByLabel("Hairline vazio");await input.focus();await expect(input).toBeInViewport();});
test("reduced motion removes sustained animation",async({page})=>{await page.emulateMedia({reducedMotion:"reduce"});await page.goto("/design-lab/v1?gate1=draft#motion");expect(await page.getByText("Série concluída").evaluate(el=>getComputedStyle(el).animationDuration)).toBe("0s");});

test("required Gate 1B evidence screenshots",async({page})=>{
  await page.setViewportSize({width:390,height:844});await page.goto("/design-lab/v1?gate1=draft");await chooseAll(page);const dir=path.join("test-results","design-lab","screenshots");
  await page.addStyleTag({content:'[class*="labHeader"],[class*="sectionNav"],.skip-link{display:none!important}'});
  for(const [id,file] of [["territories","gate-1b-territories-390.png"],["buttons","gate-1b-buttons-390.png"],["fields","gate-1b-fields-390.png"],["icons","gate-1b-icons-390.png"]] as const) await page.locator(`#${id}`).screenshot({path:path.join(dir,file)});
  for(const [tab,file] of [["Login","gate-1b-combination-login-390.png"],["Dashboard","gate-1b-combination-dashboard-390.png"],["Workout","gate-1b-combination-workout-390.png"]] as const){await page.getByRole("tab",{name:tab,exact:true}).click();await page.locator("#preview").screenshot({path:path.join(dir,file)});}
  await page.locator("#approval").screenshot({path:path.join(dir,"gate-1b-approval-ready-390.png")});
  await page.setViewportSize({width:1440,height:900});await page.locator("#overview").screenshot({path:path.join(dir,"gate-1b-overview-1440.png")});
});

test("unlabeled QA mode preserves accessible option names and visual signatures",async({page})=>{await page.goto("/design-lab/v1?qa=unlabeled&gate1=draft");const lab=page.locator("main").first();await expect(lab).toHaveAttribute("data-unlabeled","true");await expect(lab.getByRole("radio")).toHaveCount(16);await expect(page.locator('[data-qa="territories"] [data-territory="A"]')).toHaveCSS("background-color","rgb(255, 255, 255)");await expect(page.locator('[data-qa="territories"] [data-territory="C"]')).toHaveCSS("background-color","rgb(29, 36, 32)");});
