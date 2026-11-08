import { randomUUID } from "node:crypto";
import { favorableOptions, isSyntheticText, safePartition, THRESHOLD } from "./domain.mjs";
import { AppError } from "./providers.mjs";

export const analysisVersions = { motor: 1, plantilles: 1, instruccions: 2 };
const invalid = () => new AppError("La IA ha retornat contingut sense suport publicable vàlid.", 502);
const validText = (value, max = 600) =>
  typeof value === "string" && Boolean(value.trim()) && value.length <= max;
const prose = (value, max) => validText(value, max) && !/[\d@]|https?:\/\//iu.test(value);
const promptText = (value) => /@|https?:\/\/|(?:\d[\s().-]*){7}/iu.test(value ?? "") ? "" : value;
const pct = (n, d) => Math.round((n / d) * 1000) / 10;
const periods = (w) => ({ inici: new Date(w.config.opens).toISOString(), fi: new Date(w.config.closes).toISOString() });

export function policyFor(survey) {
  return {
    id: "politica-v1",
    llengua: "ca",
    max_propostes: 3,
    preguntes: survey.preguntes.filter(q => q.tipus === "escala_1_5").map(q => {
      const ids = favorableOptions(q);
      const isShiftExample = q.id === "comprensio" &&
        q.text === "Tinc clar com funciona el nou sistema de torns." &&
        q.opcions[0]?.etiqueta?.replace(/^1 · /, "") === "Gens d’acord" &&
        q.opcions[4]?.etiqueta?.replace(/^5 · /, "") === "Totalment d’acord";
      return {
        id: q.id,
        favorables: ids,
        llindar_pct: q.analisi?.llindar_pct ?? (isShiftExample && !q.analisi ? 40 : null),
      };
    }),
    relacions: survey.preguntes.filter(q => q.tipus === "text_lliure").flatMap(q =>
      (q.condicio_de_visualitzacio?.totes ?? []).map(c => [c.pregunta_id, q.id])),
  };
}

export function makeReportBase(w, snapshot, historic, themes, fingerprint) {
  const policy = snapshot.politica_analisi ?? policyFor(w.survey);
  const periode = periods(w);
  const source = (snapshot.origens ?? []).map(o => o.source);
  const context = { public: w.config.public, periode, origen: source };
  const evidence = [];
  for (const q of w.survey.preguntes) {
    const metric = snapshot.metrics.find(m => m.id === q.id);
    const selection = snapshot.seleccions?.find(m => m.id === q.id);
    const question = {
      pregunta_id: q.id, pregunta: promptText(q.text), que_mesura: promptText(q.que_mesura),
      quina_decisio_informa: promptText(q.quina_decisio_informa), branca: q.condicio_de_visualitzacio,
    };
    if (metric?.n >= THRESHOLD && (metric.favorable != null || metric.distribution)) {
      const rule = policy.preguntes.find(p => p.id === q.id);
      const n = metric.favorables ?? (metric.distribution &&
        rule.favorables.reduce((sum, id) => sum + metric.distribution[Number(id) - 1], 0));
      const status = rule.llindar_pct == null ? "descriptiva" : n == null
        ? "indisponible" : n * 100 <= rule.llindar_pct * metric.n ? "complerta" : "no_complerta";
      evidence.push({
        id: `metric_${q.id}`, tipus: q.tipus, ...context, ...question,
        base: metric.n, base_unitat: "respostes numèriques vàlides",
        favorable: metric.favorable, favorables: rule.favorables, distribucio: metric.distribution,
        regla: { estat: status, llindar_pct: rule.llindar_pct },
        text_base: status === "complerta" ? "La proporció favorable entra al rang de revisió de la política."
          : status === "no_complerta" ? "La proporció favorable queda fora del rang de revisió de la política."
          : status === "indisponible" ? "La proporció favorable no es pot avaluar." : "Distribució de les respostes numèriques vàlides.",
        limitacio: "L’ítem descriu les respostes vàlides de la mostra.",
      });
    }
    if (selection)
      evidence.push({
        id: `seleccio_${q.id}`, tipus: q.tipus, ...context, ...question,
        base: selection.base, base_unitat: "respostes substantives",
        opcions: selection.opcions.map(o => ({ etiqueta: promptText(o.etiqueta), n: o.n })),
        text_base: "Distribució de les opcions substantives.",
        limitacio: "La base exclou les absències, el no ús i la negativa.",
      });
    for (const theme of themes.filter(t => t.pregunta_id === q.id).sort((a, b) => a.id.localeCompare(b.id))) {
      evidence.push({
        ...theme, tipus: "tema", ...context, ...question, base_unitat: "textos analitzables",
        elegibles: snapshot.branca?.elegibles ?? null, exposicio_verificada: null,
        text_base: theme.titol,
        limitacio: "El tema descriu els textos analitzables de la branca opcional.",
      });
    }
    for (const comparison of snapshot.comparacions ?? []) {
      if (comparison.pregunta_id !== q.id) continue;
      evidence.push({ ...context, ...question, ...comparison, text_base: "Evolució observada entre onades comparables." });
    }
  }
  for (const shift of snapshot.torns) {
    if (shift.n == null || shift.diferencia == null || shift.diferencia >= 0) continue;
    evidence.push({
      id: `cobertura_${shift.torn.toLowerCase()}`, tipus: "cobertura", ...context,
      titol: `Cobertura del torn de ${shift.torn.toLowerCase()}`, base: snapshot.total,
      base_unitat: "trameses acceptades", torn: shift.torn, pes_mostra: shift.pes_mostra,
      pes_poblacio: shift.pes_poblacio, diferencia_pp: shift.diferencia,
      text_base: "El pes del torn a la mostra és inferior al pes al públic elegible.",
      limitacio: "La composició de la mostra no identifica per què algú ha respost.",
    });
  }
  const links = evidence.filter(e => e.tipus === "tema").flatMap(theme =>
    evidence.filter(e => policy.relacions.some(([base, branch]) =>
      e.pregunta_id === base && theme.pregunta_id === branch && e.tipus === "escala_1_5"))
      .map(e => [e.id, theme.id]));
  const report = {
    versio_contracte: 1, campanya_id: w.id, versio_formulari: w.version,
    onada: w.parent_id ? "seguiment" : "inicial", politica: policy, ...analysisVersions,
    ...context, mostra: { trameses_valides: snapshot.total, taxa_aparent: snapshot.taxa },
    evidencies: evidence, diagnostic_biaixos: historic, relacions_permeses: links,
    avisos: ["Dades sintètiques. Les troballes descriuen la mostra."],
  };
  return { ...report, instantania_id: fingerprint(JSON.stringify(report)) };
}

export function synthesisInput(w, base) {
  const qualitative = e => {
    if (e.tipus === "entre_mostres") {
      const [first, last] = e.favorables;
      return last > first ? "La proporció favorable puja a la mostra més recent."
        : last < first ? "La proporció favorable baixa a la mostra més recent."
          : "La proporció favorable publicada es manté.";
    }
    if (e.tipus === "aparellada") {
      const groups = Object.entries(e.transicions);
      const highest = Math.max(...groups.map(([, n]) => n));
      const leading = groups.filter(([, n]) => n === highest);
      return leading.length === 1 ? `La categoria més freqüent és «${leading[0][0]}».` : "Cap categoria predomina en solitari.";
    }
    if (e.opcions) {
      const highest = Math.max(...e.opcions.map(o => o.n));
      const leading = e.opcions.filter(o => o.n === highest);
      return leading.length === 1 ? `L’opció més freqüent és «${leading[0].etiqueta}».` : "Cap opció predomina en solitari.";
    }
    if (e.favorable != null) {
      return e.favorable > 50 ? "La majoria de respostes vàlides són favorables."
        : e.favorable < 50 ? "Menys de la meitat de les respostes vàlides són favorables."
          : "La proporció publicada de favorables i no favorables és la mateixa.";
    }
    return e.definicio;
  };
  return {
    public: base.public,
    context: promptText(w.config.context),
    objectiu: promptText(w.config.objectiu),
    decisio_rrhh: promptText(w.config.decisio),
    temes_exclosos: promptText(w.config.exclusions),
    evidencies: base.evidencies.map(e => ({
      id: e.id, tipus: e.tipus, pregunta: e.pregunta, que_mesura: e.que_mesura,
      quina_decisio_informa: e.quina_decisio_informa, torn: e.torn,
      base_unitat: e.base_unitat, estat_regla: e.regla?.estat,
      fet: e.text_base, detall: qualitative(e), limitacio: e.limitacio,
    })),
    diagnostic_biaixos: base.diagnostic_biaixos.map(d => ({
      id: d.id, titol: d.titol, public: d.public, abast: d.abast, limitacio: d.limitacio,
    })),
    relacions_permeses: base.relacions_permeses,
  };
}

export function themeInput(w, snapshot, rows) {
  const q = w.survey.preguntes.find(q => q.tipus === "text_lliure");
  if (!q || !(snapshot.textos >= THRESHOLD)) return null;
  const groups = new Map();
  for (const row of rows) {
    const answer = row.answers[q.id];
    if (answer?.estat !== "valid" || !isSyntheticText(answer.text)) continue;
    const group = groups.get(answer.text) ?? { resposta_ref: randomUUID(), text: answer.text, n: 0 };
    group.n++;
    groups.set(answer.text, group);
  }
  const texts = [...groups.values()];
  if (texts.reduce((sum, t) => sum + t.n, 0) !== snapshot.textos || texts.length > 40) return null;
  return {
    pregunta_id: q.id, enunciat: promptText(q.text), branca: q.condicio_de_visualitzacio,
    context: promptText(w.config.context), public: w.config.public,
    textos: texts,
  };
}

export function validateThemes(data, input) {
  const source = new Map(input.textos.map(t => [t.resposta_ref, t]));
  if (!Array.isArray(data?.temes) || data.temes.length > 4) throw invalid();
  return data.temes.map((theme, index) => {
    if (!prose(theme?.titol, 120) || !prose(theme.definicio) ||
        !Array.isArray(theme.vincles) || !theme.vincles.length ||
        theme.vincles.length > source.size) throw invalid();
    const seen = new Set();
    const vincles = theme.vincles.map(link => {
      const text = source.get(link?.resposta_ref);
      if (!text || seen.has(text.resposta_ref) ||
          !validText(link.fragment_literal, 300) || !text.text.includes(link.fragment_literal) ||
          !validText(link.observacio)) throw invalid();
      seen.add(text.resposta_ref);
      return { ...text, fragment_literal: link.fragment_literal, observacio: link.observacio };
    });
    return { id: `tema_${input.pregunta_id}_${index + 1}`, pregunta_id: input.pregunta_id,
      titol: theme.titol, definicio: theme.definicio, vincles };
  });
}

export async function contrastThemes(themes, classify) {
  const links = themes.flatMap((theme, i) => theme.vincles.map((link, j) => ({
    id: `${i}-${j}`, titol: theme.titol, definicio: theme.definicio,
    text: link.text, fragment_literal: link.fragment_literal,
  })));
  if (!links.length) return themes;
  const output = await classify(links);
  if (!Array.isArray(output?.veredictes) || output.veredictes.length !== links.length) throw invalid();
  const states = new Map(output.veredictes.map(v => [v?.id, v?.estat]));
  if (links.some(link => !["dona_suport", "contradiu", "indeterminat"].includes(states.get(link.id))))
    throw invalid();
  return themes.map((theme, i) => ({ ...theme, vincles: theme.vincles.map((link, j) => ({
    ...link, estat: states.get(`${i}-${j}`),
  })) }));
}

export function reviewThemes(draft, approved) {
  if (!Array.isArray(approved)) throw new AppError("Cal indicar els suports revisats.");
  const base = draft.base;
  const candidates = new Map(draft.temes.map(t => [t.id, t]));
  const counts = new Map();
  const published = [];
  const supports = [];
  for (const selection of approved) {
    const theme = candidates.get(selection?.id);
    if (!theme || !Array.isArray(selection.refs) || !selection.refs.length)
      throw new AppError("Hi ha un tema o suport que no correspon a la revisió.");
    candidates.delete(theme.id);
    const links = new Map(theme.vincles.filter(link => link.estat === "dona_suport")
      .map(link => [link.resposta_ref, link]));
    const accepted = selection.refs.map(ref => {
      const link = links.get(ref);
      if (!link) throw new AppError("El suport no correspon al tema revisat.");
      links.delete(ref);
      counts.set(ref, link.n);
      return link;
    });
    const n = accepted.reduce((sum, link) => sum + link.n, 0);
    if (n < THRESHOLD || !safePartition([n, base - n])) continue;
    // Protect the joint partition so different themes cannot expose small complements.
    const next = [...supports, new Set(selection.refs)];
    const partition = new Map();
    let remaining = base;
    for (const [ref, weight] of counts) {
      const key = next.map(group => Number(group.has(ref))).join("");
      partition.set(key, (partition.get(key) ?? 0) + weight);
      remaining -= weight;
    }
    const other = "0".repeat(next.length);
    partition.set(other, (partition.get(other) ?? 0) + remaining);
    if (!safePartition([...partition.values()])) continue;
    supports.push(next.at(-1));
    const { id, pregunta_id, titol, definicio } = theme;
    published.push({ id, pregunta_id, titol, definicio, n, base });
  }
  return published;
}

export function validateSynthesis(data, base, survey) {
  const evidence = new Map(base.evidencies.map(e => [e.id, e]));
  const historic = new Set(base.diagnostic_biaixos.map(d => d.id));
  const refs = (ids, source) => Array.isArray(ids) && new Set(ids).size === ids.length &&
    ids.every(id => source.has(id));
  if (!Array.isArray(data?.troballes) || data.troballes.length > 6 ||
      !Array.isArray(data.accions) || data.accions.length > base.politica.max_propostes) throw invalid();
  let descartats = 0;
  const checkedBlocks = (blocks, check) => blocks.flatMap((block, index) => {
    try {
      return [check(block, index)];
    } catch (error) {
      if (!(error instanceof AppError)) throw error;
      descartats++;
      return [];
    }
  });
  const troballes = checkedBlocks(data.troballes, (t, i) => {
    if (!prose(t?.text) || !prose(t.limitacio) || !refs(t.evidencia_ids, evidence) ||
        t.evidencia_ids.length !== 1) throw invalid();
    return { id: `troballa_${i + 1}`, text: t.text, limitacio: t.limitacio, evidencia_ids: t.evidencia_ids };
  });
  const fixed = survey.preguntes.filter(q => q.de_referencia).map(q => q.id);
  const accions = checkedBlocks(data.accions, (a, i) => {
    const follow = a?.seguiment;
    if (!["canvi", "recollida"].includes(a?.tipus) || !prose(a.titol, 140) ||
        !prose(a.rol_suggerit, 100) || !prose(a.primer_pas) || !prose(a.quan, 180) ||
        !prose(follow?.quan, 180) || !prose(follow.pregunta_adaptable, 220) ||
        !Array.isArray(follow.opcions_suggerides) || follow.opcions_suggerides.length < 2 ||
        follow.opcions_suggerides.length > 6 || follow.opcions_suggerides.some(o => !prose(o, 100)) ||
        new Set(follow.opcions_suggerides.map(o => o.trim().toLocaleLowerCase("ca"))).size !== follow.opcions_suggerides.length ||
        !refs(a.evidencia_ids, evidence) || !refs(a.diagnostic_ids, historic)) throw invalid();
    const cited = a.evidencia_ids.map(id => evidence.get(id));
    const supportsChange = cited.some(e => ["escala_1_5", "seleccio_unica", "tema"].includes(e.tipus) &&
      !["no_complerta", "indisponible"].includes(e.regla?.estat));
    const relates = cited.length <= 1 || (cited.length === 2 &&
      base.relacions_permeses.some(pair => pair.every(id => a.evidencia_ids.includes(id))));
    if (!relates || (a.tipus === "canvi" && (!supportsChange || a.diagnostic_ids.length)) ||
        (a.tipus === "recollida" && !cited.some(e => e.tipus === "cobertura" ||
          e.tipus === "tema" || e.regla?.estat === "complerta") && !a.diagnostic_ids.length))
      throw invalid();
    return {
      id: `accio_${i + 1}`, tipus: a.tipus, titol: a.titol, evidencia_ids: a.evidencia_ids,
      diagnostic_ids: a.diagnostic_ids, rol_suggerit: a.rol_suggerit, primer_pas: a.primer_pas, quan: a.quan,
      seguiment: { quan: follow.quan, pregunta_adaptable: follow.pregunta_adaptable,
        opcions_suggerides: follow.opcions_suggerides, preguntes_referencia_ids: fixed },
    };
  });
  if (descartats && !troballes.length && !accions.length) throw invalid();
  return { troballes, accions, descartats };
}

export function compareSnapshots(previous, current, w1, w2) {
  if (current.comparacio?.estat !== "comparable") return [];
  return current.comparacio.metrics.flatMap(pair => {
    const a = previous.metrics.find(m => m.id === pair.id);
    const b = current.metrics.find(m => m.id === pair.id);
    const waves = [{ id: w1.id, periode: periods(w1) }, { id: w2.id, periode: periods(w2) }];
    const evidence = [];
    if (a?.favorable != null && b?.favorable != null) {
      const before = a.favorables == null ? a.favorable : pct(a.favorables, a.n);
      const after = b.favorables == null ? b.favorable : pct(b.favorables, b.n);
      evidence.push({
        id: `mostres_${pair.id}`, tipus: "entre_mostres", pregunta_id: pair.id,
        onades: waves, bases: [a.n, b.n], favorables: [before, after],
        limitacio: "Les bases poden representar mostres diferents. L’evolució observada no demostra causalitat.",
      });
    }
    if (pair.transicions) evidence.push({
      id: `parelles_${pair.id}`, tipus: "aparellada", pregunta_id: pair.id,
      onades: waves, base: pair.n,
      base_unitat: w2.source === "typeform" ? "parells de respostes per navegador" : "parells vàlids",
      transicions: pair.transicions,
      limitacio: current.comparacio.limit,
    });
    return evidence;
  });
}
