import { readFileSync } from "node:fs";
import { Store as BaseStore } from "../app/store.mjs";
import { safeTexts } from "../app/domain.mjs";
export const template = JSON.parse(
  readFileSync(new URL("./fixtures/survey.json", import.meta.url), "utf8"),
);
export const calibrationData = JSON.parse(
  readFileSync(new URL("./fixtures/calibration.json", import.meta.url), "utf8"),
);
Object.assign(safeTexts, {
  "Les instruccions estan disperses.": ["comunicacio"],
  "Cal un resum de les instruccions a cada torn.": ["comunicacio"],
  "No sé on demanar ajuda.": ["suport"],
  "Cal conèixer els torns amb més antelació.": ["planificacio"],
  "Les instruccions estan disperses i no sé on demanar ajuda.": [
    "comunicacio",
    "suport",
  ],
});
export class Store extends BaseStore {
  async init() {
    await super.init();
    await this.db
      .prepare(
        "INSERT INTO historical_calibrations VALUES(?,?) ON CONFLICT DO NOTHING",
      )
      .run("setembre-2026", JSON.stringify(calibrationData));
    return this;
  }
  async createWave(input, options = {}) {
    return super.createWave(input, { survey: template, ...options });
  }
  async seed() {
    return seedCampaigns(this);
  }
}

export async function seedCampaigns(
  store,
  { includeBrowserExample = false } = {},
) {
  if (await store.db.prepare("SELECT 1 FROM waves LIMIT 1").get()) return false;
  const base = {
    titol: "Nou sistema de torns",
    objectiu: "Entendre com s’està vivint el canvi de torns",
    decisio:
      "Decidir si cal reforçar la comunicació del canvi o el canal d’ajuda",
    context:
      "Planta fictícia de Catalunya. Canvi de torns fixos a rotació Dia/Nit comunicat dues setmanes abans.",
    sector: "Planta",
    ubicacio: "Planta de demo",
    torn: "Tots dos",
    dies: 7,
  };
  const w = await store.createWave(base, {
    id: "torns-inicial",
    cycle: "cicle-demo-torns",
    survey: template,
  });
  await store.approve(w.id, 1);
  await store.startPublish(w.id);
  await store.finishPublish(w.id, "fixture-inicial", null);
  const texts = Object.keys(safeTexts);
  for (let i = 0; i < 180; i++) {
    const index = i < 132 ? i + 1 : 361 + i - 132;
    const token = await store.delivery(
      w.id,
      `DEMO-${String(index).padStart(4, "0")}`,
    );
    const low = i < 60;
    await store.accept(
      w.id,
      token,
      `fixture-${i}`,
      {
        comprensio: low
          ? "1"
          : i < 90
            ? "2"
            : i < 120
              ? "3"
              : i < 150
                ? "4"
                : "5",
        suport: String(1 + Math.floor(i / 36)),
        dificultat_principal: low ? "funcionament" : "cap",
        ...(low
          ? {
              aclariment_comprensio:
                texts[i % 3 === 0 ? 0 : i % 3 === 1 ? 1 : 4],
            }
          : {}),
      },
      "fixture",
    );
  }
  await store.close(w.id);
  await store.createWave(
    { ...base, titol: "Escolta del canvi · nova consulta" },
    { id: "torns-esborrany", survey: template },
  );
  const active = await store.createWave(
    { ...base, titol: "Canvi de torns · consulta oberta" },
    { id: "torns-oberta", survey: template },
  );
  await store.approve(active.id, 1);
  await store.startPublish(active.id);
  await store.finishPublish(active.id, "local-torns-oberta", null);
  if (includeBrowserExample) {
    const example = await store.createWave(
      {
        ...base,
        titol: "Prova E2E · torns",
        objectiu: "Entendre el canvi de torns",
        decisio: "Millorar la comunicació",
        context: "Cas sintètic de torns",
      },
      {
        id: "torns-prova-e2e",
        survey: { ...template, titol: "Consulta E2E revisada" },
      },
    );
    await store.approve(example.id, 1);
    await store.startPublish(example.id);
    await store.finishPublish(example.id, "local-torns-prova-e2e", null);
  }
  return true;
}
