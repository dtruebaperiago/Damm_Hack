import { DatabaseSync } from "node:sqlite";
import { AsyncLocalStorage } from "node:async_hooks";
import { readFileSync, readdirSync } from "node:fs";
import pg from "pg";

export const decodeJSON = (value) =>
  typeof value === "string" ? JSON.parse(value) : value;
export function postgresOptions(connectionString, { caFile } = {}) {
  let url;
  try {
    url = new URL(connectionString);
  } catch {
    throw new Error("DATABASE_URL no és una connexió PostgreSQL vàlida.");
  }
  if (!["postgres:", "postgresql:"].includes(url.protocol))
    throw new Error("DATABASE_URL ha de ser PostgreSQL.");
  const local = ["127.0.0.1", "localhost", "[::1]"].includes(url.hostname);
  const sslmode = url.searchParams.get("sslmode");
  if (
    !local &&
    sslmode &&
    !["require", "verify-full", "verify-ca"].includes(sslmode)
  )
    throw new Error("La connexió remota exigeix TLS verificat.");
  if (
    url.searchParams.has("uselibpqcompat") ||
    (!local && url.searchParams.get("ssl") === "false")
  )
    throw new Error("No es permet desactivar la verificació TLS.");
  for (const key of ["ssl", "sslmode", "sslcert", "sslkey", "sslrootcert"])
    url.searchParams.delete(key);
  return {
    connectionString: url.href,
    ssl: local
      ? false
      : {
          rejectUnauthorized: true,
          ...(caFile ? { ca: readFileSync(caFile, "utf8") } : {}),
        },
    max: 5,
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000,
    statement_timeout: 15000,
    types: {
      getTypeParser: (oid, format) =>
        oid === 20 ? Number : pg.types.getTypeParser(oid, format),
    },
  };
}
// SQL is internal and parameter values are always supplied separately.
function placeholders(sql) {
  let index = 0;
  return sql.replace(/'(?:''|[^'])*'|"(?:""|[^"])*"|\?/g, (token) =>
    token === "?" ? "$" + ++index : token,
  );
}
export class Database {
  context = new AsyncLocalStorage();
  pending = Promise.resolve();
  constructor(path, { databaseUrl, databaseCA, postgres } = {}) {
    this.postgres = !!(databaseUrl || postgres);
    if (postgres) this.pool = postgres;
    else if (databaseUrl) {
      this.pool = new pg.Pool(
        postgresOptions(databaseUrl, { caFile: databaseCA }),
      );
      this.pool.on("error", () =>
        console.error("S’ha interromput una connexió PostgreSQL inactiva."),
      );
    } else {
      this.sqlite = new DatabaseSync(path);
      this.sqlite.exec("PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;");
    }
  }
  async migrate() {
    await this.transaction(async () => {
      if (!this.postgres) {
        await this.exec(
          readFileSync(
            new URL("./migrations/001_initial.sql", import.meta.url),
            "utf8",
          ),
        );
        return;
      }
      if (this.pool?.connect)
        await this.query("SELECT pg_advisory_xact_lock(62417391)");
      await this.exec(
        "CREATE SCHEMA IF NOT EXISTS escolta; REVOKE ALL ON SCHEMA escolta FROM PUBLIC; SET search_path TO escolta, pg_catalog; CREATE TABLE IF NOT EXISTS migrations(version INTEGER PRIMARY KEY)",
      );
      const directory = new URL("./migrations/postgres/", import.meta.url);
      const files = readdirSync(directory)
        .filter((name) => /^\d+_.*\.sql$/.test(name))
        .sort();
      for (const name of files) {
        const version = Number(name.split("_")[0]);
        if (
          await this.prepare("SELECT 1 FROM migrations WHERE version=?").get(
            version,
          )
        )
          continue;
        await this.exec(readFileSync(new URL(name, directory), "utf8"));
        await this.prepare(
          "INSERT INTO migrations VALUES(?) ON CONFLICT DO NOTHING",
        ).run(version);
      }
    });
  }
  single(fn) {
    if (this.context.getStore()) return fn();
    const work = this.pending.then(fn);
    this.pending = work.catch(() => {});
    return work;
  }
  async query(sql, params = []) {
    if (!this.postgres)
      return this.single(() => ({
        rows: this.sqlite.prepare(sql).all(...params),
      }));
    const current = this.context.getStore();
    if (current) return current.query(placeholders(sql), params);
    if (!this.pool.connect) return this.pool.query(placeholders(sql), params);
    const client = await this.pool.connect();
    try {
      await client.query("SET search_path TO escolta, pg_catalog");
      return await client.query(placeholders(sql), params);
    } finally {
      client.release();
    }
  }
  prepare(sql) {
    return {
      get: async (...args) => (await this.query(sql, args)).rows[0],
      all: async (...args) => (await this.query(sql, args)).rows,
      run: async (...args) =>
        this.postgres
          ? this.query(sql, args)
          : this.single(() => this.sqlite.prepare(sql).run(...args)),
    };
  }
  async exec(sql) {
    const client = this.context.getStore();
    if (!this.postgres) return this.sqlite.exec(sql);
    return client?.exec
      ? client.exec(sql)
      : client
        ? client.query(sql)
        : this.pool.exec
          ? this.pool.exec(sql)
          : this.pool.query(sql);
  }
  async transaction(fn) {
    if (this.context.getStore()) return fn();
    if (this.pool?.connect) {
      const client = await this.pool.connect();
      try {
        await client.query("BEGIN");
        await client.query("SET LOCAL search_path TO escolta, pg_catalog");
        const value = await this.context.run(client, fn);
        await client.query("COMMIT");
        return value;
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    }
    // SQLite and embedded PostgreSQL have a single connection; serialize transactions.
    const work = this.pending.then(async () => {
      if (this.pool)
        return this.pool.transaction((client) => this.context.run(client, fn));
      this.sqlite.exec("BEGIN IMMEDIATE");
      try {
        const value = await this.context.run(this.sqlite, fn);
        this.sqlite.exec("COMMIT");
        return value;
      } catch (error) {
        this.sqlite.exec("ROLLBACK");
        throw error;
      }
    });
    this.pending = work.catch(() => {});
    return work;
  }
  async close() {
    await this.pending;
    if (this.pool?.end) await this.pool.end();
    else if (this.pool) await this.pool.close();
    else this.sqlite.close();
  }
}
