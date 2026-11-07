import { createApplication } from '../app/server.mjs';
import { Store as FixtureStore } from './fixtures.mjs';
const {server,store}=createApplication({dbPath:process.env.DB_PATH,secret:process.env.HMAC_SECRET,adminPassword:process.env.ADMIN_PASSWORD,origin:process.env.PUBLIC_ORIGIN,mode:'demo'});
// Historical scenarios exist only in the isolated browser test database.
const create=store.createWave.bind(store);
store.createWave=FixtureStore.prototype.createWave;
FixtureStore.prototype.seed.call(store);
store.createWave=create;
server.listen(Number(process.env.PORT),'127.0.0.1');
