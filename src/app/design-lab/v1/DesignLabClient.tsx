"use client";

import { AlertCircle, ArrowRight, Check, CheckCircle2, CircleUserRound, Dumbbell, Globe2, Home, LoaderCircle, Menu, Moon, MoreHorizontal, Pencil, RotateCcw, Search, Sun, TriangleAlert, UserRound, UsersRound, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./design-lab.module.css";
import { operationalRows } from "./fixtures";
import { buttonIds, buttonLabels, deriveGateStatus, DRAFT_STORAGE_KEY, fieldIds, fieldLabels, GATE_ID, iconIds, iconLabels, isComplete, resolveInitialDecisions, territoryIds, territoryLabels, type ApprovalArtifact, type ButtonId, type DraftSelection, type FieldId, type IconId, type TerritoryId } from "./gate-1b";

type Theme = "light" | "dark";
type Context = "login" | "dashboard" | "workout";

const selectionLabels = { visualTerritory: "Território visual", primaryButton: "Ação primária", fieldSystem: "Campo", iconography: "Iconografia" } as const;

function BrandMark() {
  return <div className={styles.brand} aria-label="FIT APP, marca temporária do laboratório"><span aria-hidden="true"><UserRound /></span><strong>FIT APP</strong><small>Decision Lab</small></div>;
}

function SectionHeading({ number, title, description }: { number: string; title: string; description: string }) {
  return <header className={styles.sectionHeading}><span>{number}</span><div><h2>{title}</h2><p>{description}</p></div></header>;
}

function GeometricIcon({ name }: { name: "home" | "students" | "workout" | "site" | "search" }) {
  const paths = {
    home: <><path d="M3 10 12 3l9 7"/><path d="M5.5 9v11h13V9"/><path d="M10 20v-6h4v6"/></>,
    students: <><circle cx="8" cy="8" r="3"/><path d="M2.5 20v-2.5A4.5 4.5 0 0 1 7 13h2a4.5 4.5 0 0 1 4.5 4.5V20"/><path d="M15 6h6M18 3v6"/></>,
    workout: <><path d="M4 9v6M7 6v12M17 6v12M20 9v6M7 12h10"/></>,
    site: <><rect x="3" y="4" width="18" height="16" rx="1"/><path d="M3 9h18M8 4v5"/></>,
    search: <><circle cx="10" cy="10" r="6"/><path d="m15 15 6 6"/></>,
  };
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="square" strokeLinejoin="miter" aria-hidden="true">{paths[name]}</svg>;
}

function ProductIcon({ system, name, selected = false }: { system: IconId; name: "home" | "students" | "workout" | "site" | "search"; selected?: boolean }) {
  if (system === "I02") return <GeometricIcon name={name} />;
  const Icon = { home: Home, students: UsersRound, workout: Dumbbell, site: Globe2, search: Search }[name];
  return <Icon aria-hidden="true" fill={system === "I03" && selected ? "currentColor" : "none"} strokeWidth={system === "I01" ? 1.8 : 1.6} />;
}

function TerritoryCanvas({ id, unlabeled }: { id: TerritoryId; unlabeled: boolean }) {
  return <div className={styles.territoryCanvas} data-territory={id}>
    <header><span>{unlabeled ? <span className={styles.visuallyHidden}>{territoryLabels[id]}</span> : territoryLabels[id]}</span><MoreHorizontal /></header>
    <div className={styles.territoryHeadline}><small>Hoje</small><strong>Prioridades do Personal</strong><p>Trabalho factual, organizado para a próxima ação.</p></div>
    {[["01","Avaliação respondida","João Silva · pronta para revisar"],["02","Treino em rascunho","Força A · ainda não publicado"]].map(([index,title,meta]) => <div className={styles.territoryRow} key={index}><span className={styles.territoryIndex}>{index}</span><span><b>{title}</b><small>{meta}</small></span><ArrowRight /></div>)}
    <footer><span>2 itens requerem atenção</span><button type="button" tabIndex={-1}>Abrir primeiro</button></footer>
  </div>;
}

function RadioOption({ name, value, checked, disabled, label, meta, onChange, children }: { name: string; value: string; checked: boolean; disabled: boolean; label: string; meta?: string; onChange: () => void; children: React.ReactNode }) {
  return <label className={styles.radioOption} data-selected={checked || undefined} data-disabled={disabled || undefined}><input type="radio" name={name} value={value} aria-label={`${value} — ${label}`} checked={checked} disabled={disabled} onChange={onChange}/><span className={styles.radioHeader}><b>{value}</b><span><strong>{label}</strong>{meta ? <small>{meta}</small> : null}</span><i aria-hidden="true"/></span>{children}</label>;
}

function TerritoryLab({ selected, onSelect, locked, unlabeled }: { selected?: TerritoryId; onSelect: (id: TerritoryId) => void; locked: boolean; unlabeled: boolean }) {
  const descriptions: Record<TerritoryId,string> = { A:"Preciso, sistemático, disciplinado", B:"Calmo, premium, humano", C:"Performance, velocidade, precisão", D:"Tecnologia premium, confiança, simplicidade" };
  return <div className={styles.territoryGrid} data-qa="territories">{territoryIds.map((id) => <RadioOption key={id} name="visual-territory" value={id} checked={selected===id} disabled={locked} label={unlabeled?`Opção ${id}`:territoryLabels[id]} meta={descriptions[id]} onChange={()=>onSelect(id)}><TerritoryCanvas id={id} unlabeled={unlabeled}/></RadioOption>)}</div>;
}

function ButtonSample({ id, unlabeled }: { id: ButtonId; unlabeled: boolean }) {
  return <div className={styles.buttonSample} data-button={id}><div className={styles.buttonRadius}><button type="button" tabIndex={-1}>Publicar treino <ArrowRight/></button><button type="button" tabIndex={-1} data-radius="medium">Publicar treino <ArrowRight/></button></div><div className={styles.stateStrip} aria-label={`${buttonLabels[id]}: estados`}><span>{unlabeled?"Ação":"Default"}</span><span data-state="hover">Hover</span><span data-state="focus">Focus</span><span data-state="pressed">Pressed</span><span data-state="loading"><LoaderCircle/>Loading</span><span data-state="disabled">Disabled</span><span data-state="success"><Check/>Success</span></div></div>;
}

function ButtonLab({ selected, onSelect, locked, unlabeled }: { selected?: ButtonId; onSelect:(id:ButtonId)=>void; locked:boolean; unlabeled:boolean }) {
  return <div className={styles.componentGrid} data-qa="buttons">{buttonIds.map((id)=><RadioOption key={id} name="primary-button" value={id} checked={selected===id} disabled={locked} label={unlabeled?`Opção ${id}`:buttonLabels[id]} onChange={()=>onSelect(id)}><ButtonSample id={id} unlabeled={unlabeled}/></RadioOption>)}</div>;
}

function FieldSample({ id }: { id: FieldId }) {
  return <div className={styles.fieldSample} data-field={id}><label data-state="empty"><span>Nome do treino</span><input aria-label={`${fieldLabels[id]} vazio`} placeholder="Ex.: Força A"/></label><label data-state="focused"><span>Aluno</span><input aria-label={`${fieldLabels[id]} focado`} value="João Silva" readOnly/></label><label data-state="filled"><span>Objetivo</span><input aria-label={`${fieldLabels[id]} preenchido`} value="Hipertrofia" readOnly/></label><label data-state="error"><span>Duração</span><input aria-label={`${fieldLabels[id]} com erro`} value="0" aria-invalid="true" readOnly/><small>Informe uma duração válida.</small></label><details><summary>Estados complementares</summary><div><label><span>Busca</span><input type="search" defaultValue="Agachamento"/></label><label><span>Senha</span><input type="password" value="segura123" readOnly/></label><label><span>Autofill</span><input autoComplete="name" value="João Silva" readOnly/></label><label><span>Indisponível</span><input value="Treino publicado" disabled readOnly/></label><p>Helper: visível ao aluno após publicar.</p></div></details></div>;
}

function FieldLab({ selected, onSelect, locked, unlabeled }: { selected?:FieldId; onSelect:(id:FieldId)=>void; locked:boolean; unlabeled:boolean }) {
  return <div className={styles.fieldGrid} data-qa="fields">{fieldIds.map((id)=><RadioOption key={id} name="field-system" value={id} checked={selected===id} disabled={locked} label={unlabeled?`Opção ${id}`:fieldLabels[id]} onChange={()=>onSelect(id)}><FieldSample id={id}/></RadioOption>)}</div>;
}

const iconConcepts=["home","students","workout","site","search"] as const;
function IconSample({ id }: { id:IconId }) { return <div className={styles.iconSample} data-icons={id}><div>{iconConcepts.map((name,index)=><span key={name} data-selected={index===2||undefined}><ProductIcon system={id} name={name} selected={index===2}/><small>{name}</small></span>)}</div><p>Outline como base · {id==="I03"?"preenchimento apenas no selecionado":"seleção por tom e superfície"}.</p></div>; }
function IconLab({ selected,onSelect,locked,unlabeled }:{selected?:IconId;onSelect:(id:IconId)=>void;locked:boolean;unlabeled:boolean}) { return <div className={styles.iconGrid} data-qa="icons">{iconIds.map((id)=><RadioOption key={id} name="iconography" value={id} checked={selected===id} disabled={locked} label={unlabeled?`Opção ${id}`:iconLabels[id]} onChange={()=>onSelect(id)}><IconSample id={id}/></RadioOption>)}</div>; }

function PreviewField({id}:{id?:FieldId}) { return <label className={styles.previewField} data-field={id??"unset"}><span>Seu e-mail</span><input value="personal@exemplo.com" readOnly/></label>; }
function PreviewButton({id,children}:{id?:ButtonId;children:React.ReactNode}) { return <button type="button" className={styles.previewButton} data-button={id??"unset"}>{children}<ArrowRight/></button>; }

function ProductPreview({decisions,context}:{decisions:DraftSelection;context:Context}) {
  const territory=decisions.visualTerritory??"A"; const icons=decisions.iconography??"I02";
  return <div className={styles.productPreview} data-territory={territory} data-button={decisions.primaryButton??"unset"} data-field={decisions.fieldSystem??"unset"} data-icons={icons}><header><BrandMark/><span>Fixture visual · não é dado real</span></header>
    {context==="login"?<div className={styles.loginPreview}><div><small>Bem-vindo</small><h3>Entre para continuar.</h3><p>Acesse seu espaço profissional.</p></div><PreviewField id={decisions.fieldSystem}/><PreviewButton id={decisions.primaryButton}>Entrar</PreviewButton><div className={styles.previewFeedback}><CheckCircle2/>Ambiente seguro</div></div>:null}
    {context==="dashboard"?<div className={styles.dashboardPreview}><div className={styles.previewTitle}><span><small>Hoje</small><h3>O que precisa da sua atenção</h3></span><PreviewButton id={decisions.primaryButton}>Criar treino</PreviewButton></div><div className={styles.previewOperational}><span><CircleUserRound/></span><span><strong>João Silva</strong><small>Avaliação respondida · revisar</small></span><ArrowRight/></div><div className={styles.previewOperational}><span><ProductIcon system={icons} name="workout"/></span><span><strong>Força A</strong><small>Rascunho · ainda não publicado</small></span><ArrowRight/></div><div className={styles.previewFeedback}><CheckCircle2/>Alterações salvas. O rascunho continua privado.</div></div>:null}
    {context==="workout"?<div className={styles.workoutPreview}><div className={styles.previewTitle}><span><small>Rascunho</small><h3>Força A</h3></span><PreviewButton id={decisions.primaryButton}>Publicar</PreviewButton></div><div className={styles.workoutPrescription}><span>01</span><span><strong>Agachamento livre</strong><small>4 séries · 8 reps · 60 kg · 120 s</small></span><Pencil/></div><PreviewField id={decisions.fieldSystem}/><div className={styles.previewFeedback}><TriangleAlert/>Revise o treino antes de publicar.</div></div>:null}
    <nav aria-label="Navegação demonstrativa"><span data-active="true"><ProductIcon system={icons} name="home" selected/>Hoje</span><span><ProductIcon system={icons} name="students"/>Alunos</span><span><ProductIcon system={icons} name="workout"/>Treinos</span><span><ProductIcon system={icons} name="site"/>Meu Site</span></nav></div>;
}

function OperationalList() { return <div className={styles.rows} role="list" aria-label="Linhas operacionais aceitas">{operationalRows.map((row)=><div className={styles.row} role="listitem" key={row.name}><span><span className={styles.avatar}><UserRound/></span><span><strong>{row.name}</strong><small>{row.context}</small></span></span><span>{row.meta}</span><span data-tone={row.tone}>{row.status}</span><button type="button" aria-label={`Abrir ${row.name}`}><ArrowRight/></button></div>)}</div>; }
function FeedbackExamples() { return <div className={styles.feedbackGrid}><div role="status" data-tone="success"><CheckCircle2/><span><strong>Alterações salvas</strong><small>O rascunho continua privado.</small></span></div><div role="alert" data-tone="danger"><AlertCircle/><span><strong>Não foi possível publicar</strong><small>Revise o campo indicado.</small></span></div><div role="status" data-tone="loading"><LoaderCircle/><span><strong>Gerando rascunho</strong><small>Você poderá revisar antes de publicar.</small></span></div><div data-tone="empty"><Dumbbell/><span><strong>Nenhum treino disponível</strong><small>O Personal ainda não publicou um treino.</small></span></div></div>; }

function ApprovalSummary({decisions}:{decisions:DraftSelection}) {
  const rows=[["Visual",decisions.visualTerritory?`${decisions.visualTerritory} — ${territoryLabels[decisions.visualTerritory]}`:"Não selecionado"],["Botão",decisions.primaryButton?`${decisions.primaryButton} — ${buttonLabels[decisions.primaryButton]}`:"Não selecionado"],["Campos",decisions.fieldSystem?`${decisions.fieldSystem} — ${fieldLabels[decisions.fieldSystem]}`:"Não selecionado"],["Ícones",decisions.iconography?`${decisions.iconography} — ${iconLabels[decisions.iconography]}`:"Não selecionado"]];
  return <dl className={styles.approvalSummary}>{rows.map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>;
}

export function DesignLabClient({repositoryArtifact,stale}:{repositoryArtifact:ApprovalArtifact|null;stale:boolean}) {
  const [theme,setTheme]=useState<Theme>("light"); const [artifact,setArtifact]=useState(repositoryArtifact); const [selections,setSelections]=useState<DraftSelection>(repositoryArtifact?.decisions??{}); const [context,setContext]=useState<Context>("login"); const [unlabeled,setUnlabeled]=useState(false); const [notice,setNotice]=useState(""); const [saving,setSaving]=useState(false);
  const approvalDialog=useRef<HTMLDialogElement>(null); const reopenDialog=useRef<HTMLDialogElement>(null); const approvalTrigger=useRef<HTMLButtonElement>(null); const reopenTrigger=useRef<HTMLButtonElement>(null); const draftReady=useRef(false);
  const locked=artifact?.status==="APPROVED"; const gateStatus=deriveGateStatus(selections,artifact,stale); const selectedCount=Object.values(selections).filter(Boolean).length;
  useEffect(()=>{queueMicrotask(()=>{setUnlabeled(new URLSearchParams(window.location.search).get("qa")==="unlabeled");try{if(repositoryArtifact?.status!=="APPROVED"){const stored=window.localStorage.getItem(DRAFT_STORAGE_KEY);if(stored){const parsed=JSON.parse(stored) as {version?:string;decisions?:DraftSelection};if(parsed.version==="gate-1b.v1"&&parsed.decisions)setSelections(resolveInitialDecisions(repositoryArtifact,parsed.decisions));}}}catch{window.localStorage.removeItem(DRAFT_STORAGE_KEY);}finally{draftReady.current=true;}});},[repositoryArtifact]);
  useEffect(()=>{if(draftReady.current&&!locked)window.localStorage.setItem(DRAFT_STORAGE_KEY,JSON.stringify({version:"gate-1b.v1",decisions:selections}));},[locked,selections]);
  const progress=useMemo(()=>[["visualTerritory",Boolean(selections.visualTerritory)],["primaryButton",Boolean(selections.primaryButton)],["fieldSystem",Boolean(selections.fieldSystem)],["iconography",Boolean(selections.iconography)]] as const,[selections]);
  function select<K extends keyof DraftSelection>(key:K,value:NonNullable<DraftSelection[K]>) { if(!locked)setSelections((current)=>({...current,[key]:value})); }
  async function submit(action:"approve"|"reopen") { if(action==="approve"&&!isComplete(selections))return;setSaving(true);setNotice("");try{const response=await fetch("/api/design-lab/approval",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(action==="approve"?{action,gateId:GATE_ID,decisions:selections}:{action,gateId:GATE_ID})});const payload=await response.json() as {artifact?:ApprovalArtifact;error?:string};if(!response.ok||!payload.artifact)throw new Error(payload.error??"Falha local");setArtifact(payload.artifact);setSelections(payload.artifact.decisions);window.localStorage.removeItem(DRAFT_STORAGE_KEY);if(action==="approve"){approvalDialog.current?.close();setNotice("Gate 1B aprovado. Fundação visual registrada.");approvalTrigger.current?.focus();}else{reopenDialog.current?.close();setNotice("Gate 1B reaberto. Uma nova revisão pode ser preparada.");reopenTrigger.current?.focus();}}catch(error){setNotice(error instanceof Error?error.message:"Não foi possível registrar a decisão.");}finally{setSaving(false);} }

  return <main className={styles.lab} data-theme={theme} data-unlabeled={unlabeled||undefined}>
    <header className={styles.labHeader}><BrandMark/><div><span>Local · dados demonstrativos</span><button type="button" aria-label={theme==="light"?"Ativar tema escuro":"Ativar tema claro"} onClick={()=>setTheme(theme==="light"?"dark":"light")}>{theme==="light"?<Moon/>:<Sun/>}</button></div></header>
    <nav className={styles.sectionNav} aria-label="Seções do Decision Lab">{["overview","territories","buttons","fields","icons","preview","rows","feedback","navigation","motion","accessibility","approval"].map((id,index)=><a key={id} href={`#${id}`}>{String(index).padStart(2,"0")}</a>)}</nav>
    <div className={styles.content}>
      <section id="overview" className={styles.overview} aria-labelledby="lab-title"><div><span>VISUAL FOUNDATION · GATE 1B</span><h1 id="lab-title">Escolha o sistema.<br/>Veja o produto inteiro.</h1><p>Quatro decisões visuais, combinadas em uma experiência coerente. A preferência provisória por Soft Editorial não está aprovada.</p></div><aside><header><span>Gate 1B</span><strong data-status={gateStatus}>{gateStatus==="STALE"?"APPROVED — REVIEW RECOMMENDED":gateStatus.replaceAll("_"," ")}</strong></header><p>{selectedCount} de 4 decisões selecionadas</p><ul>{progress.map(([key,done])=><li key={key} data-done={done||undefined}>{done?<Check/>:<span aria-hidden="true"/>}<span>{selectionLabels[key]}</span></li>)}</ul></aside></section>
      <section id="territories" className={styles.section}><SectionHeading number="01" title="Territórios visuais" description="Mesmo conteúdo, mesmo fluxo, quatro filosofias materialmente diferentes."/><TerritoryLab selected={selections.visualTerritory} onSelect={(id)=>select("visualTerritory",id)} locked={locked} unlabeled={unlabeled}/></section>
      <section id="buttons" className={styles.section}><SectionHeading number="02" title="Ações primárias" description="Escolha a filosofia. Estados e acessibilidade continuam parte do sistema."/><ButtonLab selected={selections.primaryButton} onSelect={(id)=>select("primaryButton",id)} locked={locked} unlabeled={unlabeled}/></section>
      <section id="fields" className={styles.section}><SectionHeading number="03" title="Campos" description="Labels persistentes e estados completos, com anatomias claramente distintas."/><FieldLab selected={selections.fieldSystem} onSelect={(id)=>select("fieldSystem",id)} locked={locked} unlabeled={unlabeled}/></section>
      <section id="icons" className={styles.section}><SectionHeading number="04" title="Iconografia" description="Minimal, sóbria, precisa e profissional. Nenhum ícone fitness decorativo."/><IconLab selected={selections.iconography} onSelect={(id)=>select("iconography",id)} locked={locked} unlabeled={unlabeled}/></section>
      <section id="preview" className={`${styles.section} ${styles.previewSection}`}><SectionHeading number="05" title="System Preview" description="Uma composição viva com as quatro decisões atuais."/><div className={styles.contextTabs} role="tablist" aria-label="Contexto do produto">{(["login","dashboard","workout"] as const).map((item)=><button key={item} role="tab" type="button" aria-selected={context===item} onClick={()=>setContext(item)}>{item==="login"?"Login":item==="dashboard"?"Dashboard":"Workout"}</button>)}</div><ProductPreview decisions={selections} context={context}/></section>
      <section id="rows" className={styles.section}><SectionHeading number="06" title="Linhas operacionais" description="Direção preservada: alinhamento, divisores e prioridade em vez de cards repetidos."/><OperationalList/></section>
      <section id="feedback" className={styles.section}><SectionHeading number="07" title="Feedback" description="Arquitetura preservada, agora demonstrada com iconografia contida."/><FeedbackExamples/></section>
      <section id="navigation" className={styles.section}><SectionHeading number="08" title="Navegação" description="Arquitetura aceita: contexto no desktop, destinos frequentes no mobile."/><div className={styles.navigationDemo}><nav aria-label="Navegação desktop demonstrativa"><BrandMark/><a href="#overview" aria-current="page"><Home/>Início</a><a href="#rows"><UsersRound/>Alunos</a><a href="#preview"><Dumbbell/>Treinos</a><a href="#approval"><Globe2/>Meu Site</a><button type="button"><Menu/>Mais</button></nav><nav aria-label="Navegação mobile demonstrativa"><a href="#overview" aria-current="page"><Home/>Hoje</a><a href="#rows"><UsersRound/>Alunos</a><a href="#preview"><Dumbbell/>Treinos</a><button type="button"><Menu/>Mais</button></nav></div></section>
      <section id="motion" className={styles.section}><SectionHeading number="09" title="Motion" description="Direção Quiet preservada: continuidade, hierarquia e feedback; nunca decoração."/><div className={styles.motionDemo}><span><Check/>Série concluída</span><p>Entrada curta · saída direta · reduced motion respeitado.</p><button type="button" onClick={(event)=>{const stage=event.currentTarget.parentElement?.querySelector("span");stage?.classList.remove(styles.replay);requestAnimationFrame(()=>stage?.classList.add(styles.replay));}}><RotateCcw/>Repetir</button></div></section>
      <section id="accessibility" className={styles.section}><SectionHeading number="10" title="Acessibilidade" description="A decisão visual só é válida se permanecer operável e compreensível."/><div className={styles.accessibilityList}>{["Radio semântico e seleção por teclado","Foco visível e alvos práticos de 44 × 44 px","Contraste AA, 200% zoom e texto pt-BR longo","Dialog com Escape, retorno de foco e anúncio de sucesso","Light, Dark grafite e reduced motion"].map((item)=><p key={item}><Check/>{item}</p>)}</div></section>
      <section id="approval" className={`${styles.section} ${styles.approvalSection}`}><SectionHeading number="11" title="Aprovação" description="Seleção é exploração. Aprovação registra a especificação ativa no repositório."/><div className={styles.approvalPanel}><header><span>{gateStatus==="STALE"?"APPROVED — REVIEW RECOMMENDED":gateStatus.replaceAll("_"," ")}</span>{artifact?<small>Revisão {artifact.revision} · {new Date(artifact.approvedAt).toLocaleString("pt-BR")}</small>:null}</header><ApprovalSummary decisions={selections}/>{!isComplete(selections)?<p>Selecione as quatro decisões para continuar.</p>:null}{locked?<button ref={reopenTrigger} type="button" className={styles.reopenButton} onClick={()=>reopenDialog.current?.showModal()}>Reabrir decisões</button>:<button ref={approvalTrigger} type="button" className={styles.approveButton} disabled={!isComplete(selections)} onClick={()=>approvalDialog.current?.showModal()}>Aprovar Gate 1B</button>}{notice?<p className={styles.notice} role="status" aria-live="polite">{notice}</p>:null}</div></section>
    </div>
    <dialog ref={approvalDialog} className={styles.dialog} aria-labelledby="approve-title" onClose={()=>approvalTrigger.current?.focus()}><form method="dialog"><header><div><small>GATE 1B</small><h2 id="approve-title">Você está aprovando a fundação visual do produto.</h2></div><button type="submit" aria-label="Fechar confirmação"><X/></button></header><ApprovalSummary decisions={selections}/><p>Após a aprovação, essas decisões serão tratadas como a especificação ativa para as próximas telas.</p><footer><button type="submit">Voltar</button><button type="button" disabled={saving} onClick={()=>void submit("approve")}>{saving?<LoaderCircle/>:<Check/>}Aprovar fundação visual</button></footer></form></dialog>
    <dialog ref={reopenDialog} className={styles.dialog} aria-labelledby="reopen-title" onClose={()=>reopenTrigger.current?.focus()}><form method="dialog"><header><div><small>NOVA REVISÃO</small><h2 id="reopen-title">Reabrir decisões?</h2></div><button type="submit" aria-label="Fechar confirmação"><X/></button></header><p>Reabrir o Gate permitirá criar uma nova revisão da fundação visual. A aprovação anterior será preservada no histórico.</p><footer><button type="submit">Manter aprovação</button><button type="button" disabled={saving} onClick={()=>void submit("reopen")}><RotateCcw/>Reabrir Gate 1B</button></footer></form></dialog>
  </main>;
}
