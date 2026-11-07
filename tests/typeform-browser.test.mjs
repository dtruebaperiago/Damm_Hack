import assert from "node:assert/strict";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { createApplication } from "../app/server.mjs";
import { template } from "./fixtures.mjs";

for (const backend of ["SQLite", "PostgreSQL"]) test(`${backend}: Typeform links browser responses within one series using temporary delivery references`, async (t) => {
  const origin = "https://escolta.example";
  const { server, store } = await createApplication({
    ...(backend === "PostgreSQL" ? { postgres: new PGlite() } : {}),
    dbPath: ":memory:", mode: "connected", origin,
    secret: "test-only-secret", adminPassword: "test-password", typeformToken: "test-token",
  });
  const remoteResponses = new Map();
  const fetchLocal = globalThis.fetch;
  t.mock.method(globalThis, "fetch", (url, options) => {
    const target = new URL(url);
    if (target.hostname !== "api.typeform.com") return fetchLocal(url, options);
    const [, , form, route] = target.pathname.split("/");
    return Promise.resolve(Response.json(route === "responses"
      ? { items: remoteResponses.get(form) }
      : { fields: [] }));
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await store.db.close();
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  const post = (path, body, cookie = "") => fetchLocal(base + path, {
    method: "POST",
    headers: { Origin: origin, "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify(body),
  });
  const login = await post("/api/login", { password: "test-password" });
  const admin = login.headers.getSetCookie()[0].split(";")[0];
  async function publish(id, cycle, parent = null) {
    await store.createWave({
      titol: id, objectiu: "Escoltar", decisio: "Fer seguiment", context: "Prova",
      sector: "Planta", ubicacio: "Planta de demo", torn: "Tots dos", dies: 7,
    }, { id, cycle, parent, survey: template });
    await store.approve(id, 1);
    await store.startPublish(id);
    await store.finishPublish(id, id, `https://example.typeform.com/to/${id}`);
  }
  async function open(id, series = "") {
    const auth = await post(`/api/participate/${id}/auth`, {}, series);
    assert.equal(auth.status, 200);
    const [persistent, temporary] = auth.headers.getSetCookie();
    assert.match(persistent, /HttpOnly; SameSite=Strict; Max-Age=2592000; Secure/);
    assert.match(temporary, new RegExp(`Path=/go/${id};`));
    const { destination } = await auth.json();
    const redirect = await fetchLocal(base + destination, {
      redirect: "manual",
      headers: { Cookie: temporary.split(";")[0] },
    });
    assert.equal(redirect.status, 303);
    const target = new URL(redirect.headers.get("Location"));
    assert.equal(target.hostname, "example.typeform.com");
    const delivery = new URLSearchParams(target.hash.slice(1)).get("delivery");
    const browser = persistent.split(";")[0];
    assert.ok(delivery && !target.href.includes(browser.split("=")[1]));
    return { browser, delivery };
  }
  const response = (response_id, delivery, timestamp) => ({
    response_id, hidden: { delivery }, submitted_at: new Date(timestamp).toISOString(),
    answers: [{ field: { ref: "comprensio" }, choice: { ref: "comprensio__4" } }],
  });
  await publish("first", "series-one");
  const first = await open("first");
  const submitted = Date.now() - 31 * 60000;
  const wave = await store.wave("first");
  wave.config.opens = submitted - 60000;
  await store.db.prepare("UPDATE waves SET config=? WHERE id='first'").run(JSON.stringify(wave.config));
  await store.db.prepare("UPDATE deliveries SET created_at=?, expires_at=? WHERE wave_id='first'").run(submitted - 60000, submitted + 1000);
  await store.cleanup();
  remoteResponses.set("first", [
    response("valid", first.delivery, submitted),
    response("direct", undefined, submitted),
  ]);
  assert.equal((await post("/api/campaigns/first/import", {}, admin)).status, 200);
  assert.equal((await post("/api/campaigns/first/import", {}, admin)).status, 200);
  assert.equal((await store.rows("first")).length, 1);
  assert.equal((await store.rows("first"))[0].torn, "Desconegut");
  assert.equal((await store.rows("first"))[0].answers.comprensio.value, "4");
  assert.equal((await post("/api/participate/first/auth", {}, first.browser)).status, 409);
  await store.close("first");
  assert.equal((await post("/api/campaigns/first/import", {}, admin)).status, 409);
  await store.cleanup();
  assert.equal((await store.rows("first")).length, 1);

  await publish("followup", "series-one", "first");
  const followup = await open("followup", first.browser);
  const reset = await open("followup");
  assert.equal(followup.browser, first.browser);
  assert.notEqual(followup.delivery, first.delivery);
  remoteResponses.set("followup", [
    response("same-browser", followup.delivery, Date.now()),
    response("cleared-cookie", reset.delivery, Date.now()),
    response("other-wave-token", first.delivery, Date.now()),
  ]);
  assert.equal((await post("/api/campaigns/followup/import", {}, admin)).status, 200);
  const followupRows = await store.rows("followup");
  assert.equal(followupRows.length, 2);
  const firstRows = await store.rows("first");
  assert.equal(followupRows.filter((row) => row.participant === firstRows[0].participant).length, 1);

  await publish("other", "series-two");
  const other = await open("other", first.browser);
  assert.notEqual(other.browser.split("=")[0], first.browser.split("=")[0]);
});
