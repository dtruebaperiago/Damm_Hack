import test from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { Store } from "../app/store.mjs";
import { template } from "./fixtures.mjs";
const need = {
  titol: "Prova PostgreSQL",
  objectiu: "Entendre el canvi",
  decisio: "Millorar",
  context: "Cas sintètic A",
  sector: "Planta",
  ubicacio: "Planta de demo",
  torn: "Tots dos",
  dies: 7,
};
test("PostgreSQL store: empty draft, JSONB edits, concurrent versions, unique answers and immutable results", async () => {
  const engine = new PGlite();
  const s = await new Store(null, {
    postgres: engine,
    secret: "synthetic-long-secret",
    mode: "demo",
  }).init();
  try {
    assert.deepEqual(await s.list(), []);
    const w = await s.createWave(need);
    assert.deepEqual(w.survey.preguntes, []);
    await assert.rejects(s.approve(w.id, 1));
    await s.edit(w.id, 1, template);
    await s.approve(w.id, 2);
    const edited = structuredClone(template);
    edited.titol = "Versió nova";
    const race = await Promise.allSettled([
      s.edit(w.id, 2, edited),
      s.edit(w.id, 2, edited),
    ]);
    assert.equal(race.filter((x) => x.status === "fulfilled").length, 1);
    assert.equal((await s.wave(w.id)).state, "draft");
    await s.approve(w.id, 3);
    const publications = await Promise.allSettled([
      s.startPublish(w.id),
      s.startPublish(w.id),
    ]);
    assert.equal(
      publications.filter((x) => x.status === "fulfilled").length,
      1,
    );
    await s.finishPublish(
      w.id,
      "pg-form",
      "https://form.typeform.com/to/synthetic",
    );
    for (let i = 0; i < 20; i++) {
      const credential =
        "DEMO-" + String(i < 10 ? i + 1 : 361 + i - 10).padStart(4, "0");
      const token = await s.delivery(w.id, credential);
      await s.accept(
        w.id,
        token,
        "pg-response-" + i,
        { comprensio: "4", suport: "4", dificultat_principal: "cap" },
        "typeform",
      );
      await assert.rejects(
        s.accept(w.id, token, "pg-response-" + i, {}, "typeform"),
      );
    }
    assert.equal((await s.rows(w.id)).length, 20);
    const snapshot = await s.close(w.id);
    assert.equal(snapshot.total, 20);
    assert.deepEqual(await s.close(w.id), snapshot);
    assert.deepEqual((await s.waveDTO(w.id)).results, snapshot);
    await assert.rejects(s.delivery(w.id, "DEMO-0001"));
    await s.saveProposals(w.id, {
      propostes: [
        {
          accio_id: "instruccions",
          evidencia_ids: [snapshot.evidence[0].id],
          motiu: "Proposta sintètica amb evidència.",
        },
      ],
    });
    const followups = await Promise.all([
      s.followup(w.id, "instruccions"),
      s.followup(w.id, "instruccions"),
    ]);
    assert.equal(followups[0].id, followups[1].id);
    // JSONB can reorder object keys; audience equality must compare values.
    await s.edit(followups[0].id, 1, followups[0].survey, {
      ...need,
      titol: followups[0].config.titol,
    });
    const other = await new Store(null, {
      postgres: engine,
      secret: "synthetic-long-secret",
      mode: "demo",
    }).init();
    assert.equal((await other.results(w.id)).total, 20);
  } finally {
    await s.db.close();
  }
});

import { createApplication } from "../app/server.mjs";
test("two server instances share PostgreSQL sessions and campaigns without exposing connection secrets", async () => {
  const engine = new PGlite();
  const config = {
    postgres: engine,
    secret: "shared-synthetic-hmac-secret",
    adminPassword: "shared-synthetic-password",
    mode: "demo",
    origin: "http://127.0.0.1:3999",
  };
  const a = await createApplication(config),
    b = await createApplication(config);
  await Promise.all([
    new Promise((r) => a.server.listen(0, "127.0.0.1", r)),
    new Promise((r) => b.server.listen(0, "127.0.0.1", r)),
  ]);
  const base = (s) => "http://127.0.0.1:" + s.server.address().port;
  try {
    const login = await fetch(base(a) + "/api/login", {
      method: "POST",
      headers: { Origin: config.origin, "Content-Type": "application/json" },
      body: JSON.stringify({ password: config.adminPassword }),
    });
    assert.equal(login.status, 200);
    const cookie = login.headers.get("set-cookie").split(";")[0];
    const session = await fetch(base(b) + "/api/session", {
      headers: { Cookie: cookie },
    });
    assert.equal((await session.json()).authenticated, true);
    const campaign = await fetch(base(a) + "/api/campaigns", {
      method: "POST",
      headers: {
        Origin: config.origin,
        "Content-Type": "application/json",
        Cookie: cookie,
      },
      body: JSON.stringify(need),
    });
    assert.equal(campaign.status, 201);
    const list = await fetch(base(b) + "/api/campaigns", {
      headers: { Cookie: cookie },
    });
    const text = await list.text();
    assert.equal(JSON.parse(text).campaigns.length, 1);
    assert.ok(!text.includes(config.secret));
  } finally {
    await Promise.all([
      new Promise((r) => a.server.close(r)),
      new Promise((r) => b.server.close(r)),
    ]);
    await a.store.db.close();
  }
});
