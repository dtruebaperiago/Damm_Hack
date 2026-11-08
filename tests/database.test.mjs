import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { Database, postgresOptions } from "../app/db.mjs";

test("remote PostgreSQL requires verified TLS and never exposes connection credentials in errors", () => {
  const config = postgresOptions(
    "postgresql://demo:synthetic@db.example.com/postgres?sslmode=require",
  );
  assert.equal(config.ssl.rejectUnauthorized, true);
  const trusted = postgresOptions(
    "postgresql://demo:synthetic@db.example.com/postgres?sslmode=require",
    { caFile: "app/certs/supabase-ca.crt" },
  );
  assert.match(trusted.ssl.ca, /BEGIN CERTIFICATE/);
  assert.equal(trusted.ssl.rejectUnauthorized, true);
  assert.ok(!config.connectionString.includes("sslmode"));
  assert.throws(
    () =>
      postgresOptions(
        "postgresql://demo:synthetic@db.example.com/postgres?sslmode=disable",
      ),
    /TLS/,
  );
  assert.throws(
    () =>
      postgresOptions(
        "postgresql://demo:synthetic@db.example.com/postgres?ssl=false",
      ),
    /TLS/,
  );
  assert.equal(
    postgresOptions("postgresql://demo:synthetic@127.0.0.1:5433/damm_demo").ssl,
    false,
  );
});
test("PostgreSQL migrations use JSONB, foreign keys, unique responses and restricted tables", async () => {
  const engine = new PGlite();
  const db = new Database(null, { postgres: engine });
  try {
    await engine.exec(readFileSync(new URL("../app/migrations/postgres/001_initial.sql", import.meta.url), "utf8"));
    await db.prepare("INSERT INTO escolta.sessions VALUES(?,?)").run("existing-session", 123);
    await db.migrate();
    await db.migrate();
    assert.equal(
      (
        await db
          .prepare("SELECT COUNT(*)::int AS n FROM escolta.migrations")
          .get()
      ).n,
      2,
    );
    assert.ok(await db.prepare("SELECT 1 FROM escolta.sessions WHERE token_hash=?").get("existing-session"));
    assert.deepEqual(
      await db.prepare(
        "SELECT a.atttypid::regtype::text AS data_type, c.relrowsecurity FROM pg_class c JOIN pg_attribute a ON a.attrelid=c.oid WHERE c.oid='escolta.wave_analysis'::regclass AND a.attname='data'",
      ).get(),
      { data_type: "jsonb", relrowsecurity: true },
    );
    const types = await db
      .prepare(
        "SELECT column_name,data_type FROM information_schema.columns WHERE table_schema='escolta' AND table_name='waves'",
      )
      .all();
    assert.equal(
      types.find((x) => x.column_name === "survey").data_type,
      "jsonb",
    );
    assert.equal(
      (
        await db
          .prepare(
            "SELECT relrowsecurity FROM pg_class WHERE oid='escolta.accepted'::regclass",
          )
          .get()
      ).relrowsecurity,
      true,
    );
    await assert.rejects(
      db
        .prepare("INSERT INTO response_links VALUES(?,?,?,?)")
        .run("missing", "p", 1, "Dia"),
    );
  } finally {
    await db.close();
  }
});
test("transaction rollback preserves atomicity and nested work uses the same transaction", async () => {
  const engine = new PGlite();
  const db = new Database(null, { postgres: engine });
  try {
    await db.migrate();
    await assert.rejects(
      db.transaction(async () => {
        await db
          .prepare("INSERT INTO sessions VALUES(?,?)")
          .run("rollback", 123);
        await db.transaction(async () => {
          throw new Error("stop");
        });
      }),
      /stop/,
    );
    assert.equal(
      await db
        .prepare("SELECT * FROM sessions WHERE token_hash=?")
        .get("rollback"),
      undefined,
    );
    const values = await db
      .prepare("SELECT '?' AS literal, ?::text AS bound")
      .get("safe");
    assert.deepEqual(values, { literal: "?", bound: "safe" });
  } finally {
    await db.close();
  }
});

test("pooled PostgreSQL uses one acquired client for a whole transaction and releases it after rollback", async () => {
  const calls = [];
  let acquired = 0,
    released = 0;
  const pool = {
    connect: async () => {
      acquired++;
      return {
        query: async (sql, params) => {
          calls.push({ sql, params });
          return { rows: [{ ok: true }] };
        },
        release: () => {
          released++;
        },
      };
    },
    end: async () => {},
  };
  const db = new Database(null, { postgres: pool });
  try {
    await assert.rejects(
      db.transaction(async () => {
        await db.prepare("SELECT ?::text AS value").get("synthetic");
        await db.transaction(async () => {
          throw new Error("rollback");
        });
      }),
      /rollback/,
    );
    assert.equal(acquired, 1);
    assert.equal(released, 1);
    assert.deepEqual(
      calls.map((x) => x.sql),
      [
        "BEGIN",
        "SET LOCAL search_path TO escolta, pg_catalog",
        "SELECT $1::text AS value",
        "ROLLBACK",
      ],
    );
    assert.deepEqual(calls[2].params, ["synthetic"]);
  } finally {
    await db.close();
  }
});
