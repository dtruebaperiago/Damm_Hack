import test from "node:test";
import assert from "node:assert/strict";
import { createApplication } from "../app/server.mjs";
test("HTTP authorization, CSRF, participant workflow and privacy boundary", async () => {
  const { server, store } = createApplication({
    dbPath: ":memory:",
    secret: "test-secret-long-enough",
    adminPassword: "synthetic-password",
    mode: "demo",
    origin: "http://127.0.0.1:3999",
  });
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
    store.db.close();
  }
});
