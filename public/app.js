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
  presentation: "M3 4h18v12H3z M12 16v5 M8 21h8 M7 12l3-3 3 2 4-4",
  fullscreen: "M9 4H4v5 M15 4h5v5 M20 15v5h-5 M4 15v5h5",
  grid: "M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z",
  campaign: "M5 4h14v17H5z M9 4V2h6v2 M9 9h6 M9 13h6 M9 17h3",
  chart: "M4 20V10 M10 20V4 M16 20v-7 M22 20H2",
  comment: "M21 11a7 7 0 0 1-7 7H9l-5 3v-5a7 7 0 0 1 5-12h5a7 7 0 0 1 7 7z M8 9h8 M8 13h5",
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
  ["presentation", "presentation", "Presentació"],
  ["overview", "grid", "Visió general"],
  ["campaigns", "campaign", "Campanyes"],
  ["actions", "action", "Accions i seguiment"],
];
function shell(content, active = "overview", crumb = "Visió general") {
  app.innerHTML = `<div class="shell"><aside class="sidebar"><a class="brand" href="#overview"><img class="brand-logo" src="/escoltamm-logo.png" alt="Escoltamm"><span class="brand-caption">Estrella Damm · People</span></a><div class="brand-divider"></div><nav class="nav" aria-label="Navegació principal">${navItems.map(([id, i, label]) => `<a href="#${id}" class="${active === id ? "active" : ""}" ${active === id ? 'aria-current="page"' : ""}>${icon(i)}${label}${id === "campaigns" && campaigns.length > 0 ? `<span class="nav-count">${campaigns.length}</span>` : ""}</a>`).join("")}</nav><div class="side-bottom"><nav class="nav" aria-label="Configuració"><a href="#settings" class="${active === "settings" ? "active" : ""}">${icon("settings")}Integracions</a></nav></div></aside><div class="workspace"><header class="topbar"><div class="breadcrumb"><span>Espai de People</span>${icon("arrow")}<strong>${esc(crumb)}</strong></div><div class="top-tools"><span class="mode-label">${session.mode === "demo" ? "Dades sintètiques" : "Entorn connectat"}</span><a class="mobile-settings" href="#settings" aria-label="Integracions">${icon("settings")}</a>${session.passwordless ? "" : '<button class="avatar" data-act="logout" title="Tancar la sessió" aria-label="Tancar la sessió de People">EP</button>'}</div></header><main id="main" class="content">${content}</main></div></div>`;
  positionRatingLabels();
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
  return `<div class="table-wrap"><table><thead><tr><th scope="col">Campanya</th><th scope="col">Estat</th><th scope="col">Respostes</th><th scope="col">Proper pas</th></tr></thead><tbody>${list.map((c) => `<tr><td><button class="row-link" data-open="${esc(c.id)}"><span class="campaign-title"><span class="campaign-icon">${icon(c.parent_id ? "action" : "campaign")}</span><span><strong>${esc(c.titol)}</strong><small>${esc(c.public.sector)} · ${esc(c.public.torn)}${c.parent_id ? " · Seguiment" : ""}${c.source === "simulation" ? " · Dades sintètiques" : ""}${c.id === session.scenario_a?.results_id ? " · Resultats preparats de l’Escenari A" : ""}</small></span></span></button></td><td>${badge(c.state)}</td><td>${num(c.total)}${c.total !== null ? "<small> · finals</small>" : ""}</td><td><a class="text-link" href="#campaign/${esc(c.id)}/${c.state === "closed" ? "results" : c.state === "published" ? "share" : "survey"}">${c.state === "closed" ? "Veure resultats" : c.state === "published" ? "Compartir QR" : c.state === "approved" ? "Publicar" : "Revisar consulta"} ${icon("arrow")}</a></td></tr>`).join("")}</tbody></table></div>`;
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
    ${chartOnly ? "" : `<p>${summary}</p>`}
    ${!chartOnly && plan && signals[0].abast === "ampli" ? "<p>Context històric de tota la planta, amb els dos torns agrupats.</p>" : ""}
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
        : !session.scenario_a && ["uncertain", "publishing"].includes(w.state)
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
        ${session.scenario_a && count ? "" : `<button class="btn btn-small ${session.integrations.llm && !count ? "btn-primary" : ""}" data-act="generate" ${session.integrations.llm ? "" : "disabled"}>${session.scenario_a ? "Simular crida a Groq" : "Generar amb IA"}</button>`}
        ${draft.preguntes.some(q => !q.de_referencia) ? `<button class="btn btn-small" data-act="edit-questions">${editingQuestions ? "Acabar l’edició" : "Editar preguntes manualment"}</button>` : ""}
        <button class="btn btn-small" data-act="save">Desar canvis</button>
        ${session.integrations.llm ? "" : '<small>Configura la IA a <a class="text-link" href="#settings">Integracions</a>.</small>'}</div>` : ""}
      ${count ? draft.preguntes.map((q, i) => questionEditor(q, i, editable && editingQuestions, adaptations, signals)).join("") : empty("Encara no hi ha preguntes")}
    </section>
  </div>`;
}
function shareView() {
  if (current.source === "simulation")
    return notice("Aquesta onada tancada forma part de la simulació de l’etapa 03.");
  if (!current.published)
    return `<section class="panel">${empty("Consulta pendent de publicació", "El QR estarà disponible en publicar-la.", `<a class="btn" href="#campaign/${current.id}/survey">Revisar la consulta ${icon("arrow")}</a>`)}</section>`;
  const link = `${location.origin}/participa/${current.id}`;
  return `${current.state === "closed" ? notice("La recollida està tancada. El QR conserva l’enllaç, però ja no permet enviar respostes.") : notice(current.source === "local" ? "El QR obre el formulari local." : "Per comptar als resultats, respon des del QR de la plataforma.")}
    <div class="share-layout">
      <section class="panel section" aria-labelledby="share-qr-title">
        <h2 id="share-qr-title">Comparteix amb QR</h2>
        <div class="qr-layout">
          <div class="qr-box">
            <img src="/api/campaigns/${current.id}/qr" alt="QR de l’accés a aquesta consulta">
            <strong>${esc(current.config.titol)}</strong>
            <small>${esc(current.config.public.torn)} · Dades de prova</small>
          </div>
          <div class="qr-links">
            <a class="text-link" href="${link}" target="_blank" rel="noopener">Obrir l’accés del participant ${icon("arrow")}</a>
            ${current.form_url ? `<p><a class="text-link" href="${esc(current.form_url)}" target="_blank" rel="noopener">Obrir formulari a Typeform</a> · <a class="text-link" href="/api/campaigns/${current.id}/typeform-qr" download="qr-typeform.svg">Descarregar QR Typeform</a></p>` : ""}
            <div class="share-actions">
              <a class="btn btn-primary" href="/api/campaigns/${current.id}/qr" download="qr-consulta.svg">${icon("download")}Descarregar QR</a>
              <button class="btn" data-act="copy">${icon("copy")}Copiar enllaç</button>
              <button class="btn" data-act="print">Imprimir</button>
            </div>
          </div>
        </div>
      </section>
      <section class="panel section teams-share" aria-labelledby="share-teams-title">
        <div class="teams-share-heading">
          <img src="/microsoft-teams.svg" alt="" width="32" height="34">
          <h2 id="share-teams-title">Comparteix per Microsoft Teams</h2>
        </div>
        <div class="field">
          <label for="teams-channel">Canal de Teams</label>
          <select id="teams-channel">
            <option value="" disabled selected>Selecciona un canal</option>
            <option value="general">💬 General</option>
            <option value="people">👥 People i Benestar</option>
            <option value="operacions">🏭 Operacions i Planta</option>
            <option value="logistica">🚚 Logística</option>
          </select>
        </div>
        <button class="btn btn-primary" type="button" data-act="teams-preview">${icon("send")}Enviar a Teams</button>
      </section>
    </div>
    ${current.state === "published" ? `<div class="form-actions">${current.source === "typeform" ? '<button class="btn" data-act="import">Importar respostes de Typeform</button><button class="btn" data-act="webhook">Connectar recepció automàtica</button>' : ""}<button class="btn" data-act="close">Tancar recollida i calcular resultats ${icon("arrow")}</button></div>` : ""}
    ${["127.0.0.1", "localhost", "[::1]"].includes(location.hostname) ? `<p class="muted"><small>El QR de la plataforma només funciona en aquest ordinador.</small></p>` : ""}`;
}
function simulationResults(w) {
  const { kpi, comparacions, total, taxa, population } = w.results;
  const metricName = { comprensio: "Comprensió del canvi", suport: "On demanar ajuda" };
  const signals = [
    ...Object.entries(metricName).map(([id, title]) => ({
      title: resultQuestionTitle(w, id, title), value: kpi[id + "_favorable_pct"], count: kpi[id + "_favorable_n"],
      base: kpi[id + "_base_escala"], unit: "respostes vàlides", label: "Favorables (4 o 5)",
    })),
    {
      title: resultQuestionTitle(w, "dificultat_principal", "Dificultat amb el funcionament"), value: kpi.dificultat_funcionament_pct,
      count: kpi.dificultat_funcionament_n, base: kpi.dificultat_funcionament_base,
      unit: "respostes substantives", label: "Han triat aquesta dificultat",
    },
    ...(kpi.onada > 1 ? [{
      title: resultQuestionTitle(w, "arribada_resum", "Arribada del resum"), value: kpi.arribada_resum_si_pct, count: kpi.arribada_resum_si_n,
      base: kpi.arribada_resum_si_base, unit: "trameses vàlides", label: "Diuen que l’han rebut",
    }] : []),
  ];
  return `<div class="results-dashboard" data-brand="estrella-damm">
    ${resultsDigest(w, signals, "Dades sintètiques · Simulació", w.config.context)}
    <section class="panel section"><h2>Qui ha respost?</h2>
      <p>${num(total)} trameses vàlides de ${num(population)} persones elegibles · ${num(taxa, "%")} de participació aparent.</p>
      <p>El torn de dia representa el ${num(kpi.pes_dia_poblacio_pct, "%")} del públic elegible.</p>
      ${kpi.pes_dia_mostra_pct == null ? "<p>El pes del torn de dia a la mostra no està disponible.</p>" :
        resultBarRow("Torn de dia entre els torns declarats", kpi.pes_dia_mostra_pct, 100,
          `${num(kpi.pes_dia_mostra_pct, "%")} · base: ${num(kpi.base_torns_declarats)}`)}
    </section>
    ${comparacions.length ? `<section class="panel section"><h2>Evolució entre mostres</h2>
      <p>Percentatge favorable en cada mostra voluntària. La composició de la mostra pot variar d’una onada a l’altra.</p>
      <div class="results-comparison-grid">${comparacions.map(row => `<article class="action-evidence">
        <strong>${esc(resultQuestionTitle(w, row.pregunta_id, metricName[row.pregunta_id] ?? row.pregunta_id))}</strong>
        <p><a class="text-link" href="#campaign/${esc(row.campanya_origen_id)}/results">Onada ${num(row.onada_origen)}</a>
          → Onada ${num(row.onada_desti)}</p>
        ${row.delta_favorable_pp == null ? `<p>${esc(row.motiu_o_limit)}</p>` : `
          ${resultBarRow(`Onada ${num(row.onada_origen)} · base: ${num(row.base_origen)}`, row.favorable_origen_pct, 100, num(row.favorable_origen_pct, "%"), "bar-neutral")}
          ${resultBarRow(`Onada ${num(row.onada_desti)} · base: ${num(row.base_desti)}`, row.favorable_desti_pct, 100, num(row.favorable_desti_pct, "%"))}
          <p class="results-chart-note">Canvi: ${signedPoints(row.delta_favorable_pp)}</p>`}
      </article>`).join("")}</div>
    </section>` : ""}
    <div class="form-actions"><a class="btn" href="/api/campaigns/${w.id}/export">${icon("download")}Exportar agregats</a>
      <a class="btn btn-primary" href="#campaign/${w.id}/action">Veure acció i seguiment ${icon("arrow")}</a></div>
  </div>`;
}

function resultsDigest(w, signals, source, context = "") {
  const { total, taxa, population } = w.results;
  const { public: audience, opens, closes } = w.config;
  const period = Number.isFinite(opens) && Number.isFinite(closes)
    ? resultPeriod({ inici: opens, fi: closes }) : "";
  const visible = total == null ? [] : signals.filter(s => Number.isFinite(s.value) && s.base > 0);
  return `<section class="results-digest" aria-labelledby="results-digest-title">
    <header class="results-digest-intro">
      <p class="results-kicker">Resum de l’onada</p>
      <h2 id="results-digest-title">En un cop d’ull</h2>
      ${source ? `<span class="results-source">${esc(source)}</span>` : ""}
      <p>${[audience?.ubicacio || audience?.sector, audience?.torn, period].filter(Boolean).map(esc).join(" · ")}</p>
      ${total == null ? "" : `<p><strong>${num(total)} trameses vàlides</strong>${taxa == null ? "<br>Taxa de participació no disponible" :
        ` de ${num(population)} persones elegibles<br>${num(taxa, "%")} de participació aparent`}</p>`}
      ${total != null && Number.isFinite(taxa) && taxa >= 0 && taxa <= 100 ? `<div class="results-digest-participation">${resultBar(taxa, 100)}</div>` : ""}
      ${context ? `<p>${esc(context)}</p>` : ""}
    </header>
    <div class="results-digest-signals">
      ${visible.length ? visible.map(s => `<article class="results-digest-signal">
        <div><h4>${esc(s.title)}</h4><strong>${num(s.value, "%")}</strong></div>
        <p>${esc(s.label)} · ${s.count == null ? "Base: " : `${num(s.count)} de `}${num(s.base)} ${esc(s.unit)}</p>
        ${resultBar(s.value, 100, s.tone)}
      </article>`).join("") : `<p>${total == null ? "Dades insuficients per mostrar resultats d’aquesta onada."
        : "Aquesta onada encara no té indicadors publicables per al resum."}</p>`}
      ${visible.length ? '<p class="results-chart-note">Cada percentatge es calcula sobre la base indicada a sota.</p>' : ""}
    </div>
  </section>`;
}

function digestSignals(r, referenceIds) {
  const metrics = r.metrics.filter(m => m.favorable != null && m.n > 0);
  const scales = [...metrics.filter(m => referenceIds.has(m.id)), ...metrics.filter(m => !referenceIds.has(m.id))]
    .map(m => ({
      title: resultQuestionTitle(current, m.id, resultMetricName(m)), label: `Favorables (${(m.opcions_favorables ?? ["4", "5"]).join(" o ")})`,
      value: m.favorable, count: m.favorables, base: m.n, unit: "respostes vàlides",
    }));
  const leaders = (r.seleccions ?? []).flatMap(q => {
    const positive = q.opcions.filter(o => o.n > 0);
    if (!positive.length) return [];
    const max = Math.max(...positive.map(o => o.n));
    const top = positive.filter(o => o.n === max);
    return [{
      title: resultQuestionTitle(current, q.id, current.survey.preguntes.find(p => p.id === q.id)?.que_mesura || q.text),
      label: top.length === 1 ? `Més triada: ${top[0].etiqueta}`
        : `Empat al capdavant: ${top.map(o => o.etiqueta).join(" / ")} (cadascuna)`,
      value: max / q.base * 100, count: max, base: q.base, unit: "respostes substantives", tone: "bar-gold",
    }];
  });
  return (leaders.length ? [leaders[0], ...scales, ...leaders.slice(1)] : scales).slice(0, 3);
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
  const hasComments = current.survey.preguntes.some(q => q.tipus === "text_lliure");
  const source = current.id === session.scenario_a?.results_id ? "Escenari A · Dades sintètiques"
    : (r.origens ?? []).map(o => responseSources[o.source] ?? o.source).join(" · ");

  return `<div class="results-dashboard" data-brand="estrella-damm">
    <p class="results-privacy-notice">${icon("shield")}<span><strong>Protecció de la mostra.</strong> Si un segment té menys de 10 respostes, també s’oculten els recomptes que permetrien deduir-lo per diferència.</span></p>
    <section class="results-section" aria-labelledby="quantitative-results">
      <header><h2 id="quantitative-results">Resultats numèrics</h2><p>Estadístiques calculades directament sobre les respostes.</p></header>
      ${resultsDigest(current, digestSignals(r, referenceIds), source)}
      ${r.total === null ? "" : `
      <div class="results-charts">
        ${r.metrics.length ? resultRatings(r.metrics) : ""}
        ${(r.seleccions ?? []).map(resultSelection).join("")}
        ${r.torns.length ? resultCoverage(r) : ""}
      </div>`}
      ${resultComparisons(current)}
    </section>
    ${hasComments || current.analysis ? `<section class="results-section" aria-labelledby="qualitative-results">
      <header><h2 id="qualitative-results">${current.analysis ? "Anàlisi amb IA" : "Anàlisi dels comentaris"}</h2>
        <p>${current.analysis ? "Temes dels comentaris, interpretació i propostes d’acció." : "Temes agrupats a partir de les respostes obertes."}</p></header>
      ${analysisControls(current)}
      ${r.total !== null && hasComments ? resultComments(current) : ""}
      ${analysisResults(current)}
    </section>` : ""}
    <div class="form-actions">
      <a class="btn" href="/api/campaigns/${current.id}/export">${icon("download")}Exportar agregats</a>
      <a class="btn btn-primary" href="#campaign/${current.id}/action">Decidir el proper pas ${icon("arrow")}</a>
    </div>
  </div>`;
}
function resultQuestionLabel(w, id) {
  const index = w?.survey.preguntes.findIndex(q => q.id === id) ?? -1;
  return index < 0 ? "" : `Q${index + 1}`;
}
function resultQuestionTitle(w, id, title) {
  const label = resultQuestionLabel(w, id);
  return label ? `${label} · ${title}` : title;
}
function resultMetricName(metric) {
  const measure = current.survey.preguntes.find(q => q.id === metric.id)?.que_mesura;
  if (measure === "Comprensió percebuda del canvi") return "Comprensió del canvi";
  if (measure === "Coneixement declarat del canal d’ajuda") return "On demanar ajuda";
  return measure || metric.text;
}
function resultChart(title, category, body, subtitle = "") {
  return `<section class="results-chart">
    <header class="results-chart-head"><p class="results-kicker">${category}</p>
      <h3>${esc(title)}</h3>${subtitle ? `<p>${esc(subtitle)}</p>` : ""}</header>
    ${body}
  </section>`;
}
function resultBar(value, max, tone = "") {
  return `<svg class="results-bar ${tone}" viewBox="0 0 100 8" preserveAspectRatio="none" aria-hidden="true">
    <rect width="100" height="8"/><rect width="${100 * value / max}" height="8"/>
  </svg>`;
}
function resultBarRow(label, value, max, caption, tone = "") {
  return `<div class="results-bar-row"><span>${esc(label)}</span><strong>${esc(caption)}</strong>
    ${resultBar(value, max, tone)}</div>`;
}
function resultRatings(metrics) {
  const ratings = ["1", "2", "3", "4", "5"];
  return resultChart("Com s’han repartit les puntuacions?", "Respostes d’escala", `
    <div class="results-chart-list">${metrics.map(m => {
      let start = 0;
      const mean = m.distribution && m.n ? m.distribution.reduce((sum, n, i) => sum + n * (i + 1), 0) / m.n : null;
      let position = 0;
      const labels = m.distribution?.map(count => {
        const center = m.n ? (position + count / 2) / m.n * 100 : 0;
        position += count;
        return center;
      });
      return `<article class="results-rating">
        <div class="results-rating-head"><div><h4>${esc(resultQuestionTitle(current, m.id, resultMetricName(m)))}</h4>
          <small>${m.n == null ? "Base protegida" : `${num(m.n)} respostes vàlides`}${mean == null ? "" : ` · Mitjana ${num(mean)} de 5`}</small></div>
          <strong>${m.favorable == null ? "—" : `${num(m.favorable, "%")} favorables`}</strong></div>
        ${m.distribution ? `<div class="results-rating-visual"><svg class="results-rating-bar" viewBox="0 0 ${m.n} 16" preserveAspectRatio="none" aria-hidden="true">
          ${m.distribution.map((count, i) => {
            const segment = `<rect class="rating-${i + 1}" x="${start}" width="${count}" height="16"/>`;
            start += count;
            return segment;
          }).join("")}
        </svg>
        <ul class="results-rating-key" aria-label="Recompte per puntuació">${ratings.map((rating, i) => `<li data-center="${labels[i]}">
          <span class="rating-${rating}">${rating}</span><strong>${num(m.distribution[i])}</strong>
        </li>`).join("")}</ul></div>` : '<p class="results-chart-note">Distribució protegida.</p>'}
      </article>`;
    }).join("")}</div>
    <p class="results-chart-note">Escala de l’1 al 5. Sota cada puntuació es mostra el nombre de respostes.</p>`,
    "Cada barra mostra com es reparteixen les puntuacions d’una pregunta.");
}
function positionRatingLabels() {
  document.querySelectorAll(".results-rating-key").forEach(key => {
    const lanes = [];
    const width = key.clientWidth;
    key.querySelectorAll("li").forEach(label => {
      const center = Number(label.dataset.center);
      const x = width * center / 100;
      const halfWidth = Math.max(label.offsetWidth, 18) / 2;
      let lane = lanes.findIndex(right => x - halfWidth >= right + 4);
      if (lane < 0) { lane = lanes.length; lanes.push(0); }
      lanes[lane] = x + halfWidth;
      label.style.left = `${center}%`;
      label.style.top = `${lane * 42}px`;
    });
    key.style.height = `${lanes.length * 42}px`;
  });
}
window.addEventListener("resize", positionRatingLabels);
function resultComments(w) {
  const { branca, temes, textos } = w.results;
  const state = textos == null && w.analysis?.tema === "tancat" ? "indisponible" : w.analysis?.tema;
  const automatic = w.analysis?.automatic;
  const eligible = branca?.elegibles;
  const status = {
    disponible: "Els textos estan disponibles per iniciar l’anàlisi amb Groq.",
    pendent: "People ha de revisar el suport de cada tema abans de mostrar-lo aquí.",
    tancat: "L’informe d’aquesta onada es va generar abans de revisar els temes.",
    revisat: "Cap tema ha assolit el mínim de mencions revisades per mostrar-se.",
    indisponible: textos == null
      ? "Calen almenys 10 comentaris analitzables i una base que es pugui mostrar amb seguretat."
      : "Els textos ja no estan disponibles per revisar-ne els temes.",
  };
  const emptyReason = automatic && textos != null
    ? automatic === "complete" ? "Cap tema ha assolit el mínim de mencions verificades."
      : automatic === "failed" ? "L’anàlisi dels comentaris està pendent." : "La IA està agrupant els comentaris."
    : status[state] ?? (textos == null ? status.indisponible : status.revisat);
  const question = w.survey.preguntes.find(q => q.tipus === "text_lliure");
  return resultChart(resultQuestionTitle(w, question?.id, "Què recullen els comentaris?"), "Text lliure", `
    <p>${textos == null ? "Recompte de comentaris no disponible." : `${num(textos)} comentaris analitzables${eligible != null ? ` de ${num(eligible)}` : ""}`}</p>
    <div class="results-theme-head"><h4>Temes dels comentaris</h4>
      ${!automatic && state === "disponible" ? analysisButton(w, "themes", "Descobrir temes amb Groq", !session.integrations.analysis) : ""}
      ${!automatic && state === "pendent" ? analysisButton(w, "theme-review", "Revisar suports dels temes") : ""}
    </div>
    ${temes.length ? `<div class="results-theme-grid">
      ${[...temes].sort((a, b) => b.n - a.n).map(t => themeMap(t, t.base ?? textos)).join("")}
    </div>`
    : `<div class="results-chart-empty">${icon("info")}<div><strong>Encara no hi ha temes publicables</strong>
      <p>${emptyReason}</p></div></div>`}`);
}
function themeMap(theme, base) {
  const total = Math.min(base, 40);
  const highlighted = Math.round(total * theme.n / base);
  const columns = 10;
  return `<article class="results-theme">
    <h4>${esc(theme.titol)}</h4>
    <strong>${num(theme.n)} de ${num(base)} comentaris</strong>
    <svg class="results-theme-dots" viewBox="0 0 ${columns * 12} ${Math.ceil(total / columns) * 12}" aria-hidden="true">
      ${Array.from({ length: total }, (_, i) => `<circle class="${i < highlighted ? "theme-match" : ""}" cx="${6 + i % columns * 12}" cy="${6 + Math.floor(i / columns) * 12}" r="4"/>`).join("")}
    </svg>
    ${theme.definicio ? `<p>${esc(theme.definicio)}</p>` : ""}
  </article>`;
}
function resultSelection(q) {
  const title = current.survey.preguntes.find(p => p.id === q.id)?.que_mesura || q.text;
  const options = q.opcions.filter(o => o.n > 0);
  return resultChart(resultQuestionTitle(current, q.id, title), "Selecció única", `<div class="results-chart-list">
      ${options.sort((a, b) => b.n - a.n).map(o => resultBarRow(o.etiqueta, o.n, q.base,
        `${num(o.n)} · ${num(o.n / q.base * 100, "%")}`)).join("")}
    </div>`,
    `${num(q.base)} respostes vàlides per a aquesta pregunta.`);
}
function resultCoverage(r) {
  const shifts = r.torns.filter(s => s.pes_mostra != null && (s.n > 0 || s.pes_poblacio != null));
  if (!shifts.length) return "";
  return resultChart("Qui ha respost?", "Cobertura de la mostra",
    `<div class="results-chart-list">
      ${shifts.map(s => `<article class="results-shift"><h4>Torn de ${esc(s.torn.toLowerCase())}
        <small>${num(s.n)} respostes</small></h4>
        ${resultBarRow("Mostra", s.pes_mostra, 100, num(s.pes_mostra, "%"))}
        ${s.pes_poblacio == null ? "" : resultBarRow("Públic elegible", s.pes_poblacio, 100, num(s.pes_poblacio, "%"), "bar-neutral")}
      </article>`).join("")}</div>
      <p class="results-chart-note">El pes de cada torn es calcula sobre les ${num(r.total)} respostes acceptades.</p>`,
    "Pes de cada torn en les respostes i en el públic elegible.");
}
const responseSources = { fixture: "Llavor sintètica", local: "Formulari local", typeform: "Typeform" };
const signedPoints = value => `${value > 0 ? "+" : ""}${num(value)} punts percentuals`;
const resultPeriod = ({ inici, fi }) =>
  [inici, fi].map(value => new Date(value).toLocaleDateString("ca-ES")).join(" – ");

function resultComparisons(w) {
  const { comparacio, comparacions = [] } = w.results;
  if (!comparacio) return "";
  const between = comparacions.filter(e => e.tipus === "entre_mostres");
  const paired = comparacions.filter(e => e.tipus === "aparellada");
  const question = id => resultQuestionTitle(w, id, w.survey.preguntes.find(q => q.id === id)?.que_mesura || id);

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
              ${e ? `<div class="results-chart-list results-paired-bars">
                ${resultBarRow("Pugen", e.transicions.puja, e.base, num(e.transicions.puja))}
                ${resultBarRow("Es mantenen", e.transicions.igual, e.base, num(e.transicions.igual), "bar-neutral")}
                ${resultBarRow("Baixen", e.transicions.baixa, e.base, num(e.transicions.baixa), "bar-gold")}
              </div>`
                : m.delta != null ? `<div>Canvi mitjà: ${num(m.delta)} punts d’escala</div>` : "<div>Dades insuficients per publicar el canvi.</div>"}
            </div>`;
          }).join("")}
        </div>
      </div><p class="muted">Les mostres poden incloure persones diferents. L’evolució observada no demostra l’efecte de l’acció.</p>`}
  </section>`;
}

function evidenceCard(e, w = current) {
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
  return `<div class="action-evidence"><strong>${esc(resultQuestionTitle(w, e.pregunta_id, e.titol || e.pregunta || "Evidència de l’onada"))}</strong>
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
const analysisInProgress = w => ["pending", "running"].includes(w.analysis?.automatic);
function analysisControls(w) {
  const base = w.results.informe_base;
  if (!w.analysis || !base) return "";
  const { tema, informe, automatic } = w.analysis;
  if (analysisInProgress(w)) return '<p role="status" class="results-analysis-progress">L’anàlisi amb IA està en curs. Els resultats numèrics ja estan disponibles.</p>';
  if (automatic === "failed") return `<div class="results-analysis-progress"><p>L’anàlisi amb IA no s’ha pogut completar.</p>
    ${analysisButton(w, "analysis-retry", "Reintentar l’anàlisi", !session.integrations.analysis)}</div>`;
  if (automatic) return "";
  const ready = session.integrations.analysis;
  const label = session.scenario_a ? "Anàlisi amb Groq simulat" : "Anàlisi amb Groq";
  const reviewLabel = session.scenario_a ? "Revisar l’informe simulat" : "Revisar l’informe de Groq";
  const canGenerate = ready && !!(base.evidencies.length || base.diagnostic_biaixos.length);
  if (informe === "revisat") return "";
  return `<section class="panel section">
    <h2>${label}</h2>
    ${!ready && informe === "disponible" ? "<p>Configura Groq a Integracions per generar l’anàlisi.</p>" : ""}
    ${informe === "disponible" ? `<p>People revisa l’evidència i cada bloc abans que aparegui als resultats.
      ${["disponible", "pendent"].includes(tema) ? "Si generes l’informe ara, només s’hi inclouran temes ja revisats." : ""}</p>` : ""}
    <div class="toolbar">
      ${tema === "disponible" ? analysisButton(w, "themes", "Descobrir temes amb Groq", !ready) : ""}
      ${tema === "pendent" ? analysisButton(w, "theme-review", "Revisar suports dels temes") : ""}
      ${informe === "disponible" ? analysisButton(w, "proposals", "Generar anàlisi i accions", !canGenerate) : ""}
      ${informe === "pendent" ? analysisButton(w, "analysis-review", reviewLabel) : ""}
    </div>
    ${informe === "pendent" ? "<p>Esborrany pendent de revisió per People.</p>" : ""}
  </section>`;
}
function findingReasoning(t) {
  return `${t.hipotesi ? `<p><strong>Hipòtesi</strong><br>${esc(t.hipotesi)}</p>` : ""}
    ${t.comprovacio ? `<p><strong>Com comprovar-ho</strong><br>${esc(t.comprovacio)}</p>` : ""}
    <p class="muted">${esc(t.limitacio)}</p>`;
}
function analysisResults(w) {
  const base = w.results.informe_base;
  const report = w.results.informe;
  return `${report ? `<section class="panel section" aria-labelledby="results-findings">
      <p class="results-kicker">${w.analysis?.automatic ? "Interpretació amb IA" : "Revisat per People"}</p><h3 id="results-findings">Què ens diuen els resultats?</h3>
      ${report.troballes.length ? `<div class="results-findings">
        ${report.troballes.map(t => {
          const sources = base.evidencies.filter(e => t.evidencia_ids.includes(e.id));
          const labels = sources.map(e => resultQuestionLabel(w, e.pregunta_id) || e.titol || "Evidència de l’onada");
          return `<article class="results-finding">
            <p class="results-kicker">${esc([...new Set(labels)].join(" · "))}</p>
            <h4>${esc(t.text)}</h4>${findingReasoning(t)}
          </article>`;
        }).join("")}
      </div>` : "<p>No hi ha interpretacions publicables.</p>"}
    </section>
    ${w.followup || w.proposals.length ? `<section class="panel action-plans" aria-labelledby="results-next">
      <h2 id="results-next">Accions i seguiment</h2>${campaignActionPlans(w)}
    </section>` : ""}` : ""}
    ${base?.evidencies.length ? `<details class="panel section results-details">
      <summary>Totes les fitxes d’evidència</summary>
      ${base.evidencies.map(e => evidenceCard(e, w)).join("")}
    </details>` : ""}`;
}
const catalogActionCopy = {
  instruccions: {
    titol: "Unificar les instruccions de torn",
    objectiu: "Facilitar que la plantilla entengui la rotació i trobi les instruccions vigents.",
    primer_pas: "Publica un únic resum i presenta’l a l’inici de cada torn.",
    rol_suggerit: "Supervisió de Planta",
  },
  ajuda: {
    titol: "Fer visible el canal d’ajuda",
    objectiu: "Que la plantilla sàpiga a qui adreçar els dubtes de torn.",
    primer_pas: "Comparteix el contacte amb els dos torns i explica quan i com utilitzar-lo.",
    rol_suggerit: "People i Supervisió",
  },
  antelacio: {
    titol: "Compartir el calendari amb antelació",
    objectiu: "Donar temps a la plantilla per organitzar-se abans d’un canvi de torn.",
    primer_pas: "Acorda amb planificació quan es farà públic el quadrant i per quin canal.",
    rol_suggerit: "Planificació de Planta",
  },
};
function actionSignal(e, w) {
  const questionId = e.pregunta_id ?? (e.id === "dificultat_funcionament" ? "dificultat_principal" : null);
  const label = resultQuestionLabel(w, questionId);
  const title = e.titol || (e.favorable != null ? e.que_mesura : e.text || e.que_mesura) || e.pregunta;
  let values = "";
  if (e.favorable != null) values = `${num(e.favorable, "%")} favorable · ${num(e.base)} respostes`;
  else if (e.n != null && e.base != null) {
    const unit = e.tipus === "tema" ? "comentaris analitzables" : e.tema ? "textos analitzables" : "respostes";
    values = `${num(e.n)} de ${num(e.base)} ${unit}`;
  } else if (e.tipus === "cobertura")
    values = `${num(e.pes_mostra, "%")} de la mostra · ${num(e.pes_poblacio, "%")} del públic`;
  else if (e.opcions?.length) values = `${num(e.base)} ${e.base_unitat}`;
  return `<li>${label ? `<span class="action-question">${label}</span>` : ""}
    <span>${esc([title, values].filter(Boolean).join(" · "))}</span></li>`;
}
function actionDetails(a, base, w = current) {
  const evidence = a.evidence ?? a.evidencia ?? (base?.evidencies ?? w.results?.evidence ?? [])
    .filter(e => a.evidencia_ids?.includes(e.id));
  const diagnostics = a.diagnostic ?? base?.diagnostic_biaixos.filter(d => a.diagnostic_ids?.includes(d.id)) ?? [];
  const follow = a.seguiment;
  const baseline = follow?.pregunta_impacte_id && base?.evidencies.find(e =>
    e.pregunta_id === follow.pregunta_impacte_id && e.tipus === "escala_1_5" && e.favorable != null);
  const role = a.rol_suggerit || a.responsable;
  const implementation = a.primer_pas || a.descripcio;
  return `<header class="action-plan-head">
    ${a.tipus === "recollida" ? '<p class="action-plan-meta">Millora de la recollida</p>' : ""}
    <h3>${esc(a.titol || a.accio_id)}</h3>
  </header>
  <dl class="action-plan-case">
    ${a.objectiu ? `<div><dt>Objectiu</dt><dd>${esc(a.objectiu)}</dd></div>` : ""}
    ${a.justificacio || a.motiu || evidence.length || diagnostics.length ? `<div><dt>Per què aquesta acció</dt>
      <dd>${a.justificacio || a.motiu ? `<p>${esc(a.justificacio || a.motiu)}</p>` : ""}
      ${evidence.length || diagnostics.length ? `<ul class="action-plan-signals" role="list">
        ${evidence.map(e => actionSignal(e, w)).join("")}
        ${diagnostics.map(d => `<li><span>${esc(d.titol)} · Sondeig històric</span></li>`).join("")}
      </ul>` : ""}</dd></div>` : ""}
  </dl>
  ${implementation || follow ? `<div class="action-roadmap">
    <h4>Pla d’implementació i seguiment</h4>
    <ol class="action-roadmap-steps" role="list">
      ${implementation ? `<li><h5>Aplicar l’acció</h5>
        ${role || a.quan ? `<p class="action-plan-meta">${[role, a.quan].filter(Boolean).map(esc).join(" · ")}</p>` : ""}
        <p>${esc(implementation)}</p></li>` : ""}
      ${follow ? `<li><h5>Comprovar si ha arribat</h5>
        ${follow.quan ? `<p class="action-plan-meta">${esc(follow.quan)}</p>` : ""}
        <p>${esc(follow.pregunta_adaptable)}</p>
        ${follow.opcions_suggerides?.length ? `<details><summary>Opcions de resposta</summary><p>${follow.opcions_suggerides.map(esc).join(" · ")}</p></details>` : ""}
      </li>
      ${follow.criteri_impacte ? `<li><h5>Mesurar el canvi</h5>
        ${baseline ? `<p class="action-plan-baseline"><span class="action-question">${esc(resultQuestionLabel(w, baseline.pregunta_id))}</span>
          ${num(baseline.favorable, "%")} favorable a l’onada de partida · ${num(baseline.base)} respostes</p>` : ""}
        <p>${esc(follow.criteri_impacte)}</p>
      </li>` : ""}` : ""}
    </ol>
  </div>` : ""}`;
}
function campaignActionPlans(w) {
  const base = w.results?.informe_base;
  if (w.followup) {
    const a = w.selected_action;
    const simulation = w.source === "simulation";
    const selected = simulation && a ? {
      ...catalogActionCopy.instruccions, ...a, primer_pas: a.descripcio,
      seguiment: {
        pregunta_adaptable: "T’ha arribat el resum sobre el nou sistema de torns?",
        criteri_impacte: "Compara la comprensió de la rotació i el coneixement del canal d’ajuda a les onades simulades.",
      },
    } : a && { ...catalogActionCopy[a.id], ...a };
    return `<article class="action-plan">
      <p class="action-plan-meta">${simulation ? "Acció simulada" : "Acció escollida per People"}</p>
      ${selected ? actionDetails(selected, base, w) : ""}
      <a class="btn btn-primary" href="#campaign/${esc(w.followup)}/${simulation ? "results" : "survey"}">${simulation ? "Veure resultats del seguiment" : "Obrir la consulta de seguiment"} ${icon("arrow")}</a>
    </article>`;
  }
  return w.proposals.map(p => `<article class="action-plan">
    ${actionDetails({ ...catalogActionCopy[p.accio_id], ...p }, base, w)}
    <button class="btn" data-follow="${esc(p.accio_id)}" data-wave="${esc(w.id)}">Escollir acció i crear seguiment ${icon("arrow")}</button>
  </article>`).join("");
}
function actionView(w = current) {
  if (w.source === "simulation" && !w.followup)
    return `<section class="panel section"><h3>Última onada de la simulació</h3><a class="text-link" href="#campaign/${esc(w.id)}/results">Veure evolució ${icon("arrow")}</a></section>`;
  const canGenerate = !w.analysis && session.mode !== "demo" && w === current && w.state === "closed" &&
    session.integrations.llm && w.results.evidence.length;
  return `${w.analysis && !w.followup ? analysisControls(w) : ""}<section class="panel action-plans">
    <h2>${w.followup ? "Pla de seguiment" : w.analysis?.informe === "revisat" ? "Propostes d’acció revisades" : "Propostes d’acció"}</h2>
    ${canGenerate ? '<button class="btn" data-act="proposals">Generar propostes amb IA</button>' : ""}
    ${w.followup || w.proposals.length ? campaignActionPlans(w)
      : empty("Encara no hi ha propostes", "Les propostes es basen en evidència publicable.")}</section>`;
}
async function allActions() {
  const completed = await Promise.all(
    campaigns
      .filter((c) => c.state === "closed")
      .map((c) => api("/api/campaigns/" + c.id)),
  );
  shell(
    `<div class="actions-page">${head("Accions i seguiment")}<section class="panel actions-metric" aria-labelledby="actions-time"><div><h2 id="actions-time">Temps estalviat</h2><p>Exemple fictici per a la demo: de 20 h de gestió manual a 8 h amb la plataforma, des de la preparació fins al seguiment.</p></div><div class="actions-metric-value"><strong>12</strong><span>hores per campanya</span></div></section>${completed.length ? completed.map((w) => `<section class="actions-campaign"><h2>${esc(w.config.titol)}</h2>${actionView(w)}</section>`).join("") : empty("Encara no hi ha accions", "Les propostes apareixen quan hi ha resultats publicables.")}</div>`,
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
function presentationView() {
  const slide = "/presentacio-acte-1.png";
  const fullscreenControl = document.fullscreenEnabled
    ? `<button class="btn" type="button" id="open-presentation" data-act="presentation-fullscreen">${icon("fullscreen")}Pantalla completa</button>`
    : `<a class="btn" href="${slide}">${icon("fullscreen")}Veure a mida completa</a>`;
  const content = `<header class="page-head presentation-head">
      <h1>Presentació</h1>
      <div class="presentation-controls">${fullscreenControl}
        ${session?.authenticated ? `<button class="btn btn-primary" type="button" data-act="new">Nova consulta ${icon("arrow")}</button>` : ""}
      </div>
    </header>
    <figure class="presentation-stage" id="presentation-stage">
      <a href="#overview" class="presentation-next" aria-label="Continuar a la visió general">
      <img src="${slide}" width="2560" height="1440" alt="Escoltamm. Distribució de les puntuacions en un sondeig simulat: els extrems (1 i 5) passen del 17,3% a la referència completa (600 respostes) al 37,9% a la consulta voluntària per QR (240 respostes). Són 20,6 punts percentuals més, un senyal de possible biaix d’autoselecció.">
      </a>
      <button class="btn presentation-exit" type="button" data-act="presentation-exit" aria-label="Sortir de la pantalla completa" title="Sortir de la pantalla completa">${icon("close")}</button>
    </figure>`;
  if (session?.authenticated) shell(content, "presentation", "Presentació");
  else app.innerHTML = `<main id="main" class="content">${content}</main>`;
  if (document.fullscreenElement) $(".presentation-next").focus({ preventScroll: true });
}
function presentationCover() {
  app.innerHTML = `<main id="main" class="presentation-cover">
    <svg class="cover-filter" aria-hidden="true"><filter id="cover-white" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  3 -3 0 0 0"/><feComponentTransfer><feFuncA type="linear" slope="6" intercept="-4"/></feComponentTransfer></filter><filter id="cover-gold" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="0 0 0 0 .835  0 0 0 0 .678  0 0 0 0 .333  0 4 -4 0 0"/><feComponentTransfer><feFuncA type="linear" slope="6" intercept="-4"/></feComponentTransfer></filter></svg>
    <a class="presentation-cover-link" href="#presentation" aria-label="Començar la presentació"><span class="presentation-cover-logo"><img src="/escoltamm-logo.png" alt="Escoltamm"><img class="cover-gold" src="/escoltamm-logo.png" alt="" aria-hidden="true"></span></a>
    <video class="presentation-intro" src="/presentacio-intro.mp4" preload="auto" playsinline disablepictureinpicture disableremoteplayback hidden></video>
  </main>`;
  const cover = $(".presentation-cover-link");
  const video = $(".presentation-intro");
  const finish = () => {
    if (video.isConnected) location.hash = "presentation";
  };
  let started = false;
  cover.addEventListener("click", (event) => {
    event.preventDefault();
    if (started) return;
    started = true;

    video.addEventListener("playing", () => {
      video.hidden = false;
      cover.remove();
    }, { once: true });
    video.addEventListener("ended", finish, { once: true });
    video.addEventListener("error", finish, { once: true });

    // Keep the root fullscreen when the video is replaced by the slide.
    const playback = video.play();
    if (document.fullscreenEnabled && !document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    }
    playback.catch(finish);
  });
}
let analysisPoll;
function watchAnalysis(id, hash) {
  analysisPoll = setTimeout(async () => {
    if (location.hash !== hash || !session?.authenticated) return;
    try {
      const wave = await api(`/api/campaigns/${encodeURIComponent(id)}`);
      if (location.hash !== hash) return;
      if (analysisInProgress(wave)) watchAnalysis(id, hash);
      else await route();
    } catch {
      if (location.hash === hash && session?.authenticated) watchAnalysis(id, hash);
    }
  }, 1500);
}
async function route() {
  clearTimeout(analysisPoll);
  if (location.hash === "#presentation") return presentationView();
  if (document.fullscreenElement) {
    document.exitFullscreen().catch(() => {});
  }
  if (!location.hash || location.hash === "#inici") return presentationCover();
  if (!session?.authenticated) return renderLogin();
  const hash = location.hash.slice(1);
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
      if (["results", "action"].includes(tab) && analysisInProgress(current)) watchAnalysis(id, location.hash);
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
  const preset = session.scenario_a?.defaults;
  const c = edit ? current.config : preset ? { ...preset, public: preset } : null;
  showDialog(
    edit ? "Editar la necessitat" : "Nova consulta",
    `<form id="need-form" data-edit="${edit}">${!edit && preset ? '<p class="muted">Escenari A · Canvi de torns a la planta. Pots editar tots els camps.</p>' : ""}<div class="form-grid">${[
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
      )}</select></div><div class="field"><label for="new-shift">Torn</label><select id="new-shift" name="torn">${["Tots dos", "Dia", "Nit"].map((s) => `<option ${s === c?.public.torn ? "selected" : ""}>${s}</option>`).join("")}</select></div><div class="field"><label for="new-days">Dies de recollida</label><input id="new-days" name="dies" type="number" min="1" max="30" value="${c?.dies || 7}" required></div><div class="field"><label for="new-exclusions">Temes exclosos</label><input id="new-exclusions" name="exclusions" value="${esc(c?.exclusions || "Dades que identifiquin persones")}"></div></div><p id="need-error" class="error-text" role="alert"></p><div class="form-actions"><button class="btn" type="button" data-act="dismiss">Cancel·lar</button><button class="btn ${!edit && preset ? "" : "btn-primary"}" type="submit">${edit ? "Desar i tornar a esborrany" : "Crear esborrany"} ${icon("arrow")}</button>${!edit && session.integrations.llm ? `<button class="btn btn-primary" type="submit" data-generate>${preset ? "Simular crida a Groq" : "Generar amb IA"}</button>` : ""}</div></form>`,
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
      <p>${esc(t.text)}</p>${findingReasoning(t)}
      ${data.base.evidencies.filter(e => t.evidencia_ids.includes(e.id)).map(e => evidenceCard(e)).join("")}
      ${checkbox("troballes", t.id, "Aprovar aquesta interpretació")}</article>`).join("")}
      ${data.draft.accions.map(a => `<article class="action-card action-plan action-review">${actionDetails(a, data.base)}
        <details><summary>Fitxes d’evidència</summary>
          ${data.base.evidencies.filter(e => a.evidencia_ids.includes(e.id)).map(e => evidenceCard(e)).join("")}
          ${data.base.diagnostic_biaixos.filter(d => a.diagnostic_ids.includes(d.id)).map(historicalEvidence).join("")}
        </details>
        ${checkbox("accions", a.id, "Aprovar aquesta proposta per valorar-la")}</article>`).join("")}`;
  showDialog(isTheme ? "Revisió dels suports" : "Revisió de l’anàlisi", `<form id="analysis-review-form">
    <p>${isTheme ? "Marca cada suport només si el fragment i el text complet sustenten el títol i la definició del tema. El servidor comprova la base i els complements abans de publicar." :
      "Comprova el significat, l’abast de l’evidència i la relació amb l’objectiu. Només es publicaran els blocs marcats."}</p>
    ${!isTheme && data.draft.descartats ? "<p>El servidor ha descartat blocs amb referències o contingut invàlids.</p>" : ""}
    ${content.trim() ? content : "<p>El model no ha proposat cap bloc per revisar.</p>"}
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
    if (action !== "analysis-retry")
      toast(action === "themes" ? "Temes preparats per revisar." : "Informe preparat per revisar.");
    await refreshDetail();
  });
}
async function action(name, button) {
  if (name === "presentation-fullscreen") {
    const stage = $("#presentation-stage");
    try {
      await stage.requestFullscreen();
      stage.querySelector(".presentation-exit").focus();
    } catch {
      toast("No s’ha pogut obrir la pantalla completa.", true);
    }
    return;
  }
  if (name === "presentation-exit") {
    await document.exitFullscreen();
    return;
  }
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
  if (name === "teams-preview") {
    const channel = $("#teams-channel");
    if (!channel.value) {
      toast("Selecciona un canal de Teams.", true);
      channel.focus();
      return;
    }
    toast(`Simulació per a «${channel.selectedOptions[0].textContent}». No s’ha enviat cap missatge.`);
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
          proposals: "Propostes generades.",
          webhook: "Recepció automàtica connectada amb Typeform.",
          reconcile: "Publicació reconciliada.",
          import:
            "Import revisat. Duplicats i entrades no autoritzades queden fora dels agregats.",
          generate: "Esborrany generat i validat.",
        }[name],
      );
      if (name === "publish" && session.scenario_a && tab !== "share") location.hash = `campaign/${current.id}/share`;
      else if (name === "generate" && tab !== "survey") location.hash = `campaign/${current.id}/survey`;
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
  if (el.dataset.required !== undefined) {
    draft.preguntes[Number(el.dataset.required)].obligatoria = el.checked;
    el.closest(".question").querySelector("[data-question-required]").textContent = el.checked ? "Obligatòria" : "Opcional";
  }
});
document.addEventListener("submit", (event) => {
  const form = event.target;
  if (!["login-form", "need-form", "json-form"].includes(form.id)) return;
  event.preventDefault();
  if (form.querySelector('button[aria-busy="true"]')) return;
  const button = event.submitter || form.querySelector("button[type=submit],button:not([type])");
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
document.addEventListener("fullscreenchange", () => {
  if (!document.fullscreenElement) $("#open-presentation")?.focus();
});
try {
  session = await api("/api/session");
  if (location.pathname.startsWith("/participa/")) await participantPage();
  else await route();
} catch (e) {
  app.innerHTML = `<main id="main" class="initial">${notice(esc(e.message), "error")}<button class="btn" id="retry-start">Tornar a carregar</button></main>`;
  $("#retry-start").onclick = () => location.reload();
}
