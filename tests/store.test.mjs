import test from "node:test";
import assert from "node:assert/strict";
import { Store } from "../app/store.mjs";
import { template } from "../app/domain.mjs";
import { mkdirSync } from "node:fs";
import { randomUUID } from "node:crypto";

const create = () =>
  new Store(":memory:", { secret: "test-secret-long-enough", mode: "demo" });
test('changing the audience replaces eligibility and keeps the matching denominator',()=>{
  const s=create();
  const w=s.createWave({titol:'Torns',objectiu:'Entendre',decisio:'Reforçar',context:'Torns',sector:'Planta',ubicacio:'Planta de demo',torn:'Tots dos',dies:7});
  const edited=s.edit(w.id,1,template,{titol:'Torns',objectiu:'Entendre',decisio:'Reforçar',context:'Torns',sector:'Oficines',ubicacio:'Oficina de demo',torn:'Dia',dies:7});
  assert.equal(edited.config.population,72);
  s.approve(w.id,2);s.startPublish(w.id);s.finishPublish(w.id,'f-eligibility',null);
  assert.throws(()=>s.delivery(w.id,'DEMO-0300'));
  assert.ok(s.delivery(w.id,'DEMO-0001'));s.db.close();
});
test("authorization, delivery expiry and transactional uniqueness across simultaneous sessions/imports", async () => {
  const s = create();
  const w = s.createWave({
    titol: "Prova de torns",
    objectiu: "Entendre el canvi",
    decisio: "Millorar la comunicació",
    context: "Canvi de torns",
    sector: "Planta",
    ubicacio: "Planta de demo",
    torn: "Tots dos",
    dies: 7,
  });
  assert.throws(() => s.startPublish(w.id), /aprov/);
  s.approve(w.id, 1);
  s.startPublish(w.id);
  s.finishPublish(w.id, "local-" + w.id, null);
  assert.throws(() => s.delivery(w.id, "arbitrari"));
  const a = s.delivery(w.id, " DEMO-0001 "),
    b = s.delivery(w.id, "DEMO-0001");
  assert.throws(() => s.accept(w.id, a + "x", "bad", {}, "local"));
  s.db
    .prepare("UPDATE deliveries SET expires_at=0 WHERE token_hash=?")
    .run(s.hash(b));
  assert.throws(() => s.accept(w.id, b, "expired", {}, "local"));
  const c = s.delivery(w.id, "DEMO-0001");
  const results = await Promise.allSettled([
    Promise.resolve().then(() =>
      s.accept(w.id, a, "r1", { comprensio: "1" }, "local"),
    ),
    Promise.resolve().then(() =>
      s.accept(w.id, c, "r2", { comprensio: "5" }, "local"),
    ),
  ]);
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  assert.equal(s.rows(w.id).length, 1);
  assert.throws(() => s.accept(w.id, a, "r1", {}, "local"));
  assert.equal(s.rows(w.id)[0].answers.comprensio.value, "1");
  assert.ok(
    !JSON.stringify(s.waveDTO(w.id)).includes(
      s.pseudonym(w.cycle, "DEMO-0001"),
    ),
  );
  assert.ok(!JSON.stringify(s.waveDTO(w.id)).includes("DEMO-0001"));
  s.db.close();
});
test("edits revoke approval, stale versions fail, published revision cannot change", () => {
  const s = create();
  const w = s.createWave({
    titol: "Torns",
    objectiu: "Entendre",
    decisio: "Reforçar",
    context: "Torns",
    sector: "Planta",
    ubicacio: "Planta de demo",
    torn: "Tots dos",
    dies: 7,
  });
  s.approve(w.id, 1);
  const changed = structuredClone(template);
  changed.titol = "Consulta revisada";
  s.edit(w.id, 1, changed);
  assert.equal(s.wave(w.id).state, "draft");
  assert.throws(() => s.approve(w.id, 1));
  s.approve(w.id, 2);
  s.startPublish(w.id);
  s.finishPublish(w.id, "f1", "https://form.typeform.com/to/f1");
  assert.throws(() => s.edit(w.id, 2, changed));
  assert.equal(s.startPublish(w.id).form_id, "f1");
  s.db.close();
});
test("immutable closing snapshot, idempotent follow-up and protected paired base", () => {
  const s = create();
  s.seed();
  const w = s.wave("torns-inicial");
  assert.equal(w.state, "closed");
  const r = s.results(w.id);
  assert.equal(r.total, 180);
  assert.ok(r.temes.length);
  const p = s.proposals(w.id);
  assert.ok(p.length);
  const child = s.followup(w.id, p[0].accio_id);
  assert.equal(s.followup(w.id, p[0].accio_id).id, child.id);
  assert.deepEqual(child.survey.preguntes[0], w.survey.preguntes[0]);
  assert.equal(child.cycle, w.cycle);
  assert.deepEqual(child.config.public, w.config.public);
  assert.throws(() => s.accept(w.id, "fake", "x", {}, "local"));
  assert.equal(s.results(w.id).total, 180);
  s.db.close();
});
test("source complements, rate limiting and restart persistence", () => {
  mkdirSync("test-results", { recursive: true });
  const path = `test-results/persistence-${randomUUID()}.sqlite`;
  const config = { secret: "test-secret-long-enough", mode: "demo" };
  let s = new Store(path, config);
  const w = s.createWave({
    titol: "Torns",
    objectiu: "Entendre",
    decisio: "Reforçar",
    context: "Torns",
    sector: "Planta",
    ubicacio: "Planta de demo",
    torn: "Tots dos",
    dies: 7,
  });
  s.approve(w.id, 1);
  s.startPublish(w.id);
  s.finishPublish(w.id, "test-sources", null);
  for (let i = 1; i <= 29; i++)
    s.accept(
      w.id,
      s.delivery(w.id, `DEMO-${String(i).padStart(4, "0")}`),
      "r" + i,
      { comprensio: "4", suport: "4", dificultat_principal: "cap" },
      i <= 20 ? "fixture" : "local",
    );
  s.close(w.id);
  assert.ok(s.results(w.id).origens.every((o) => o.n === null));
  for (let i = 0; i < 10; i++) s.rateLimit("test-ip");
  assert.throws(() => s.rateLimit("test-ip"), /Massa intents/);
  s.db.close();
  s = new Store(path, config);
  assert.equal(s.results(w.id).total, 29);
  assert.equal(s.rows(w.id).length, 29);
  s.db.close();
});
