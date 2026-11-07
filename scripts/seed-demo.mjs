import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";
import { Store } from "../app/store.mjs";
import { seedCampaigns } from "../tests/fixtures.mjs";

const data = new URL("../data/", import.meta.url);
const dbPath = fileURLToPath(new URL("demo.sqlite", data));

function hasCampaigns() {
  if (!existsSync(dbPath)) return false;
  const db = new DatabaseSync(dbPath, { readOnly: true });
  try {
    const hasWaves = db.prepare("SELECT 1 FROM sqlite_schema WHERE name='waves' AND type='table'").get();
    return Boolean(hasWaves && db.prepare("SELECT 1 FROM waves LIMIT 1").get());
  } finally {
    db.close();
  }
}

function seedLocalDemo() {
  if (hasCampaigns()) return false;
  const secretFile = new URL("local-secret", data);
  mkdirSync(data, { recursive: true });
  try {
    writeFileSync(secretFile, randomBytes(48).toString("hex"), { flag: "wx", mode: 0o600 });
  } catch (error) {
    if (error.code !== "EEXIST") throw error;
  }
  const store = new Store(dbPath, {
    mode: "demo",
    secret: readFileSync(secretFile, "utf8"),
  });
  try {
    return seedCampaigns(store, { includeBrowserExample: true });
  } finally {
    store.db.close();
  }
}

console.log(seedLocalDemo()
  ? "Quatre campanyes sintètiques afegides a data/demo.sqlite."
  : "La base de demo ja conté campanyes. No s’hi han afegit exemples.");
