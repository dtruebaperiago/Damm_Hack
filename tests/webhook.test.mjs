import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { createApplication } from "../app/server.mjs";
import { template } from "./fixtures.mjs";
const origin = "http://127.0.0.1:3999",
  secret = "synthetic-typeform-signing-secret";
test("signed Typeform webhook validates raw bytes, authorizes delivery and deduplicates without CSRF bypass elsewhere", async () => {
  const { server, store } = await createApplication({
    dbPath: ":memory:",
    secret: "synthetic-hmac-secret",
    adminPassword: "synthetic-password",
    mode: "connected",
    origin,
    typeformWebhookSecret: secret,
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const base = "http://127.0.0.1:" + server.address().port;
  try {
    const w = await store.createWave(
      {
        titol: "Cas A",
        objectiu: "Entendre",
        decisio: "Millorar",
        context: "Torns",
        sector: "Planta",
        ubicacio: "Planta de demo",
        torn: "Tots dos",
        dies: 7,
      },
      { survey: template },
    );
    await store.approve(w.id, 1);
    await store.startPublish(w.id);
    await store.finishPublish(
      w.id,
      "webhook-form",
      "https://form.typeform.com/to/synthetic",
    );
    const token = await store.delivery(w.id, "DEMO-0001");
    const event = {
      event_type: "form_response",
      form_response: {
        form_id: "webhook-form",
        token: "remote-response-1",
        submitted_at: new Date().toISOString(),
        hidden: { delivery: token },
        answers: [
          { field: { ref: "comprensio" }, choice: { ref: "comprensio__4" } },
        ],
        definition: { fields: [] },
      },
    };
    const raw = JSON.stringify(event);
    const signature =
      "sha256=" + createHmac("sha256", secret).update(raw).digest("base64");
    const post = (body, sig, path = "/api/webhooks/typeform") =>
      fetch(base + path, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Typeform-Signature": sig,
        },
        body,
      });
    assert.equal((await post(raw, "sha256=bad")).status, 403);
    assert.equal((await post(raw + " ", signature)).status, 403);
    assert.equal((await post(raw, signature)).status, 200);
    assert.equal((await post(raw, signature)).status, 200);
    assert.equal((await store.rows(w.id)).length, 1);
    assert.equal((await store.rows(w.id))[0].source, "typeform");
    assert.equal((await store.rows(w.id))[0].answers.comprensio.value, "4");
    assert.equal((await post(raw, signature, "/api/campaigns")).status, 403);
    event.form_response.token = "unauthorized";
    delete event.form_response.hidden.delivery;
    const rejected = JSON.stringify(event);
    assert.equal(
      (
        await post(
          rejected,
          "sha256=" +
            createHmac("sha256", secret).update(rejected).digest("base64"),
        )
      ).status,
      200,
    );
    assert.equal((await store.rows(w.id)).length, 1);
  } finally {
    await new Promise((r) => server.close(r));
    await store.db.close();
  }
});
