import { randomBytes } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { Store } from "../app/store.mjs";
import { loadSimulation } from "../app/simulation.mjs";

const data = new URL("../data/", import.meta.url);
const dbPath = fileURLToPath(new URL("demo.sqlite", data));

async function seedLocalDemo() {
  const secretFile = new URL("local-secret", data);
  mkdirSync(data, { recursive: true });
  try {
    writeFileSync(secretFile, randomBytes(48).toString("hex"), {
      flag: "wx",
      mode: 0o600,
    });
  } catch (error) {
    if (error.code !== "EEXIST") throw error;
  }
  const store = await new Store(dbPath, {
    mode: "demo",
    secret: readFileSync(secretFile, "utf8"),
  }).init();
  try {
    return await loadSimulation(store);
  } finally {
    await store.db.close();
  }
}

const inserted = await seedLocalDemo();
console.log(inserted
  ? `Onades sintètiques de l’etapa 03 afegides a data/demo.sqlite: ${inserted}.`
  : "La base de demo ja conté totes les onades de l’etapa 03.");
