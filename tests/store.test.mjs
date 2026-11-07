import test from "node:test";
import assert from "node:assert/strict";
import { Store } from "./fixtures.mjs";
import { template } from "./fixtures.mjs";
import { mkdirSync } from "node:fs";
import { randomUUID } from "node:crypto";

const create = async () =>
  await new Store(":memory:", {
    secret: "test-secret-long-enough",
    mode: "demo",
  }).init();
test("changing the audience replaces eligibility and keeps the matching denominator", async () => {
  const s = await create();
  const w = await s.createWave({
    titol: "Torns",
    objectiu: "Entendre",
    decisio: "Reforçar",
    context: "Torns",
    sector: "Planta",
    ubicacio: "Planta de demo",
    torn: "Tots dos",
    dies: 7,
  });
  const edited = await s.edit(w.id, 1, template, {
    titol: "Torns",
    objectiu: "Entendre",
    decisio: "Reforçar",
    context: "Torns",
    sector: "Oficines",
    ubicacio: "Oficina de demo",
    torn: "Dia",
    dies: 7,
  });
  assert.equal(edited.config.population, 72);
  await s.approve(w.id, 2);
  await s.startPublish(w.id);
  await s.finishPublish(w.id, "f-eligibility", null);
  await assert.rejects(async () => await s.delivery(w.id, "DEMO-0300"));
  assert.ok(await s.delivery(w.id, "DEMO-0001"));
  await s.db.close();
});
test("authorization, delivery expiry and transactional uniqueness across simultaneous sessions/imports", async () => {
  const s = await create();
  const w = await s.createWave({
    titol: "Prova de torns",
    objectiu: "Entendre el canvi",
    decisio: "Millorar la comunicació",
    context: "Canvi de torns",
    sector: "Planta",
    ubicacio: "Planta de demo",
    torn: "Tots dos",
    dies: 7,
  });
  await assert.rejects(async () => await s.startPublish(w.id), /aprov/);
  await s.approve(w.id, 1);
  await s.startPublish(w.id);
  await s.finishPublish(w.id, "local-" + w.id, null);
  await assert.rejects(async () => await s.delivery(w.id, "arbitrari"));
  const a = await s.delivery(w.id, " DEMO-0001 "),
    b = await s.delivery(w.id, "DEMO-0001");
  await assert.rejects(
    async () => await s.accept(w.id, a + "x", "bad", {}, "local"),
  );
  await s.db
    .prepare("UPDATE deliveries SET expires_at=0 WHERE token_hash=?")
    .run(s.hash(b));
  await assert.rejects(
    async () => await s.accept(w.id, b, "expired", {}, "local"),
  );
  const c = await s.delivery(w.id, "DEMO-0001");
  const results = await Promise.allSettled([
    Promise.resolve().then(
      async () => await s.accept(w.id, a, "r1", { comprensio: "1" }, "local"),
    ),
    Promise.resolve().then(
      async () => await s.accept(w.id, c, "r2", { comprensio: "5" }, "local"),
    ),
  ]);
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  assert.equal((await s.rows(w.id)).length, 1);
  await assert.rejects(async () => await s.accept(w.id, a, "r1", {}, "local"));
  assert.equal((await s.rows(w.id))[0].answers.comprensio.value, "1");
  assert.ok(
    !JSON.stringify(await s.waveDTO(w.id)).includes(
      s.pseudonym(w.cycle, "DEMO-0001"),
    ),
  );
  assert.ok(!JSON.stringify(await s.waveDTO(w.id)).includes("DEMO-0001"));
  await s.db.close();
});
test("edits revoke approval, stale versions fail, published revision cannot change", async () => {
  const s = await create();
  const w = await s.createWave({
    titol: "Torns",
    objectiu: "Entendre",
    decisio: "Reforçar",
    context: "Torns",
    sector: "Planta",
    ubicacio: "Planta de demo",
    torn: "Tots dos",
    dies: 7,
  });
  await s.approve(w.id, 1);
  const changed = structuredClone(template);
  changed.titol = "Consulta revisada";
  await s.edit(w.id, 1, changed);
  assert.equal((await s.wave(w.id)).state, "draft");
  await assert.rejects(async () => await s.approve(w.id, 1));
  await s.approve(w.id, 2);
  await s.startPublish(w.id);
  await s.finishPublish(w.id, "f1", "https://form.typeform.com/to/f1");
  await assert.rejects(async () => await s.edit(w.id, 2, changed));
  assert.equal((await s.startPublish(w.id)).form_id, "f1");
  await s.db.close();
});
test("immutable closing snapshot, idempotent follow-up and protected paired base", async () => {
  const s = await create();
  await s.seed();
  const w = await s.wave("torns-inicial");
  assert.equal(w.state, "closed");
  const r = await s.results(w.id);
  assert.equal(r.total, 180);
  assert.ok(r.temes.length);
  const p = await s.proposals(w.id);
  assert.ok(p.length);
  const child = await s.followup(w.id, p[0].accio_id);
  assert.equal((await s.followup(w.id, p[0].accio_id)).id, child.id);
  assert.deepEqual(child.survey.preguntes[0], w.survey.preguntes[0]);
  assert.equal(child.cycle, w.cycle);
  assert.deepEqual(child.config.public, w.config.public);
  await assert.rejects(
    async () => await s.accept(w.id, "fake", "x", {}, "local"),
  );
  assert.equal((await s.results(w.id)).total, 180);
  await s.db.close();
});
test("source complements, rate limiting and restart persistence", async () => {
  mkdirSync("test-results", { recursive: true });
  const path = `test-results/persistence-${randomUUID()}.sqlite`;
  const config = { secret: "test-secret-long-enough", mode: "demo" };
  let s = await new Store(path, config).init();
  const w = await s.createWave({
    titol: "Torns",
    objectiu: "Entendre",
    decisio: "Reforçar",
    context: "Torns",
    sector: "Planta",
    ubicacio: "Planta de demo",
    torn: "Tots dos",
    dies: 7,
  });
  await s.approve(w.id, 1);
  await s.startPublish(w.id);
  await s.finishPublish(w.id, "test-sources", null);
  for (let i = 1; i <= 29; i++)
    await s.accept(
      w.id,
      await s.delivery(w.id, `DEMO-${String(i).padStart(4, "0")}`),
      "r" + i,
      { comprensio: "4", suport: "4", dificultat_principal: "cap" },
      i <= 20 ? "fixture" : "local",
    );
  await s.close(w.id);
  assert.ok((await s.results(w.id)).origens.every((o) => o.n === null));
  for (let i = 0; i < 10; i++) await s.rateLimit("test-ip");
  await assert.rejects(
    async () => await s.rateLimit("test-ip"),
    /Massa intents/,
  );
  await s.db.close();
  s = await new Store(path, config).init();
  assert.equal((await s.results(w.id)).total, 29);
  assert.equal((await s.rows(w.id)).length, 29);
  await s.db.close();
});
