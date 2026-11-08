import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Store } from "../app/store.mjs";
import { seedCampaigns } from "./fixtures.mjs";

test("optional demo seeding is awaited, keeps blank-canvas defaults and publishes cycle metadata", async () => {
  const store = await new Store(":memory:", {
    mode: "demo",
    secret: "synthetic-seed-secret",
  }).init();
  try {
    assert.deepEqual(await store.list(), []);
    assert.equal(
      await seedCampaigns(store, { includeBrowserExample: true }),
      true,
    );
    const list = await store.list();
    assert.equal(list.length, 4);
    assert.equal(list.find((w) => w.id === "torns-inicial").total, 180);
    assert.equal(
      list.find((w) => w.id === "torns-esborrany").has_questions,
      true,
    );
    assert.equal(list.find((w) => w.id === "torns-oberta").state, "published");
    assert.equal(
      list.find((w) => w.id === "torns-prova-e2e").state,
      "published",
    );
    assert.equal(
      await seedCampaigns(store, { includeBrowserExample: true }),
      false,
    );
    assert.equal((await store.list()).length, 4);
    const action = (await store.proposals("torns-inicial"))[0];
    await store.followup("torns-inicial", action.accio_id);
    assert.equal(
      (await store.list()).find((w) => w.id === "torns-inicial").has_followup,
      true,
    );
    const blank = await store.createWave({
      titol: "Consulta buida",
      objectiu: "Entendre",
      decisio: "Millorar",
      context: "Prova",
      sector: "Planta",
      ubicacio: "Planta de demo",
      torn: "Tots dos",
      dies: 7,
    });
    assert.equal(
      (await store.list()).find((w) => w.id === blank.id).has_questions,
      false,
    );
  } finally {
    await store.db.close();
  }
});


import { loadSimulation } from "../app/simulation.mjs";
import { createApplication } from "../app/server.mjs";
import { PGlite } from "@electric-sql/pglite";
test("stage 03 simulation loads six waves asynchronously and preserves existing campaigns", async () => {
  const store = await new Store(":memory:", { mode: "demo", secret: "simulation-test" }).init();
  try {
    await store.createWave({ objectiu: "Consulta existent", sector: "Planta", ubicacio: "Planta de demo", torn: "Tots dos", dies: 7 });
    assert.equal(await loadSimulation(store), 6);
    assert.equal(await loadSimulation(store), 0);
    const waves = await store.list();
    assert.equal(waves.length, 7);
    assert.equal(waves.filter(w => w.source === "simulation" && w.state === "closed").length, 6);
    assert.equal((await store.db.prepare("SELECT COUNT(*) AS n FROM accepted").get()).n, 0);
  } finally { await store.db.close(); }
});
test("PostgreSQL simulation is opt-in and seeds dashboard results, actions and follow-ups without duplicates", async () => {
  const engine = new PGlite();
  const config = { postgres: engine, mode: "connected", secret: "simulation-test",
    adminPassword: "test-password", origin: "http://127.0.0.1:3000" };
  const initial = await createApplication(config);
  try {
    assert.deepEqual(await initial.store.list(), []);
    const existing = await initial.store.createWave({ objectiu: "Existing draft", sector: "Planta",
      ubicacio: "Planta de demo", torn: "Tots dos", dies: 7 });
    const seeded = await createApplication({ ...config, loadSimulation: true });
    const data = JSON.parse(readFileSync(new URL("../stages/03_simulacio/output/demo_web.json", import.meta.url)));
    const list = await seeded.store.list();
    assert.equal(list.length, 7);
    for (const wave of data.onades) {
      const dto = await seeded.store.waveDTO(wave.campanya_id);
      const kpi = data.kpis.find(k => k.campanya_id === wave.campanya_id);
      const next = data.onades.find(w => w.campanya_origen_id === wave.campanya_id);
      assert.equal(dto.source, "simulation");
      assert.equal(dto.state, "closed");
      assert.deepEqual(dto.results.kpi, kpi);
      assert.equal(dto.results.total, kpi.respostes_valides);
      assert.deepEqual(dto.results.comparacions, data.comparacions.filter(c => c.campanya_desti_id === wave.campanya_id));
      assert.equal(dto.followup, next?.campanya_id || null);
      assert.equal(dto.selected_action?.followup || null, next?.campanya_id || null);
      if (next) assert.ok(dto.selected_action.descripcio && dto.selected_action.titol);
      assert.equal(list.find(w => w.id === dto.id).has_followup, !!next);
    }
    const before = await seeded.store.db.prepare("SELECT * FROM waves ORDER BY id").all();
    assert.equal(await loadSimulation(seeded.store), 0);
    const restarted = await createApplication({ ...config, loadSimulation: true });
    assert.deepEqual(await restarted.store.db.prepare("SELECT * FROM waves ORDER BY id").all(), before);
    assert.equal((await restarted.store.wave(existing.id)).state, "draft");
    assert.equal((await restarted.store.db.prepare("SELECT COUNT(*) AS n FROM historical_calibrations").get()).n, 1);
    assert.equal((await restarted.store.db.prepare("SELECT COUNT(*) AS n FROM accepted").get()).n, 0);
  } finally { await initial.store.db.close(); }
});

test("PostgreSQL loader reports six inserts then zero on rerun", async () => {
  const store = await new Store(null, { postgres: new PGlite(), mode: "connected", secret: "simulation-test" }).init();
  try {
    assert.equal(await loadSimulation(store), 6);
    assert.equal(await loadSimulation(store), 0);
    assert.equal((await store.list()).length, 6);
  } finally { await store.db.close(); }
});
