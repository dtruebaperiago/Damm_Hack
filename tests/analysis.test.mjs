import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { decodeJSON } from "../app/db.mjs";
import { createApplication } from "../app/server.mjs";
import { makeReportBase } from "../app/analysis.mjs";
import { seedCampaigns, template } from "./fixtures.mjs";

test("analysis evaluates the published rule on exact counts and respects suppression", () => {
  const w = {
    id: "torns", version: 1, survey: template,
    config: { public: { sector: "Planta" }, opens: 0, closes: 86400000 },
  };
  function state(n, base, published) {
    return makeReportBase(w, {
      metrics: [{ id: "comprensio", n: base, favorables: n, favorable: published, distribution: null }],
      torns: [], total: base,
    }, [], [], value => value).evidencies[0]?.regla.estat;
  }
  assert.equal(state(40, 100, 40), "complerta");
  assert.equal(state(41, 100, 41), "no_complerta");
  assert.equal(state(401, 1002, 40), "no_complerta");
  assert.equal(state(null, null, null), undefined);
});

for (const database of ["SQLite", "PostgreSQL"]) {
  test(`${database}: Typeform responses drive the reviewed report`, async (t) => {
    const origin = "http://127.0.0.1:3913";
    const webhookSecret = "synthetic-typeform-signing-secret";
    const password = "synthetic-people-password";
    const { server, store } = await createApplication({
      dbPath: ":memory:",
      postgres: database === "PostgreSQL" ? new PGlite() : undefined,
      secret: "synthetic-hmac-secret",
      adminPassword: password,
      mode: "connected",
      origin,
      typeformToken: "synthetic-typeform-token",
      typeformWebhookSecret: webhookSecret,
      provider: "groq",
      model: "openai/gpt-oss-120b",
      groqKey: "synthetic-key",
    });
    await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
    t.after(async () => {
      await new Promise(resolve => server.close(resolve));
      await store.db.close();
    });
    const url = `http://127.0.0.1:${server.address().port}`;
    const originalFetch = globalThis.fetch;
    let providerCalls = 0;
    let typeformItems = [];
    t.mock.method(globalThis, "fetch", async (input, options) => {
      if (typeof input === "string" && input.startsWith("https://api.typeform.com/forms/")) {
        return Response.json(input.includes("/responses?") ? { items: typeformItems } : { fields: [] });
      }
      if (input !== "https://api.groq.com/openai/v1/chat/completions")
        return originalFetch(input, options);
      providerCalls++;
      const { messages } = JSON.parse(options.body);
      const payload = JSON.parse(messages[1].content);
      assert.ok(payload.evidencies.some(e => e.id === "metric_comprensio"));
      assert.doesNotMatch(messages[1].content, /private-comment|remote-response|external_id|participant|delivery/);
      const content = {
        troballes: [{
          text: "La proporció favorable s’ha calculat sobre les respostes vàlides.",
          evidencia_ids: ["metric_comprensio"],
          limitacio: "La mostra descriu les persones que han respost.",
        }],
        accions: [],
      };
      return Response.json({ choices: [{ message: { content: JSON.stringify(content) } }] });
    });
    let cookie;
    const request = (path, body) => fetch(url + path, {
      headers: { Origin: origin, "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}) },
      ...(body === undefined ? {} : { method: "POST", body: JSON.stringify(body) }),
    });
    const login = await request("/api/login", { password });
    cookie = login.headers.get("set-cookie").split(";")[0];

    async function collect(n) {
      const w = await store.createWave({
        objectiu: "Entendre el canvi de torns",
        sector: "Planta", ubicacio: "Planta de demo", torn: "Tots dos", dies: 7,
      }, { survey: template });
      const formId = `synthetic-form-${n}`;
      await store.approve(w.id, 1);
      await store.startPublish(w.id);
      await store.finishPublish(w.id, formId, "https://form.typeform.com/to/synthetic");
      const published = await store.wave(w.id);
      typeformItems = [];
      for (let i = 0; i < n; i++) {
        const delivery = await store.browserDelivery(published, `synthetic-browser-${i}`);
        const value = i % 2 ? 4 : 1;
        const body = JSON.stringify({
          event_type: "form_response",
          form_response: {
            form_id: formId, token: `remote-response-${i}`,
            submitted_at: new Date().toISOString(), hidden: { delivery },
            answers: [
              { field: { ref: "comprensio" }, choice: { ref: `comprensio__${value}` } },
              { field: { ref: "suport" }, choice: { ref: `suport__${value}` } },
              { field: { ref: "dificultat_principal" }, choice: { ref: "dificultat_principal__cap" } },
              { field: { ref: "aclariment_comprensio" }, text: "private-comment" },
            ],
          },
        });
        typeformItems.push(JSON.parse(body).form_response);
        if (i !== 0) continue;
        const sig = "sha256=" + createHmac("sha256", webhookSecret).update(body).digest("base64");
        const submit = () => fetch(url + "/api/webhooks/typeform", {
          method: "POST", headers: { "Content-Type": "application/json", "Typeform-Signature": sig }, body,
        });
        assert.equal((await submit()).status, 200);
        assert.equal((await submit()).status, 200);
      }
      const path = "/api/campaigns/" + w.id;
      assert.equal((await request(path + "/import", {})).status, 200);
      assert.equal((await request(path + "/import", {})).status, 200);
      assert.equal((await store.rows(w.id)).length, n);
      assert.equal((await request(path + "/close", {})).status, 200);
      return { id: w.id, path };
    }

    const small = await collect(9);
    assert.equal((await request(small.path + "/proposals", {})).status, 422);
    const wave = await collect(24);
    assert.equal(providerCalls, 0);
    assert.equal((await request(wave.path + "/proposals", {})).status, 200);
    const pending = await (await request(wave.path + "/analysis-review")).json();
    const reportId = pending.base.instantania_id;
    assert.equal(pending.base.evidencies.find(e => e.id === "metric_comprensio").base, 24);
    assert.equal((await (await request(wave.path + "/export")).json()).resultats.informe, null);
    const review = {
      revision: pending.revision, troballes: [pending.draft.troballes[0].id], accions: [],
    };
    assert.equal((await request(wave.path + "/analysis-review", review)).status, 200);
    assert.equal((await request(wave.path + "/analysis-review", review)).status, 409);
    const exported = await (await request(wave.path + "/export")).json();
    assert.equal(exported.resultats.informe.instantania_id, reportId);
    assert.equal(exported.resultats.informe.troballes.length, 1);
    assert.doesNotMatch(JSON.stringify(exported), /private-comment|remote-response|external_id|participant|delivery/);
    assert.equal(providerCalls, 1);

    const { revision, ...state } = await store.analysis(wave.id);
    await store.writeAnalysis(wave.id, revision, { ...state, themeReview: [{ id: "restricted" }] });
    const agedSnapshot = decodeJSON((await store.wave(wave.id)).snapshot);
    agedSnapshot.closed_at = new Date(Date.now() - 31 * 86400000).toISOString();
    await store.db.prepare("UPDATE waves SET snapshot=? WHERE id=?").run(JSON.stringify(agedSnapshot), wave.id);
    await store.cleanup();
    assert.equal((await store.rows(wave.id)).length, 0);
    const retained = await store.analysis(wave.id);
    assert.equal(retained.themeReview, undefined);
    assert.equal(retained.approved.instantania_id, reportId);
  });
}

test("Groq drafts stay private until review, validated actions retain exact evidence in follow-up", async (t) => {
  const origin = "http://127.0.0.1:3912";
  const { server, store } = await createApplication({
    dbPath: ":memory:", secret: "test-secret-long-enough",
    adminPassword: "test-password", origin, mode: "demo",
    provider: "groq", model: "openai/gpt-oss-120b", groqKey: "test-groq-key",
  });
  await seedCampaigns(store);
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  t.after(async () => { await new Promise(resolve => server.close(resolve)); await store.db.close(); });
  const originalFetch = globalThis.fetch;
  let inventedFragment = true;
  let invalidAction = true;
  let providerCalls = 0;
  t.mock.method(globalThis, "fetch", async (url, options) => {
    if (url !== "https://api.groq.com/openai/v1/chat/completions") return originalFetch(url, options);
    providerCalls++;
    const request = JSON.parse(options.body);
    const input = JSON.parse(request.messages[1].content);
    assert.ok(!options.body.includes("test-groq-key"));
    let content;
    if (input.textos) {
      assert.ok(input.textos.every(text => Object.keys(text).length === 2));
      content = { temes: [{
        titol: "Instruccions disperses", definicio: "La informació es consulta en llocs diferents.",
        vincles: input.textos.map(r => ({ resposta_ref: r.resposta_ref,
          fragment_literal: inventedFragment ? "Fragment inventat" : r.text, observacio: "Possible suport." })),
      }] };
    } else if (input.vincles) {
      content = { veredictes: input.vincles.map(v => ({ id: v.id,
        estat: v.text === "Cal un resum de les instruccions a cada torn." ? "indeterminat" : "dona_suport" })) };
    } else {
      assert.equal(request.response_format.type, "json_schema");
      assert.ok(!options.body.includes("Les instruccions estan disperses."));
      assert.ok(!options.body.includes("DEMO-0001"));
      assert.ok(input.evidencies.every(e => !Object.hasOwn(e, "base") && !Object.hasOwn(e, "favorable")));
      const themeId = input.evidencies.find(e => e.tipus === "tema").id;
      content = {
        troballes: invalidAction ? [] : [{ text: "Alguns comentaris descriuen instruccions disperses.", evidencia_ids: [themeId],
          limitacio: "Es tracta dels textos analitzables de la repregunta." }],
        accions: [{
          tipus: "canvi", titol: "Centralitzar les instruccions", evidencia_ids: invalidAction ? [] : [themeId],
          diagnostic_ids: invalidAction ? ["historic_extrems"] : [], rol_suggerit: "Supervisió de Planta",
          primer_pas: "Publicar una guia comuna", quan: "La setmana vinent",
          seguiment: { quan: "Una setmana després", pregunta_adaptable: "Has trobat les instruccions quan les has necessitat?",
            opcions_suggerides: ["Sí", "No", "No les he necessitat"] },
        }],
      };
    }
    return Response.json({ choices: [{ message: { content: JSON.stringify(content) } }] });
  });
  const local = `http://127.0.0.1:${server.address().port}`;
  const path = "/api/campaigns/torns-inicial";
  let cookie;
  function request(endpoint, body) {
    return fetch(local + endpoint, { headers: { Origin: origin, "Content-Type": "application/json",
      ...(cookie ? { Cookie: cookie } : {}) },
      ...(body === undefined ? {} : { method: "POST", body: JSON.stringify(body) }) });
  }
  assert.equal((await request(path + "/theme-review")).status, 401);
  const login = await request("/api/login", { password: "test-password" });
  cookie = login.headers.get("set-cookie").split(";")[0];
  assert.equal((await request(path + "/themes", {})).status, 502);
  inventedFragment = false;
  assert.equal((await request(path + "/themes", {})).status, 200);
  const result = await (await request(path)).json();
  assert.deepEqual(result.results.temes, []);
  const themes = await (await request(path + "/theme-review")).json();
  const candidate = themes.temes[0];
  const select = links => ({ revision: themes.revision,
    temes: [{ id: candidate.id, refs: links.map(v => v.resposta_ref) }] });
  assert.equal((await request(path + "/theme-review", select(candidate.vincles))).status, 422);
  const selected = select(candidate.vincles.filter(v => v.estat === "dona_suport"));
  const saved = await (await request(path + "/theme-review", selected)).json();
  assert.equal(saved.results.temes[0].n, 40);
  assert.ok(!JSON.stringify(saved).includes("fragment_literal"));
  assert.equal((await request(path + "/proposals", {})).status, 502);
  invalidAction = false;
  assert.equal((await request(path + "/proposals", {})).status, 200);
  const review = await (await request(path + "/analysis-review")).json();
  assert.deepEqual((await (await request(path)).json()).proposals, []);
  const action = review.draft.accions[0].id;
  assert.equal((await request(path + "/followup", { action })).status, 422);
  const approved = await (await request(path + "/analysis-review", {
    revision: review.revision, troballes: [review.draft.troballes[0].id], accions: [action],
  })).json();
  assert.equal(approved.results.informe.troballes.length, 1);
  assert.equal(approved.proposals[0].evidencia[0].n, 40);
  const calls = providerCalls;
  const repeat = await (await request(path + "/proposals", {})).json();
  assert.equal(providerCalls, calls);
  assert.deepEqual(repeat.results.informe, approved.results.informe);
  const child = await (await request(path + "/followup", { action })).json();
  const repeatedChild = await (await request(path + "/followup", { action })).json();
  assert.equal(child.created_followup, repeatedChild.created_followup);
  assert.equal(child.selected_action.instantania_id, review.base.instantania_id);
  const followup = await (await request("/api/campaigns/" + child.created_followup)).json();
  assert.deepEqual(followup.survey.preguntes.slice(0, 2), template.preguntes.slice(0, 2));
  assert.equal(followup.survey.preguntes.at(-1).text, approved.proposals[0].seguiment.pregunta_adaptable);
});
