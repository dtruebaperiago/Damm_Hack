import { template, calibrationData } from './fixtures.mjs';
const validateSurvey=(s)=>validate(s,template);
const historical=(p)=>history(p,calibrationData);
import test from "node:test";
import assert from "node:assert/strict";
import {
  validateSurvey as validate,
  normalizeAnswers,
  historical as history,
  aggregate,
  comparable,
  paired,
} from "../app/domain.mjs";
import { toTypeform, fromTypeform } from "../app/providers.mjs";

test("versioned template, reference preservation and fail-closed JSON validation", () => {
  assert.deepEqual(validateSurvey(template), []);
  for (const mutate of [
    (s) => (s.temps_estimat_segons = 120),
    (s) => (s.preguntes[0].text += "!"),
    (s) => (s.preguntes[3].obligatoria = true),
    (s) => (s.preguntes[3].condicio_de_visualitzacio.totes[0].opcions_ids = []),
    (s) => (s.preguntes[1].id = "comprensio"),
    (s) => (s.preguntes[0].opcions[5].id = "0"),
    (s) => (s.adaptacions[0].senyal_id = "inventat"),
  ]) {
    const s = structuredClone(template);
    mutate(s);
    assert.ok(validateSurvey(s).length);
  }
  assert.ok(validateSurvey(null).length);
});
test("exact branch trigger, omissions, not applicable and invalid codes stay distinct", () => {
  const read = (a) => normalizeAnswers(template, a);
  assert.equal(
    read({
      comprensio: "1",
      dificultat_principal: "canvis",
      aclariment_comprensio: "Les instruccions estan disperses.",
    }).aclariment_comprensio.estat,
    "valid",
  );
  assert.equal(
    read({ comprensio: "1", dificultat_principal: "canvis" })
      .aclariment_comprensio.estat,
    "omesa",
  );
  for (const a of [
    { comprensio: "1", dificultat_principal: "no_us" },
    { comprensio: "no_valorable" },
    { comprensio: "2", dificultat_principal: "canvis" },
    {},
  ]) {
    assert.equal(read(a).aclariment_comprensio.estat, "no_mostrada");
  }
  assert.equal(
    read({ comprensio: "no_valorable" }).comprensio.estat,
    "no_valorable",
  );
  assert.equal(read({ comprensio: "8" }).comprensio.estat, "invalida");
  assert.equal(read({
    dificultat_principal: "canvis", aclariment_comprensio: "Les instruccions estan disperses.",
  }).aclariment_comprensio.estat, "desconeguda");
  assert.equal(
    read({
      comprensio: "1",
      dificultat_principal: "canvis",
      aclariment_comprensio: "Parla amb Maria al 600123456",
    }).aclariment_comprensio.estat,
    "descartada_privacitat",
  );
});
test("calibration computes before rounding and limits its scope", () => {
  const h = historical({
    sector: "Planta",
    ubicacio: "Planta de demo",
    torn: "Tots dos",
  });
  assert.equal(h.taxa, 40);
  assert.equal(h.diferencia, 20.6);
  assert.deepEqual(h.referencia, [53, 109, 275, 112, 51]);
  assert.equal(
    historical({ sector: "Planta", ubicacio: "Planta de demo", torn: "Nit" })
      .abast,
    "ampli",
  );
  assert.equal(
    historical({
      sector: "Oficines",
      ubicacio: "Oficina de demo",
      torn: "Tots dos",
    }).abast,
    "insuficient",
  );
});
test("small effective bases and complementary segments are never serialized", () => {
  const rows = Array.from({ length: 53 }, (_, i) => ({
    torn: i < 44 ? "Dia" : "Nit",
    answers: normalizeAnswers(template, {
      comprensio: i % 2 ? "4" : "3",
      suport: "4",
      dificultat_principal: "cap",
    }),
  }));
  const a = aggregate(rows, 600, template);
  assert.equal(a.total, 53);
  assert.ok(a.torns.every((s) => s.n === null));
  const small = aggregate(rows.slice(0, 9), 600, template);
  assert.equal(small.total, null);
  assert.equal(small.metrics.length, 0);
  const sparse = structuredClone(rows);
  sparse[0].answers.comprensio = { estat: "omesa" };
  assert.equal(
    aggregate(sparse, 600, template).metrics.find((m) => m.id === "comprensio")
      .n,
    null,
  );
});
test("comparison requires the entire fixed question contract and audience", () => {
  const a = {
    survey: template,
    public: { sector: "Planta", ubicacio: "Planta de demo", torn: "Tots dos" },
    protocol: "qr-v1",
  };
  assert.ok(comparable(a, a));
  const b = structuredClone(a);
  b.survey.preguntes[0].opcions[0].etiqueta = "Canvi";
  assert.equal(comparable(a, b), false);
});
test("Typeform preserves all labels, stable refs and conjunctive logic; maps returned refs", () => {
  const f = toTypeform(template, "prova");
  assert.equal(f.fields[0].properties.choices.length, 6);
  assert.equal(f.fields[0].properties.randomize, false);
  assert.deepEqual(f.hidden, ["delivery"]);
  for(const rule of f.logic){
    const defaults=rule.actions.filter(a=>a.condition.op==='always');
    assert.ok(defaults.length<=1);
    if(defaults.length)assert.equal(rule.actions.at(-1),defaults[0]);
  }
  const condition=f.logic[2].actions[0].condition;
  const evaluate=(c,answers)=>c.op==='and'?c.vars.every(v=>evaluate(v,answers)):c.op==='or'?c.vars.some(v=>evaluate(v,answers)):answers[c.vars[0].value]===c.vars[1].value;
  assert.ok(evaluate(condition,{comprensio:'comprensio__1',dificultat_principal:'dificultat_principal__canvis'}));
  assert.equal(evaluate(condition,{comprensio:'comprensio__2',dificultat_principal:'dificultat_principal__canvis'}),false);
  assert.equal(evaluate(condition,{comprensio:'comprensio__1',dificultat_principal:'dificultat_principal__no_us'}),false);
  const mapped = fromTypeform(
    {
      answers: [
        {
          field: { ref: "comprensio" },
          type: "choice",
          choice: { ref: "comprensio__no_valorable" },
        },
      ],
    },
    template,
  );
  assert.equal(mapped.comprensio, "no_valorable");
});
test("JSON property order does not change a fixed question; paired bases exclude missing waves", () => {
  const reordered = structuredClone(template);
  reordered.preguntes[0] = Object.fromEntries(
    Object.entries(reordered.preguntes[0]).reverse(),
  );
  assert.deepEqual(validateSurvey(reordered), []);
  const config = {
    survey: template,
    public: { sector: "Planta" },
    protocol: "qr-v1",
  };
  const rowsA = Array.from({ length: 40 }, (_, i) => ({
    participant: "p" + i,
    answers: normalizeAnswers(template, { comprensio: "1", suport: "2" }),
  }));
  const rowsB = Array.from({ length: 20 }, (_, i) => ({
    participant: i < 10 ? "p" + i : "new" + i,
    answers: normalizeAnswers(template, { comprensio: "4", suport: "4" }),
  }));
  const comparison = paired(config, config, rowsA, rowsB);
  assert.equal(comparison.metrics[0].n, 10);
  assert.equal(comparison.metrics[0].delta, 3);
  assert.equal(comparison.metrics[0].perdues, 30);
  assert.equal(
    paired(config, config, rowsA, rowsB.slice(1)).metrics[0].n,
    null,
  );
});
test("branch denominators cannot reveal a small complement of an antecedent", () => {
  const rows = Array.from({ length: 30 }, (_, i) => ({
    torn: "Dia",
    answers: normalizeAnswers(template, {
      comprensio: "1",
      suport: "4",
      dificultat_principal: i < 25 ? "canvis" : "cap",
      aclariment_comprensio: "Les instruccions estan disperses.",
    }),
  }));
  const data = aggregate(rows, 600, template);
  assert.equal(data.branca, null);
  assert.equal(data.textos, null);
  assert.deepEqual(data.temes, []);
});
