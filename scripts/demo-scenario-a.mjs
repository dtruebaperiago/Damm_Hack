import { createApplication } from "../app/server.mjs";

const port = Number(process.env.PORT || 3010);
const origin = `http://127.0.0.1:${port}`;
const { server } = await createApplication({ scenarioA: true, origin });
server.listen(port, "127.0.0.1", () => {
  console.log(`Escoltamm · Escenari A · ${origin}/`);
});
