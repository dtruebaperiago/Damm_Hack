import http from "node:http";
import { readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  randomBytes,
  scryptSync,
  timingSafeEqual,
  randomUUID,
} from "node:crypto";
import qr from "qrcode-generator";
import {
  verifyTypeformSignature,
  importTypeformResponse,
} from "./typeform-ingest.mjs";
import { Store } from "./store.mjs";
import { loadSimulation } from "./simulation.mjs";
import { template } from "./domain.mjs";
import {
  AppError,
  typeformClient,
  toTypeform,
  generateSurvey,
  llmJSON,
} from "./providers.mjs";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const cookieValue = (req, key) => {
  const pair = (req.headers.cookie || "")
    .split(";")
    .map((s) => s.trim())
    .find((s) => s.startsWith(key + "="));
  return pair?.slice(key.length + 1) || "";
};
export async function createApplication(config) {
  const store = await new Store(config.dbPath, config).init();
  if (config.loadSimulation && !store.db.postgres) await loadSimulation(store);
  const passwordSalt = randomBytes(16),
    passwordHash = scryptSync(config.adminPassword, passwordSalt, 32);
  const secure = new URL(config.origin).protocol === "https:";
  const cookie = (name, value, maxAge, path = "/") =>
    `${name}=${value}; Path=${path}; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure ? "; Secure" : ""}`;
  const auth = async (req) => {
    const token = cookieValue(req, "ea_admin");
    if (
      !token ||
      !(await store.db
        .prepare("SELECT 1 FROM sessions WHERE token_hash=? AND expires_at>?")
        .get(store.hash(token), Date.now()))
    )
      throw new AppError("Accedeix a l’espai de People per continuar.", 401);
  };
  const tf = () => {
    if (!config.typeformToken)
      throw new AppError(
        "Falta TYPEFORM_TOKEN al servidor. La demo local continua disponible.",
        503,
      );
    return typeformClient(config.typeformToken);
  };
  const server = http.createServer(async (req, res) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader(
      "Permissions-Policy",
      "camera=(), microphone=(), geolocation=()",
    );
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
    );
    res.setHeader("Cache-Control", "no-store");
    const send = (status, data, type = "application/json; charset=utf-8") => {
      res.writeHead(status, { "Content-Type": type });
      res.end(
        type.startsWith("application/json") ? JSON.stringify(data) : data,
      );
    };
    try {
      const url = new URL(req.url, config.origin),
        path = url.pathname;
      if (req.method === "GET" && path === "/api/health")
        return send(200, { ok: true, mode: config.mode });
      const webhook = path === "/api/webhooks/typeform";
      let body = {};
      if (req.method === "POST") {
        if (
          (!webhook && req.headers.origin !== config.origin) ||
          !req.headers["content-type"]?.startsWith("application/json")
        )
          throw new AppError(
            "Origen o format de la petició no autoritzat.",
            403,
          );
        let size = 0,
          chunks = [];
        for await (const chunk of req) {
          size += chunk.length;
          if (size > 65536)
            throw new AppError("La petició és massa gran.", 413);
          chunks.push(chunk);
        }
        const raw = Buffer.concat(chunks);
        if (
          webhook &&
          !verifyTypeformSignature(
            raw,
            req.headers["typeform-signature"],
            config.typeformWebhookSecret,
          )
        )
          throw new AppError("Signatura Typeform no vàlida.", 403);
        try {
          body = JSON.parse(raw.toString("utf8"));
        } catch {
          throw new AppError("JSON invàlid.");
        }
        if (!body || typeof body !== "object" || Array.isArray(body))
          throw new AppError("Cal un objecte JSON.");
        await store.rateLimit(`api:${req.socket.remoteAddress}`, 400);
      } else if (req.method !== "GET")
        throw new AppError("Mètode no permès.", 405);
      if (webhook) {
        if (req.method !== "POST") throw new AppError("Mètode no permès.", 405);
        const item = body.form_response;
        if (
          body.event_type === "form_response" &&
          typeof item?.form_id === "string"
        ) {
          const found = await store.db
            .prepare("SELECT id FROM waves WHERE form_id=?")
            .get(item.form_id);
          if (found) {
            const w = await store.wave(found.id);
            // Persist before acknowledging. LLM calls stay outside the webhook deadline.
            await importTypeformResponse(
              store,
              w,
              item,
              item.definition || {},
              config,
              { classify: false },
            );
          }
        }
        return send(200, { received: true });
      }
      if (path === "/api/session") {
        let authenticated = true;
        try {
          await auth(req);
        } catch {
          authenticated = false;
        }
        return send(200, {
          authenticated,
          mode: config.mode,
          integrations: {
            typeform: !!config.typeformToken,
            llm:
              !!(config.provider === "groq"
                ? config.groqKey
                : config.openaiKey) && !!config.model,
            provider: config.provider || "openai",
          },
          catalog: {
            Planta: "Planta de demo",
            Logística: "Magatzem de demo",
            Comercial: "Zona comercial de demo",
            Oficines: "Oficina de demo",
          },
        });
      }
      if (path === "/api/login" && req.method === "POST") {
        await store.rateLimit(`admin:${req.socket.remoteAddress}`);
        if (
          typeof body.password !== "string" ||
          body.password.length > 200 ||
          !timingSafeEqual(
            scryptSync(body.password, passwordSalt, 32),
            passwordHash,
          )
        )
          throw new AppError("No s’ha pogut iniciar la sessió.", 403);
        const token = randomBytes(32).toString("base64url");
        await store.db
          .prepare("INSERT INTO sessions VALUES(?,?)")
          .run(store.hash(token), Date.now() + 8 * 3600000);
        res.setHeader("Set-Cookie", cookie("ea_admin", token, 28800));
        return send(200, { ok: true });
      }
      if (path === "/api/logout" && req.method === "POST") {
        await store.db
          .prepare("DELETE FROM sessions WHERE token_hash=?")
          .run(store.hash(cookieValue(req, "ea_admin")));
        res.setHeader("Set-Cookie", cookie("ea_admin", "", 0));
        return send(200, { ok: true });
      }
      const participant = path.match(
        /^\/api\/participate\/([a-zA-Z0-9-]+)(?:\/(auth|submit))?$/,
      );
      if (participant) {
        const [, id, action] = participant,
          w = await store.wave(id);
        if (w.source === "simulation")
          throw new AppError("Aquesta onada és una simulació tancada.", 409);
        if (req.method === "GET" && !action) {
          let admitted = false;
          try {
            await store.checkDelivery(id, cookieValue(req, "ea_participant"));
            admitted = true;
          } catch {}
          return send(200, {
            title: w.survey.titol,
            introduction: w.survey.introduccio,
            questions: w.survey.preguntes,
            open:
              w.state === "published" &&
              Date.now() >= w.config.opens &&
              Date.now() <= w.config.closes,
            admitted,
            mode: w.source,
            estimated: w.survey.temps_estimat_segons,
          });
        }
        if (req.method === "POST" && action === "auth") {
          if (w.source === "typeform") {
            const name = "ea_series_" + store.hash(w.cycle).slice(0, 32);
            const saved = cookieValue(req, name);
            const code = /^[A-Za-z0-9_-]{43}$/.test(saved)
              ? saved
              : randomBytes(32).toString("base64url");
            const token = await store.browserDelivery(w, code);
            res.setHeader("Set-Cookie", [
              cookie(name, code, 30 * 86400),
              cookie("ea_typeform_delivery", token, 1800, `/go/${id}`),
            ]);
            return send(200, { ok: true, mode: w.source, destination: `/go/${id}` });
          }
          await store.rateLimit(`participant:${req.socket.remoteAddress}`);
          const token = await store.delivery(id, body.credential);
          res.setHeader("Set-Cookie", cookie("ea_participant", token, 1800));
          return send(200, {
            ok: true,
            mode: w.source,
            destination: `/go/${id}`,
          });
        }
        if (req.method === "POST" && action === "submit") {
          if (w.source !== "local")
            throw new AppError(
              "Aquesta onada recull les respostes a Typeform.",
              409,
            );
          if (
            !body.answers ||
            typeof body.answers !== "object" ||
            Array.isArray(body.answers)
          )
            throw new AppError("Calen les respostes del formulari.");
          await store.accept(
            id,
            cookieValue(req, "ea_participant"),
            randomUUID(),
            body.answers,
            "local",
          );
          res.setHeader("Set-Cookie", cookie("ea_participant", "", 0));
          return send(200, { ok: true });
        }
      }
      const go = path.match(/^\/go\/([a-zA-Z0-9-]+)$/);
      if (go) {
        const id = go[1],
          token = cookieValue(req, "ea_typeform_delivery") || cookieValue(req, "ea_participant"),
          { w } = await store.checkDelivery(id, token);
        let target = `/participa/${id}`;
        if (w.source === "typeform") {
          const remote = new URL(w.form_url);
          if (
            remote.protocol !== "https:" ||
            !/(^|\.)typeform\.com$/.test(remote.hostname)
          )
            throw new AppError(
              "L’enllaç extern no és un Typeform verificat.",
              502,
            );
          remote.hash = new URLSearchParams({ delivery: token }).toString();
          target = remote.href;
        }
        res.writeHead(303, { Location: target });
        return res.end();
      }
      if (path === "/api/calibration" && req.method === "GET") {
        await auth(req);
        return send(
          200,
          await store.calibration({
            sector: "Planta",
            ubicacio: "Planta de demo",
            torn: "Tots dos",
          }),
        );
      }
      if (path.startsWith("/api/campaigns")) {
        await auth(req);
        if (path === "/api/campaigns") {
          if (req.method === "GET")
            return send(200, { campaigns: await store.list() });
          const w = await store.createWave(body);
          return send(201, await store.waveDTO(w.id));
        }
        const match = path.match(
          /^\/api\/campaigns\/([a-zA-Z0-9-]+)(?:\/(edit|approve|publish|reconcile|import|close|generate|proposals|followup|qr|typeform-qr|webhook|export))?$/,
        );
        if (!match) throw new AppError("Ruta no trobada.", 404);
        const [, id, action] = match;
        let w = await store.wave(id);
        if (!action && req.method === "GET")
          return send(200, await store.waveDTO(id));
        if (["qr", "typeform-qr"].includes(action) && req.method === "GET") {
          if (!w.form_id)
            throw new AppError(
              "Publica la consulta abans de descarregar-ne el QR.",
              409,
            );
          const code = qr(0, "M");
          if (action === "typeform-qr" && !w.form_url)
            throw new AppError(
              "Aquesta consulta no té formulari Typeform.",
              409,
            );
          code.addData(
            action === "typeform-qr"
              ? w.form_url
              : `${config.origin}/participa/${id}`,
          );
          code.make();
          res.setHeader(
            "Content-Disposition",
            `inline; filename="consulta-${id}.svg"`,
          );
          return send(
            200,
            code.createSvgTag({ cellSize: 6, margin: 24, scalable: true }),
            "image/svg+xml",
          );
        }
        if (action === "export" && req.method === "GET") {
          if (w.state !== "closed")
            throw new AppError(
              "Tanca l’onada per exportar la instantània final.",
              409,
            );
          res.setHeader(
            "Content-Disposition",
            `attachment; filename="resultats-${id}.json"`,
          );
          return send(200, {
            campanya: w.config.titol,
            public: w.config.public,
            resultats: await store.results(id),
          });
        }
        if (req.method !== "POST") throw new AppError("Mètode no permès.", 405);
        if (w.source === "simulation")
          throw new AppError("Aquesta onada és una simulació tancada.", 409);
        if (action === "edit")
          await store.edit(id, body.version, body.survey, body.config);
        else if (action === "approve") await store.approve(id, body.version);
        else if (action === "generate") {
          if (w.state !== "draft")
            throw new AppError("Només es pot generar sobre un esborrany.", 409);
          const survey = await generateSurvey(
            {
              objectiu: w.config.objectiu,
              decisio_rrhh: w.config.decisio,
              conceptes: w.config.conceptes,
              context: w.config.context,
              public: w.config.public,
              sondeig: await store.diagnostic(w),
              restriccions: {
                temes_exclosos: w.config.exclusions,
                tractament:
                  "Pseudonimitzat i relacionable entre onades del cicle. RRHH només veu agregats.",
              },
            },
            config,
            w.parent_id ? (await store.wave(w.parent_id)).survey : template,
          );
          await store.edit(id, w.version, survey);
        } else if (action === "publish") {
          if (config.mode !== "demo" && !config.typeformToken)
            throw new AppError(
              "Cal configurar TYPEFORM_TOKEN per publicar en mode connectat.",
              503,
            );
          if (w.form_id) return send(200, await store.waveDTO(id));
          w = await store.startPublish(id);
          if (config.mode === "demo")
            await store.finishPublish(id, "local-" + id, null);
          else {
            try {
              const form = await tf().create(
                toTypeform(w.survey, w.publish_title),
              );
              if (!form.id || !form._links?.display)
                throw new AppError(
                  "La publicació no s’ha pogut confirmar.",
                  503,
                );
              await store.finishPublish(id, form.id, form._links.display);
            } catch (e) {
              const confirmedFailure =
                e.remoteStatus >= 400 &&
                e.remoteStatus < 500 &&
                e.remoteStatus !== 408;
              await store.db
                .prepare(
                  "UPDATE waves SET state=? WHERE id=? AND state='publishing'",
                )
                .run(confirmedFailure ? "approved" : "uncertain", id);
              throw e;
            }
          }
        } else if (action === "reconcile") {
          if (!["uncertain", "publishing"].includes(w.state))
            throw new AppError("No hi ha cap publicació incerta.", 409);
          const form = await tf().find(w.publish_title);
          if (!form)
            throw new AppError(
              "Encara no s’ha trobat el formulari. Es manté el bloqueig per evitar duplicats; revisa el compte Typeform.",
              409,
            );
          const definition = await tf().definition(form.id);
          const expected = toTypeform(w.survey, w.publish_title);
          const shape = (form) => ({
            hidden: form.hidden,
            fields: form.fields?.map((f) => [
              f.ref,
              f.title,
              f.type,
              !!f.validations?.required,
              f.properties?.choices?.map((c) => [c.ref, c.label]),
            ]),
          });
          if (
            JSON.stringify(shape(definition)) !==
            JSON.stringify(shape(expected))
          )
            throw new AppError(
              "El formulari trobat no coincideix amb la revisió aprovada.",
              409,
            );
          await store.finishPublish(id, form.id, definition._links.display);
        } else if (action === "webhook") {
          if (!w.form_id || w.source !== "typeform")
            throw new AppError("Publica primer el formulari Typeform.", 409);
          const origin = new URL(config.origin);
          if (
            origin.protocol !== "https:" ||
            ["localhost", "127.0.0.1", "[::1]"].includes(origin.hostname)
          )
            throw new AppError(
              "Configura PUBLIC_ORIGIN amb l’URL HTTPS pública de la web per rebre notificacions.",
              422,
            );
          if (
            !config.typeformWebhookSecret ||
            config.typeformWebhookSecret.length < 32
          )
            throw new AppError(
              "Configura TYPEFORM_WEBHOOK_SECRET al servidor (mínim 32 caràcters).",
              503,
            );
          await tf().webhook(
            w.form_id,
            `${config.origin}/api/webhooks/typeform`,
            config.typeformWebhookSecret,
          );
        } else if (action === "import") {
          if (w.state !== "published")
            throw new AppError(
              "Només es pot importar mentre la recollida està oberta.",
              409,
            );
          if (w.source !== "typeform")
            throw new AppError(
              "La demo local desa les respostes directament. No hi ha cap import de Typeform.",
              409,
            );
          const client = tf(),
            definition = await client.definition(w.form_id),
            items = await client.responses(w.form_id);
          for (const item of items)
            await importTypeformResponse(store, w, item, definition, config);
        } else if (action === "close") await store.close(id);
        else if (action === "proposals") {
          const evidence = (await store.results(id)).evidence;
          if (!evidence.length)
            throw new AppError(
              "Encara no hi ha evidència publicable per proposar accions.",
            );
          if (config.mode !== "demo")
            await store.saveProposals(
              id,
              await llmJSON(
                "recommendations",
                { public: w.config.public, evidence },
                config,
              ),
            );
        } else if (action === "followup") {
          const child = await store.followup(id, body.action);
          return send(200, {
            ...(await store.waveDTO(id)),
            created_followup: child.id,
          });
        } else throw new AppError("Ruta no trobada.", 404);
        return send(200, await store.waveDTO(id));
      }
      const staticFiles = {
        "/": "index.html",
        "/index.html": "index.html",
        "/app.js": "app.js",
        "/styles.css": "styles.css",
        "/favicon.svg": "favicon.svg",
        "/escoltamm-logo.png": "escoltamm-logo.png",
      };
      const name =
        staticFiles[path] ||
        (path.startsWith("/participa/") ? "index.html" : null);
      if (req.method === "GET" && path === "/brand-tokens.css")
        return send(
          200,
          readFileSync(
            resolve(
              root,
              ".agents/skills/estrella-damm-brandkit/assets/brand-tokens.css",
            ),
          ),
          "text/css",
        );
      if (name) {
        const types = {
          html: "text/html; charset=utf-8",
          js: "text/javascript; charset=utf-8",
          css: "text/css",
          svg: "image/svg+xml",
          png: "image/png",
        };
        return send(
          200,
          readFileSync(resolve(root, "public", name)),
          types[name.split(".").at(-1)],
        );
      }
      throw new AppError("Pàgina no trobada.", 404);
    } catch (e) {
      if (e instanceof AppError && e.retryAfter !== undefined)
        res.setHeader("Retry-After", String(e.retryAfter));
      if (!res.headersSent)
        send(e instanceof AppError ? e.status : 500, {
          ...(e instanceof AppError && e.retryAfter !== undefined
            ? { retryAfter: e.retryAfter }
            : {}),
          error:
            e instanceof AppError
              ? e.message
              : "No s’ha pogut completar l’operació. El contingut desat es conserva.",
        });
      else res.end();
    }
  });
  return { server, store };
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  const mode = process.env.APP_MODE === "connected" ? "connected" : "demo",
    port = Number(process.env.PORT || 3000),
    origin = process.env.PUBLIC_ORIGIN || `http://127.0.0.1:${port}`;
  const dbPath = process.env.DB_PATH || resolve(root, `data/${mode}.sqlite`);
  mkdirSync(dirname(dbPath), { recursive: true });
  const secretPath = resolve(dirname(dbPath), "local-secret");
  if (mode === "demo" && !process.env.HMAC_SECRET && !existsSync(secretPath))
    writeFileSync(secretPath, randomBytes(48).toString("hex"), { mode: 0o600 });
  const secret =
    process.env.HMAC_SECRET ||
    (mode === "demo" ? readFileSync(secretPath, "utf8") : "");
  const adminPassword =
    process.env.ADMIN_PASSWORD || (mode === "demo" ? "equip-damm" : "");
  if (secret.length < 32 || adminPassword.length < 8)
    throw new Error(
      "Configura HMAC_SECRET (mínim 32 caràcters) i ADMIN_PASSWORD (mínim 8).",
    );
  const u = new URL(origin);
  if (
    mode === "connected" &&
    u.protocol !== "https:" &&
    !["127.0.0.1", "localhost"].includes(u.hostname)
  )
    throw new Error(
      "L’entorn connectat remot exigeix PUBLIC_ORIGIN amb HTTPS.",
    );
  const { server, store } = await createApplication({
    dbPath,
    databaseUrl: process.env.DATABASE_URL,
    databaseCA: process.env.DATABASE_SSL_CA_FILE,
    mode,
    loadSimulation: process.env.LOAD_SIMULATION === "1" ||
      (mode === "demo" && process.env.LOAD_SIMULATION !== "0"),
    secret,
    adminPassword,
    origin,
    typeformToken: process.env.TYPEFORM_TOKEN,
    typeformWebhookSecret: process.env.TYPEFORM_WEBHOOK_SECRET,
    openaiKey: process.env.OPENAI_API_KEY,
    provider: process.env.LLM_PROVIDER || "openai",
    groqKey: process.env.GROQ_API_KEY,
    model:
      process.env.LLM_PROVIDER === "groq"
        ? process.env.GROQ_MODEL || "openai/gpt-oss-120b"
        : process.env.OPENAI_MODEL,
  });
  await store.cleanup();
  const timer = setInterval(
    () =>
      store
        .cleanup()
        .catch(() =>
          console.error("No s’ha pogut completar la neteja periòdica."),
        ),
    3600000,
  );
  timer.unref();
  server.listen(port, process.env.HOST || "127.0.0.1", () =>
    console.log(`Escolta activa · ${mode} · ${origin}`),
  );
  for (const signal of ["SIGINT", "SIGTERM"])
    process.on(signal, () =>
      server.close(async () => {
        await store.db.close();
        process.exit(0);
      }),
    );
}
