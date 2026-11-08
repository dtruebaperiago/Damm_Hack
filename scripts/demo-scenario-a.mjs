import { createApplication } from "../app/server.mjs";

const port = Number(process.env.PORT || 3010);
const origin = `http://127.0.0.1:${port}`;
const { server, store } = await createApplication({ scenarioA: true, origin });
// Recreate the action and draft follow-up prepared for the presentation.
await store.followup("escenari-a-resultats", "accio_1");
server.listen(port, "127.0.0.1", () => {
  console.log(`Escoltamm · Escenari A · ${origin}/`);
});
