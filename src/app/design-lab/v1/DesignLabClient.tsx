"use client";

import {
  AlertCircle,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  Dumbbell,
  ExternalLink,
  Globe2,
  LoaderCircle,
  Menu,
  Moon,
  MoreHorizontal,
  Play,
  RotateCcw,
  Share2,
  Sun,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";
import { useRef, useState } from "react";
import styles from "./design-lab.module.css";
import {
  evidenceSummary,
  operationalRows,
  workoutRows,
  type DesignOption,
  type MotionMode,
} from "./fixtures";

type LabTheme = "light" | "dark";

const optionLabels: Record<DesignOption, string> = {
  A: "Contida",
  B: "Equilibrada",
  C: "Enfática",
};

function BrandMark() {
  return (
    <div className={styles.brand} aria-label="FIT APP, marca temporária do laboratório">
      <span aria-hidden="true"><Dumbbell /></span>
      <strong>FIT APP</strong>
      <small>marca temporária</small>
    </div>
  );
}

function SectionHeading({ title, description }: { title: string; description: string }) {
  return (
    <header className={styles.sectionHeading}>
      <h2>{title}</h2>
      <p>{description}</p>
    </header>
  );
}

function DecisionOptionGroup({
  decisionId,
  title,
  variable,
  selected,
  recommendation,
  onSelect,
  children,
}: {
  decisionId: string;
  title: string;
  variable: string;
  selected: DesignOption;
  recommendation: DesignOption;
  onSelect: (value: DesignOption) => void;
  children: (option: DesignOption) => React.ReactNode;
}) {
  return (
    <fieldset className={styles.decisionGroup} data-decision-id={decisionId}>
      <legend>
        <span>{decisionId}</span>
        <strong>{title}</strong>
      </legend>
      <p className={styles.decisionVariable}>Variável isolada: {variable}.</p>
      <div className={styles.optionGrid}>
        {(["A", "B", "C"] as const).map((option) => (
          <label key={option} className={styles.option} data-selected={selected === option || undefined}>
            <input
              type="radio"
              name={decisionId}
              value={option}
              checked={selected === option}
              onChange={() => onSelect(option)}
            />
            <span className={styles.optionHeader}>
              <b>{option}</b>
              <span>{optionLabels[option]}</span>
              {recommendation === option ? <em>Recomendada</em> : null}
            </span>
            {children(option)}
          </label>
        ))}
      </div>
      <p className={styles.pendingDecision} role="status">
        Seleção de trabalho: opção {selected}. Aprovação do Product Owner ainda pendente.
      </p>
    </fieldset>
  );
}

function FoundationSample({ option }: { option: DesignOption }) {
  return (
    <span className={styles.foundationSample} data-option={option}>
      <span>Hoje</span>
      <strong>O que precisa da sua atenção</strong>
      <small>3 ações objetivas</small>
      <i aria-hidden="true" />
    </span>
  );
}

function ActionSample({ option }: { option: DesignOption }) {
  return (
    <button type="button" className={styles.actionSample} data-option={option} tabIndex={-1}>
      Criar treino <ArrowRight aria-hidden="true" />
    </button>
  );
}

function FieldSample({ option }: { option: DesignOption }) {
  return (
    <span className={styles.fieldSample} data-option={option}>
      <span>Nome do treino</span>
      <span className={styles.fieldControl}>Inferiores — semana 3</span>
      <small>Visível para o aluno após publicar.</small>
    </span>
  );
}

function MotionSample({ option, replayKey }: { option: DesignOption; replayKey: number }) {
  return (
    <span className={styles.motionStage} data-option={option}>
      <span key={`${option}-${replayKey}`} className={styles.motionObject}>
        <Check aria-hidden="true" /> Série concluída
      </span>
    </span>
  );
}

function OperationalList() {
  return (
    <div className={styles.rows} role="table" aria-label="Ações operacionais demonstrativas">
      <div className={styles.rowHead} role="row">
        <span role="columnheader">Pessoa e contexto</span>
        <span role="columnheader">Atualização</span>
        <span role="columnheader">Estado</span>
        <span role="columnheader" className={styles.visuallyHidden}>Ação</span>
      </div>
      {operationalRows.map((row) => (
        <div className={styles.row} role="row" key={row.name}>
          <span className={styles.identityCell} role="cell">
            <span className={styles.avatar} aria-hidden="true"><UserRound /></span>
            <span><strong>{row.name}</strong><small>{row.context}</small></span>
          </span>
          <span role="cell">{row.meta}</span>
          <span role="cell" className={styles.status} data-tone={row.tone}>{row.status}</span>
          <span role="cell" className={styles.rowAction}>
            <button type="button" aria-label={`Abrir contexto de ${row.name}`}><ArrowRight aria-hidden="true" /></button>
          </span>
        </div>
      ))}
    </div>
  );
}

function FeedbackExamples() {
  return (
    <div className={styles.feedbackGrid}>
      <div className={styles.feedback} data-tone="success" role="status">
        <CheckCircle2 aria-hidden="true" />
        <span><strong>Alterações salvas</strong><small>O rascunho continua privado.</small></span>
      </div>
      <div className={styles.feedback} data-tone="danger" role="alert">
        <AlertCircle aria-hidden="true" />
        <span><strong>Não foi possível publicar</strong><small>Revise o campo indicado e tente novamente.</small></span>
      </div>
      <div className={styles.feedback} data-tone="loading" role="status">
        <LoaderCircle aria-hidden="true" />
        <span><strong>Gerando rascunho</strong><small>Você poderá revisar tudo antes de publicar.</small></span>
      </div>
      <div className={styles.feedback} data-tone="empty">
        <ClipboardCheck aria-hidden="true" />
        <span><strong>Nenhuma avaliação pendente</strong><small>Novas respostas aparecerão aqui.</small></span>
      </div>
    </div>
  );
}

function NavigationExamples() {
  return (
    <div className={styles.navigationExamples}>
      <nav className={styles.desktopNav} aria-label="Exemplo de navegação desktop">
        <BrandMark />
        <a href="#product-fragments" aria-current="page">Início</a>
        <a href="#operational-rows">Alunos</a>
        <a href="#fields">Treinos</a>
        <a href="#feedback">Meu Site</a>
        <button type="button" aria-label="Mais destinos"><MoreHorizontal /></button>
      </nav>
      <nav className={styles.mobileNav} aria-label="Exemplo de navegação mobile">
        <a href="#product-fragments" aria-current="page"><Dumbbell /><span>Hoje</span></a>
        <a href="#operational-rows"><UsersRound /><span>Alunos</span></a>
        <a href="#feedback"><Globe2 /><span>Meu Site</span></a>
        <button type="button"><Menu /><span>Mais</span></button>
      </nav>
    </div>
  );
}

function ProductFragments() {
  return (
    <div className={styles.productFragments}>
      <article className={styles.trainerFragment}>
        <header>
          <span><strong>Bom dia, Personal</strong><small>Terça-feira, 1 de setembro</small></span>
          <button type="button">Nova ação</button>
        </header>
        <h3>O que precisa da sua atenção hoje</h3>
        <ul>
          <li><ClipboardCheck /><span><strong>2 avaliações para revisar</strong><small>Respostas recebidas hoje</small></span><ArrowRight /></li>
          <li><Dumbbell /><span><strong>1 treino em rascunho</strong><small>Aguardando revisão e publicação</small></span><ArrowRight /></li>
          <li><Globe2 /><span><strong>Seu site está publicado</strong><small>pperfil.com/p/seu-nome</small></span><ExternalLink /></li>
        </ul>
      </article>

      <article className={styles.studentFragment}>
        <header><span>Hoje</span><button type="button" aria-label="Abrir perfil"><UserRound /></button></header>
        <div className={styles.workoutMedia} aria-hidden="true"><Dumbbell /></div>
        <div className={styles.studentWorkoutCopy}>
          <span>Próximo treino</span>
          <h3>Inferiores — força</h3>
          <p>55 min · 6 exercícios</p>
          <button type="button"><Play /> Iniciar treino</button>
        </div>
      </article>

      <article className={styles.builderFragment}>
        <header>
          <span><strong>Semana 3 · Sessão A</strong><small>Rascunho salvo</small></span>
          <button type="button">Publicar</button>
        </header>
        <div className={styles.builderTable} role="table" aria-label="Fragmento demonstrativo do Workout Builder">
          <div role="row" className={styles.builderHead}>
            <span role="columnheader">Exercício</span><span role="columnheader">Séries</span><span role="columnheader">Carga</span><span role="columnheader">Descanso</span>
          </div>
          {workoutRows.map((row) => (
            <div role="row" key={row.exercise}>
              <span role="cell"><strong>{row.exercise}</strong></span>
              <span role="cell">{row.prescription}</span>
              <span role="cell">{row.load}</span>
              <span role="cell">{row.rest}</span>
            </div>
          ))}
        </div>
        <button type="button" className={styles.addExercise}>Adicionar exercício</button>
      </article>
    </div>
  );
}

export function DesignLabClient() {
  const [theme, setTheme] = useState<LabTheme>("light");
  const [selections, setSelections] = useState<Record<string, DesignOption>>({
    "VF-01": "B",
    "VF-02": "B",
    "VF-03": "B",
    "VF-04": "A",
  });
  const [motionMode, setMotionMode] = useState<MotionMode>("quiet");
  const [motionReplay, setMotionReplay] = useState(0);
  const [disclosureOpen, setDisclosureOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  function select(decisionId: string, option: DesignOption) {
    setSelections((current) => ({ ...current, [decisionId]: option }));
    if (decisionId === "VF-04") {
      setMotionMode(option === "A" ? "quiet" : option === "B" ? "spatial" : "expressive");
      setMotionReplay((current) => current + 1);
    }
  }

  return (
    <main className={styles.lab} data-theme={theme} data-motion={motionMode}>
      <header className={styles.labHeader}>
        <BrandMark />
        <div className={styles.headerActions}>
          <span>Ambiente local · dados demonstrativos</span>
          <button
            type="button"
            aria-label={theme === "light" ? "Ativar tema escuro" : "Ativar tema claro"}
            aria-pressed={theme === "dark"}
            onClick={() => setTheme((current) => current === "light" ? "dark" : "light")}
          >
            {theme === "light" ? <Moon /> : <Sun />}
          </button>
        </div>
      </header>

      <div className={styles.page}>
        <aside className={styles.rail}>
          <p>Decision Lab V1</p>
          <nav aria-label="Seções do laboratório">
            <a href="#foundation">Fundação</a>
            <a href="#typography">Tipografia</a>
            <a href="#actions">Ações</a>
            <a href="#fields">Campos</a>
            <a href="#operational-rows">Linhas</a>
            <a href="#feedback">Feedback</a>
            <a href="#navigation">Navegação</a>
            <a href="#disclosures">Disclosures</a>
            <a href="#motion">Movimento</a>
            <a href="#product-fragments">Produto</a>
          </nav>
          <div className={styles.gateSummary}>
            <strong>Gate 1</strong>
            <span>4 decisões</span>
            <small>Aguardando Product Owner</small>
          </div>
        </aside>

        <div className={styles.content}>
          <section className={styles.intro} aria-labelledby="lab-title">
            <div>
              <h1 id="lab-title">Uma base visual para decidir antes de migrar.</h1>
              <p>
                Este laboratório compara variáveis isoladas, preserva a arquitetura factual do PPerfil e não altera nenhuma tela de produção.
              </p>
            </div>
            <dl>
              <div><dt>Direção</dt><dd>Premium Consumer atual</dd></div>
              <div><dt>North Star</dt><dd>Performance Serena</dd></div>
              <div><dt>Status</dt><dd>Exploração controlada</dd></div>
            </dl>
          </section>

          <section id="foundation" className={styles.section}>
            <SectionHeading title="Fundação" description="Light-first, Dark em grafite e separação por tom, borda e espaço antes de sombra." />
            <DecisionOptionGroup
              decisionId="VF-01"
              title="Canvas e superfícies"
              variable="separação entre canvas e conteúdo"
              selected={selections["VF-01"]}
              recommendation="B"
              onSelect={(option) => select("VF-01", option)}
            >
              {(option) => <FoundationSample option={option} />}
            </DecisionOptionGroup>
          </section>

          <section id="typography" className={styles.section}>
            <SectionHeading title="Tipografia" description="Manrope constrói hierarquia; Inter sustenta leitura operacional e formulários." />
            <div className={styles.typeSpecimen}>
              <div><span>Display</span><strong>Performance sem ruído.</strong><small>Manrope · 700 · tracking contido</small></div>
              <div><span>Título de página</span><h3>O que precisa da sua atenção hoje</h3><small>Manrope · 700</small></div>
              <div><span>Corpo</span><p>Informação factual, clara e curta para orientar a próxima ação sem competir com ela.</p><small>Inter · 500</small></div>
              <div><span>Dados</span><b>4 × 8 · 60 kg · RPE 8 · 120 s</b><small>Inter · tabular numerals</small></div>
            </div>
          </section>

          <section id="actions" className={styles.section}>
            <SectionHeading title="Ações" description="A anatomia permanece idêntica; somente o preenchimento da CTA muda." />
            <DecisionOptionGroup
              decisionId="VF-02"
              title="CTA primária"
              variable="tratamento visual do preenchimento"
              selected={selections["VF-02"]}
              recommendation="B"
              onSelect={(option) => select("VF-02", option)}
            >
              {(option) => <ActionSample option={option} />}
            </DecisionOptionGroup>
          </section>

          <section id="fields" className={styles.section}>
            <SectionHeading title="Campos" description="Label persistente, ajuda curta e estados legíveis sem depender apenas de cor." />
            <DecisionOptionGroup
              decisionId="VF-03"
              title="Campo de formulário"
              variable="tratamento da borda em repouso"
              selected={selections["VF-03"]}
              recommendation="B"
              onSelect={(option) => select("VF-03", option)}
            >
              {(option) => <FieldSample option={option} />}
            </DecisionOptionGroup>
            <div className={styles.formStateGrid}>
              <label><span>Padrão</span><input defaultValue="Treino A" /></label>
              <label data-state="success"><span>Válido</span><input defaultValue="Hipertrofia 4×" aria-describedby="field-success" /><small id="field-success"><Check /> Pronto para salvar.</small></label>
              <label data-state="error"><span>Com erro</span><input aria-invalid="true" aria-describedby="field-error" defaultValue="A" /><small id="field-error"><AlertCircle /> Use pelo menos 3 caracteres.</small></label>
              <label><span>Indisponível</span><input value="Publicado" disabled readOnly /></label>
            </div>
          </section>

          <section id="operational-rows" className={styles.section}>
            <SectionHeading title="Linhas operacionais" description="Informação densa é organizada por alinhamento, divisores e prioridade — não por cards repetidos." />
            <OperationalList />
          </section>

          <section id="feedback" className={styles.section}>
            <SectionHeading title="Feedback e estados" description="Mensagens dizem o que ocorreu e, quando necessário, como continuar." />
            <FeedbackExamples />
          </section>

          <section id="navigation" className={styles.section}>
            <SectionHeading title="Navegação" description="Trainer desktop mantém contexto; mobile prioriza destinos frequentes e deixa o restante em Mais." />
            <NavigationExamples />
          </section>

          <section id="disclosures" className={styles.section}>
            <SectionHeading title="Progressive disclosure" description="Detalhes ficam disponíveis sem disputar espaço com a tarefa principal." />
            <div className={styles.disclosureDemo}>
              <button type="button" aria-expanded={disclosureOpen} onClick={() => setDisclosureOpen((current) => !current)}>
                Parâmetros avançados <ChevronDown aria-hidden="true" />
              </button>
              {disclosureOpen ? <div><span>Tempo</span><strong>3–1–X–1</strong><span>RPE alvo</span><strong>8</strong></div> : null}
              <button type="button" onClick={() => dialogRef.current?.showModal()}>Abrir ações da sessão</button>
            </div>
          </section>

          <section id="motion" className={styles.section}>
            <SectionHeading title="Movimento" description="Mesma distância e duração; a comparação altera somente a curva de easing." />
            <DecisionOptionGroup
              decisionId="VF-04"
              title="Personalidade de movimento"
              variable="curva de easing"
              selected={selections["VF-04"]}
              recommendation="A"
              onSelect={(option) => select("VF-04", option)}
            >
              {(option) => <MotionSample option={option} replayKey={motionReplay} />}
            </DecisionOptionGroup>
            <button type="button" className={styles.replayButton} onClick={() => setMotionReplay((current) => current + 1)}>
              <RotateCcw aria-hidden="true" /> Repetir movimento
            </button>
          </section>

          <section id="product-fragments" className={styles.section}>
            <SectionHeading title="Fragmentos do produto" description="Dados demonstrativos preservam a distinção entre operação Trainer, ação Student e prescrição profissional." />
            <ProductFragments />
          </section>

          <section className={styles.section} aria-labelledby="evidence-heading">
            <SectionHeading title="Modelo de evidência" description="Cada decisão indica de onde vem a autoridade que a sustenta." />
            <h3 id="evidence-heading" className={styles.visuallyHidden}>Evidências usadas</h3>
            <div className={styles.evidenceList}>
              {evidenceSummary.map((evidence) => (
                <article key={evidence.category}>
                  <span>{evidence.category}</span>
                  <p>{evidence.statement}</p>
                  <small>{evidence.source}</small>
                </article>
              ))}
            </div>
          </section>
        </div>
      </div>

      <dialog ref={dialogRef} className={styles.sheet} aria-labelledby="session-actions-title">
        <div>
          <header>
            <span><strong id="session-actions-title">Ações da sessão</strong><small>Semana 3 · Sessão A</small></span>
            <button type="button" aria-label="Fechar ações da sessão" onClick={() => dialogRef.current?.close()}><X /></button>
          </header>
          <button type="button"><Share2 /> Compartilhar preview</button>
          <button type="button"><Globe2 /> Visualizar como aluno</button>
          <button type="button" onClick={() => dialogRef.current?.close()}>Concluir</button>
        </div>
      </dialog>
    </main>
  );
}
