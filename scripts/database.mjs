import { Database } from "../app/db.mjs";
if (!process.env.DATABASE_URL) {
  console.error(
    "Falta DATABASE_URL al servidor. Configura la connexió Session pooler de Supabase al .env.",
  );
  process.exitCode = 1;
} else {
  let db;
  try {
    db = new Database(null, {
      databaseUrl: process.env.DATABASE_URL,
      databaseCA: process.env.DATABASE_SSL_CA_FILE,
    });
    await db.migrate();
    const row = await db
      .prepare("SELECT version FROM migrations ORDER BY version DESC LIMIT 1")
      .get();
    console.log(
      `PostgreSQL connectat. Esquema escolta preparat; migració ${row.version}.`,
    );
  } catch {
    console.error(
      "No s’ha pogut preparar PostgreSQL. Revisa DATABASE_URL, la contrasenya, la xarxa i el certificat TLS. No s’ha activat cap alternativa silenciosa.",
    );
    process.exitCode = 1;
  } finally {
    if (db) await db.close();
  }
}
