import { readFileSync } from "node:fs";
import { catalog } from "./domain.mjs";

function readSimulation(path) {
  return JSON.parse(readFileSync(new URL(`../stages/03_simulacio/${path}`, import.meta.url), "utf8"));
}

export async function loadSimulation(store) {
  const { onades, kpis, comparacions } = readSimulation("output/demo_web.json");
  const { poblacio, resum } = readSimulation("output/calibracio_resum.json");
  const survey = readSimulation("consulta.json");
  const audience = { sector: poblacio.sector, ubicacio: "Planta de demo", torn: poblacio.torn };
  const action = catalog.find(({ id }) => id === "instruccions");
  const insertWave = store.db.prepare(
    `INSERT INTO waves(id,parent_id,cycle,state,config,survey,source,snapshot,selected_action,created_at)
     VALUES(?,?,?,'closed',?,?,'simulation',?,?,?) ON CONFLICT(id) DO NOTHING RETURNING id`,
  );

  return store.tx(async () => {
    await store.db.prepare("INSERT INTO historical_calibrations VALUES(?,?) ON CONFLICT DO NOTHING").run(
      "setembre-2026",
      JSON.stringify({
        ...audience,
        population: poblacio.poblacio_elegible,
        referencia: resum.distribucions.referencia.recomptes_1_a_5,
        voluntaria: resum.distribucions.voluntaria.recomptes_1_a_5,
        periode: resum.periode,
        pregunta: resum.pregunta,
        origen: resum.origen,
      }),
    );
    let inserted = 0;
    for (const wave of onades) {
      const id = wave.campanya_id;
      const kpi = kpis.find((row) => row.campanya_id === id);
      const next = onades.find((row) => row.campanya_origen_id === id);
      const opens = Date.parse(wave.periode_inici);
      const closes = Date.parse(wave.periode_fi + "T23:59:59Z");
      const scenario = wave.escenari === "millora" ? "Millora simulada" : "Escenari estable";
      const stage = wave.onada === 1 ? "Consulta inicial" : `Seguiment ${wave.onada - 1}`;
      const config = {
        titol: `Canvi de torns · ${scenario} · ${stage}`,
        objectiu: "Entendre com es viu el pas de torns fixos a rotació Dia/Nit.",
        decisio: "Valorar si cal reforçar les instruccions i el canal d’ajuda.",
        context: wave.escenari === "millora"
          ? "La simulació assumeix un efecte progressiu de l’acció sobre comprensió i suport."
          : "La simulació fixa a zero l’efecte de l’acció. Les mostres poden variar entre onades.",
        public: audience,
        dies: 7,
        exclusions: "Dades que identifiquin persones",
        protocol: wave.protocol_id,
        population: wave.poblacio_elegible,
        opens,
        closes,
      };
      const evidence = kpi.dificultat_funcionament_n === null ? [] : [{
        id: "dificultat_funcionament",
        text: "Entendre el funcionament és la dificultat principal declarada",
        n: kpi.dificultat_funcionament_n,
        base: kpi.dificultat_funcionament_base,
      }];
      const snapshot = {
        total: kpi.respostes_valides,
        taxa: kpi.participacio_aparent_pct,
        population: config.population,
        historic: await store.calibration(audience),
        evidence,
        kpi,
        comparacions: comparacions.filter((row) => row.campanya_desti_id === id),
      };
      const questions = wave.onada === 1 ? survey.preguntes : [...survey.preguntes, {
        id: "arribada_resum",
        text: "T’ha arribat el resum sobre el nou sistema de torns?",
        que_mesura: "Arribada del resum",
        quina_decisio_informa: "Valorar si cal reforçar la difusió",
        tipus: "seleccio_unica",
        opcions: [
          { id: "si", etiqueta: "Sí" },
          { id: "no", etiqueta: "No" },
          { id: "no_ho_se", etiqueta: "No ho sé" },
        ],
        obligatoria: false,
        de_referencia: false,
        condicio_de_visualitzacio: null,
      }];
      inserted += Number(Boolean(await insertWave.get(
        id, wave.campanya_origen_id || null, wave.serie_id, JSON.stringify(config),
        JSON.stringify({ ...survey, preguntes: questions }), JSON.stringify(snapshot),
        next ? JSON.stringify({ ...action, descripcio: next.accio, evidence, followup: next.campanya_id }) : null,
        opens,
      )));
    }
    return inserted;
  });
}
