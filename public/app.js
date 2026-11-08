const $ = (s) => document.querySelector(s);
const esc = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const paths = {
  fullscreen: "M9 4H4v5 M15 4h5v5 M20 15v5h-5 M4 15v5h5",
  grid: "M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z",
  campaign: "M5 4h14v17H5z M9 4V2h6v2 M9 9h6 M9 13h6 M9 17h3",
  chart: "M4 20V10 M10 20V4 M16 20v-7 M22 20H2",
  action: "m5 12 4 4L20 5 M4 4h8 M4 20h16",
  settings:
    "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M3 12h2 M19 12h2 M12 3v2 M12 19v2 M5 5l2 2 M17 17l2 2 M5 19l2-2 M17 7l2-2",
  arrow: "M5 12h14 m-5-5 5 5-5 5",
  back: "M19 12H5 m5-5-5 5 5 5",
  plus: "M12 5v14 M5 12h14",
  people:
    "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M20 21v-2a4 4 0 0 0-3-3.9 M16 3.1a4 4 0 0 1 0 7.8",
  shield: "m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6z m-4 9 3 3 5-6",
  clock: "M12 8v5l3 2 M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20",
  check: "m5 12 4 4L20 5",
  info: "M12 11v6 M12 7h.01 M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20",
  lock: "M5 10h14v11H5z M8 10V6a4 4 0 0 1 8 0v4",
  search: "M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14 m5 12 6 6",
  close: "m6 6 12 12 M6 18 18 6",
  up: "m6 15 6-6 6 6",
  down: "m6 9 6 6 6-6",
  trash: "M3 6h18 M9 6V3h6v3 M6 6l1 15h10l1-15 M10 10v7 M14 10v7",
  download: "M12 3v12 m-5-5 5 5 5-5 M4 16v5h16v-5",
  copy: "M9 9h12v12H9z M15 9V3H3v12h6",
  send: "m22 2-7 20-4-9-9-4z M22 2 11 13",
  wave: "M3 10v4 M7 5v14 M12 2v20 M17 6v12 M21 10v4",
};
const icon = (name, cls = "") =>
  `<svg class="icon ${cls}" viewBox="0 0 24 24" aria-hidden="true"><path d="${paths[name] || paths.info}"/></svg>`;
const states = {
  draft: "Esborrany",
  approved: "Aprovada",
  publishing: "Publicant",
  uncertain: "Pendent de reconciliar",
  published: "En recollida",
  closed: "Tancada",
};
const badge = (state) =>
  `<span class="badge ${esc(state)}">${states[state] || esc(state)}</span>`;
const num = (n, suffix = "") =>
  n === null || n === undefined
    ? "—"
    : new Intl.NumberFormat("ca-ES", { maximumFractionDigits: 1 }).format(n) +
      suffix;
let session,
  campaigns = [],
  current,
  draft,
  editingQuestions = false,
  tab = "need",
  toastTimer;
const app = $("#app"),
  dialog = $("#dialog");
let llmRetryUntil=0,cooldownTimer;
function refreshLLMCooldown(){
  const remaining=Math.max(0,Math.ceil((llmRetryUntil-Date.now())/1000));
  document.querySelectorAll('[data-act="generate"],[data-analysis="proposals"],[data-analysis="themes"]').forEach(button=>{
    button.disabled=!!remaining||!session?.integrations.llm||button.dataset.unavailable==='true'||button.getAttribute('aria-busy')==='true';
    let label=button.querySelector('[data-cooldown]');
    if(remaining){if(!label){label=document.createElement('span');label.dataset.cooldown='';button.append(label);}label.textContent=` · ${remaining} s`;}
    else label?.remove();
  });
  if(!remaining){clearInterval(cooldownTimer);cooldownTimer=undefined;}
}
function toast(message, error = false) {
  const t = $("#toast");
  t.textContent = message;
  t.hidden = false;
  t.className = "toast" + (error ? " error" : "");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (t.hidden = true), error ? 9000 : 4500);
}
async function api(path, body) {
  const res = await fetch(path, {
    ...(body !== undefined
      ? {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      : {}),
  });
  const result = await res.json();
  if (!res.ok) {
    if (res.status === 401 && session?.authenticated) {
      session.authenticated = false;
      renderLogin();
    }
    if(res.status===429 && result.retryAfter!==undefined && /Groq|IA/.test(result.error||'')){
      llmRetryUntil=Math.max(llmRetryUntil,Date.now()+Number(result.retryAfter)*1000);
      if(!cooldownTimer)cooldownTimer=setInterval(refreshLLMCooldown,1000);
      refreshLLMCooldown();
    }
    throw new Error(result.error || "No s’ha pogut completar l’operació.");
  }
  return result;
}
async function run(button, fn) {
  if (button?.disabled) return;
  button?.setAttribute("aria-busy", "true");
  if (button) button.disabled = true;
  try {
    await fn();
  } catch (e) {
    toast(e.message, true);
  } finally {
    button?.removeAttribute("aria-busy");
    if (button) button.disabled = false;
    refreshLLMCooldown();
  }
}
const navItems = [
  ["overview", "grid", "Visió general"],
  ["campaigns", "campaign", "Campanyes"],
  ["calibration", "chart", "Calibració"],
  ["actions", "action", "Accions i seguiment"],
];
function shell(content, active = "overview", crumb = "Visió general") {
  app.innerHTML = `<div class="shell"><aside class="sidebar"><a class="brand" href="#overview"><img class="brand-logo" src="/escoltamm-logo.png" alt="Escoltamm"><span class="brand-caption">Estrella Damm · People</span></a><div class="brand-divider"></div><nav class="nav" aria-label="Navegació principal">${navItems.map(([id, i, label]) => `<a href="#${id}" class="${active === id ? "active" : ""}" ${active === id ? 'aria-current="page"' : ""}>${icon(i)}${label}${id === "campaigns" && campaigns.length > 0 ? `<span class="nav-count">${campaigns.length}</span>` : ""}</a>`).join("")}</nav><div class="side-bottom"><nav class="nav" aria-label="Configuració"><a href="#settings" class="${active === "settings" ? "active" : ""}">${icon("settings")}Integracions</a></nav></div></aside><div class="workspace"><header class="topbar"><div class="breadcrumb"><span>Espai de People</span>${icon("arrow")}<strong>${esc(crumb)}</strong></div><div class="top-tools"><span class="mode-label">${session.mode === "demo" ? "Dades sintètiques" : "Entorn connectat"}</span><a class="mobile-settings" href="#settings" aria-label="Integracions">${icon("settings")}</a><button class="avatar" data-act="logout" title="Tancar la sessió" aria-label="Tancar la sessió de People">EP</button></div></header><main id="main" class="content">${content}</main></div></div>`;
  const main = $("#main");
  main.setAttribute("tabindex", "-1");
  main.focus({ preventScroll: true });
  window.scrollTo(0, 0);
  refreshLLMCooldown();
}
function head(title, action = false) {
  return `<header class="page-head"><h1>${title}</h1>${action ? `<button class="btn btn-primary" data-act="new">${icon("plus")}Nova consulta</button>` : ""}</header>`;
}
function notice(text, type = "info") {
  return `<div class="notice ${type}">${icon(type === "success" ? "shield" : "info")}<p>${text}</p></div>`;
}
function empty(title, text = "", action = "") {
  return `<div class="empty"><h3>${title}</h3>${text ? `<p>${text}</p>` : ""}${action}</div>`;
}
function table(list) {
  return `<div class="table-wrap"><table><thead><tr><th scope="col">Campanya</th><th scope="col">Estat</th><th scope="col">Respostes</th><th scope="col">Proper pas</th></tr></thead><tbody>${list.map((c) => `<tr><td><button class="row-link" data-open="${esc(c.id)}"><span class="campaign-title"><span class="campaign-icon">${icon(c.parent_id ? "action" : "campaign")}</span><span><strong>${esc(c.titol)}</strong><small>${esc(c.public.sector)} · ${esc(c.public.torn)}${c.parent_id ? " · Seguiment" : ""}${c.source === "simulation" ? " · Dades sintètiques" : ""}</small></span></span></button></td><td>${badge(c.state)}</td><td>${num(c.total)}${c.total !== null ? "<small> · finals</small>" : ""}</td><td><a class="text-link" href="#campaign/${esc(c.id)}/${c.state === "closed" ? "results" : c.state === "published" ? "share" : "survey"}">${c.state === "closed" ? "Veure resultats" : c.state === "published" ? "Compartir QR" : c.state === "approved" ? "Publicar" : "Revisar consulta"} ${icon("arrow")}</a></td></tr>`).join("")}</tbody></table></div>`;
}
function stats() {
  const active = campaigns.filter((c) => c.state === "published").length,
    closed = campaigns.filter((c) => c.state === "closed"),
    count = closed.reduce((n, c) => n + (c.total || 0), 0),
    follow = campaigns.filter((c) => c.parent_id).length;
  return `<section class="stats" aria-label="Resum de l’espai">${[
    [active, "Consultes obertes"],
    [count, "Respostes publicables"],
    [closed.length, "Onades tancades"],
    [follow, "Seguiments"],
  ]
    .map(
      ([value, title]) =>
        `<div class="stat"><div class="stat-top">${title}</div><div class="stat-value">${num(value)}</div></div>`,
    )
    .join("")}</section>`;
}
let cycleCampaignId;
function cycleSteps(campaign) {
  const steps = ["Definir la necessitat", "Revisar i aprovar", "Recollir respostes", "Llegir els resultats", "Decidir i fer seguiment"];
  const phaseByState = {
    draft: campaign?.has_questions ? 2 : 1,
    approved: 2,
    publishing: 2,
    uncertain: 2,
    published: 3,
    closed: campaign?.has_followup ? 5 : 4,
  };
  const phase = phaseByState[campaign?.state];
  return steps.map((step, i) => `<li${phase === i + 1 ? ' aria-current="step"' : ""}><span class="step-circle" aria-hidden="true">${i + 1}</span>${step}</li>`).join("");
}
function overview() {
  const campaign = campaigns.find((c) => c.id === cycleCampaignId) ?? campaigns[0];
  shell(
    `${head("Consultes de People", true)}
    ${campaigns.length ? stats() : ""}
    <div class="split">
      <section class="panel overview-campaigns">
        <div class="panel-head"><h2>Campanyes</h2>${campaigns.length ? `<a class="text-link" href="#campaigns">Veure totes ${icon("arrow")}</a>` : ""}</div>
        ${campaigns.length ? table(campaigns.slice(0, 4)) : empty("Encara no hi ha consultes")}
      </section>
      <aside class="panel cycle-card">
        <h2>Cicle d’escolta</h2>
        ${campaigns.length > 1 ? `<label class="field cycle-picker">
          <span class="visually-hidden">Campanya del cicle</span>
          <select id="cycle-campaign">${campaigns.map((c) => `<option value="${esc(c.id)}" ${c.id === campaign.id ? "selected" : ""}>${esc(c.titol)}</option>`).join("")}</select>
        </label>` : campaign ? `<p class="cycle-campaign-name">${esc(campaign.titol)}</p>` : ""}
        <ol class="cycle-list" id="cycle-steps">${cycleSteps(campaign)}</ol>
      </aside>
    </div>`,
  );
}
function campaignList() {
  shell(
    `${head("Campanyes", true)}<section class="panel"><div class="toolbar"><label class="search">${icon("search")}<span class="visually-hidden">Cercar campanyes</span><input type="search" id="campaign-search" placeholder="Cerca una campanya…"></label><label class="field"><span class="visually-hidden">Filtrar per estat</span><select id="state-filter"><option value="">Tots els estats</option>${Object.entries(
      states,
    )
      .map(([id, s]) => `<option value="${id}">${s}</option>`)
      .join(
        "",
      )}</select></label></div><div id="campaign-table">${table(campaigns)}</div></section>`,
    "campaigns",
    "Campanyes",
  );
}
async function calibration() {
  const { diagnostic } = await api("/api/calibration");
  const content = diagnostic.length
    ? `<h2>Calibració històrica de Planta</h2>${diagnosticContent(diagnostic)}`
    : empty("Sense dades històriques", "No s’han carregat dades de calibració en aquest espai.");
  shell(`${head("Calibració")}<section class="panel section">${content}</section>`, "calibration", "Calibració");
}
function diagnosticContent(signals, adaptations = []) {
  if (!signals.length) return "<p>Dades insuficients per a aquest públic.</p>";
  const { public: audience, abast, origen, periode, pregunta } = signals[0];
  const scope = abast === "ampli"
    ? "Context de tota la planta, amb els dos torns agrupats."
    : "Calibració del públic seleccionat.";
  return `<p><strong>${esc(audience.ubicacio)} · ${esc(audience.torn)}</strong><br>${esc(origen)} · ${esc(periode)}. ${scope}</p>
    <p>Pregunta històrica: «${esc(pregunta)}»</p>
    ${signals.map(signal => {
      const related = adaptations.filter(item => item.senyal_id === signal.id);
      return `<div class="diagnostic">
        <small class="red">Senyal mesurat</small>
        <h3>${esc(signal.titol)}</h3>
        <p>${esc(signal.observacio)} ${esc(signal.limitacio)}</p>
        ${related.map(item => `<p><strong>Proposta de la IA.</strong> ${esc(item.proposta)}</p>`).join("")}
      </div>`;
    }).join("")}`;
}
function distributionChart(distribution) {
  if (!distribution) return "";
  const { percentatges, bases } = distribution;
  const peak = Math.max(...percentatges.flat());
  const tickSize = peak > 60 ? 20 : 10;
  const ceiling = Math.max(tickSize, Math.ceil(peak / tickSize) * tickSize);
  const ticks = Array.from({ length: ceiling / tickSize + 1 }, (_, i) => i * tickSize);
  const ratings = [1, 2, 3, 4, 5];
  const xStep = 96;
  const x = (i) => 48 + i * xStep;
  const y = (value) => 182 - (value / ceiling) * 162;
  const labels = ["Referència completa", "Voluntària per QR"];

  return `<figure class="calibration-chart">
    <figcaption>Em sento a gust amb el meu entorn de treball i les meves condicions laborals</figcaption>
    <ul class="calibration-legend" role="list">
      ${labels.map((label, i) => `<li class="calibration-series-${i}">${label} (n=${num(bases[i])})</li>`).join("")}
    </ul>
    <svg viewBox="0 0 450 228" role="img" aria-label="Percentatge de respostes per puntuació de l’1 al 5">
      ${ticks.map(value => `<line class="calibration-gridline" x1="48" y1="${y(value)}" x2="432" y2="${y(value)}"/>
        <text x="40" y="${y(value) + 4}" text-anchor="end">${value}%</text>`).join("")}
      ${ratings.map((rating, i) => `<text x="${x(i)}" y="202" text-anchor="middle">${rating}</text>`).join("")}
      <text x="240" y="224" text-anchor="middle">Puntuació</text>
      ${percentatges.map((values, series) => {
        const points = values.map(y);
        const changes = points.slice(1).map((point, i) => point - points[i]);
        // Les tangents comparteixen pendent a cada punt i s’aplanen als extrems locals.
        const tangents = points.map((_, i) => {
          const before = changes[i - 1] ?? 0;
          const after = changes[i] ?? 0;
          return before * after > 0 ? (2 * before * after) / (before + after) : 0;
        });
        const segments = changes.map((_, i) =>
          `C ${x(i) + xStep / 3} ${points[i] + tangents[i] / 3}, ${x(i + 1) - xStep / 3} ${points[i + 1] - tangents[i + 1] / 3}, ${x(i + 1)} ${points[i + 1]}`);
        return `<g class="calibration-series-${series}">
          <path d="M ${x(0)} ${points[0]} ${segments.join(" ")}"/>
          ${points.map((point, i) => `<circle cx="${x(i)}" cy="${point}" r="4">
            <title>${labels[series]} · Puntuació ${ratings[i]} · ${num(values[i], "%")}</title>
          </circle>`).join("")}
        </g>`;
      }).join("")}
    </svg>
  </figure>`;
}
function historicalTrend(chartOnly = false) {
  const { generacio, public: audience } = current.config;
  const sameAudience = generacio && JSON.stringify(generacio.public) === JSON.stringify(audience);
  const signals = sameAudience ? generacio.sondeig : current.diagnostic;
  const adaptations = sameAudience ? current.survey.adaptacions.filter(a => a.pregunta_id === undefined) : [];
  const summary = sameAudience
    ? signals.length
      ? "Aquests són els senyals històrics que la IA va rebre en generar l’esborrany."
      : "Quan es va generar l’esborrany, les dades de calibració eren insuficients per a aquest públic."
    : generacio
      ? "El públic ha canviat des de la generació. Revisa si el formulari encara és adequat per al públic actual."
      : "El sondeig històric orienta el disseny del formulari.";
  const plan = signals.some(signal => signal.id === "historic_participacio") ? `
    <ol class="calibration-steps" role="list">
      <li>
        <span>${icon("chart")} 01 · Senyal observat</span>
        <h3>Possible distorsió de l’opinió del conjunt</h3>
        <p>Si hi responen sobretot les persones amb opinions més marcades, els resultats poden donar una imatge esbiaixada del conjunt.</p>
        ${icon("arrow", "calibration-arrow")}
      </li>
      <li>
        <span>${icon("people")} 02 · Objectiu</span>
        <h3>Augmentar la participació</h3>
        <p>Facilitar que hi responguin més persones del públic seleccionat.</p>
        ${icon("arrow", "calibration-arrow")}
      </li>
      <li>
        <span>${icon("action")} 03 · Acció proposada</span>
        <h3>Fer preguntes més curtes</h3>
        <p>Redactar enunciats breus, amb una sola idea per pregunta.</p>
      </li>
    </ol>` : "";
  const chart = distributionChart(current.distribucio_historica);
  const evidence = chartOnly ? "" : diagnosticContent(signals, adaptations);
  const hasDetails = chartOnly ? Boolean(chart) : signals.length > 0;
  return `<section class="panel section calibration-review" aria-labelledby="review-calibration">
    <h2 id="review-calibration">Tendència històrica</h2>
    <p>${summary}</p>
    ${plan && signals[0].abast === "ampli" ? "<p>Context històric de tota la planta, amb els dos torns agrupats.</p>" : ""}
    ${plan}
    ${hasDetails ? `<details class="calibration-evidence">
      <summary>${!chartOnly && adaptations.length ? "Dades del sondeig i propostes de la IA" : "Dades del sondeig"}</summary>
      ${evidence}
      ${chart}
    </details>` : evidence || (!signals.length && !generacio ? "<p>Dades insuficients per a aquest públic.</p>" : "")}
  </section>`;
}
const tabs = [
  ["need", "Necessitat"],
  ["survey", "Consulta"],
  ["share", "Difusió"],
  ["results", "Resultats"],
  ["action", "Acció i seguiment"],
];
function detailFrame(inner) {
  const w = current;
  let primary =
    w.state === "draft" && w.survey.preguntes.length > 0
      ? tab === "survey"
        ? `<button class="btn btn-primary" data-act="approve">${icon("check")}Aprovar versió ${w.version}</button>`
        : `<a class="btn btn-primary" href="#campaign/${w.id}/survey">Revisar la consulta ${icon("arrow")}</a>`
      : w.state === "approved"
        ? `<button class="btn btn-primary" data-act="publish">${icon("send")}Publicar consulta</button>`
        : ["uncertain", "publishing"].includes(w.state)
          ? '<button class="btn btn-primary" data-act="reconcile">Reconciliar publicació</button>'
          : "";
  shell(
    `<a class="back" href="#campaigns">${icon("back")}Totes les campanyes</a><header class="page-head"><div><h1 class="detail-title">${esc(w.config.titol)}</h1><div class="detail-meta">${badge(w.state)}<span class="muted"><small>${w.parent_id ? "Seguiment · " : ""}${esc(w.config.public.sector)} · ${esc(w.config.public.ubicacio)} · ${esc(w.config.public.torn)} · Versió ${w.version}${w.source === "simulation" ? " · Dades sintètiques" : ""}</small></span></div></div>${primary}</header><nav class="tabs" aria-label="Passos de la campanya">${tabs.map(([id, s]) => `<a class="tab ${tab === id ? "active" : ""}" ${tab === id ? 'aria-current="page"' : ""} href="#campaign/${w.id}/${id}">${s}</a>`).join("")}</nav>${inner}`,
    "campaigns",
    w.config.titol,
  );
}
function needView() {
  const c = current.config;
  return `<section class="panel section"><h2>${esc(c.objectiu)}</h2><dl class="info-list"><div><dt>Decisió</dt><dd>${esc(c.decisio)}</dd></div><div><dt>Context</dt><dd>${esc(c.context)}</dd></div><div><dt>Públic</dt><dd>${esc(c.public.sector)} · ${esc(c.public.ubicacio)} · ${esc(c.public.torn)}<br><small>${c.population} credencials sintètiques elegibles</small></dd></div><div><dt>Finestra de resposta</dt><dd>${c.dies} dies · ${new Date(c.opens).toLocaleDateString("ca-ES")} – ${new Date(c.closes).toLocaleDateString("ca-ES")}</dd></div><div><dt>Temes exclosos</dt><dd>${esc(c.exclusions)}</dd></div></dl>${["draft", "approved"].includes(current.state) ? '<button class="btn" data-act="edit-need">Editar la necessitat</button>' : ""}</section>${historicalTrend()}`;
}
const questionBias = {
  cobertura: { tag: "Cobertura", kind: "cobertura", contextual: true },
  historic_participacio: { tag: "Baixa participació", kind: "participacio" },
  participacio_nit: { tag: "Baixa participació", kind: "participacio" },
  moment: { tag: "Moment", kind: "moment", contextual: true },
};
function biasTag({ tag, kind }) {
  return `<span class="bias-tag" data-bias="${kind}">${tag}</span>`;
}
function questionOptions(q, i, canEdit) {
  if (!q.opcions.length) return "";
  if (q.tipus === "escala_1_5") {
    const points = q.opcions.slice(0, 5);
    return `<div class="question-options"><strong>Opcions de resposta</strong>
      <ol class="question-scale" role="list">${points.map(({ id, etiqueta }) => {
        const endpoint = id === "1" || id === "5";
        const label = endpoint ? etiqueta.replace(/^[15]\s*[·:–-]\s*/, "") : "";
        return `<li><b>${id}</b>${label ? `<span>${esc(label)}</span>` : ""}</li>`;
      }).join("")}</ol><small class="scale-non-rating">${esc(q.opcions[5].etiqueta)}</small>
    </div>`;
  }
  return `<div class="question-options"><strong>Opcions de resposta</strong><ul class="option-editor">${q.opcions.map((o, j) => `<li>
    <span class="option-mark" aria-hidden="true">○</span>${canEdit ? `<textarea rows="1" data-option="${i}:${j}" aria-label="Opció ${j + 1} de la pregunta ${i + 1}">${esc(o.etiqueta)}</textarea>` : `<span>${esc(o.etiqueta)}</span>`}
    </li>`).join("")}</ul></div>`;
}
function questionEditor(q, i, editable, adaptations, signals) {
  const n = i + 1;
  const canEdit = editable && !q.de_referencia;
  const format = { escala_1_5: "Escala 1–5", seleccio_unica: "Selecció única", text_lliure: "Text lliure" }[q.tipus];
  const notes = adaptations.filter(a => a.pregunta_id === q.id);
  const tags = [...new Map(notes.map(a => questionBias[a.senyal_id]).filter(Boolean).map(b => [b.kind, b])).values()];
  const conditions = q.condicio_de_visualitzacio?.totes.map(c => {
    const source = draft.preguntes.findIndex(p => p.id === c.pregunta_id);
    if (source === -1) return "Pregunta de la condició eliminada";
    const options = c.opcions_ids.map(id => esc(draft.preguntes[source].opcions.find(o => o.id === id)?.etiqueta || id));
    return `Q${source + 1}: ${options.join(" / ")}`;
  }).join(" i ");
  return `<details class="question" data-question="${esc(q.id)}">
    <summary class="question-summary">
      <span class="question-number">${String(n).padStart(2, "0")}</span>
      <span class="question-overview">
        <strong data-question-text>${esc(q.text) || "Pregunta sense enunciat"}</strong>
        <span class="question-meta"><span>${format}</span><span data-question-required>${q.obligatoria ? "Obligatòria" : "Opcional"}</span>
          ${conditions ? "<span>Condicional</span>" : ""}
          ${q.de_referencia ? `<span class="fixed-tag">${icon("lock")}Referència fixa</span>` : ""}
          ${tags.map(biasTag).join("")}
        </span>
      </span>${icon("down")}
    </summary>
    <div class="question-body">
      ${canEdit ? `<div class="field"><label for="question-${i}">Enunciat</label><textarea id="question-${i}" data-q="${i}">${esc(q.text)}</textarea></div>` : ""}
      <dl class="question-purpose"><div><dt>Què mesura</dt><dd>${esc(q.que_mesura)}</dd></div>
        <div><dt>Quina decisió informa</dt><dd>${esc(q.quina_decisio_informa)}</dd></div></dl>
      ${notes.length ? `<div class="question-rationale"><strong>Justificació del disseny</strong><ul>${notes.map(a => {
        const bias = questionBias[a.senyal_id];
        const signal = signals.find(s => s.id === a.senyal_id);
        return `<li>${bias ? biasTag(bias) : ""} <span>${esc(a.proposta)}${bias?.contextual ? " <small>· Risc contextual</small>" : signal ? ` <small>· ${signal.abast === "ampli" ? "Sondeig de tota la planta" : "Sondeig històric"}</small>` : ""}</span></li>`;
      }).join("")}</ul></div>` : ""}
      ${questionOptions(q, i, canEdit)}
      ${conditions ? `<p class="question-condition"><strong>Es mostra si</strong> ${conditions}</p>` : ""}
      ${canEdit ? `<div class="question-controls">
        ${q.tipus !== "text_lliure" ? `<label class="check-label"><input type="checkbox" data-required="${i}" ${q.obligatoria ? "checked" : ""}>Resposta obligatòria</label>` : ""}
        <div class="question-tools"><button class="icon-btn" data-move="${i}" data-dir="-1" aria-label="Moure la pregunta ${n} amunt" ${!i || draft.preguntes[i - 1].de_referencia ? "disabled" : ""}>${icon("up")}</button>
          <button class="icon-btn" data-move="${i}" data-dir="1" aria-label="Moure la pregunta ${n} avall" ${!draft.preguntes[i + 1] || draft.preguntes[i + 1].de_referencia ? "disabled" : ""}>${icon("down")}</button>
          <button class="icon-btn" data-delete="${i}" aria-label="Eliminar la pregunta ${n}">${icon("trash")}</button></div>
      </div>` : ""}
    </div>
  </details>`;
}
function surveyView() {
  const editable = ["draft", "approved"].includes(current.state);
  const count = draft.preguntes.length;
  const generation = current.config.generacio;
  const audienceChanged = generation && JSON.stringify(generation.public) !== JSON.stringify(current.config.public);
  const adaptations = audienceChanged ? [] : draft.adaptacions;
  const signals = generation?.sondeig || current.diagnostic;
  return `<div class="survey-workspace">
    ${historicalTrend(true)}
    <details class="panel survey-form" open>
      <summary class="survey-disclosure"><strong>Títol i introducció</strong><small data-form-title>${esc(draft.titol)}</small>${icon("down")}</summary>
      <div class="section"><div class="field"><label for="survey-title">Títol del formulari</label><input id="survey-title" value="${esc(draft.titol)}" ${editable ? "" : "readonly"}></div>
      <div class="field"><label for="survey-intro">Introducció i tractament de dades</label><textarea id="survey-intro" ${editable ? "" : "readonly"}>${esc(draft.introduccio)}</textarea></div></div>
    </details>
    <section class="panel survey-questions" aria-labelledby="survey-questions"><header class="survey-list-heading"><h2 id="survey-questions">Preguntes de la consulta</h2>
      ${count ? `<small>${count} preguntes · ${draft.temps_estimat_segons} s estimats</small>` : ""}</header>
      ${editable ? `<div class="toolbar survey-toolbar">
        <button class="btn btn-small ${session.integrations.llm && !count ? "btn-primary" : ""}" data-act="generate" ${session.integrations.llm ? "" : "disabled"}>Generar amb IA real</button>
        ${draft.preguntes.some(q => !q.de_referencia) ? `<button class="btn btn-small" data-act="edit-questions">${editingQuestions ? "Acabar l’edició" : "Editar preguntes manualment"}</button>` : ""}
        <button class="btn btn-small" data-act="save">Desar canvis</button><button class="btn btn-small btn-quiet" data-act="json">Editar JSON complet</button>
        ${session.integrations.llm ? "" : '<small>Configura la IA a <a class="text-link" href="#settings">Integracions</a>.</small>'}</div>` : ""}
      ${count ? draft.preguntes.map((q, i) => questionEditor(q, i, editable && editingQuestions, adaptations, signals)).join("") : empty("Encara no hi ha preguntes")}
    </section>
    ${count ? participantPreview() : ""}
  </div>`;
}
function participantPreview() {
  const prompts = draft.preguntes.map((question, i) => {
    if (question.condicio_de_visualitzacio || !question.opcions.length) return "";
    return `<div class="field"><label for="preview-q${i + 1}">Q${i + 1} · ${esc(question.que_mesura)}</label>
      <select id="preview-q${i + 1}" data-preview="${esc(question.id)}"><option value="">Sense resposta</option>
      ${question.opcions.map(option => `<option value="${esc(option.id)}">${esc(option.etiqueta)}</option>`).join("")}</select></div>`;
  });
  return `<aside class="preview"><h2>Vista del participant</h2>
    ${draft.preguntes.some(q => q.condicio_de_visualitzacio) ? "<p>Tria respostes per provar les preguntes condicionals.</p>" : ""}
    ${prompts.join("")}<div id="preview-path"></div>
    ${current.published ? `<a class="text-link" href="/participa/${current.id}" target="_blank" rel="noopener">Obrir l’accés del participant ${icon("arrow")}</a>` : ""}</aside>`;
}
function previewPath() {
  if (!$("#preview-path")) return;
  const answers=Object.fromEntries([...document.querySelectorAll('[data-preview]')].map(el=>[el.dataset.preview,el.value]));
  const questions = draft.preguntes.filter(
    (q) =>
      !q.condicio_de_visualitzacio ||
      q.condicio_de_visualitzacio.totes.every((c) =>
        c.opcions_ids.includes(answers[c.pregunta_id]),
      ),
  );
  $("#preview-path").innerHTML =
    `<div class="preview-path">${questions.map((q, i) => `${i ? icon("arrow") : ""}<b>Q${draft.preguntes.indexOf(q) + 1}</b>`).join("")}</div><strong><small>${questions.length} preguntes en aquest camí</small></strong>${questions.some((q) => q.condicio_de_visualitzacio) ? `<p class="red">Aclariment visible: «${esc(questions.find((q) => q.condicio_de_visualitzacio).text)}»</p>` : "<p>Sense repregunta en aquest recorregut.</p>"}`;
}
function shareView() {
  if (current.source === "simulation")
    return notice("Aquesta onada tancada forma part de la simulació de l’etapa 03.");
  if (!current.published)
    return `<section class="panel">${empty("Consulta pendent de publicació", "El QR estarà disponible en publicar-la.", `<a class="btn" href="#campaign/${current.id}/survey">Revisar la consulta ${icon("arrow")}</a>`)}</section>`;
  const link = `${location.origin}/participa/${current.id}`;
  return `${current.state === "closed" ? notice("La recollida està tancada. El QR conserva l’enllaç, però ja no permet enviar respostes.") : notice(current.source === "local" ? "El QR obre el formulari local." : "Per comptar als resultats, respon des del QR de la plataforma.")}<section class="panel section"><div class="qr-layout"><div class="qr-box"><img src="/api/campaigns/${current.id}/qr" alt="QR de l’accés a aquesta consulta"><strong>${esc(current.config.titol)}</strong><small>${esc(current.config.public.torn)} · Dades de prova</small></div><div><h2>Comparteix la consulta</h2><a class="text-link" href="${link}" target="_blank" rel="noopener">Obrir l’accés del participant ${icon("arrow")}</a>${current.form_url ? `<p><a class="text-link" href="${esc(current.form_url)}" target="_blank" rel="noopener">Obrir formulari a Typeform</a> · <a class="text-link" href="/api/campaigns/${current.id}/typeform-qr" download="qr-typeform.svg">Descarregar QR Typeform</a></p>` : ""}<div class="share-actions"><button class="btn" data-act="copy">${icon("copy")}Copiar enllaç</button><a class="btn" href="/api/campaigns/${current.id}/qr" download="qr-consulta.svg">${icon("download")}Descarregar QR</a><button class="btn btn-quiet" data-act="print">Imprimir</button></div></div></div></section>${current.state === "published" ? `<div class="form-actions">${current.source === "typeform" ? '<button class="btn" data-act="import">Importar respostes de Typeform</button><button class="btn" data-act="webhook">Connectar recepció automàtica</button>' : ""}<button class="btn" data-act="close">Tancar recollida i calcular resultats ${icon("arrow")}</button></div>` : ""}${["127.0.0.1", "localhost", "[::1]"].includes(location.hostname) ? `<p class="muted"><small>El QR de la plataforma només funciona en aquest ordinador.</small></p>` : ""}`;
}
function simulationResults(w) {
  const { kpi, comparacions, total, taxa, population } = w.results;
  const reading = (label, value, base) =>
    `<div class="topic-row"><span>${label}<br><small>Base: ${num(base)}</small></span><strong>${num(value, "%")}</strong></div>`;
  const metricName = { comprensio: "Comprensió", suport: "Suport" };
  return `${notice("Dades sintètiques de l’etapa 03. Les bases petites i els seus complements es protegeixen.")}
    <section class="panel section"><h2>Resultats de l’onada</h2>
      <p>${num(total)} trameses vàlides de ${num(population)} persones elegibles · ${num(taxa, "%")} de participació aparent</p>
      <p>Les respostes 4 i 5 compten com a favorables sobre la base vàlida de cada pregunta.</p>
      ${Object.entries(metricName).map(([id, name]) =>
        reading(name + " favorable", kpi[id + "_favorable_pct"], kpi[id + "_base_escala"]),
      ).join("")}
      ${reading("Dificultat principal: entendre el funcionament", kpi.dificultat_funcionament_pct, kpi.dificultat_funcionament_base)}
      ${kpi.onada > 1 ? reading("Ha rebut el resum", kpi.arribada_resum_si_pct, kpi.arribada_resum_si_base) : ""}
      ${reading("Pes del torn de dia entre els torns declarats", kpi.pes_dia_mostra_pct, kpi.base_torns_declarats)}
      <p><small>Pes del torn de dia al públic elegible: ${num(kpi.pes_dia_poblacio_pct, "%")}.</small></p>
    </section>
    ${comparacions.length ? `<section class="panel section"><h2>Evolució entre mostres</h2>
      <p>Mostres voluntàries sense aparellar. La no resposta, l’autoselecció i els canvis de composició poden afectar la comparació.</p>
      ${comparacions.map((row) => `<div class="topic-row">
        <span>${metricName[row.pregunta_id]} · <a class="text-link" href="#campaign/${esc(row.campanya_origen_id)}/results">Onada ${row.onada_origen}</a> → ${row.onada_desti}<br>
        <small>${row.delta_favorable_pp === null ? esc(row.motiu_o_limit) : `${num(row.favorable_origen_pct, "%")} → ${num(row.favorable_desti_pct, "%")} · Bases ${num(row.base_origen)} → ${num(row.base_desti)}`}</small></span>
        <strong>${num(row.delta_favorable_pp, " pp")}</strong>
      </div>`).join("")}
    </section>` : ""}
    <div class="form-actions"><a class="btn" href="/api/campaigns/${w.id}/export">${icon("download")}Exportar agregats</a>
      <a class="btn btn-primary" href="#campaign/${w.id}/action">Veure acció i seguiment ${icon("arrow")}</a></div>`;
}
function resultView() {
  if (current.source === "simulation") return simulationResults(current);
  const r = current.results;
  if (r.recollint) {
    return `<section class="panel">${empty("Recollida en curs", "Els resultats es mostren quan es tanca la recollida.",
      `<a class="btn" href="#campaign/${current.id}/share">Anar a difusió ${icon("arrow")}</a>`)}</section>`;
  }
  if (current.state !== "closed") {
    return `<section class="panel">${empty("Encara no hi ha resultats", "Publica la consulta per recollir respostes.")}</section>`;
  }

  const referenceIds = new Set(current.survey.preguntes.filter(q => q.de_referencia).map(q => q.id));
  const headlineMetrics = [...r.metrics.filter(m => referenceIds.has(m.id)),
    ...r.metrics.filter(m => !referenceIds.has(m.id))].slice(0, 2);
  const cards = [
    { value: num(r.total), label: "Respostes acceptades", note: "Trameses de l’onada tancada" },
    { value: num(r.taxa, "%"), label: "Participació", note: r.taxa == null
      ? "Taxa indisponible per a aquesta mostra" : `${num(r.population)} persones elegibles` },
    ...headlineMetrics.map(m => ({
      value: num(m.favorable, "%"), label: current.survey.preguntes.find(q => q.id === m.id)?.que_mesura || m.text,
      note: m.favorable == null ? "Proporció indisponible" : `Favorables · ${num(m.n)} respostes vàlides`,
    })),
  ];

  return `<div class="results-dashboard">
    <section class="stats results-stats" aria-label="Indicadors de l’onada">
      ${cards.map(({ value, label, note }) => `<div class="stat">
        <div class="stat-top">${esc(label)}</div><div class="stat-value">${value}</div>
        <small>${esc(note)}</small>
      </div>`).join("")}
    </section>
    ${r.total === null ? notice("Dades insuficients per mostrar resultats d’aquesta onada.") : ""}
    ${analysisResults(current)}
    ${resultComparisons(current)}
    ${r.total === null ? "" : resultDetails(r)}
    <div class="form-actions">
      <a class="btn" href="/api/campaigns/${current.id}/export">${icon("download")}Exportar agregats</a>
      <a class="btn btn-primary" href="#campaign/${current.id}/action">Decidir el proper pas ${icon("arrow")}</a>
    </div>
  </div>`;
}
function resultDetails(r) {
  const states = {
    no_valorable: "No valorable", no_us: "No ús", negativa: "Negatives", no_mostrada: "No elegibles",
    omesa: "Omeses", invalida: "Invàlides", desconeguda: "Desconegudes",
  };
  return `<details class="panel section results-details">
    <summary>Detall de les respostes i de la mostra</summary>
    <p class="muted">Les bases inferiors a deu i els complements petits es protegeixen.</p>
    <div class="detail-grid">
      <div>
        ${r.metrics.length ? `<section class="panel">
          <div class="panel-head"><div><h2>Resultats de la consulta</h2>
            <p>Les proporcions favorables es calculen sobre les respostes numèriques vàlides.</p>
          </div></div>
          ${r.metrics.map(m => `<article class="metric-card">
            <div><h3>${esc(m.text)}</h3>
              <small>Base vàlida: ${num(m.n)} · «No ho puc valorar» queda fora de l’escala.
                Favorables: ${esc((m.opcions_favorables ?? ["4", "5"]).join(", "))}.</small>
              ${m.distribution ? `<div class="distribution">${m.distribution.map((n, i) => `<div>${num(n)}
                <progress value="${n}" max="${m.n}" aria-label="Puntuació ${i + 1}: ${n} respostes"></progress>${i + 1}
              </div>`).join("")}</div>` : "<p><small>Distribució protegida per categories o complements petits.</small></p>"}
              ${m.absencies?.length ? `<small>${m.absencies.map(a => `${states[a.estat]}: ${num(a.n)}`).join(" · ")}</small>` : ""}
            </div>
            <div class="large-number">${num(m.favorable, "<small>%</small>")}<div><small>favorables</small></div></div>
          </article>`).join("")}
        </section>` : ""}
        <section class="panel">
          <div class="panel-head"><div><h2>Temes que es repeteixen</h2>
            <p>Una menció per tema i resposta · base de textos analitzables: ${num(r.textos)}</p>
          </div></div>
          <div class="panel-body">
            ${r.branca ? `<p><small>Elegibles per a l’aclariment: ${num(r.branca.elegibles)} · Respostes: ${num(r.branca.respostes)} ·
              Textos analitzables: ${num(r.branca.respostes_text)}<br>${esc(r.branca.visibilitat)}</small></p>` : ""}
            ${r.temes.length ? r.temes.map(t => `<div class="topic-row"><strong>${esc(t.titol)}</strong>
              <span class="topic-n">${num(t.n)} mencions</span></div>`).join("") :
              empty("Sense temes publicables", "Cal prou suport revisat per publicar un tema.")}
          </div>
        </section>
        ${(r.seleccions || []).map(q => `<section class="panel section"><h2>${esc(q.text)}</h2>
          <p>Base de respostes substantives: ${num(q.base)}.</p>
          ${q.opcions.map(o => `<div class="topic-row"><span>${esc(o.etiqueta)}</span><span>${num(o.n)}</span></div>`).join("")}
        </section>`).join("")}
      </div>
      <aside>
        <section class="panel section"><h2>Mostra per torn</h2>
          ${r.torns.length === 0 ? "<p>Sense dades de torn de feina.</p>" : r.torns.map(s => `<div class="topic-row"><span>Torn de ${esc(s.torn.toLowerCase())}<br>
            <small>${num(s.pes_mostra, "%")} de la mostra · ${num(s.pes_poblacio, "%")} del públic</small></span>
            <span>${num(s.n)}<br><small>${s.diferencia === null ? "Protegit" : num(s.diferencia, " pp")}</small></span>
          </div>`).join("")}
          <p><small>La composició de la mostra ajuda a valorar la cobertura dels torns.</small></p>
        </section>
        <section class="panel section"><h2>Origen de les respostes</h2>
          ${(r.origens || []).map(o => `<p><strong>${esc(responseSources[o.source] ?? o.source)}</strong><br>
            ${num(o.n)} respostes publicables</p>`).join("")}
        </section>
      </aside>
    </div>
  </details>`;
}
const responseSources = { fixture: "Llavor sintètica", local: "Formulari local", typeform: "Typeform" };
const resultPeriod = ({ inici, fi }) =>
  [inici, fi].map(value => new Date(value).toLocaleDateString("ca-ES")).join(" – ");

function resultComparisons(w) {
  const { comparacio, comparacions = [] } = w.results;
  if (!comparacio) return "";
  const between = comparacions.filter(e => e.tipus === "entre_mostres");
  const paired = comparacions.filter(e => e.tipus === "aparellada");
  const question = id => w.survey.preguntes.find(q => q.id === id)?.que_mesura || id;

  return `<section class="panel section" aria-labelledby="results-comparisons">
    <h2 id="results-comparisons">Evolució entre onades</h2>
    ${comparacio.estat !== "comparable" ? "<p>Comparació indisponible perquè les onades no comparteixen la mateixa mesura.</p>" :
      `<div class="results-comparison-grid">
        <div><h3>Mostra de cada onada</h3>
          <p>Percentatge favorable entre les respostes vàlides de cada onada.</p>
          ${between.length ? between.map(e => `<div class="action-evidence"><strong>${esc(question(e.pregunta_id))}</strong>
            ${e.onades.map((wave, i) => `<div class="results-comparison-bar">
              <span>${esc(resultPeriod(wave.periode))} · n=${num(e.bases[i])}</span>
              <progress value="${e.favorables[i]}" max="100" aria-label="${esc(i === 0 ? "Onada de referència" : "Onada actual")} · ${esc(question(e.pregunta_id))}"></progress>
              <strong>${num(e.favorables[i], "%")}</strong>
            </div>`).join("")}
          </div>`).join("") : "<p>Dades insuficients per publicar la comparació entre mostres.</p>"}
        </div>
        <div><h3>${w.source === "typeform" ? "Respostes enllaçades pel navegador" : "Persones que han respost a totes dues onades"}</h3>
          ${w.source === "typeform" ? "<p>Un navegador compartit pot vincular respostes de persones diferents.</p>" : ""}
          <p>${esc(comparacio.limit)}</p>
          ${comparacio.metrics.map(m => {
            const e = paired.find(e => e.pregunta_id === m.id);
            return `<div class="action-evidence"><strong>${esc(question(m.id))}</strong>
              <div>Base aparellada: ${num(m.n)} · Pèrdues de seguiment: ${num(m.perdues)}</div>
              ${e ? `<div>${num(e.transicions.puja)} pugen · ${num(e.transicions.igual)} es mantenen · ${num(e.transicions.baixa)} baixen</div>`
                : m.delta != null ? `<div>Canvi mitjà: ${num(m.delta)} punts d’escala</div>` : "<div>Dades insuficients per publicar el canvi.</div>"}
            </div>`;
          }).join("")}
        </div>
      </div><p class="muted">Les mostres poden incloure persones diferents. L’evolució observada no demostra l’efecte de l’acció.</p>`}
  </section>`;
}

function evidenceCard(e) {
  const source = Array.isArray(e.origen) ? e.origen.map(o => responseSources[o] ?? o).join(", ") : e.origen;
  const scope = e.public && [e.public.sector, e.public.ubicacio, e.public.torn].join(" · ");
  let values = "";
  if (e.favorable != null) values = `${num(e.favorable, "%")} favorable · `;
  if (e.n != null) values = `${num(e.n)} mencions · `;
  if (e.base != null) values += `base de ${num(e.base)} ${e.base_unitat}`;
  if (e.opcions) values += ` · ${e.opcions.map(o => `${o.etiqueta} (${o.n})`).join(", ")}`;
  if (e.tipus === "cobertura") values += ` · ${num(e.pes_mostra, "%")} de la mostra · ${num(e.pes_poblacio, "%")} del públic`;
  if (e.tipus === "entre_mostres")
    values = e.onades.map((wave, i) =>
      `${resultPeriod(wave.periode)} · ${num(e.favorables[i], "%")} favorable (n=${e.bases[i]})`).join(" → ");
  if (e.transicions)
    values += ` · ${e.transicions.puja} pugen, ${e.transicions.igual} iguals, ${e.transicions.baixa} baixen`;
  return `<div class="action-evidence"><strong>${esc(e.titol || e.pregunta || "Evidència de l’onada")}</strong>
    <div>${esc(values)}</div><small>${esc([scope, e.onades && e.tipus === "aparellada" ?
      e.onades.map(wave => resultPeriod(wave.periode)).join(" / ") : e.onades ? "" : resultPeriod(e.periode), source].filter(Boolean).join(" · "))}</small>
    <p><small>${esc(e.text_base)} ${esc(e.limitacio)}</small></p></div>`;
}
function historicalEvidence(d) {
  return `<div class="action-evidence"><strong>${esc(d.titol)} · Històric</strong>
    <p>${esc(d.observacio)}</p><small>${esc(d.periode)} · ${esc(d.origen)} · ${d.abast === "ampli" ? "Abast de tota la planta" : "Mateix públic"}<br>${esc(d.limitacio)}</small></div>`;
}
const analysisButton = (w, action, label, disabled = false) =>
  `<button class="btn" data-analysis="${action}" data-wave="${esc(w.id)}" ${disabled ? 'disabled data-unavailable="true"' : ""}>${label}</button>`;
function analysisControls(w) {
  const base = w.results.informe_base;
  if (!w.analysis || !base) return "";
  const { tema, informe } = w.analysis;
  const ready = session.integrations.analysis;
  return `<section class="panel section">
    <h2>Anàlisi amb Groq</h2>
    ${!ready && informe === "disponible" ? "<p>Configura Groq a Integracions per generar l’anàlisi.</p>" : ""}
    ${informe === "disponible" ? `<p>People revisa l’evidència i cada bloc abans que aparegui als resultats.
      ${["disponible", "pendent"].includes(tema) ? "Si generes l’informe ara, només s’hi inclouran temes ja revisats." : ""}</p>` : ""}
    <div class="toolbar">
      ${tema === "disponible" ? analysisButton(w, "themes", "Descobrir temes amb Groq", !ready) : ""}
      ${tema === "pendent" ? analysisButton(w, "theme-review", "Revisar suports dels temes") : ""}
      ${informe === "disponible" ? analysisButton(w, "proposals", "Generar anàlisi i accions", !ready || (!base.evidencies.length && !base.diagnostic_biaixos.length)) : ""}
      ${informe === "pendent" ? analysisButton(w, "analysis-review", "Revisar l’informe de Groq") : ""}
    </div>
    ${informe === "revisat" ? "<p>Revisió de l’informe desada.</p>" : ""}
    ${informe === "pendent" ? "<p>Esborrany pendent de revisió per People.</p>" : ""}
  </section>`;
}
function analysisResults(w) {
  const base = w.results.informe_base;
  const approved = w.results.informe;
  const historic = base?.diagnostic_biaixos ?? w.diagnostic ?? [];
  const historicChart = w.results.historic;
  return `${base && !approved ? analysisControls(w) : ""}
    ${approved ? `<section class="panel section" aria-labelledby="results-findings">
      <h2 id="results-findings">Interpretacions revisades</h2>
      ${approved.troballes.length ? `<div class="results-findings">
        ${approved.troballes.map(t => `<article class="results-finding">
          <h3>${esc(t.text)}</h3><p class="muted">${esc(t.limitacio)}</p>
          ${base.evidencies.filter(e => t.evidencia_ids.includes(e.id)).map(evidenceCard).join("")}
        </article>`).join("")}
      </div>` : "<p>People ha tancat la revisió sense aprovar cap interpretació.</p>"}
    </section>
    ${w.followup || w.proposals.length ? `<section class="panel section" aria-labelledby="results-next">
      <h2 id="results-next">Accions i seguiment</h2>
      ${w.followup ? `<p>${esc(w.selected_action?.titol || "Seguiment preparat")}</p>
        <a class="btn" href="#campaign/${esc(w.followup)}/survey">Obrir la consulta de seguiment ${icon("arrow")}</a>` : ""}
      ${w.proposals.map(p => `<article class="action-card results-action">
        ${actionDetails(p, base)}
        ${w.followup ? "" : `<button class="btn" data-follow="${esc(p.accio_id)}" data-wave="${esc(w.id)}">Escollir acció i crear seguiment ${icon("arrow")}</button>`}
      </article>`).join("")}
    </section>` : ""}` : ""}
    ${historic.length ? `<details class="panel section results-details">
      <summary>Context històric del sondeig</summary>
      <p class="muted">El sondeig de setembre ajuda a valorar el risc d’autoselecció de la mostra actual.</p>
      ${historic.map(historicalEvidence).join("")}
      ${historicChart?.percentatges ? distributionChart(historicChart) : ""}
    </details>` : ""}
    ${base?.evidencies.length ? `<details class="panel section results-details">
      <summary>Totes les fitxes d’evidència</summary>
      ${base.evidencies.map(evidenceCard).join("")}
    </details>` : ""}`;
}
function actionDetails(a, base) {
  if (!a.seguiment) {
    return `<h3>${esc(a.accio_id)}</h3><p>${esc(a.motiu)}</p><small>${esc(a.origen)}</small>`;
  }
  return `<small>${a.tipus === "canvi" ? "Acció de canvi" : "Acció de recollida"}</small>
    <h3>${esc(a.titol)}</h3><p>${esc(a.primer_pas)}</p>
    <p><small>${esc(a.rol_suggerit)} · ${esc(a.quan)}</small></p>
    ${base.evidencies.filter(e => a.evidencia_ids.includes(e.id)).map(evidenceCard).join("")}
    ${base.diagnostic_biaixos.filter(d => a.diagnostic_ids.includes(d.id)).map(historicalEvidence).join("")}
    <p><strong>Seguiment</strong> · ${esc(a.seguiment.quan)}<br>${esc(a.seguiment.pregunta_adaptable)}<br>
      <small>${a.seguiment.opcions_suggerides.map(esc).join(" · ")}</small></p>`;
}
function actionView(w = current) {
  if (w.source === "simulation") {
    const a = w.selected_action;
    if (!a) return `<section class="panel section"><h3>Última onada de la simulació</h3><a class="text-link" href="#campaign/${w.id}/results">Veure evolució ${icon("arrow")}</a></section>`;
    return `<section class="panel section"><div class="eyebrow">ACCIÓ SIMULADA · ETAPA 03</div>
      <h3>${esc(a.titol)}</h3><p>${esc(a.descripcio)}</p>
      ${a.evidence.map((e) => `<p><strong>${num(e.n)} de ${num(e.base)} respostes</strong> assenyalen entendre el funcionament com a dificultat principal.</p>`).join("")}
      <p><small>Rol responsable · ${esc(a.responsable)}</small></p>
      <a class="btn btn-primary" href="#campaign/${w.followup}/results">Veure resultats del seguiment ${icon("arrow")}</a></section>`;
  }
  const actions = {
    instruccions: [
      "Un únic lloc per a les instruccions",
      "Centralitzar les instruccions i presentar-ne un resum a l’inici de cada torn.",
      "Supervisió de Planta",
    ],
    ajuda: [
      "Fer visible el canal d’ajuda",
      "Compartir un punt de contacte de suport i explicar quan i com utilitzar-lo.",
      "People i Supervisió",
    ],
    antelacio: [
      "Compartir el calendari amb antelació",
      "Acordar una finestra estable per comunicar el calendari als dos torns.",
      "Planificació de Planta",
    ],
  };
  if (w.followup)
    return `<section class="panel section">${notice("People ha seleccionat una acció. El seguiment està vinculat a l’evidència original.", "success")}<h2>${esc(w.selected_action?.titol || "Seguiment preparat")}</h2><p>${esc(w.selected_action?.descripcio || "")}</p><a class="btn btn-primary" href="#campaign/${w.followup}/survey">Obrir la consulta de seguiment ${icon("arrow")}</a></section>`;
  if (w.analysis) return `${analysisControls(w)}<section class="panel">
    <div class="panel-head"><h2>${w.results.informe ? "Propostes d’acció revisades" : "Propostes d’acció"}</h2></div>
    ${w.proposals.length ? w.proposals.map(p => `<article class="action-card">
      ${actionDetails(p, w.results.informe_base)}
      <button class="btn" data-follow="${esc(p.accio_id)}" data-wave="${esc(w.id)}">Escollir acció i crear seguiment ${icon("arrow")}</button></article>`).join("")
      : empty("Encara no hi ha propostes aprovades", "Cal evidència publicable i una revisió de People.")}</section>`;
  return `<section class="panel"><div class="panel-head"><div><h2>Propostes d’acció</h2><p>${session.mode === "demo" ? "Propostes de regles locals" : "Propostes IA vinculades a evidència agregada"}</p></div>${session.mode !== "demo" && w === current && w.state === "closed" && session.integrations.llm && w.results.evidence.length ? '<button class="btn" data-act="proposals">Generar propostes amb IA</button>' : ""}</div>${w.proposals.length ? w.proposals.map((p) => `<article class="action-card"><small>${esc(p.origen)}</small><h3>${esc(actions[p.accio_id]?.[0] || p.accio_id)}</h3><p>${esc(actions[p.accio_id]?.[1] || "")}</p><div class="action-evidence">${icon("chart")} ${esc(p.motiu)}<br><small>Evidència: ${p.evidencia_ids.map(esc).join(", ")} · Onada actual</small></div><p><small>Rol suggerit: ${esc(actions[p.accio_id]?.[2] || "People")}</small></p><button class="btn" data-follow="${esc(p.accio_id)}" data-wave="${w.id}">Escollir acció i crear seguiment ${icon("arrow")}</button></article>`).join("") : empty("Encara no hi ha propostes", "Calen resultats publicables.")}</section>`;
}
async function allActions() {
  const completed = await Promise.all(
    campaigns
      .filter((c) => c.state === "closed")
      .map((c) => api("/api/campaigns/" + c.id)),
  );
  shell(
    `${head("Accions i seguiment")}${completed.length ? completed.map((w) => `<section><h2>${esc(w.config.titol)}</h2>${actionView(w)}</section>`).join("") : empty("Encara no hi ha accions", "Les propostes apareixen quan hi ha resultats publicables.")}`,
    "actions",
    "Accions i seguiment",
  );
}
function settings() {
  shell(
    `${head("Integracions")}${notice(session.mode === "demo" ? "Estàs en mode de demo local. Formularis i dades de contingència no es presenten com a respostes de Typeform ni com a crides IA." : "Entorn connectat. Verifica les funcions i els límits del teu compte Typeform abans de la demo.")}<section class="panel">${[
      [
        "T",
        "Typeform",
        "Publicació de consultes i importació de respostes.",
        session.integrations.typeform,
      ],
      [
        "IA",
        "Model de llenguatge",
        "Generació, classificació i propostes amb context separat.",
        session.integrations.llm,
      ],
    ]
      .map(
        ([logo, title, text, ready]) =>
          `<div class="integration"><span class="integration-symbol">${logo}</span><div class="integration-info"><h3>${title}</h3><p>${text}</p></div><span class="badge ${ready ? "published" : "draft"}">${ready ? "Configurat" : "Sense configurar"}</span></div>`,
      )
      .join(
        "",
      )}</section><section class="panel section"><h2>Activar el mode connectat</h2><p>Copia .env.example a .env i defineix aquestes variables localment. Reinicia el servidor. Consulta el README per a permisos, retenció i proves pendents.</p><pre>APP_MODE=connected\nPUBLIC_ORIGIN=https://el-teu-origen\nADMIN_PASSWORD=…\nHMAC_SECRET=…\nTYPEFORM_TOKEN=…\nLLM_PROVIDER=groq\nGROQ_API_KEY=…\nGROQ_MODEL=openai/gpt-oss-120b</pre><p><small>Utilitza una base separada (DB_PATH) per a proves connectades. La demo no conté secrets reals. La presència de variables no acredita una connexió verificada.</small></p></section>`,
    "settings",
    "Integracions",
  );
}
async function route() {
  if (!session?.authenticated) return renderLogin();
  const hash = location.hash.slice(1) || "overview";
  try {
    campaigns = (await api("/api/campaigns")).campaigns;
    if (hash.startsWith("campaign/")) {
      const [, id, t] = hash.split("/");
      current = await api("/api/campaigns/" + encodeURIComponent(id));
      cycleCampaignId = current.id;
      draft = structuredClone(current.survey);
      editingQuestions = false;
      tab = tabs.some(([x]) => x === t) ? t : "need";
      detailFrame(
        {
          need: needView,
          survey: surveyView,
          share: shareView,
          results: resultView,
          action: actionView,
        }[tab](),
      );
      if (tab === "survey") previewPath();
    } else if (hash === "campaigns") campaignList();
    else if (hash === "calibration") await calibration();
    else if (hash === "actions") await allActions();
    else if (hash === "settings") settings();
    else overview();
  } catch (e) {
    shell(
      `${notice(esc(e.message), "error")}<a class="btn" href="#overview">Tornar a l’inici</a>`,
    );
  }
}
function renderLogin() {
  app.innerHTML = `<main id="main" class="login-page"><section class="login-story"><img class="brand-logo" src="/escoltamm-logo.png" alt="Escoltamm"><footer>Estrella Damm · People · UAB The Hack! 2026</footer></section><section class="login-form"><div class="login-inner"><h1>Accés de People</h1><form id="login-form"><div class="field"><label for="password">Contrasenya de l’equip</label><input id="password" name="password" type="password" autocomplete="current-password" required></div><button class="btn btn-primary" type="submit">Entrar a l’espai ${icon("arrow")}</button><p id="login-error" class="error-text" role="alert"></p></form>${session?.mode === "demo" ? notice("Contrasenya de prova: <strong>equip-damm</strong>.") : ""}<p class="participant-footer">No introdueixis dades personals reals.</p></div></section></main>`;
}
function showDialog(title, body) {
  dialog.innerHTML = `<div class="dialog-head"><h2>${title}</h2><button type="button" data-act="dismiss" aria-label="Tancar">${icon("close")}</button></div><div class="dialog-body">${body}</div>`;
  dialog.showModal();
}
function needForm(edit = false) {
  const c = edit ? current.config : null;
  showDialog(
    edit ? "Editar la necessitat" : "Nova consulta",
    `<form id="need-form" data-edit="${edit}"><div class="form-grid">${[
      ["titol", "Nom de la campanya", c?.titol || ""],
      [
        "objectiu",
        "Necessitat · Què volem entendre?",
        c?.objectiu || "",
      ],
      [
        "decisio",
        "Quina decisió ens ajudarà a prendre?",
        c?.decisio || "",
      ],
    ]
      .map(
        ([id, label, val]) =>
          `<div class="field full"><label for="new-${id}">${label}</label><input id="new-${id}" name="${id}" value="${esc(val)}" ${id === "objectiu" ? "required" : ""} maxlength="${id === "titol" ? 160 : 2000}"></div>`,
      )
      .join(
        "",
      )}<div class="field full"><label for="new-context">Context</label><textarea name="context" id="new-context" maxlength="2000">${esc(c?.context || "")}</textarea></div><div class="field"><label for="new-sector">Col·lectiu</label><select id="new-sector" name="sector">${Object.keys(
      session.catalog,
    )
      .map(
        (s) =>
          `<option ${s === (c?.public.sector || "Planta") ? "selected" : ""}>${s}</option>`,
      )
      .join(
        "",
      )}</select></div><div class="field"><label for="new-shift">Torn</label><select id="new-shift" name="torn">${["Tots dos", "Dia", "Nit"].map((s) => `<option ${s === c?.public.torn ? "selected" : ""}>${s}</option>`).join("")}</select></div><div class="field"><label for="new-days">Dies de recollida</label><input id="new-days" name="dies" type="number" min="1" max="30" value="${c?.dies || 7}" required></div><div class="field"><label for="new-exclusions">Temes exclosos</label><input id="new-exclusions" name="exclusions" value="${esc(c?.exclusions || "Dades que identifiquin persones")}"></div></div><p id="need-error" class="error-text" role="alert"></p><div class="form-actions"><button class="btn" type="button" data-act="dismiss">Cancel·lar</button><button class="btn btn-primary" type="submit">${edit ? "Desar i tornar a esborrany" : "Crear esborrany"} ${icon("arrow")}</button>${!edit && session.integrations.llm ? '<button class="btn btn-primary" type="submit" data-generate>Generar amb IA</button>' : ""}</div></form>`,
  );
}
async function refreshDetail() {
  await route();
}
function showAnalysisReview(path, action, data) {
  const isTheme = action === "theme-review";
  const checkbox = (type, id, label) =>
    `<label class="check-label"><input type="checkbox" name="${type}" value="${esc(id)}"> ${label}</label>`;
  const content = isTheme
    ? data.temes.map(t => `<fieldset><legend>${esc(t.titol)}</legend><p>${esc(t.definicio)}</p>
      ${t.vincles.map(v => `<div class="action-evidence"><p>${esc(v.text)}</p>
        <p><small>Fragment: «${esc(v.fragment_literal)}» · ${esc(v.observacio)}</small></p>
        ${v.estat === "dona_suport" ? checkbox(t.id, v.resposta_ref, `Confirma el suport en les ${v.n} trameses amb aquest text`) :
          `<small>${v.estat === "contradiu" ? "El text contradiu el tema." : "Suport indeterminat."}</small>`}</div>`).join("")}
      </fieldset>`).join("")
    : `${data.draft.troballes.map(t => `<article class="action-card"><h3>Interpretació</h3>
      <p>${esc(t.text)}</p><p><small>${esc(t.limitacio)}</small></p>
      ${data.base.evidencies.filter(e => t.evidencia_ids.includes(e.id)).map(evidenceCard).join("")}
      ${checkbox("troballes", t.id, "Aprovar aquesta interpretació")}</article>`).join("")}
      ${data.draft.accions.map(a => `<article class="action-card">${actionDetails(a, data.base)}
        ${checkbox("accions", a.id, "Aprovar aquesta proposta per valorar-la")}</article>`).join("")}`;
  showDialog(isTheme ? "Revisió dels suports" : "Revisió de l’anàlisi", `<form id="analysis-review-form">
    <p>${isTheme ? "Marca cada suport només si el fragment i el text complet sustenten el títol i la definició del tema. El servidor comprova la base i els complements abans de publicar." :
      "Comprova el significat, l’abast de l’evidència i la relació amb l’objectiu. Només es publicaran els blocs marcats."}</p>
    ${!isTheme && data.draft.descartats ? "<p>El servidor ha descartat blocs amb referències o contingut invàlids.</p>" : ""}
    ${content.trim() ? content : "<p>Groq no ha proposat cap bloc per revisar.</p>"}
    <div class="form-actions"><button type="button" class="btn" data-act="dismiss">Tornar</button>
      <button class="btn btn-primary" type="submit">Desar la revisió</button></div></form>`);
  $("#analysis-review-form").addEventListener("submit", event => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    run(event.submitter, async () => {
      const selection = isTheme
        ? { temes: data.temes.map(t => ({ id: t.id, refs: form.getAll(t.id) })).filter(t => t.refs.length) }
        : { troballes: form.getAll("troballes"), accions: form.getAll("accions") };
      await api(`${path}/${action}`, { revision: data.revision, ...selection });
      dialog.close();
      toast("Revisió desada.");
      await refreshDetail();
    });
  });
}
function handleAnalysis(button) {
  run(button, async () => {
    const action = button.dataset.analysis;
    const path = `/api/campaigns/${encodeURIComponent(button.dataset.wave)}`;
    if (action.endsWith("-review")) {
      showAnalysisReview(path, action, await api(`${path}/${action}`));
      return;
    }
    await api(`${path}/${action}`, {});
    toast(action === "themes" ? "Temes preparats per revisar." : "Informe preparat per revisar.");
    await refreshDetail();
  });
}
async function action(name, button) {
  if (name === "dismiss") {
    dialog.close();
    return;
  }
  if (name === "new") {
    needForm();
    return;
  }
  if (name === "edit-need") {
    needForm(true);
    return;
  }
  if (name === "edit-questions") {
    editingQuestions = !editingQuestions;
    detailFrame(surveyView());
    previewPath();
    const input = $("[data-q]");
    if (input) {
      input.closest(".question").open = true;
      input.focus();
    } else {
      $('[data-act="edit-questions"]').focus();
    }
    return;
  }
  if (name === "json") {
    showDialog(
      "Editor JSON de la consulta",
      `<form id="json-form"><p><small>Es valida el contracte complet abans de desar. Les preguntes de referència han de quedar intactes.</small></p><label for="json-input" class="visually-hidden">JSON de la consulta</label><textarea class="json-editor" id="json-input" spellcheck="false">${esc(JSON.stringify(draft, null, 2))}</textarea><p id="json-error" class="error-text" role="alert"></p><div class="form-actions"><button class="btn" type="button" data-act="dismiss">Cancel·lar</button><button class="btn btn-primary">Validar i desar</button></div></form>`,
    );
    return;
  }
  if (name === "close") {
    const options = current.comparacions_disponibles;
    showDialog(
      "Tancar la recollida?",
      `<p>Es deixarà d’acceptar respostes i es calcularà una única instantània final amb les regles de privacitat. Aquesta onada no es podrà reobrir.</p>
      ${options?.length ? `<div class="field"><label for="comparison-wave">Onada de referència</label>
        <select id="comparison-wave"><option value="">Primera onada de la sèrie</option>
        ${options.map(w => `<option value="${esc(w.id)}">${esc(w.titol)}</option>`).join("")}</select></div>` : ""}
      <div class="form-actions"><button class="btn" data-act="dismiss">Continuar recollint</button><button class="btn btn-primary" data-act="confirm-close">Tancar i calcular resultats</button></div>`,
    );
    return;
  }
  await run(button, async () => {
    if (name === "logout") {
      await api("/api/logout", {});
      session.authenticated = false;
      renderLogin();
      return;
    }
    if (name === "copy") {
      try {
        await navigator.clipboard.writeText(
          location.origin + "/participa/" + current.id,
        );
        toast("Enllaç copiat.");
      } catch {
        toast("Selecciona i copia l’enllaç que es mostra a la pantalla.", true);
      }
      return;
    }
    if (name === "print") {
      window.print();
      return;
    }
    if (name === "save") {
      draft.titol = $("#survey-title").value;
      draft.introduccio = $("#survey-intro").value;
      await api(`/api/campaigns/${current.id}/edit`, {
        version: current.version,
        survey: draft,
      });
      toast("Canvis desats. Cal aprovar la nova versió.");
      await refreshDetail();
      return;
    }
    if (name === "approve") {
      if (
        tab === "survey" &&
        JSON.stringify(draft) !== JSON.stringify(current.survey)
      )
        throw new Error("Desa els canvis abans d’aprovar la versió.");
      await api(`/api/campaigns/${current.id}/approve`, {
        version: current.version,
      });
      toast("Versió aprovada per People.");
      await refreshDetail();
      return;
    }
    if (name === "confirm-close") {
      await api(`/api/campaigns/${current.id}/close`, { referencia_id: $("#comparison-wave")?.value });
      dialog.close();
      location.hash = `campaign/${current.id}/results`;
      return;
    }
    if (
      ["publish", "reconcile", "import", "generate", "proposals", "webhook"].includes(name)
    ) {
      await api(`/api/campaigns/${current.id}/${name}`, {});
      toast(
        {
          publish: "Consulta publicada.",
          webhook: "Recepció automàtica connectada amb Typeform.",
          reconcile: "Publicació reconciliada.",
          import:
            "Import revisat. Duplicats i entrades no autoritzades queden fora dels agregats.",
          generate: "Esborrany generat i validat.",
          proposals: "Propostes preparades per revisar.",
        }[name],
      );
      if (name === "generate" && tab !== "survey") location.hash = `campaign/${current.id}/survey`;
      else await refreshDetail();
    }
  });
}
document.addEventListener("click", (event) => {
  const analysis = event.target.closest("[data-analysis]");
  if (analysis) {
    handleAnalysis(analysis);
    return;
  }
  const b = event.target.closest("[data-act]");
  if (b) {
    event.preventDefault();
    action(b.dataset.act, b);
    return;
  }
  const open = event.target.closest("[data-open]");
  if (open) {
    location.hash = "campaign/" + open.dataset.open + "/need";
    return;
  }
  const follow = event.target.closest("[data-follow]");
  if (follow) {
    run(follow, async () => {
      const r = await api(`/api/campaigns/${follow.dataset.wave}/followup`, {
        action: follow.dataset.follow,
      });
      location.hash = "campaign/" + r.created_followup + "/survey";
      toast("Acció seleccionada. Seguiment en esborrany.");
    });
    return;
  }
  const move = event.target.closest("[data-move]");
  if (move) {
    const i = Number(move.dataset.move),
      j = i + Number(move.dataset.dir);
    if (
      j < 0 ||
      j >= draft.preguntes.length ||
      draft.preguntes[j].de_referencia
    ) {
      toast("Les preguntes fixes conserven la seva posició.", true);
      return;
    }
    [draft.preguntes[i], draft.preguntes[j]] = [
      draft.preguntes[j],
      draft.preguntes[i],
    ];
    detailFrame(surveyView());
    const moved = document.querySelectorAll(".question")[j];
    moved.open = true;
    moved.querySelector("summary").focus();
    return;
  }
  const del = event.target.closest("[data-delete]");
  if (del) {
    const i = Number(del.dataset.delete);
    const [removed] = draft.preguntes.splice(i, 1);
    draft.adaptacions = draft.adaptacions.filter(a => a.pregunta_id !== removed.id);
    detailFrame(surveyView());
    const next = document.querySelectorAll(".question-summary")[Math.min(i, draft.preguntes.length - 1)];
    (next || $(".survey-form summary"))?.focus();
  }
});
document.addEventListener("input", (event) => {
  const el = event.target;
  if (el.dataset.q !== undefined) {
    draft.preguntes[Number(el.dataset.q)].text = el.value;
    el.closest(".question").querySelector("[data-question-text]").textContent = el.value || "Pregunta sense enunciat";
  }
  if (el.dataset.option) {
    const [i, j] = el.dataset.option.split(":").map(Number);
    draft.preguntes[i].opcions[j].etiqueta = el.value;
  }
  if (el.id === "survey-title") {
    draft.titol = el.value;
    $("[data-form-title]").textContent = el.value;
  }
  if (el.id === "survey-intro") draft.introduccio = el.value;
  if (el.id === "campaign-search") filterCampaigns();
});
function filterCampaigns() {
  const q = $("#campaign-search").value.toLocaleLowerCase("ca"),
    state = $("#state-filter").value;
  const list = campaigns.filter(
    (c) =>
      (!state || state === c.state) &&
      c.titol.toLocaleLowerCase("ca").includes(q),
  );
  $("#campaign-table").innerHTML = list.length
    ? table(list)
    : empty("Cap coincidència", "Prova un altre nom o estat.");
}
document.addEventListener("change", (event) => {
  const el = event.target;
  if (el.id === "cycle-campaign") {
    cycleCampaignId = el.value;
    $("#cycle-steps").innerHTML = cycleSteps(campaigns.find((c) => c.id === cycleCampaignId));
  }
  if (el.id === "state-filter") filterCampaigns();
  if (el.dataset.preview !== undefined) previewPath();
  if (el.dataset.required !== undefined) {
    draft.preguntes[Number(el.dataset.required)].obligatoria = el.checked;
    el.closest(".question").querySelector("[data-question-required]").textContent = el.checked ? "Obligatòria" : "Opcional";
  }
});
document.addEventListener("submit", (event) => {
  const form = event.target;
  if (!["login-form", "need-form", "json-form"].includes(form.id)) return;
  event.preventDefault();
  const button = form.querySelector("button[type=submit],button:not([type])");
  run(button, async () => {
    try {
      if (form.id === "login-form") {
        await api("/api/login", {
          password: new FormData(form).get("password"),
        });
        session = await api("/api/session");
        await route();
      }
      if (form.id === "need-form") {
        const data = Object.fromEntries(new FormData(form));
        data.dies = Number(data.dies);
        data.ubicacio = session.catalog[data.sector];
        const w =
          form.dataset.edit === "true"
            ? await api(`/api/campaigns/${current.id}/edit`, {
                version: current.version,
                config: data,
              })
            : await api("/api/campaigns", data);
        dialog.close();
        if (event.submitter?.hasAttribute("data-generate")) {
          try {
            await api(`/api/campaigns/${w.id}/generate`, {});
            location.hash = `campaign/${w.id}/survey`;
            toast("Esborrany generat i validat.");
          } catch (e) {
            location.hash = `campaign/${w.id}/need`;
            toast(e.message, true);
          }
          return;
        }
        if (location.hash === `#campaign/${w.id}/need`) await route();
        else location.hash = `campaign/${w.id}/need`;
        toast("Necessitat desada en esborrany.");
      }
      if (form.id === "json-form") {
        let s;
        try {
          s = JSON.parse($("#json-input").value);
        } catch {
          throw new Error("El text no és JSON vàlid.");
        }
        await api(`/api/campaigns/${current.id}/edit`, {
          version: current.version,
          survey: s,
        });
        dialog.close();
        await route();
        toast("Consulta validada i desada.");
      }
    } catch (e) {
      const error = form.querySelector("[role=alert]");
      if (error) error.textContent = e.message;
      else throw e;
    }
  });
});

let participantData,
  participantAnswers = {},
  participantId;
function participantFrame(body) {
  app.innerHTML = `<main id="main" class="participant"><header class="participant-brand"><img class="brand-logo" src="/escoltamm-logo.png" alt="Escoltamm"><span class="muted">Estrella Damm · People</span></header>${body}<footer class="participant-footer">Prototip · Només respostes fictícies<br>Les respostes es pseudonimitzen. People només veu agregats.</footer></main>`;
}
async function participantPage() {
  participantId = location.pathname.split("/").at(-1);
  try {
    participantData = await api(
      "/api/participate/" + encodeURIComponent(participantId),
    );
    if (!participantData.open) {
      participantFrame(
        empty(
          "Aquesta consulta no està oberta.",
          "La recollida no ha començat o ja s’ha tancat. Gràcies pel teu interès.",
        ),
      );
      return;
    }
    if (participantData.admitted && participantData.mode === "local") {
      participantSurvey();
      return;
    }
    if (participantData.mode === "typeform") {
      participantFrame(
        `<h1>${esc(participantData.title)}</h1><p class="participant-intro">${esc(participantData.introduction)}</p>
        <section class="panel section"><h2>Accés a la consulta</h2>
        <p>El navegador desa un codi aleatori per comparar respostes d’aquesta sèrie si hi tornes amb el mateix navegador. Pots respondre sense escriure el nom ni cap credencial. People només veu resultats agrupats.</p>
        <form id="participant-auth"><p id="participant-error" class="error-text" role="alert"></p>
        <button class="btn btn-primary" type="submit">Continuar a Typeform ${icon("arrow")}</button></form></section>`,
      );
      return;
    }
    participantFrame(
      `<h1>${esc(participantData.title)}</h1><p class="participant-intro">${esc(participantData.introduction)}</p><section class="panel section"><h2>Accés a la consulta</h2><form id="participant-auth"><div class="field"><label for="credential">Credencial de demo</label><input id="credential" name="credential" autocomplete="off" autocapitalize="characters" placeholder="DEMO-0001" required maxlength="80"></div><p id="participant-error" class="error-text" role="alert"></p><button class="btn btn-primary" type="submit">Accedir a la consulta ${icon("arrow")}</button></form></section><p class="muted"><small>Formulari local de contingència.</small></p>`,
    );
  } catch (e) {
    participantFrame(notice(esc(e.message), "error"));
  }
}
function isVisible(q) {
  return (
    !q.condicio_de_visualitzacio ||
    q.condicio_de_visualitzacio.totes.every((c) =>
      c.opcions_ids.includes(participantAnswers[c.pregunta_id]),
    )
  );
}
function participantSurvey() {
  participantFrame(
    `<h1>${esc(participantData.title)}</h1><p class="participant-intro">${esc(participantData.introduction)}</p><form id="participant-survey"><div class="panel">${participantData.questions.map((q, i) => `<fieldset id="participant-q-${q.id}" ${isVisible(q) ? "" : "hidden"}><legend>${i + 1}. ${esc(q.text)} <small>(${q.obligatoria ? "obligatòria" : "opcional"})</small></legend><div>${q.tipus === "text_lliure" ? `<div class="field"><label for="text-${q.id}" class="visually-hidden">${esc(q.text)}</label><textarea id="text-${q.id}" name="${q.id}" maxlength="1000" placeholder="Comparteix només informació fictícia, sense noms ni dades de contacte."></textarea></div>` : q.opcions.map((o) => `<label class="answer-choice"><input type="radio" name="${q.id}" value="${esc(o.id)}" ${q.obligatoria ? "required" : ""}><span>${esc(o.etiqueta)}</span></label>`).join("")}${!q.obligatoria && q.tipus !== "text_lliure" ? `<button class="text-link" type="button" data-clear="${q.id}">Deixar sense resposta</button>` : ""}</div></fieldset>`).join("")}</div><p id="participant-error" class="error-text" role="alert"></p><button class="btn btn-primary" type="submit">Enviar la meva resposta ${icon("send")}</button></form>`,
  );
}
document.addEventListener("change", (event) => {
  if (event.target.closest("#participant-survey")) {
    participantAnswers[event.target.name] = event.target.value;
    for (const q of participantData.questions) {
      const fs = $("#participant-q-" + q.id),
        show = isVisible(q);
      fs.hidden = !show;
      fs.querySelectorAll("input,textarea").forEach(
        (i) => (i.disabled = !show),
      );
    }
  }
});
document.addEventListener("click", (event) => {
  const b = event.target.closest("[data-clear]");
  if (b) {
    const name = b.dataset.clear;
    participantAnswers[name] = "";
    document
      .querySelectorAll(`input[name="${name}"]`)
      .forEach((i) => (i.checked = false));
    for (const q of participantData.questions) {
      const fs = $("#participant-q-" + q.id);
      fs.hidden = !isVisible(q);
      fs.querySelectorAll("input,textarea").forEach(
        (i) => (i.disabled = fs.hidden),
      );
    }
  }
});
document.addEventListener("submit", (event) => {
  const form = event.target;
  if (!["participant-auth", "participant-survey"].includes(form.id)) return;
  event.preventDefault();
  run(form.querySelector("button[type=submit]"), async () => {
    try {
      if (form.id === "participant-auth") {
        const r = await api(`/api/participate/${participantId}/auth`, {
          credential: new FormData(form).get("credential"),
        });
        if (r.mode === "typeform") {
          location.assign(r.destination);
          return;
        }
        participantData.admitted = true;
        participantSurvey();
      } else {
        const answers = Object.fromEntries(new FormData(form));
        await api(`/api/participate/${participantId}/submit`, { answers });
        participantFrame(
          `<section class="participant-thanks">${icon("shield")}<h1>Gràcies per compartir<br>la teva experiència.</h1><p class="participant-intro">La teva resposta s’ha acceptat. People veurà resultats agrupats quan hi hagi una base suficient i es tanqui la consulta.</p><p><small>Ja pots tancar aquesta pàgina.</small></p></section>`,
        );
      }
    } catch (e) {
      $("#participant-error").textContent = e.message;
    }
  });
});
window.addEventListener("hashchange", () => {
  if (!location.pathname.startsWith("/participa/")) route();
});
try {
  session = await api("/api/session");
  if (location.pathname.startsWith("/participa/")) await participantPage();
  else await route();
} catch (e) {
  app.innerHTML = `<main id="main" class="initial">${notice(esc(e.message), "error")}<button class="btn" id="retry-start">Tornar a carregar</button></main>`;
  $("#retry-start").onclick = () => location.reload();
}
