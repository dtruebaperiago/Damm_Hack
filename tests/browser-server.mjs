import { createApplication } from "../app/server.mjs";
import { seedCampaigns } from "./fixtures.mjs";
const { server, store } = await createApplication({
  dbPath: process.env.DB_PATH,
  secret: process.env.HMAC_SECRET,
  adminPassword: process.env.ADMIN_PASSWORD,
  origin: process.env.PUBLIC_ORIGIN,
  mode: "demo",
});
// Historical scenarios exist only in the isolated browser test database.
await seedCampaigns(store);
server.listen(Number(process.env.PORT), "127.0.0.1");
