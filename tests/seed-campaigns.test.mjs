import test from "node:test";
import assert from "node:assert/strict";
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
test("PostgreSQL startup never loads simulation even when requested in config", async () => {
  const { store } = await createApplication({ postgres: new PGlite(), mode: "demo", loadSimulation: true,
    secret: "simulation-test", adminPassword: "test-password", origin: "http://127.0.0.1:3000" });
  try { assert.deepEqual(await store.list(), []); }
  finally { await store.db.close(); }
});
