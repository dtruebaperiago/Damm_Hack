import { Store as FixtureStore, template } from './fixtures.mjs';
import test from "node:test";
import assert from "node:assert/strict";
import { createApplication } from "../app/server.mjs";
test("HTTP authorization, CSRF, participant workflow and privacy boundary", async () => {
  const { server, store } = await createApplication({
    dbPath: ":memory:",
    secret: "test-secret-long-enough",
    adminPassword: "synthetic-password",
    mode: "demo",
    origin: "http://127.0.0.1:3999",
  });
  assert.deepEqual(await store.list(), []);
  const originalCreate = store.createWave;
  store.createWave = FixtureStore.prototype.createWave;
  await FixtureStore.prototype.seed.call(store);
  store.createWave = originalCreate;
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const post = (path, body, cookie = "", origin = "http://127.0.0.1:3999") =>
    fetch(base + path, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: origin,
        Cookie: cookie,
      },
      body: JSON.stringify(body),
    });
  try {
    assert.equal((await fetch(base + "/api/campaigns")).status, 401);
    assert.equal(
      (
        await post(
          "/api/login",
          { password: "synthetic-password" },
          "",
          "https://evil.invalid",
        )
      ).status,
      403,
    );
    const login = await post("/api/login", { password: "synthetic-password" });
    assert.equal(login.status, 200);
    const cookie = login.headers.get("set-cookie").split(";")[0];
    const list = await (
      await fetch(base + "/api/campaigns", { headers: { Cookie: cookie } })
    ).json();
    assert.equal(list.campaigns.length, 3);
    assert.equal(
      (
        await fetch(base + "/api/campaigns/torns-oberta/typeform-qr", {
          headers: { Cookie: cookie },
        })
      ).status,
      409,
    );
    await store.db
      .prepare("UPDATE waves SET form_url=? WHERE id=?")
      .run("https://form.typeform.com/to/synthetic", "torns-oberta");
    const remoteQR = await fetch(
      base + "/api/campaigns/torns-oberta/typeform-qr",
      { headers: { Cookie: cookie } },
    );
    assert.equal(remoteQR.status, 200);
    assert.match(await remoteQR.text(), /<svg/);
    const participant = await post("/api/participate/torns-oberta/auth", {
      credential: "DEMO-0001",
    });
    assert.equal(participant.status, 200);
    const pc = participant.headers.get("set-cookie").split(";")[0];
    assert.equal(
      (
        await post(
          "/api/participate/torns-oberta/submit",
          {
            answers: {
              comprensio: "4",
              suport: "4",
              dificultat_principal: "cap",
            },
          },
          pc,
        )
      ).status,
      200,
    );
    assert.notEqual(
      (await post("/api/participate/torns-oberta/submit", { answers: {} }, pc))
        .status,
      200,
    );
    const detail = await (
      await fetch(base + "/api/campaigns/torns-oberta", {
        headers: { Cookie: cookie },
      })
    ).json();
    assert.equal(detail.results.total, null);
    assert.ok(!JSON.stringify(detail).includes("DEMO-0001"));
    assert.equal(
      (
        await fetch(base + "/api/campaigns/torns-oberta/qr", {
          headers: { Cookie: cookie },
        })
      ).headers.get("content-type"),
      "image/svg+xml",
    );
    assert.equal(
      (await post("/api/campaigns/torns-oberta/close", {}, cookie)).status,
      200,
    );
    assert.equal(
      (
        await post("/api/participate/torns-oberta/auth", {
          credential: "DEMO-0002",
        })
      ).status,
      403,
    );
    assert.equal((await fetch(base + "/.env")).status, 404);
    assert.equal(
      (await fetch(base + "/")).headers.get("x-content-type-options"),
      "nosniff",
    );
  } finally {
    await new Promise((r) => server.close(r));
    await store.db.close();
  }
});

test("generation sends scoped calibration to Groq and keeps it with the draft for review", async (t) => {
  const origin = "http://127.0.0.1:3999";
  const { server, store } = await createApplication({
    dbPath: ":memory:", secret: "synthetic", adminPassword: "synthetic-password",
    mode: "demo", origin, provider: "groq", groqKey: "test-key", model: "test-model",
  });
  const realFetch = globalThis.fetch;
  const requests = [];
  let adaptations = [
    { senyal_id: "historic_participacio", pregunta_id: "dificultat_principal", proposta: "Una sola selecció redueix l’esforç al mòbil." },
    { senyal_id: "moment", pregunta_id: "dificultat_principal", proposta: "Delimitar els darrers set dies dona una referència temporal comuna als torns." },
  ];
  t.mock.method(globalThis, "fetch", async (url, options) => {
    if (url !== "https://api.groq.com/openai/v1/chat/completions")
      return realFetch(url, options);
    const { messages } = JSON.parse(options.body);
    requests.push({ instructions: messages[0].content, input: JSON.parse(messages[1].content) });
    return Response.json({ choices: [{ message: { content: JSON.stringify({
      ...template,
      preguntes: template.preguntes.map(q => ({ ...q, de_referencia: false })),
      adaptacions: adaptations,
    }) } }] });
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const post = (path, body, cookie = "") => realFetch(base + path, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: origin, Cookie: cookie },
    body: JSON.stringify(body),
  });
  try {
    const login = await post("/api/login", { password: "synthetic-password" });
    const cookie = login.headers.get("set-cookie").split(";")[0];
    const need = {
      titol: "Consulta", objectiu: "Entendre el canvi", decisio: "Ajustar la comunicació",
      context: "Canvi de torns", sector: "Planta", ubicacio: "Planta de demo", torn: "Nit", dies: 7,
    };
    const created = await (await post("/api/campaigns", need, cookie)).json();
    const path = `/api/campaigns/${created.id}`;
    const response = await post(path + "/generate", {}, cookie);
    assert.equal(response.status, 200);
    const draft = await response.json();
    const { instructions, input } = requests[0];
    assert.match(instructions, /context del conjunt de la planta/);
    assert.equal(input.public.torn, "Nit");
    assert.deepEqual(input.sondeig, created.diagnostic);
    assert.equal(input.sondeig.length, 2);
    assert.ok(input.sondeig.every(signal => signal.abast === "ampli" && signal.public.torn === "Tots dos"));
    assert.match(input.sondeig[0].observacio, /37,9%.*17,3%.*20,6 punts percentuals/);
    assert.match(input.sondeig[1].observacio, /240 trameses.*600 persones.*40%/);
    assert.equal(draft.state, "draft");
    assert.deepEqual(draft.config.generacio.sondeig, input.sondeig);
    assert.deepEqual(draft.survey.adaptacions, adaptations);

    adaptations[1].pregunta_id = "pregunta_inexistent";
    assert.equal((await post(path + "/generate", {}, cookie)).status, 422);
    adaptations[1].pregunta_id = "dificultat_principal";

    const logistics = { ...need, sector: "Logística", ubicacio: "Magatzem de demo" };
    const changed = await post(path + "/edit", {
      version: draft.version, survey: draft.survey, config: logistics,
    }, cookie);
    assert.equal(changed.status, 200);
    const edited = await changed.json();
    assert.deepEqual(edited.diagnostic, []);
    assert.equal(edited.config.generacio.public.sector, "Planta");
    assert.equal((await post(path + "/generate", {}, cookie)).status, 422);
    assert.deepEqual(requests.at(-1).input.sondeig, []);
    assert.equal((await store.wave(created.id)).version, edited.version);

    adaptations = [];
    const regenerated = await post(path + "/generate", {}, cookie);
    assert.equal(regenerated.status, 200);
    assert.deepEqual((await regenerated.json()).config.generacio.sondeig, []);
  } finally {
    await new Promise(resolve => server.close(resolve));
    await store.db.close();
  }
});
