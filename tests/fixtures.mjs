import { readFileSync } from 'node:fs';
import { Store as BaseStore } from '../app/store.mjs';
import { safeTexts } from '../app/domain.mjs';
export const template=JSON.parse(readFileSync(new URL('./fixtures/survey.json',import.meta.url),'utf8'));
export const calibrationData=JSON.parse(readFileSync(new URL('./fixtures/calibration.json',import.meta.url),'utf8'));
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
  constructor(path,config){super(path,config);this.db.prepare('INSERT OR IGNORE INTO historical_calibrations VALUES(?,?)').run('setembre-2026',JSON.stringify(calibrationData));}
  createWave(input,options={}) {return super.createWave(input,{survey:template,...options});}
  seed() {
    if (this.db.prepare("SELECT 1 FROM waves LIMIT 1").get()) return;
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
    const w = this.createWave(base, {
      id: "torns-inicial",
      cycle: "cicle-demo-torns",
    });
    this.approve(w.id, 1);
    this.startPublish(w.id);
    this.finishPublish(w.id, "fixture-inicial", null);
    const texts = Object.keys(safeTexts);
    for (let i = 0; i < 180; i++) {
      const index = i < 132 ? i + 1 : 361 + i - 132;
      const token = this.delivery(
        w.id,
        `DEMO-${String(index).padStart(4, "0")}`,
      );
      const low = i < 60;
      this.accept(
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
    this.close(w.id);
    this.createWave(
      { ...base, titol: "Escolta del canvi · nova consulta" },
      { id: "torns-esborrany" },
    );
    const active = this.createWave(
      { ...base, titol: "Canvi de torns · consulta oberta" },
      { id: "torns-oberta" },
    );
    this.approve(active.id, 1);
    this.startPublish(active.id);
    this.finishPublish(active.id, "local-torns-oberta", null);
  }
}
