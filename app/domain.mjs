import { isDeepStrictEqual } from "node:util";
export const template = { titol: "", introduccio: "", temps_estimat_segons: 90, adaptacions: [], preguntes: [] };
export const THRESHOLD = 10;
export const SIGNALS = [
  "participacio_nit",
  "historic_extrems",
  "historic_participacio",
  "cobertura",
  "moment",
];
export const catalog = [
  {
    id: "instruccions",
    titol: "Un únic lloc per a les instruccions",
    descripcio:
      "Centralitzar les instruccions i presentar-ne un resum a l’inici de cada torn.",
    responsable: "Supervisió de Planta",
    tema: "comunicacio",
  },
  {
    id: "ajuda",
    titol: "Fer visible el canal d’ajuda",
    descripcio:
      "Compartir un punt de contacte de suport i explicar quan i com utilitzar-lo.",
    responsable: "People i Supervisió",
    tema: "suport",
  },
  {
    id: "antelacio",
    titol: "Compartir el calendari amb antelació",
    descripcio:
      "Acordar una finestra estable per comunicar el calendari i comprovar que arriba als dos torns.",
    responsable: "Planificació de Planta",
    tema: "planificacio",
  },
];
export const topics = {
  comunicacio: "Instruccions i comunicació",
  suport: "Canal d’ajuda",
  planificacio: "Antelació dels torns",
  altres: "Altres / no classificable",
};
// Only exact, known synthetic phrases survive ingestion. Never retain arbitrary free text.
export const safeTexts = {};
const syntheticTexts = new Set([
  "Entre el tauler i el full de torn hi ha instruccions diferents.",
  "Un únic lloc per consultar les instruccions, ara no sé quina versió val.",
  "Vaig veure dos papers amb indicacions diferents. Quin és el bo?",
  "El que es va dir al relleu no ho vaig trobar al quadrant.",
  "Amb tot repartit costa trobar la informació quan toca.",
  "Mateix full al tauler i al mòbil, si pot ser.",
  "Em vaig fer un embolic, hi havia un full nou i l’antic seguia penjat.",
  "Un exemple amb un canvi de nit a dia, pas a pas.",
  "Un esquema senzill del que passa després de l’últim torn de nit.",
  "Amb un dibuix del quadrant ho hauria vist més clar.",
  "Tenir el quadrant de la setmana vinent una mica abans.",
  "Que avisin abans si es mou el dia de descans.",
  "El vaig veure tard i ja m’havia organitzat.",
  "Que quedi escrit com es pot demanar un intercanvi.",
  "Saber on anar quan el canvi ja està fet i no el pots fer.",
  "Veure la rotació amb temps per organitzar-me a casa.",
  "Explicar com encaixar els dies de descans entre els torns.",
  "Més exemples, amb l’explicació sola em vaig perdre.",
  "Ho vaig preguntar al relleu, m’aniria bé poder-ho consultar després.",
  "La informació en 2 minuts a l’inici hauria anat bé.",
]);
export const isSyntheticText = (value) =>
  typeof value === "string" && (syntheticTexts.has(value) || Object.hasOwn(safeTexts, value));
export const visible = (q, answers) =>
  !q.condicio_de_visualitzacio ||
  q.condicio_de_visualitzacio.totes.every((c) =>
    c.opcions_ids.includes(answers[c.pregunta_id]),
  );
export const favorableOptions = (q) => q.analisi?.favorables ?? ["4", "5"];
const nonempty = (s, max = 2000) =>
  typeof s === "string" && s.trim().length > 0 && s.length <= max;
export function validateSurvey(s, reference = template, signals = SIGNALS) {
  const errors = [];
  if (!s || typeof s !== "object" || Array.isArray(s))
    return ["La consulta ha de ser un objecte JSON."];
  if (!nonempty(s.titol, 180) || !nonempty(s.introduccio, 3000))
    errors.push("Cal un títol i una introducció vàlids.");
  if (
    !Number.isInteger(s.temps_estimat_segons) ||
    s.temps_estimat_segons <= 0 ||
    s.temps_estimat_segons >= 120
  )
    errors.push("La durada estimada ha de ser un enter entre 1 i 119 segons.");
  if (
    !Array.isArray(s.adaptacions) ||
    s.adaptacions.length > 12 ||
    s.adaptacions.some(
      (a) => !a || !nonempty(a.proposta) || (
        !signals.includes(a.senyal_id) &&
        !(a.pregunta_id !== undefined && ["cobertura", "moment"].includes(a.senyal_id))
      ),
    )
  )
    errors.push("Cada adaptació ha de citar un senyal existent.");
  if (
    !Array.isArray(s.preguntes) ||
    s.preguntes.length < 3 ||
    s.preguntes.length > 6
  )
    return [...errors, "Calen entre 3 i 6 preguntes."];
  const previous = new Map();
  for (const [i, q] of s.preguntes.entries()) {
    if (!q || typeof q !== "object") {
      errors.push(`Pregunta ${i + 1} invàlida.`);
      continue;
    }
    if (!/^[a-z][a-z0-9_]{0,49}$/.test(q.id) || previous.has(q.id))
      errors.push(`ID de pregunta invàlid o repetit: ${i + 1}.`);
    if (
      ![q.text, q.que_mesura, q.quina_decisio_informa].every((t) => nonempty(t))
    )
      errors.push(`Pregunta ${i + 1}: cal text, concepte i decisió.`);
    if (
      typeof q.obligatoria !== "boolean" ||
      typeof q.de_referencia !== "boolean"
    )
      errors.push(
        `Pregunta ${i + 1}: obligatorietat i referència han de ser booleans.`,
      );
    if (
      !["escala_1_5", "seleccio_unica", "text_lliure"].includes(q.tipus) ||
      !Array.isArray(q.opcions)
    ) {
      errors.push(`Pregunta ${i + 1}: tipus o opcions invàlids.`);
      continue;
    }
    const ids = q.opcions.map((o) => o?.id);
    if (q.analisi !== undefined) {
      const a = q.analisi;
      if (q.tipus !== "escala_1_5" || !a || !Array.isArray(a.favorables) ||
          !a.favorables.length || a.favorables.length > 4 ||
          new Set(a.favorables).size !== a.favorables.length ||
          a.favorables.some(v => typeof v !== "string" || !/^[1-5]$/.test(v)) ||
          (a.llindar_pct !== undefined &&
            (!Number.isInteger(a.llindar_pct) || a.llindar_pct < 0 || a.llindar_pct > 100)))
        errors.push(`Pregunta ${i + 1}: política d’anàlisi invàlida.`);
    }
    if (
      new Set(ids).size !== ids.length ||
      q.opcions.some(
        (o) =>
          !o ||
          typeof o.id !== "string" ||
          !/^[a-z0-9_]{1,45}$/.test(o.id) ||
          !nonempty(o.etiqueta, 300),
      )
    )
      errors.push(`Pregunta ${i + 1}: opcions repetides o invàlides.`);
    if (
      q.tipus === "escala_1_5" &&
      JSON.stringify(ids) !==
        JSON.stringify(["1", "2", "3", "4", "5", "no_valorable"])
    )
      errors.push(
        `Pregunta ${i + 1}: l’escala ha de conservar 1–5 i no_valorable.`,
      );
    if (q.tipus === "seleccio_unica" && (ids.length < 2 || ids.length > 12))
      errors.push(`Pregunta ${i + 1}: calen 2–12 opcions.`);
    if (
      q.tipus === "text_lliure" &&
      (q.opcions.length || q.obligatoria || !q.condicio_de_visualitzacio)
    )
      errors.push(
        "El text lliure ha de ser opcional, condicionat i sense opcions.",
      );
    if (q.condicio_de_visualitzacio !== null) {
      const conditions = q.condicio_de_visualitzacio?.totes;
      if (
        !Array.isArray(conditions) ||
        !conditions.length ||
        conditions.some(
          (c) =>
            !c ||
            !previous.has(c.pregunta_id) ||
            previous.get(c.pregunta_id).condicio_de_visualitzacio !== null ||
            !Array.isArray(c.opcions_ids) ||
            !c.opcions_ids.length ||
            c.opcions_ids.some(
              (id) =>
                !previous.get(c.pregunta_id).opcions.some((o) => o.id === id),
            ),
        )
      )
        errors.push(
          `Pregunta ${i + 1}: condició invàlida; cal referenciar opcions anteriors sempre visibles.`,
        );
    }
    previous.set(q.id, q);
  }
  if (Array.isArray(s.adaptacions) && s.adaptacions.some(a =>
    a?.pregunta_id !== undefined &&
    (typeof a.pregunta_id !== "string" || !previous.has(a.pregunta_id))))
    errors.push("Cada adaptació d’una pregunta ha de citar un ID de pregunta existent.");
  for (const [i, ref] of reference.preguntes.entries())
    if (ref.de_referencia && !isDeepStrictEqual(s.preguntes[i], ref))
      errors.push(
        `Cal preservar íntegrament la pregunta fixa ${ref.id} i la seva posició.`,
      );
  if (!errors.length) {
    const walk = (i, answers, count, branches) => {
      if (i === s.preguntes.length) {
        if (count < 3 || count > 6 || branches > 1)
          errors.push(
            "Cada camí ha de tenir 3–6 preguntes i com a màxim una repregunta.",
          );
        return;
      }
      const q = s.preguntes[i];
      if (!visible(q, answers)) return walk(i + 1, answers, count, branches);
      const values =
        q.tipus === "text_lliure"
          ? [null]
          : [...q.opcions.map((o) => o.id), ...(q.obligatoria ? [] : [null])];
      for (const value of values)
        walk(
          i + 1,
          { ...answers, [q.id]: value },
          count + 1,
          branches + (q.condicio_de_visualitzacio ? 1 : 0),
        );
    };
    walk(0, {}, 0, 0);
  }
  return [...new Set(errors)];
}
export function normalizeAnswers(s, input = {}) {
  const result = {};
  const hasAnswer = value => value !== undefined && value !== null && value !== "";
  const validInput = Object.fromEntries(
    s.preguntes
      .filter((q) => q.opcions.some((o) => o.id === input[q.id]))
      .map((q) => [q.id, input[q.id]]),
  );
  for (const q of s.preguntes) {
    const value = input[q.id];
    let entry;
    if (!visible(q, validInput)) {
      const conditions = q.condicio_de_visualitzacio.totes;
      const disproved = conditions.some(c => Object.hasOwn(validInput, c.pregunta_id) &&
        !c.opcions_ids.includes(validInput[c.pregunta_id]));
      const incomplete = conditions.some(c => hasAnswer(input[c.pregunta_id]) &&
        !Object.hasOwn(validInput, c.pregunta_id));
      const determinate = disproved || (!hasAnswer(value) && !incomplete);
      entry = {
        estat: determinate ? "no_mostrada" : "desconeguda",
        visibilitat: determinate ? "elegibilitat_reconstruida" : "desconeguda",
      };
    } else if (!hasAnswer(value))
      entry = { estat: "omesa" };
    else if (q.tipus === "text_lliure")
      entry = isSyntheticText(value)
        ? { estat: "valid", text: value, temes: safeTexts[value] ?? [] }
        : { estat: "descartada_privacitat" };
    else if (!q.opcions.some((o) => o.id === value))
      entry = { estat: "invalida" };
    else
      entry = {
        estat:
          value === "no_valorable"
            ? "no_valorable"
            : value === "no_us"
              ? "no_us"
              : value === "prefereixo_no_respondre"
                ? "negativa"
                : "valid",
        value,
      };
    result[q.id] = entry;
  }
  return result;
}
const pct = (n, d) => Math.round((n / d) * 1000) / 10;
const protectedCount = (n) => n > 0 && n < THRESHOLD;
export const safePartition = (ns) => !ns.some(protectedCount);
const answerStates = ["no_valorable", "no_us", "negativa", "omesa", "no_mostrada", "invalida", "desconeguda"];
const stateCounts = (rows, question) => answerStates.map(estat => ({
  estat, n: rows.filter(r => r.answers[question]?.estat === estat).length,
}));
export function historical(p, data = null) {
  if (!data || p.sector !== data.sector || p.ubicacio !== data.ubicacio) return {abast:'insuficient'};
  const {referencia,voluntaria}=data;
  const bases=[referencia.reduce((a,b)=>a+b,0),voluntaria.reduce((a,b)=>a+b,0)];
  if (bases.some(n => n < THRESHOLD) || bases[1] > data.population ||
      !safePartition([...referencia, ...voluntaria, data.population - bases[1]]))
    return {abast:'insuficient'};
  const extremes=[referencia[0]+referencia[4],voluntaria[0]+voluntaria[4]];
  return {abast:p.torn==='Tots dos'?'exacte':'ampli',referencia,voluntaria,bases,
    poblacio_elegible:data.population,taxa:pct(bases[1],data.population),percentatges:[referencia.map(n=>pct(n,bases[0])),voluntaria.map(n=>pct(n,bases[1]))],
    extrems:extremes.map((n,i)=>pct(n,bases[i])),diferencia:Math.round((extremes[1]/bases[1]-extremes[0]/bases[0])*1000)/10,
    periode:data.periode,pregunta:data.pregunta,origen:data.origen};
}
export function aggregate(rows, population, survey, audience = null) {
  const total = rows.length;
  if (total < THRESHOLD)
    return {
      total: null,
      taxa: null,
      population,
      metrics: [],
      torns: [],
      temes: [],
      evidence: [],
      textos: null,
      branca: null,
      seleccions: [],
    };
  const metrics = survey.preguntes
    .filter((q) => q.tipus === "escala_1_5")
    .map((q) => {
      const values = rows
        .map((r) => r.answers[q.id])
        .filter((a) => a?.estat === "valid" && /^[1-5]$/.test(a.value))
        .map((a) => Number(a.value));
      const n = values.length,
        rest = total - n;
      if (n < THRESHOLD || !safePartition([n, rest]))
        return {
          id: q.id,
          text: q.text,
          n: null,
          favorable: null,
          distribution: null,
          absencies: null,
        };
      const counts = [1, 2, 3, 4, 5].map(
          (v) => values.filter((x) => x === v).length,
        ),
        fav = favorableOptions(q).reduce((sum, option) => sum + counts[Number(option) - 1], 0);
      const states = stateCounts(rows, q.id);
      return {
        id: q.id,
        text: q.text,
        n,
        favorable: safePartition([fav, n - fav]) ? pct(fav, n) : null,
        favorables: safePartition([fav, n - fav]) ? fav : null,
        opcions_favorables: favorableOptions(q),
        distribution: safePartition(counts) ? counts : null,
        absencies: safePartition(states.map((s) => s.n)) ? states : null,
      };
    });
  const shifts = ["Dia", "Nit"].map((torn) => ({
    torn,
    n: rows.filter((r) => r.torn === torn).length,
  }));
  const showShifts = safePartition([
    ...shifts.map((s) => s.n),
    total - shifts.reduce((n, s) => n + s.n, 0),
  ]);
  const texts = rows.filter((r) =>
    Object.values(r.answers).some((a) => a.text),
  );
  const textQuestions = survey.preguntes.filter(
    (q) => q.tipus === "text_lliure",
  );
  const eligible = rows.filter((r) =>
    textQuestions.some((q) => r.answers[q.id] &&
      !["no_mostrada", "desconeguda"].includes(r.answers[q.id].estat)),
  );
  const answered = eligible.filter(r => textQuestions.some(q =>
    ["valid", "descartada_privacitat"].includes(r.answers[q.id]?.estat))).length;
  const antecedentCounts = textQuestions.flatMap((q) =>
    q.condicio_de_visualitzacio.totes.map(
      (c) =>
        rows.filter((r) =>
          c.opcions_ids.includes(r.answers[c.pregunta_id]?.value),
        ).length,
    ),
  );
  const branchSafe =
    textQuestions.length === 1 &&
    eligible.length >= THRESHOLD &&
    safePartition([
      eligible.length,
      total - eligible.length,
      ...antecedentCounts.map((n) => n - eligible.length),
    ]);
  const textBaseSafe =
    branchSafe &&
    texts.length >= THRESHOLD &&
    safePartition([
      texts.length,
      total - texts.length,
      eligible.length - texts.length,
    ]);
  const temes = textBaseSafe
    ? Object.entries(topics)
        .map(([id, titol]) => ({
          id,
          titol,
          n: texts.filter((r) =>
            Object.values(r.answers).some((a) => a.temes?.includes(id)),
          ).length,
        }))
        .filter(
          (t) => t.n >= THRESHOLD && safePartition([t.n, texts.length - t.n]),
        )
    : [];
  const evidence = temes.map((t) => ({
    id: `tema_${t.id}`,
    tema: t.id,
    n: t.n,
    base: texts.length,
    text: t.titol,
  }));
  for (const m of metrics)
    if (m.favorable !== null && m.n !== null)
      evidence.push({
        id: `metric_${m.id}`,
        n: m.n,
        text: m.text,
        favorable: m.favorable,
      });
  const selections = survey.preguntes.filter(q => q.tipus === "seleccio_unica").flatMap(q => {
    const opcions = q.opcions
      .filter(o => !["no_us", "no_valorable", "prefereixo_no_respondre"].includes(o.id))
      .map(o => ({...o,n:rows.filter(r => {
        const answer = r.answers[q.id];
        return answer?.estat === "valid" && answer.value === o.id;
      }).length}));
    const base = opcions.reduce((n,o) => n+o.n,0);
    const states = stateCounts(rows, q.id).filter(state => state.n > 0);
    return base >= THRESHOLD && safePartition([...opcions.map(o => o.n),total-base])
      ? [{id:q.id,text:q.text,base,opcions,
        ...(states.length && safePartition(states.map(state => state.n)) ? { estats: states } : {})}] : [];
  });
  return {
    total,
    taxa: population && total <= population ? pct(total, population) : null,
    population,
    metrics,
    torns: shifts.map((s) => {
      const pop =
        audience?.torn === "Tots dos" && population
          ? Math.round(population * (s.torn === "Dia" ? 0.6 : 0.4))
          : audience?.torn === s.torn
            ? population
            : null;
      return {
        ...s,
        n: showShifts ? s.n : null,
        poblacio: pop,
        pes_mostra: showShifts ? pct(s.n, total) : null,
        pes_poblacio: pop && population ? pct(pop, population) : null,
        diferencia:
          showShifts && pop && population
            ? Math.round((s.n / total - pop / population) * 1000) / 10
            : null,
      };
    }),
    temes,
    textos: textBaseSafe ? texts.length : null,
    evidence,
    seleccions: selections,
    branca: branchSafe
      ? {
          elegibles: eligible.length,
          visibilitat:
            "Elegibilitat reconstruïda; no és una visualització observada",
          respostes: answered >= THRESHOLD && safePartition([eligible.length - answered, answered - texts.length, texts.length])
            ? answered : null,
          respostes_text: textBaseSafe ? texts.length : null,
        }
      : null,
  };
}
export function comparable(a, b) {
  return (
    isDeepStrictEqual(a.public, b.public) &&
    a.protocol === b.protocol &&
    a.survey.preguntes.every(
      (q, i) => !q.de_referencia || isDeepStrictEqual(q, b.survey.preguntes[i]),
    )
  );
}
export function paired(a, b, rowsA, rowsB) {
  if (!isDeepStrictEqual(a.public, b.public) || a.protocol !== b.protocol)
    return { estat: "no_comparable", metrics: [] };
  const questions = a.survey.preguntes.filter((q, i) =>
    q.de_referencia && q.tipus === "escala_1_5" && isDeepStrictEqual(q, b.survey.preguntes[i]));
  if (!questions.length) return { estat: "no_comparable", metrics: [] };
  const uniqueParticipants = (rows) => {
    const lookup = new Map();
    for (const row of rows) {
      if (row.participant) lookup.set(row.participant, lookup.has(row.participant) ? null : row);
    }
    return lookup;
  };
  const before = uniqueParticipants(rowsA);
  const after = uniqueParticipants(rowsB);
  const metrics = questions
    .map((q) => {
      const pairs = [...after]
        .filter(([participant, row]) => row && before.get(participant))
        .map(([participant, row]) => [before.get(participant).answers[q.id], row.answers[q.id]])
        .filter((pair) =>
          pair.every((v) => v?.estat === "valid" && /^[1-5]$/.test(v.value)),
        );
      if (
        pairs.length < THRESHOLD ||
        !safePartition([
          rowsA.length - pairs.length,
          rowsB.length - pairs.length,
        ])
      )
        return { id: q.id, n: null, delta: null, perdues: null };
      const transitions = { puja: 0, igual: 0, baixa: 0 };
      for (const [x, y] of pairs)
        transitions[Number(y.value) > Number(x.value) ? "puja" : x.value === y.value ? "igual" : "baixa"]++;
      const delta =
        pairs.reduce(
          (sum, [x, y]) => sum + Number(y.value) - Number(x.value),
          0,
        ) / pairs.length;
      return {
        id: q.id,
        n: pairs.length,
        delta: Math.round(delta * 100) / 100,
        transicions: safePartition(Object.values(transitions)) ? transitions : null,
        perdues: rowsA.length - pairs.length,
      };
    });
  return {
    estat: "comparable",
    metrics,
    limit:
      "Evolució observada de parelles; no demostra un efecte causal de l’acció. Només ítems vàlids a les dues onades.",
  };
}
