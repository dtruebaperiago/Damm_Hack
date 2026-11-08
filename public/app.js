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
  tab = "need",
  toastTimer;
const app = $("#app"),
  dialog = $("#dialog");
let llmRetryUntil=0,cooldownTimer;
function refreshLLMCooldown(){
  const remaining=Math.max(0,Math.ceil((llmRetryUntil-Date.now())/1000));
  document.querySelectorAll('[data-act="generate"],[data-act="proposals"]').forEach(button=>{
    button.disabled=!!remaining||!session?.integrations.llm||button.getAttribute('aria-busy')==='true';
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
  const data = await api("/api/calibration");
  const content = data.abast === "insuficient"
    ? empty("Sense dades històriques", "No s’han carregat dades de calibració en aquest espai.")
    : `<div class="section"><div class="eyebrow">${esc(data.periode)} · SONDEIG SINTÈTIC</div>
      <h2>${esc(data.pregunta)}</h2>
      <p><strong>${num(data.taxa, "%")} de participació aparent</strong> · ${num(data.bases[1])} trameses voluntàries sobre ${num(data.bases[0])} persones elegibles.</p>
      <p>Les puntuacions extremes representen el ${num(data.extrems[0], "%")} a la referència completa i el ${num(data.extrems[1], "%")} a la recollida voluntària.</p>
      <p>El QR compartit deixa la unicitat sense verificar. Aquesta pregunta de clima correspon a un sondeig separat de les onades sobre el canvi de torns.</p></div>`;
  shell(`${head("Calibració")}<section class="panel">${content}</section>`, "calibration", "Calibració");
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
      ? `<button class="btn btn-primary" data-act="approve">${icon("check")}Aprovar versió ${w.version}</button>`
      : w.state === "approved"
        ? `<button class="btn btn-primary" data-act="publish">${icon("send")}Publicar consulta</button>`
        : w.state === "uncertain"
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
  const dates = current.source === "simulation" ? { timeZone: "UTC" } : undefined;
  return `<div class="detail-grid"><section class="panel section"><h2>${esc(c.objectiu)}</h2><dl class="info-list"><div><dt>Decisió</dt><dd>${esc(c.decisio)}</dd></div><div><dt>Context</dt><dd>${esc(c.context)}</dd></div><div><dt>Públic</dt><dd>${esc(c.public.sector)} · ${esc(c.public.ubicacio)} · ${esc(c.public.torn)}<br><small>${c.population} ${current.source === "simulation" ? "persones elegibles simulades" : "credencials sintètiques elegibles"}</small></dd></div><div><dt>Finestra de resposta</dt><dd>${c.dies} dies · ${new Date(c.opens).toLocaleDateString("ca-ES", dates)} – ${new Date(c.closes).toLocaleDateString("ca-ES", dates)}</dd></div><div><dt>Temes exclosos</dt><dd>${esc(c.exclusions)}</dd></div></dl>${["draft", "approved"].includes(current.state) ? `<div class="form-actions"><button class="btn" data-act="edit-need">Editar la necessitat</button>${current.state === "draft" && session.integrations.llm ? '<button class="btn btn-primary" data-act="generate">Generar amb IA</button>' : ""}</div>` : ""}</section><aside class="panel section"><h2>Diagnòstic del públic</h2>${current.diagnostic.length ? current.diagnostic.map((d) => `<div class="diagnostic"><small class="${d.estat === "senyal_mesurat" ? "red" : ""}">${{ senyal_mesurat: "Senyal mesurat", risc: "Risc", sense_dades_suficients: "Dades insuficients" }[d.estat]}</small><h3>${esc(d.titol)}</h3><p>${esc(d.text)}</p></div>`).join("") : '<p>Sense dades per al diagnòstic.</p>'}</aside></div>`;
}
function questionEditor(q, i, editable) {
  return `<article class="question"><header class="question-heading"><div class="question-number"><b>${String(i + 1).padStart(2, "0")}</b><span>${q.tipus === "escala_1_5" ? "Escala 1–5" : q.tipus === "seleccio_unica" ? "Selecció única" : "Aclariment opcional"}</span>${q.de_referencia ? `<span class="fixed-tag">${icon("lock")}Referència fixa</span>` : ""}</div>${editable && !q.de_referencia ? `<div class="question-tools"><button class="icon-btn" data-move="${i}" data-dir="-1" aria-label="Moure la pregunta ${i + 1} amunt">${icon("up")}</button><button class="icon-btn" data-move="${i}" data-dir="1" aria-label="Moure la pregunta ${i + 1} avall">${icon("down")}</button><button class="icon-btn" data-delete="${i}" aria-label="Eliminar la pregunta ${i + 1}">${icon("trash")}</button></div>` : ""}</header><div class="field"><label for="question-${i}">Enunciat</label><textarea id="question-${i}" data-q="${i}" data-prop="text" ${!editable || q.de_referencia ? "readonly" : ""}>${esc(q.text)}</textarea></div><small>${esc(q.que_mesura)}</small>${q.opcions.length ? `<div class="option-editor">${q.opcions.map((o, j) => `<label><span>${q.tipus === "escala_1_5" && j < 5 ? j + 1 : "○"}</span><span class="visually-hidden">Opció ${j + 1} de la pregunta ${i + 1}</span><input data-option="${i}:${j}" aria-label="Opció ${j + 1} de la pregunta ${i + 1}" value="${esc(o.etiqueta)}" ${!editable || q.de_referencia ? "readonly" : ""}></label>`).join("")}</div>` : ""}${editable && !q.de_referencia && q.tipus !== "text_lliure" ? `<label class="check-label"><input type="checkbox" data-required="${i}" ${q.obligatoria ? "checked" : ""}>Resposta obligatòria</label>` : ""}<footer>${q.condicio_de_visualitzacio ? 'Branca: '+q.condicio_de_visualitzacio.totes.map(c=>`Q${draft.preguntes.findIndex(p=>p.id===c.pregunta_id)+1}: ${c.opcions_ids.map(id=>esc(draft.preguntes.find(p=>p.id===c.pregunta_id)?.opcions.find(o=>o.id===id)?.etiqueta||id)).join(' / ')}`).join(' I ') : "Pregunta comuna · " + (q.obligatoria ? "Obligatòria" : "Es pot ometre")}</footer></article>`;
}
function surveyView() {
  const editable = ["draft", "approved"].includes(current.state);
  return `<div class="toolbar">${draft.preguntes.length ? `<span class="pill-note">${draft.preguntes.length} preguntes · ${draft.temps_estimat_segons} s estimats</span>` : ""}${editable ? `<button class="btn btn-small ${session.integrations.llm && !draft.preguntes.length ? "btn-primary" : ""}" data-act="generate" ${session.integrations.llm ? "" : "disabled"}>Generar amb IA real</button><button class="btn btn-small" data-act="save">Desar canvis</button><button class="btn btn-small btn-quiet" data-act="json">Editar JSON complet</button>` : ""}</div>${!session.integrations.llm && editable ? '<p class="muted"><small>Configura la IA a <a class="text-link" href="#settings">Integracions</a>.</small></p>' : ""}<div class="${draft.preguntes.length ? "detail-grid" : ""}"><section class="panel"><div class="section"><div class="field"><label for="survey-title">Títol del formulari</label><input id="survey-title" value="${esc(draft.titol)}" ${editable ? "" : "readonly"}></div><div class="field"><label for="survey-intro">Introducció i tractament de dades</label><textarea id="survey-intro" ${editable ? "" : "readonly"}>${esc(draft.introduccio)}</textarea></div></div>${draft.preguntes.length ? draft.preguntes.map((q, i) => questionEditor(q, i, editable)).join("") : empty("Encara no hi ha preguntes")}</section>${draft.preguntes.length ? `<aside class="preview"><h2>Vista del participant</h2>${draft.preguntes.some((q) => q.condicio_de_visualitzacio) ? "<p>Tria respostes per provar les preguntes condicionals.</p>" : ""}${draft.preguntes.map((q,i)=>!q.condicio_de_visualitzacio&&q.opcions.length?`<div class="field"><label for="preview-q${i+1}">Q${i+1} · ${esc(q.que_mesura)}</label><select id="preview-q${i+1}" data-preview="${q.id}"><option value="">Sense resposta</option>${q.opcions.map(o=>`<option value="${esc(o.id)}">${esc(o.etiqueta)}</option>`).join('')}</select></div>`:'').join('')}<div id="preview-path"></div>${current.published ? `<a class="text-link" href="/participa/${current.id}" target="_blank" rel="noopener">Obrir l’accés del participant ${icon("arrow")}</a>` : ""}</aside>` : ""}</div>`;
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
  return `${current.state === "closed" ? notice("La recollida està tancada. El QR conserva l’enllaç, però ja no permet enviar respostes.") : notice(current.source === "local" ? "El QR obre el formulari local." : "Per comptar als resultats, respon des del QR de la plataforma.")}<section class="panel section"><div class="qr-layout"><div class="qr-box"><img src="/api/campaigns/${current.id}/qr" alt="QR de l’accés a aquesta consulta"><strong>${esc(current.config.titol)}</strong><small>${esc(current.config.public.torn)} · Dades de prova</small></div><div><h2>Comparteix la consulta</h2><a class="text-link" href="${link}" target="_blank" rel="noopener">Obrir l’accés del participant ${icon("arrow")}</a>${current.form_url ? `<p><a class="text-link" href="${esc(current.form_url)}" target="_blank" rel="noopener">Obrir formulari a Typeform</a> · <a class="text-link" href="/api/campaigns/${current.id}/typeform-qr" download="qr-typeform.svg">Descarregar QR Typeform</a></p>` : ""}<div class="share-actions"><button class="btn" data-act="copy">${icon("copy")}Copiar enllaç</button><a class="btn" href="/api/campaigns/${current.id}/qr" download="qr-consulta.svg">${icon("download")}Descarregar QR</a><button class="btn btn-quiet" data-act="print">Imprimir</button></div></div></div></section>${current.state === "published" ? `<div class="form-actions">${current.source === "typeform" ? '<button class="btn" data-act="import">Importar respostes de Typeform</button>' : ""}<button class="btn" data-act="close">Tancar recollida i calcular resultats ${icon("arrow")}</button></div>` : ""}${["127.0.0.1", "localhost", "[::1]"].includes(location.hostname) ? `<p class="muted"><small>El QR de la plataforma només funciona en aquest ordinador.</small></p>` : ""}`;
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
  if (r.recollint)
    return `<section class="panel">${empty("Recollida en curs", "Els resultats es mostren quan es tanca la recollida.", `<a class="btn" href="#campaign/${current.id}/share">Anar a difusió ${icon("arrow")}</a>`)}</section>`;
  if (current.state !== "closed")
    return `<section class="panel">${empty("Encara no hi ha resultats", "Publica la consulta per recollir respostes.")}</section>`;
  return `${notice("Resultats agregats de la mostra. Les bases de menys de 10 i els complements petits es protegeixen.")}<section class="stats">${[
    [num(r.total), "Respostes acceptades"],
    [num(r.taxa, "%"), "Participació sobre elegibles"],
    [r.population, "Població sintètica elegible"],
    [num(r.textos), "Textos analitzables publicables"],
  ]
    .map(
      ([n, t]) =>
        `<div class="stat"><div class="stat-top">${t}</div><div class="stat-value">${n}</div></div>`,
    )
    .join(
      "",
    )}</section>${r.total === null ? notice("Dades insuficients per mostrar resultats d’aquesta onada.") : `<div class="detail-grid"><div><section class="panel"><div class="panel-head"><div><h2>Resultats de la consulta</h2><p>Favorables: 4–5 sobre respostes numèriques vàlides 1–5.</p></div></div>${r.metrics.map((m) => `<article class="metric-card"><div><h3>${esc(m.text)}</h3><small>Base vàlida: ${num(m.n)} · «No ho puc valorar» queda fora de l’escala.</small>${m.distribution ? `<div class="distribution">${m.distribution.map((n, i) => `<div>${num(n)}<progress value="${n}" max="${m.n}" aria-label="Puntuació ${i + 1}: ${n} respostes"></progress>${i + 1}</div>`).join("")}</div>` : "<p><small>Distribució protegida per categories o complements petits.</small></p>"}${m.absencies ? `<small>${m.absencies.map((a) => `${{ no_valorable: "No valorable", omesa: "Omeses", invalida: "Invàlides" }[a.estat]}: ${a.n}`).join(" · ")}</small>` : ""}</div><div class="large-number">${num(m.favorable, "<small>%</small>")}<div><small>favorables</small></div></div></article>`).join("")}</section><section class="panel"><div class="panel-head"><div><h2>Temes que es repeteixen</h2><p>Una menció per tema i resposta · base de textos analitzables: ${num(r.textos)}</p></div></div><div class="panel-body">${r.branca ? `<p><small>Elegibles per a l’aclariment: ${num(r.branca.elegibles)} · Textos: ${num(r.branca.respostes_text)}<br>${esc(r.branca.visibilitat)}</small></p>` : ""}${r.temes.length ? r.temes.map((t) => `<div class="topic-row"><strong>${esc(t.titol)}</strong><span class="topic-n">${num(t.n)} mencions</span></div>`).join("") : empty("Sense temes publicables", "No hi ha prou suport segur per publicar temes. El text descartat no compta com a absència d’un tema.")}</div></section>${(r.seleccions || []).map(q => `<section class="panel section"><h2>${esc(q.text)}</h2><p>Base de respostes vàlides: ${q.base}.</p>${q.opcions.map(o => `<div class="topic-row"><span>${esc(o.etiqueta)}</span><span>${o.n}</span></div>`).join("")}</section>`).join("")}${r.comparacio ? `<section class="panel section"><h2>Evolució de parelles</h2>${current.source === "typeform" ? "<p>El codi vincula respostes del mateix navegador. En un navegador compartit, poden correspondre a persones diferents.</p>" : ""}<p>${esc(r.comparacio.limit || "Comparació indisponible: ha canviat el contracte de mesura.")}</p>${r.comparacio.metrics.map((m) => `<div class="topic-row"><span>${esc(m.id)}<br><small>${current.source === "typeform" ? "Base de respostes enllaçades" : "Base aparellada"}: ${num(m.n)} · Pèrdues de seguiment: ${num(m.perdues)}</small></span><strong>${m.delta === null ? "Dades insuficients" : num(m.delta) + " punts d’escala"}</strong></div>`).join("")}</section>` : ""}</div><aside><section class="panel section"><h2>Mostra per torn</h2>${r.torns.length === 0 ? "<p>Sense dades de torn de feina.</p>" : r.torns.map((s) => `<div class="topic-row"><span>Torn de ${s.torn.toLowerCase()}<br><small>${num(s.pes_mostra, "%")} de la mostra · ${num(s.pes_poblacio, "%")} del públic</small></span><span>${num(s.n)}<br><small>${s.diferencia === null ? "Protegit" : num(s.diferencia) + " pp"}</small></span></div>`).join("")}<p><small>Si un torn és petit, s’oculta també el complement. La participació no garanteix representativitat.</small></p></section><section class="panel section"><h2>Origen de les respostes</h2>${(r.origens || []).map((o) => `<p><strong>${o.source === "fixture" ? "Llavor sintètica" : o.source === "local" ? "Formulari local" : "Import de Typeform"}</strong><br>${num(o.n)} respostes publicables</p>`).join("")}<small>Cap dada històrica s’ha vinculat a les persones d’aquesta onada.</small></section></aside></div>`}<div class="form-actions"><a class="btn" href="/api/campaigns/${current.id}/export">${icon("download")}Exportar agregats</a><a class="btn btn-primary" href="#campaign/${current.id}/action">Decidir el proper pas ${icon("arrow")}</a></div>`;
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
  return `<section class="panel"><div class="panel-head"><div><h2>Propostes d’acció</h2><p>${session.mode === "demo" ? "Propostes de regles locals" : "Propostes IA vinculades a evidència agregada"}</p></div>${session.mode !== "demo" ? '<button class="btn" data-act="proposals">Generar propostes amb IA</button>' : ""}</div>${w.proposals.length ? w.proposals.map((p) => `<article class="action-card"><small>${esc(p.origen)}</small><h3>${esc(actions[p.accio_id]?.[0] || p.accio_id)}</h3><p>${esc(actions[p.accio_id]?.[1] || "")}</p><div class="action-evidence">${icon("chart")} ${esc(p.motiu)}<br><small>Evidència: ${p.evidencia_ids.map(esc).join(", ")} · Onada actual</small></div><p><small>Rol suggerit: ${esc(actions[p.accio_id]?.[2] || "People")}</small></p><button class="btn" data-follow="${esc(p.accio_id)}" data-wave="${w.id}">Escollir acció i crear seguiment ${icon("arrow")}</button></article>`).join("") : empty("Encara no hi ha propostes", "Calen resultats publicables.")}</section>`;
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
      previewPath();
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
  if (name === "json") {
    showDialog(
      "Editor JSON de la consulta",
      `<form id="json-form"><p><small>Es valida el contracte complet abans de desar. Les preguntes de referència han de quedar intactes.</small></p><label for="json-input" class="visually-hidden">JSON de la consulta</label><textarea class="json-editor" id="json-input" spellcheck="false">${esc(JSON.stringify(draft, null, 2))}</textarea><p id="json-error" class="error-text" role="alert"></p><div class="form-actions"><button class="btn" type="button" data-act="dismiss">Cancel·lar</button><button class="btn btn-primary">Validar i desar</button></div></form>`,
    );
    return;
  }
  if (name === "close") {
    showDialog(
      "Tancar la recollida?",
      `<p>Es deixarà d’acceptar respostes i es calcularà una única instantània final amb les regles de privacitat. Aquesta onada no es podrà reobrir.</p><div class="form-actions"><button class="btn" data-act="dismiss">Continuar recollint</button><button class="btn btn-primary" data-act="confirm-close">Tancar i calcular resultats</button></div>`,
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
      await api(`/api/campaigns/${current.id}/close`, {});
      dialog.close();
      location.hash = `campaign/${current.id}/results`;
      return;
    }
    if (
      ["publish", "reconcile", "import", "generate", "proposals"].includes(name)
    ) {
      await api(`/api/campaigns/${current.id}/${name}`, {});
      toast(
        {
          publish: "Consulta publicada.",
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
    previewPath();
    return;
  }
  const del = event.target.closest("[data-delete]");
  if (del) {
    draft.preguntes.splice(Number(del.dataset.delete), 1);
    detailFrame(surveyView());
    previewPath();
  }
});
document.addEventListener("input", (event) => {
  const el = event.target;
  if (el.dataset.q !== undefined)
    draft.preguntes[Number(el.dataset.q)][el.dataset.prop] = el.value;
  if (el.dataset.option) {
    const [i, j] = el.dataset.option.split(":").map(Number);
    draft.preguntes[i].opcions[j].etiqueta = el.value;
  }
  if (el.id === "survey-title") draft.titol = el.value;
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
  if (el.id.startsWith("preview-")) previewPath();
  if (el.id === "state-filter") filterCampaigns();
  if (el.dataset.required !== undefined)
    draft.preguntes[Number(el.dataset.required)].obligatoria = el.checked;
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
