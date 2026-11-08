import { readFileSync } from "node:fs";
import { analysisVersions, policyFor, reviewThemes, themeInput, validateSynthesis, validateThemes } from "./analysis.mjs";
import { aggregate, normalizeAnswers, visible } from "./domain.mjs";

export const scenarioAResultsId = "escenari-a-resultats";
export const scenarioADefaults = {
  titol: "Canvi de torns a Planta",
  objectiu: "Entendre com viu la plantilla el nou sistema de torns i quines dificultats hi troba.",
  decisio: "Decidir si cal reforçar les instruccions del canvi o el canal d’ajuda.",
  context: "A la fàbrica fictícia de Catalunya hem passat de torns fixos a una rotació Dia/Nit. Vam comunicar el canvi fa dues setmanes.",
  sector: "Planta",
  ubicacio: "Planta de demo",
  torn: "Tots dos",
  dies: 7,
  exclusions: "Dades que identifiquin persones",
};

const surveyTemplate = JSON.parse(readFileSync(
  new URL("../stages/03_simulacio/consulta.json", import.meta.url), "utf8",
));
const commentQuestionId = "aclariment_comprensio";
const commentThemes = [
  {
    n: 15,
    text: "Entre el tauler i el full de torn hi ha instruccions diferents.",
    titol: "Instruccions disperses",
    definicio: "Els comentaris descriuen instruccions diferents segons on es consulten.",
  },
  {
    n: 10,
    text: "Un exemple amb un canvi de nit a dia, pas a pas.",
    titol: "Exemples de la rotació",
    definicio: "Els comentaris demanen un exemple pràctic del pas del torn de nit al de dia.",
  },
];
const instructionsEvidenceId = `tema_${commentQuestionId}_1`;

export function scenarioASurvey(signals, followup) {
  if (followup) return structuredClone(followup);
  const survey = structuredClone(surveyTemplate);
  survey.introduccio = "Volem saber com estàs vivint el canvi de torns. Les respostes es pseudonimitzen i es poden vincular entre onades de la mateixa sèrie. People només veu resultats agrupats amb una base suficient.";
  survey.preguntes.find(q => q.id === "dificultat_principal").text =
    "Aquesta setmana, què t’ha costat més del nou sistema de torns?";
  survey.adaptacions = [
    {
      senyal_id: "cobertura", pregunta_id: "dificultat_principal",
      proposta: "Una tria d’un sol toc facilita respondre des del mòbil durant qualsevol torn.",
    },
    {
      senyal_id: "moment", pregunta_id: "dificultat_principal",
      proposta: "Un període curt i l’opció de no ús ajuden quan la plantilla ha provat la rotació en moments diferents.",
    },
  ];
  if (signals.some(s => s.id === "historic_participacio")) {
    survey.adaptacions.unshift({
      senyal_id: "historic_participacio", pregunta_id: "dificultat_principal",
      proposta: "Una pregunta breu, amb una sola idea, redueix l’esforç de respondre.",
    });
    survey.adaptacions.push({
      senyal_id: "historic_participacio",
      proposta: "Col·loca el QR en un espai accessible i deixa set dies perquè hi puguin respondre tots dos torns.",
    });
  }
  return survey;
}

export const scenarioAAnalysis = {
  troballes: [
    {
      text: "Els comentaris apunten a les instruccions disperses com un obstacle concret per entendre la rotació.",
      hipotesi: "Si els dos torns reben el mateix resum, podria augmentar la comprensió del sistema.",
      comprovacio: "Pregunta si el resum ha arribat i torna a mesurar la comprensió en una onada comparable.",
      limitacio: "L’aclariment era opcional i només apareixia quan es declarava la comprensió més baixa i alguna dificultat.",
      evidencia_ids: ["seleccio_dificultat_principal", instructionsEvidenceId],
    },
    {
      text: "A la mostra, és menys habitual declarar que se sap on demanar ajuda que declarar que s’entén la rotació. Això apunta a una necessitat de suport pròpia.",
      hipotesi: "Fer visible el punt de contacte podria facilitar que la plantilla sàpiga on resoldre dubtes.",
      comprovacio: "Torna a mesurar si la plantilla sap on demanar ajuda després de difondre el contacte i comprova si les persones que l’han necessitat l’han trobat.",
      limitacio: "Les dues preguntes tenen bases diferents. Els percentatges descriuen el conjunt de cada base.",
      evidencia_ids: ["metric_comprensio", "metric_suport"],
    },
  ],
  accions: [{
    tipus: "canvi",
    titol: "Compartir un resum únic de la rotació",
    objectiu: "Que la plantilla dels dos torns entengui com funciona la rotació.",
    justificacio: "Els comentaris apunten que les instruccions repartides costen de trobar quan fan falta. Un resum únic amb un exemple de rotació pot aclarir quina pauta cal seguir.",
    evidencia_ids: [instructionsEvidenceId],
    diagnostic_ids: [],
    rol_suggerit: "Supervisió de Planta",
    primer_pas: "Prepara un full amb un exemple de pas de nit a dia. Penja’l al tauler i presenta’l al relleu dels dos torns.",
    quan: "Abans del pròxim canvi de quadrant.",
    seguiment: {
      quan: "Una setmana després de compartir el resum.",
      pregunta_adaptable: "T’ha arribat el resum sobre el nou sistema de torns?",
      opcions_suggerides: ["Sí", "No", "No ho sé"],
      pregunta_impacte_id: "comprensio",
      criteri_impacte: "Torna a fer la pregunta de comprensió i compara les respostes favorables amb l’onada inicial si les mostres són comparables. Si el resum ha arribat i la comprensió no puja, revisa l’exemple de rotació.",
    },
  }, {
    tipus: "canvi",
    titol: "Fer visible el canal d’ajuda",
    objectiu: "Que la plantilla sàpiga a qui adreçar els dubtes sobre la rotació.",
    justificacio: "Poca gent declara saber on demanar ajuda. Un contacte visible al tauler i al relleu donaria un lloc clar on anar quan apareix un dubte.",
    evidencia_ids: ["metric_suport"],
    diagnostic_ids: [],
    rol_suggerit: "People i Supervisió",
    primer_pas: "Acorda qui atendrà els dubtes i en quin horari. Publica el contacte i l’horari als espais dels dos torns.",
    quan: "Durant la pròxima setmana de rotació.",
    seguiment: {
      quan: "Una setmana després de publicar el contacte.",
      pregunta_adaptable: "Has trobat el punt de contacte per a dubtes sobre els torns quan l’has necessitat?",
      opcions_suggerides: ["Sí", "No", "No l’he necessitat"],
      pregunta_impacte_id: "suport",
      criteri_impacte: "Repeteix la pregunta sobre on demanar ajuda i compara les respostes favorables si les mostres són comparables. Si el coneixement puja però encara costa trobar el contacte quan cal, revisa com s’hi accedeix.",
    },
  }],
};

// Keep the Stage 03 opening-wave headline counts. Use a small synthetic
// undeclared-shift segment so the normal complementary suppression is visible.
function scenarioARows(survey) {
  const expand = counts => Object.entries(counts).flatMap(([value, n]) => Array(n).fill(value));
  const shifts = expand({ Dia: 141, Nit: 47, Desconegut: 6 });
  const understanding = expand({ 2: 44, 3: 45, 4: 25, 5: 22, no_valorable: 13 });
  const support = expand({ 1: 41, 2: 51, 3: 47, 4: 22, 5: 17, no_valorable: 16 });
  const difficulties = expand({
    funcionament: 68, antelacio: 35, canvis: 26, necessitats_personals: 21, altra: 10, cap: 21, no_us: 13,
  });
  const commentQuestion = survey.preguntes.find(q => q.id === commentQuestionId);
  const comments = commentThemes.flatMap(({ text, n }) => Array(n).fill(text));
  // Keep the eligible group and each of its complements above the privacy minimum.
  const lowScores = { withBranch: 35, withoutBranch: 10 };
  let otherScore = 0;
  let eligible = 0;
  return shifts.map((torn, i) => {
    const difficulty = difficulties[(i * 17) % shifts.length];
    const offersComment = visible(commentQuestion, { comprensio: "1", dificultat_principal: difficulty });
    const group = offersComment ? "withBranch" : "withoutBranch";
    const low = lowScores[group] > 0;
    if (low) lowScores[group]--;
    const answers = normalizeAnswers(survey, {
      comprensio: low ? "1" : understanding[(otherScore++ * 19) % understanding.length],
      suport: support[(i * 13) % shifts.length],
      dificultat_principal: difficulty,
      [commentQuestionId]: low && offersComment ? comments[eligible++] : undefined,
    });
    return { torn, answers };
  });
}

export async function seedScenarioA(store) {
  const config = store.validateConfig(scenarioADefaults);
  const historic = await store.calibration(config.public);
  const survey = scenarioASurvey(store.diagnostic(config.public, historic));
  const opens = Date.parse("2026-10-05T00:00:00Z");
  const closes = opens + config.dies * 86400000;
  const rows = scenarioARows(survey);
  const snapshot = {
    ...aggregate(rows, config.population, survey, config.public),
    historic,
    closed_at: new Date(closes).toISOString(),
    politica_analisi: policyFor(survey),
    origens: [{ source: "fixture", n: rows.length }],
  };
  await store.db.prepare(
    `INSERT INTO waves(id,cycle,state,config,survey,source,snapshot,created_at)
     VALUES(?,?,'closed',?,?,'local',?,?)`,
  ).run(scenarioAResultsId, scenarioAResultsId, JSON.stringify({ ...config, opens, closes }),
    JSON.stringify(survey), JSON.stringify(snapshot), opens);

  // The prepared wave includes a simulated theme review. Only retain the safe aggregates.
  const input = themeInput({ config, survey }, snapshot, rows);
  const drafts = validateThemes({ temes: commentThemes.map(({ text, titol, definicio }) => ({
    titol, definicio,
    vincles: [{
      resposta_ref: input.textos.find(t => t.text === text).resposta_ref,
      fragment_literal: text,
      observacio: "El comentari sintètic descriu explícitament el tema.",
    }],
  })) }, input);
  const reviewed = drafts.map(theme => ({
    ...theme, vincles: theme.vincles.map(link => ({ ...link, estat: "dona_suport" })),
  }));
  const themes = reviewThemes({ base: snapshot.textos, temes: reviewed },
    reviewed.map(t => ({ id: t.id, refs: t.vincles.map(v => v.resposta_ref) })));
  const wave = await store.wave(scenarioAResultsId);
  const base = store.reportBase(wave, snapshot, themes);
  const report = validateSynthesis(scenarioAAnalysis, base, survey);
  await store.writeAnalysis(scenarioAResultsId, 0, {
    automatic: "complete", themes, base,
    draft: { ...report, instantania_id: base.instantania_id, model: "groq-simulat", instruccions: analysisVersions.instruccions },
  });

  const examples = [
    ["aprovada", "Acollida de noves incorporacions", "Logística", "Magatzem de demo"],
    ["publicant", "Accés a les eines internes", "Oficines", "Oficina de demo"],
    ["reconciliar", "Coordinació de visites", "Comercial", "Zona comercial de demo"],
    ["recollida", "Relleu i informació de torn", "Planta", "Planta de demo"],
  ];
  for (const [state, titol, sector, ubicacio] of examples) {
    const objectiu = `Entendre què es pot millorar en el procés de ${titol.toLocaleLowerCase("ca")}.`;
    const exampleSurvey = {
      ...survey, titol,
      introduccio: `${objectiu} Les respostes es pseudonimitzen i es poden vincular entre onades de la mateixa sèrie.`,
      adaptacions: [],
      preguntes: survey.preguntes.slice(0, 3).map((q, i) => ({
        ...q,
        text: ["Tinc clar com funciona el procés.", "Sé on demanar ajuda si tinc un dubte.", "El procés m’ha resultat fàcil de seguir."][i],
        de_referencia: false,
        tipus: "escala_1_5",
        opcions: survey.preguntes[0].opcions,
        que_mesura: ["Comprensió del procés", "Coneixement del suport", "Facilitat del procés"][i],
        quina_decisio_informa: "Valorar si cal reforçar les instruccions o el suport.",
      })),
    };
    const id = `escenari-a-${state}`;
    await store.createWave({ titol, objectiu, sector, ubicacio, torn: "Tots dos", dies: 7 }, { id, survey: exampleSurvey });
    await store.approve(id, 1);
    if (state === "aprovada") continue;
    await store.startPublish(id);
    if (state === "recollida") await store.finishPublish(id, `local-${id}`, null);
    if (state === "reconciliar")
      await store.db.prepare("UPDATE waves SET state='uncertain' WHERE id=?").run(id);
  }
}
