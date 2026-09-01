"use client";

import {
  ArrowLeft,
  BarChart3,
  Check,
  ChevronRight,
  ClipboardCheck,
  Dumbbell,
  Globe2,
  GraduationCap,
  Home,
  LayoutDashboard,
  LoaderCircle,
  Menu,
  Moon,
  MoreHorizontal,
  Plus,
  RotateCcw,
  Search,
  Settings2,
  Share2,
  Sun,
  UserRound,
  UsersRound,
  X,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  deriveGate2Status,
  GATE_2_DRAFT_STORAGE_KEY,
  GATE_2_ID,
  GATE_2_LAB_VERSION,
  isGate2Complete,
  resolveGate2InitialDecisions,
  studentIdentityIds,
  studentIdentityLabels,
  trainerNavigationDestinations,
  trainerNavigationIds,
  trainerNavigationLabels,
  type Gate2ApprovalArtifact,
  type Gate2Draft,
  type StudentIdentityId,
  type TrainerNavigationId,
} from "./gate-2";
import styles from "./gate-2.module.css";

type Theme = "light" | "dark";
type PreviewId =
  | "trainer-overview"
  | "trainer-operational"
  | "trainer-production"
  | "trainer-mobile-home"
  | "trainer-mobile-operational"
  | "trainer-mobile-more"
  | "student-home"
  | "student-workout"
  | "student-immersive";

const trainerNavigation = [
  { label: "Início", icon: LayoutDashboard, group: "Visão geral" },
  { label: "Meu Site", icon: Globe2, group: "Negócio" },
  { label: "Leads", icon: UsersRound, group: "Negócio" },
  { label: "Alunos", icon: GraduationCap, group: "Acompanhamento" },
  { label: "Avaliações", icon: ClipboardCheck, group: "Acompanhamento" },
  { label: "Treinos", icon: Dumbbell, group: "Acompanhamento" },
  { label: "Configurações", icon: Settings2, group: "Conta" },
] as const;

const iconByDestination: Record<string, LucideIcon> = {
  "Início": Home,
  "Alunos": GraduationCap,
  "Treinos": Dumbbell,
  "Leads": UsersRound,
  "Meu Site": Globe2,
  "Avaliações": ClipboardCheck,
  "Configurações": Settings2,
  "Plano": BarChart3,
  "Mais": Menu,
};

const previewTabs: Array<{ id: PreviewId; label: string; group: "Trainer desktop" | "Trainer mobile" | "Student mobile" }> = [
  { id: "trainer-overview", label: "Overview", group: "Trainer desktop" },
  { id: "trainer-operational", label: "Alunos", group: "Trainer desktop" },
  { id: "trainer-production", label: "Workout Builder", group: "Trainer desktop" },
  { id: "trainer-mobile-home", label: "Início", group: "Trainer mobile" },
  { id: "trainer-mobile-operational", label: "Alunos", group: "Trainer mobile" },
  { id: "trainer-mobile-more", label: "Mais", group: "Trainer mobile" },
  { id: "student-home", label: "Hoje", group: "Student mobile" },
  { id: "student-workout", label: "Treino", group: "Student mobile" },
  { id: "student-immersive", label: "Execução", group: "Student mobile" },
];

function AppMark({ compact = false }: { compact?: boolean }) {
  return <span className={styles.appMark} aria-label="FIT APP, identidade temporária do laboratório"><UserRound aria-hidden="true" /><strong>{compact ? "FA" : "FIT APP"}</strong></span>;
}

function GateHeading({ number, title, copy }: { number: string; title: string; copy: string }) {
  return <header className={styles.sectionHeading}><span>{number}</span><div><h2>{title}</h2><p>{copy}</p></div></header>;
}

function OptionCard({ name, value, title, description, recommended, checked, locked, onChange, children }: {
  name: string;
  value: string;
  title: string;
  description: string;
  recommended?: boolean;
  checked: boolean;
  locked: boolean;
  onChange: () => void;
  children: React.ReactNode;
}) {
  return <label className={styles.option} data-selected={checked || undefined}>
    <input type="radio" name={name} value={value} checked={checked} disabled={locked} onChange={onChange} />
    <span className={styles.optionHeading}><span><b>{value}</b><span><strong>{title}</strong><small>{description}</small></span></span><i aria-hidden="true" />{recommended ? <em>Recomendado</em> : null}</span>
    {children}
  </label>;
}

function TrainerBottomNavigation({ id, active = "Início", compact = false, onMore }: { id: TrainerNavigationId; active?: string; compact?: boolean; onMore?: (trigger: HTMLButtonElement) => void }) {
  return <nav className={styles.bottomNavigation} aria-label="Navegação demonstrativa do Personal">{trainerNavigationDestinations[id].map((label) => {
    const Icon = iconByDestination[label] ?? MoreHorizontal;
    const selected = active === label || (active === "Mais" && label === "Mais");
    const content = <><Icon aria-hidden="true" /><span>{label}</span></>;
    return label === "Mais"
      ? <button key={label} type="button" aria-current={selected ? "page" : undefined} aria-label={compact || onMore ? "Mais destinos" : undefined} onClick={(event) => onMore?.(event.currentTarget)}>{content}</button>
      : <a key={label} href="#gate-2-preview" aria-current={selected ? "page" : undefined}>{content}</a>;
  })}</nav>;
}

function TrainerNavigationOption({ id }: { id: TrainerNavigationId }) {
  return <div className={styles.navOptionPreview} data-navigation={id}>
    <header><AppMark compact /><span><Search aria-hidden="true" /><UserRound aria-hidden="true" /></span></header>
    <main><small>Hoje</small><strong>Prioridades</strong><span /><span /><span /></main>
    <TrainerBottomNavigation id={id} compact />
  </div>;
}

function StudentIdentityHeader({ id, compact = false }: { id: StudentIdentityId; compact?: boolean }) {
  return <header className={styles.studentIdentity} data-identity={id}>
    {id !== "G2-02A" ? <AppMark compact={compact} /> : null}
    <span className={styles.trainerAvatar}><UserRound aria-hidden="true" /></span>
    <span className={styles.trainerName}><strong>Thiago Almeida</strong><small>Seu Personal</small></span>
    {id === "G2-02A" ? <span className={styles.subtleBrand}>FIT APP</span> : null}
  </header>;
}

function StudentIdentityOption({ id }: { id: StudentIdentityId }) {
  return <div className={styles.identityOptionPreview} data-identity={id}><StudentIdentityHeader id={id} compact /><div><small>Hoje</small><strong>Força A</strong><span>4 exercícios · 48 min</span><button type="button" tabIndex={-1}>Começar treino</button></div></div>;
}

function Sidebar({ active, compact = false }: { active: string; compact?: boolean }) {
  const groups = ["Visão geral", "Negócio", "Acompanhamento", "Conta"] as const;
  return <aside className={styles.sidebar} data-compact={compact || undefined}>
    <AppMark compact={compact} />
    <nav aria-label="Portal do Personal">{groups.map((group) => <section key={group} aria-label={group}><span>{group}</span>{trainerNavigation.filter((item) => item.group === group).map(({ label, icon: Icon }) => <a key={label} href="#gate-2-preview" aria-current={active === label ? "page" : undefined} title={compact ? label : undefined}><Icon aria-hidden="true" /><strong>{label}</strong></a>)}</section>)}</nav>
    <div className={styles.profile}><span><UserRound aria-hidden="true" /></span><span><strong>Thiago Almeida</strong><small>Personal Trainer</small></span></div>
  </aside>;
}

function PageHeader({ title, action, compact = false }: { title: string; action: string; compact?: boolean }) {
  return <header className={styles.pageHeader}><div><small>{compact ? "Portal do Personal" : "Terça-feira, 1 de setembro"}</small><h3>{title}</h3></div><button type="button"><Plus aria-hidden="true" />{action}</button></header>;
}

function OverviewContent() {
  return <div className={styles.overviewContent}>
    <section className={styles.pulse} aria-label="Resumo factual"><span><b>3</b> alunos ativos</span><span><b>2</b> treinos em rascunho</span><span><b>1</b> avaliação pendente</span><span><b>2</b> novos leads</span><span><Check aria-hidden="true" /> site publicado</span></section>
    <div className={styles.openColumns}>
      <section className={styles.priorityList}><header><h4>Precisa da sua atenção</h4><span>3 prioridades</span></header>{[
        ["João Silva", "Avaliação respondida · revisar", ClipboardCheck],
        ["Força A", "Rascunho · ainda não publicado", Dumbbell],
        ["Ana Costa", "Novo lead · verificar interesse", UsersRound],
      ].map(([title, detail, Icon]) => <button key={String(title)} type="button"><span><Icon aria-hidden="true" /></span><span><strong>{String(title)}</strong><small>{String(detail)}</small></span><ChevronRight aria-hidden="true" /></button>)}</section>
      <aside className={styles.sitePanel}><header><Globe2 aria-hidden="true" /><span><strong>Meu Site</strong><small>Publicado</small></span></header><p>fitapp.com/thiago-almeida</p><div><button type="button">Abrir</button><button type="button">Editar</button><button type="button" aria-label="Compartilhar site"><Share2 aria-hidden="true" /></button></div></aside>
    </div>
  </div>;
}

function StudentsContent() {
  return <section className={styles.studentsContent}><div className={styles.filters}><label><span className={styles.srOnly}>Buscar aluno</span><Search aria-hidden="true" /><input value="" placeholder="Buscar aluno" readOnly /></label><button type="button">Ativos</button><button type="button">Todos</button></div><div role="list" aria-label="Alunos demonstrativos">{[
    ["João Silva", "Força A · treino publicado", "Ativo"],
    ["Marina Costa", "Avaliação aguardando revisão", "Revisar"],
    ["Carlos Lima", "Convite enviado", "Pendente"],
  ].map(([name, detail, status]) => <button role="listitem" type="button" key={name}><span className={styles.rowAvatar}><UserRound aria-hidden="true" /></span><span><strong>{name}</strong><small>{detail}</small></span><em>{status}</em><ChevronRight aria-hidden="true" /></button>)}</div></section>;
}

function BuilderContent() {
  return <div className={styles.builderContent}>
    <aside><small>Programa</small><strong>Hipertrofia 4×</strong><span>Semana 1</span><span aria-current="step">Semana 2</span><span>Semana 3</span><button type="button"><Plus aria-hidden="true" />Semana</button></aside>
    <section><header><div><small>Semana 2</small><h4>Sessão A</h4></div><button type="button"><Plus aria-hidden="true" />Bloco</button></header><article><header><strong>Bloco 1</strong><small>Força</small></header>{[
      ["Agachamento livre", "4 × 8 · 60 kg · 120 s"],
      ["Levantamento romeno", "4 × 10 · 48 kg · 90 s"],
      ["Mesa flexora", "3 × 12 · 32 kg · 75 s"],
    ].map(([exercise, prescription], index) => <button key={exercise} type="button" aria-current={index === 0 ? "true" : undefined}><b>{index + 1}</b><span><strong>{exercise}</strong><small>{prescription}</small></span><ChevronRight aria-hidden="true" /></button>)}</article></section>
    <aside><small>Exercício selecionado</small><strong>Agachamento livre</strong><label><span>Carga sugerida</span><input value="60 kg" readOnly /></label><label><span>Repetições</span><input value="8" readOnly /></label><label><span>Descanso</span><input value="120 s" readOnly /></label><button type="button">Ver detalhes</button></aside>
  </div>;
}

function TrainerDesktopShell({ view }: { view: "overview" | "operational" | "production" }) {
  const active = view === "operational" ? "Alunos" : view === "production" ? "Treinos" : "Início";
  const title = view === "operational" ? "Alunos" : view === "production" ? "Montar treino" : "Início";
  const action = view === "operational" ? "Adicionar aluno" : view === "production" ? "Publicar" : "Montar treino";
  return <div className={styles.trainerDesktop} data-density={view === "overview" ? "1" : view === "operational" ? "2" : "3"}>
    <Sidebar active={active} />
    <main><PageHeader title={title} action={action} compact={view === "production"} />{view === "overview" ? <OverviewContent /> : view === "operational" ? <StudentsContent /> : <BuilderContent />}</main>
  </div>;
}

function MoreSheetContent({ direct }: { direct: readonly string[] }) {
  const supported = ["Meu Site", "Avaliações", "Treinos", "Leads", "Configurações", "Plano"].filter((item) => !direct.includes(item));
  return <nav aria-label="Mais destinos do Personal">{supported.map((label) => { const Icon = iconByDestination[label]; return <a key={label} href="#gate-2-preview"><Icon aria-hidden="true" /><strong>{label}</strong><ChevronRight aria-hidden="true" /></a>; })}</nav>;
}

function MobileTrainerContent({ operational }: { operational: boolean }) {
  return <main className={styles.mobileContent}>{operational ? <><header><small>Acompanhamento</small><h4>Alunos</h4><button type="button"><Plus aria-hidden="true" /><span className={styles.srOnly}>Adicionar aluno</span></button></header><StudentsContent /></> : <><header><small>Hoje</small><h4>O que precisa da sua atenção</h4></header><section className={styles.mobilePriority}><button type="button"><ClipboardCheck aria-hidden="true" /><span><strong>Revisar avaliação</strong><small>João Silva</small></span><ChevronRight aria-hidden="true" /></button><button type="button"><Dumbbell aria-hidden="true" /><span><strong>Finalizar rascunho</strong><small>Força A</small></span><ChevronRight aria-hidden="true" /></button></section><section className={styles.mobileSite}><Globe2 aria-hidden="true" /><span><strong>Meu Site</strong><small>Publicado · fitapp.com/thiago-almeida</small></span><ChevronRight aria-hidden="true" /></section></>}</main>;
}

function TrainerMobileShell({ navigation, view, onOpenMore }: { navigation: TrainerNavigationId; view: "home" | "operational" | "more"; onOpenMore: (trigger: HTMLButtonElement) => void }) {
  return <div className={styles.phone} data-shell="trainer"><header className={styles.mobileBar}><AppMark compact /><span><Sun aria-hidden="true" /><UserRound aria-hidden="true" /></span></header><MobileTrainerContent operational={view === "operational"} />{view === "more" ? <div className={styles.inlineMore} role="dialog" aria-label="Mais destinos"><header><strong>Mais</strong><X aria-hidden="true" /></header><MoreSheetContent direct={trainerNavigationDestinations[navigation]} /></div> : null}<TrainerBottomNavigation id={navigation} active={view === "operational" ? "Alunos" : view === "more" ? "Mais" : "Início"} onMore={onOpenMore} /></div>;
}

function StudentShell({ identity, view }: { identity: StudentIdentityId; view: "home" | "workout" | "immersive" }) {
  if (view === "immersive") return <div className={styles.phone} data-shell="student" data-immersive="true"><header className={styles.executionHeader}><button type="button" aria-label="Sair da execução"><X aria-hidden="true" /></button><span><small>Treino em andamento</small><strong>18:42</strong></span><button type="button">Pausar</button></header><main className={styles.execution}><span className={styles.exerciseMedia}><Dumbbell aria-hidden="true" /></span><small>Exercício 1 de 4</small><h4>Agachamento livre</h4><p>4 séries · alvo de 8 repetições</p><div className={styles.setProgress}><span data-complete="true">1</span><span data-active="true">2</span><span>3</span><span>4</span></div><section><span><small>Carga sugerida</small><strong>60 kg</strong></span><span><small>Repetições</small><strong>8</strong></span><span><small>Descanso</small><strong>120 s</strong></span></section><button type="button">Concluir série</button><p>Próximo: série 3 de 4</p></main></div>;
  return <div className={styles.phone} data-shell="student"><StudentIdentityHeader id={identity} /><main className={styles.studentContent}>{view === "home" ? <><small>Hoje</small><h4>Seu treino</h4><section className={styles.workoutHero}><span><Dumbbell aria-hidden="true" /></span><div><small>Inferiores</small><strong>Força A</strong><p>4 exercícios · 48 min</p></div><button type="button">Começar treino</button></section><div className={styles.frequency}><header><strong>Últimos 7 dias</strong><span>3 treinos</span></header><div>{[1,0,1,0,1,0,0].map((done, index) => <span key={index} data-done={done || undefined}><i /><small>{["S","T","Q","Q","S","S","D"][index]}</small></span>)}</div></div></> : <><header className={styles.studentRouteHeader}><button type="button" aria-label="Voltar"><ArrowLeft aria-hidden="true" /></button><h4>Força A</h4></header><section className={styles.workoutDetail}><span className={styles.exerciseMedia}><Dumbbell aria-hidden="true" /></span><strong>Treino de inferiores</strong><p>4 exercícios · aproximadamente 48 minutos</p>{["Agachamento livre", "Levantamento romeno", "Mesa flexora", "Panturrilha em pé"].map((item, index) => <span key={item}><b>{index + 1}</b>{item}</span>)}<button type="button">Começar treino</button></section></>}</main><nav className={styles.studentNav} aria-label="Navegação do Aluno"><a href="#gate-2-preview" aria-current={view === "home" ? "page" : undefined}><Home aria-hidden="true" />Hoje</a><a href="#gate-2-preview" aria-current={view === "workout" ? "page" : undefined}><Dumbbell aria-hidden="true" />Treinos</a><a href="#gate-2-preview"><BarChart3 aria-hidden="true" />Progresso</a><a href="#gate-2-preview"><UserRound aria-hidden="true" />Perfil</a></nav></div>;
}

function ApprovalSummary({ decisions }: { decisions: Gate2Draft }) {
  return <dl className={styles.approvalSummary}><div><dt>Trainer mobile navigation</dt><dd>{decisions.trainerMobileNavigation ? `${decisions.trainerMobileNavigation} — ${trainerNavigationLabels[decisions.trainerMobileNavigation]}` : "Não selecionado"}</dd></div><div><dt>Student identity</dt><dd>{decisions.studentIdentity ? `${decisions.studentIdentity} — ${studentIdentityLabels[decisions.studentIdentity]}` : "Não selecionado"}</dd></div><div><dt>Inherited design</dt><dd>Monochrome Product · Solid · Quiet Filled · Rounded Outline</dd></div></dl>;
}

export function Gate2ShellLab({ repositoryArtifact, stale }: { repositoryArtifact: Gate2ApprovalArtifact | null; stale: boolean }) {
  const [theme, setTheme] = useState<Theme>("light");
  const [artifact, setArtifact] = useState(repositoryArtifact);
  const [decisions, setDecisions] = useState<Gate2Draft>(repositoryArtifact?.decisions ?? {});
  const [preview, setPreview] = useState<PreviewId>("trainer-overview");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const approvalDialog = useRef<HTMLDialogElement>(null);
  const reopenDialog = useRef<HTMLDialogElement>(null);
  const moreDialog = useRef<HTMLDialogElement>(null);
  const approvalTrigger = useRef<HTMLButtonElement>(null);
  const reopenTrigger = useRef<HTMLButtonElement>(null);
  const moreTrigger = useRef<HTMLButtonElement>(null);
  const draftReady = useRef(false);
  const locked = artifact?.status === "APPROVED";
  const status = deriveGate2Status(decisions, artifact, stale);
  const selectedCount = Object.values(decisions).filter(Boolean).length;

  useEffect(() => { queueMicrotask(() => {
    try {
      if (repositoryArtifact?.status !== "APPROVED") {
        const stored = window.localStorage.getItem(GATE_2_DRAFT_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as { version?: string; decisions?: Gate2Draft };
          if (parsed.version === GATE_2_LAB_VERSION && parsed.decisions) setDecisions(resolveGate2InitialDecisions(repositoryArtifact, parsed.decisions));
        }
      }
    } catch { window.localStorage.removeItem(GATE_2_DRAFT_STORAGE_KEY); }
    finally { draftReady.current = true; }
  }); }, [repositoryArtifact]);

  useEffect(() => {
    if (draftReady.current && !locked) window.localStorage.setItem(GATE_2_DRAFT_STORAGE_KEY, JSON.stringify({ version: GATE_2_LAB_VERSION, decisions }));
  }, [decisions, locked]);

  const groups = useMemo(() => ["Trainer desktop", "Trainer mobile", "Student mobile"] as const, []);
  const navigation = decisions.trainerMobileNavigation ?? "G2-01A";
  const identity = decisions.studentIdentity ?? "G2-02A";

  function select(key: keyof Gate2Draft, value: TrainerNavigationId | StudentIdentityId) {
    if (!locked) setDecisions((current) => ({ ...current, [key]: value }));
  }

  async function submit(action: "approve" | "reopen") {
    if (action === "approve" && !isGate2Complete(decisions)) return;
    setSaving(true); setNotice("");
    try {
      const response = await fetch("/api/design-lab/gate-2-approval", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(action === "approve" ? { action, gateId: GATE_2_ID, decisions } : { action, gateId: GATE_2_ID }) });
      const payload = await response.json() as { artifact?: Gate2ApprovalArtifact; error?: string };
      if (!response.ok || !payload.artifact) throw new Error(payload.error ?? "Falha local");
      setArtifact(payload.artifact); setDecisions(payload.artifact.decisions); window.localStorage.removeItem(GATE_2_DRAFT_STORAGE_KEY);
      if (action === "approve") { approvalDialog.current?.close(); setNotice("Gate 2 aprovado. App Shell registrado."); approvalTrigger.current?.focus(); }
      else { reopenDialog.current?.close(); setNotice("Gate 2 reaberto. Uma nova revisão pode ser preparada."); reopenTrigger.current?.focus(); }
    } catch (error) { setNotice(error instanceof Error ? error.message : "Não foi possível registrar a decisão."); }
    finally { setSaving(false); }
  }

  function openMore(trigger: HTMLButtonElement) { moreTrigger.current = trigger; moreDialog.current?.showModal(); }

  return <section id="gate-2" className={styles.gate} data-theme={theme} aria-labelledby="gate-2-title">
    <header className={styles.gateHeader}><AppMark /><div><span>Local · Gate 2</span><button type="button" aria-label={theme === "light" ? "Ativar tema escuro no Gate 2" : "Ativar tema claro no Gate 2"} onClick={() => setTheme(theme === "light" ? "dark" : "light")}>{theme === "light" ? <Moon aria-hidden="true" /> : <Sun aria-hidden="true" />}</button></div></header>
    <div className={styles.gateContent}>
      <section className={styles.intro}><div><span>APP SHELL · GATE 2</span><h1 id="gate-2-title">Um produto.<br />Dois contextos claros.</h1><p>O shell traduz a fundação aprovada para operação profissional e acompanhamento do aluno, sem alterar fluxos ou capacidades.</p></div><aside><header><span>Gate 2</span><strong data-status={status}>{status === "STALE" ? "APPROVED — REVIEW RECOMMENDED" : status.replaceAll("_", " ")}</strong></header><p>{selectedCount} de 2 decisões selecionadas</p><ul><li data-done={Boolean(decisions.trainerMobileNavigation) || undefined}>{decisions.trainerMobileNavigation ? <Check aria-hidden="true" /> : <span />}Trainer navigation</li><li data-done={Boolean(decisions.studentIdentity) || undefined}>{decisions.studentIdentity ? <Check aria-hidden="true" /> : <span />}Student identity</li></ul></aside></section>

      <section className={styles.gateSection} data-evidence="trainer-options"><GateHeading number="01" title="Trainer mobile navigation" copy="Três prioridades materialmente diferentes. Quatro destinos diretos e um menu Mais." /><div className={styles.optionGrid}>{trainerNavigationIds.map((id) => <OptionCard key={id} name="trainer-mobile-navigation" value={id} title={trainerNavigationLabels[id]} description={trainerNavigationDestinations[id].join(" · ")} recommended={id === "G2-01A"} checked={decisions.trainerMobileNavigation === id} locked={locked} onChange={() => select("trainerMobileNavigation", id)}><TrainerNavigationOption id={id} /></OptionCard>)}</div></section>

      <section className={styles.gateSection} data-evidence="student-options"><GateHeading number="02" title="Student identity" copy="A hierarquia muda de verdade: Personal, equilíbrio ou plataforma como identidade principal." /><div className={styles.optionGrid}>{studentIdentityIds.map((id) => <OptionCard key={id} name="student-identity" value={id} title={studentIdentityLabels[id]} description={id === "G2-02A" ? "O Personal conduz o ambiente" : id === "G2-02B" ? "Marca e Personal dividem presença" : "A plataforma conduz o ambiente"} recommended={id === "G2-02A"} checked={decisions.studentIdentity === id} locked={locked} onChange={() => select("studentIdentity", id)}><StudentIdentityOption id={id} /></OptionCard>)}</div></section>

      <section id="gate-2-preview" className={styles.gateSection} data-evidence="system-preview"><GateHeading number="03" title="System preview" copy="A mesma combinação atravessa overview, operação e produção densa, além do contexto do aluno." /><div className={styles.previewControls}>{groups.map((group) => <div key={group} role="tablist" aria-label={group}><span>{group}</span>{previewTabs.filter((item) => item.group === group).map((item) => <button key={item.id} type="button" role="tab" aria-selected={preview === item.id} onClick={() => setPreview(item.id)}>{item.label}</button>)}</div>)}</div><div className={styles.systemPreview} data-preview={preview}>{preview === "trainer-overview" ? <TrainerDesktopShell view="overview" /> : preview === "trainer-operational" ? <TrainerDesktopShell view="operational" /> : preview === "trainer-production" ? <TrainerDesktopShell view="production" /> : preview === "trainer-mobile-home" ? <TrainerMobileShell navigation={navigation} view="home" onOpenMore={openMore} /> : preview === "trainer-mobile-operational" ? <TrainerMobileShell navigation={navigation} view="operational" onOpenMore={openMore} /> : preview === "trainer-mobile-more" ? <TrainerMobileShell navigation={navigation} view="more" onOpenMore={openMore} /> : preview === "student-home" ? <StudentShell identity={identity} view="home" /> : preview === "student-workout" ? <StudentShell identity={identity} view="workout" /> : <StudentShell identity={identity} view="immersive" />}</div></section>

      <section className={styles.gateSection}><GateHeading number="04" title="Density proof" copy="O shell muda a densidade do conteúdo, não sua identidade ou capacidade." /><div className={styles.densityProof}><article><span>Level 1</span><strong>Overview</strong><p>Respiração maior, pulso compacto e prioridade factual.</p></article><article><span>Level 2</span><strong>Operational</strong><p>Linhas, filtros e ações com leitura rápida.</p></article><article><span>Level 3</span><strong>Production</strong><p>Workspace máximo para o Workout Builder.</p></article></div></section>

      <section className={styles.gateSection}><GateHeading number="05" title="Fixed shell rules" copy="Regras já resolvidas não voltam para votação." /><div className={styles.fixedRules}>{["Headers são contextuais", "Mensagens e Financeiro ficam ocultos", "Workout Builder maximiza área útil", "Execução Student usa modo imersivo", "Light primário e Dark em grafite", "Ícones Rounded Outline sem mistura"].map((rule) => <p key={rule}><Check aria-hidden="true" />{rule}</p>)}</div></section>

      <section className={`${styles.gateSection} ${styles.approval}`} data-evidence="approval"><GateHeading number="06" title="Aprovação" copy="O preview combinado é a última revisão antes de registrar o App Shell." /><div className={styles.approvalPanel}><header><span>APP SHELL</span><strong>{status === "STALE" ? "APPROVED — REVIEW RECOMMENDED" : status.replaceAll("_", " ")}</strong>{artifact ? <small>Revisão {artifact.revision} · {new Date(artifact.approvedAt).toLocaleString("pt-BR")}</small> : null}</header><ApprovalSummary decisions={decisions} />{!isGate2Complete(decisions) ? <p>Selecione Trainer navigation e Student identity para continuar.</p> : <div className={styles.finalPreview}><TrainerMobileShell navigation={navigation} view="home" onOpenMore={openMore} /><StudentShell identity={identity} view="home" /></div>}{locked ? <button ref={reopenTrigger} type="button" className={styles.secondaryAction} onClick={() => reopenDialog.current?.showModal()}>Reabrir decisões</button> : <button ref={approvalTrigger} type="button" className={styles.primaryAction} disabled={!isGate2Complete(decisions)} onClick={() => approvalDialog.current?.showModal()}>Aprovar Gate 2</button>}{notice ? <p className={styles.notice} role="status" aria-live="polite">{notice}</p> : null}</div></section>
    </div>

    <dialog ref={moreDialog} className={`${styles.dialog} ${styles.moreDialog}`} aria-labelledby="gate-2-more-title" onClose={() => moreTrigger.current?.focus()}><form method="dialog"><header><div><small>Portal do Personal</small><h2 id="gate-2-more-title">Mais destinos</h2></div><button type="submit" aria-label="Fechar Mais"><X aria-hidden="true" /></button></header><MoreSheetContent direct={trainerNavigationDestinations[navigation]} /></form></dialog>
    <dialog ref={approvalDialog} className={styles.dialog} aria-labelledby="gate-2-approve-title" onClose={() => approvalTrigger.current?.focus()}><form method="dialog"><header><div><small>GATE 2</small><h2 id="gate-2-approve-title">Você está aprovando o shell principal do produto.</h2></div><button type="submit" aria-label="Fechar confirmação"><X aria-hidden="true" /></button></header><ApprovalSummary decisions={decisions} /><footer><button type="submit">Voltar</button><button type="button" disabled={saving} onClick={() => void submit("approve")}>{saving ? <LoaderCircle aria-hidden="true" /> : <Check aria-hidden="true" />}Aprovar App Shell</button></footer></form></dialog>
    <dialog ref={reopenDialog} className={styles.dialog} aria-labelledby="gate-2-reopen-title" onClose={() => reopenTrigger.current?.focus()}><form method="dialog"><header><div><small>NOVA REVISÃO</small><h2 id="gate-2-reopen-title">Reabrir decisões do App Shell?</h2></div><button type="submit" aria-label="Fechar confirmação"><X aria-hidden="true" /></button></header><p>A aprovação anterior será preservada no histórico. As escolhas atuais permanecerão como ponto inicial.</p><footer><button type="submit">Manter aprovação</button><button type="button" disabled={saving} onClick={() => void submit("reopen")}><RotateCcw aria-hidden="true" />Reabrir Gate 2</button></footer></form></dialog>
  </section>;
}
