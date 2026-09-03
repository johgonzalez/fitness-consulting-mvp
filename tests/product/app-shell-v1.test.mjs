import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const read = (path) => readFile(new URL(`../../${path}`, import.meta.url), "utf8");

test("trainer shell exposes only supported production destinations", async () => {
  const navigation = await read("src/components/dashboard/BottomNavigation.tsx");

  for (const label of ["Início", "Alunos", "Leads", "Avaliações", "Treinos", "Meu Site"]) {
    assert.match(navigation, new RegExp(`label: "${label}"`));
  }

  assert.doesNotMatch(navigation, /label: "Mensagens"/);
  assert.doesNotMatch(navigation, /label: "Financeiro"/);
  assert.match(navigation, /mobileDestinations = \[destinations\[0\], destinations\[1\], destinations\[4\], destinations\[2\]\]/);
  assert.match(navigation, /aria-haspopup="dialog"/);
  assert.match(navigation, /aria-expanded=\{moreOpen\}/);
});

test("student shell is trainer-first and keeps the execution route immersive", async () => {
  const [layout, shell, workspace] = await Promise.all([
    read("src/app/student/layout.tsx"),
    read("src/components/student/StudentAppShell.tsx"),
    read("src/lib/workouts/student-workspace.ts"),
  ]);

  assert.match(layout, /getStudentShellIdentity/);
  assert.match(layout, /identity=\{identity\}/);
  assert.match(shell, /identity\.trainer\.name/);
  assert.match(shell, /identity\.trainer\.imageUrl/);
  assert.match(shell, /pathname\.endsWith\("\/execute"\)/);
  assert.match(shell, /pp-student-app--immersive/);
  assert.doesNotMatch(shell, /MessageCircle|Chat — em breve/);
  assert.match(workspace, /export async function getStudentShellIdentity/);
});

test("approved monochrome shell remains scoped and responsive", async () => {
  const [rootLayout, trainerLayout, css] = await Promise.all([
    read("src/app/layout.tsx"),
    read("src/app/dashboard/layout.tsx"),
    read("src/app/app-shell-v1.css"),
  ]);

  assert.match(rootLayout, /app-shell-v1\.css/);
  assert.match(trainerLayout, /pp-app-shell-v1/);
  assert.match(css, /\.pp-app-shell-v1/);
  assert.match(css, /@media \(min-width:768px\) and \(max-width:1179px\)/);
  assert.match(css, /\.pp-primary-nav--desktop \{ width:100%;display:grid;grid-template-columns:1fr;align-content:start;overflow-y:auto; \}/);
  assert.match(css, /\.pp-primary-nav--desktop \.pp-nav-section \{ display:grid;grid-template-columns:1fr;/);
  assert.match(css, /@media \(max-width:767px\)/);
  assert.match(css, /grid-template-columns:repeat\(5,minmax\(0,1fr\)\)/);
  assert.match(css, /\.pp-mobile-more:not\(\[open\]\)\s*\{\s*display:none/);
  assert.match(css, /@media \(prefers-reduced-motion:reduce\)/);
});

test("workout builder receives shell hooks without losing its canonical workspace", async () => {
  const builder = await read("src/components/workouts/WorkoutBuilder.tsx");

  assert.match(builder, /pp-workout-builder-shell/);
  assert.match(builder, /pp-workout-builder-topbar/);
  assert.match(builder, /SetEditor/);
  assert.match(builder, /ExerciseLibraryDrawer/);
  assert.match(builder, /VersionHistoryPanel/);
  assert.match(builder, /changeWorkoutLifecycleAction/);
});
