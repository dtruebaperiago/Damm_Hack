import { DatabaseSync } from "node:sqlite";
import { createHash, createHmac, randomBytes, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import {
  template,
  validateSurvey,
  normalizeAnswers,
  aggregate,
  historical,
  paired,
  catalog,
} from "./domain.mjs";
import { AppError } from "./providers.mjs";
const now = () => Date.now();
const json = JSON.stringify;
const locations = {
  Planta: "Planta de demo",
  Logística: "Magatzem de demo",
  Comercial: "Zona comercial de demo",
  Oficines: "Oficina de demo",
};
export class Store {
  constructor(path, config) {
    this.settings = config;
    this.db = new DatabaseSync(path);
    this.db.exec("PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;");
    this.db.exec(
      readFileSync(
        new URL("./migrations/001_initial.sql", import.meta.url),
        "utf8",
      ),
    );
    this.db.exec("UPDATE waves SET state='uncertain' WHERE state='publishing'");
  }
  calibration(audience) {
    const row=this.db.prepare('SELECT data FROM historical_calibrations WHERE id=?').get('setembre-2026');
    return historical(audience,row?JSON.parse(row.data):null);
  }
  hash(s) {
    return createHash("sha256").update(s).digest("hex");
  }
  pseudonym(cycle, id) {
    return createHmac("sha256", this.settings.secret)
      .update(
        `v1:escolta:${cycle}:${id.normalize("NFKC").trim().toUpperCase()}`,
      )
      .digest("hex");
  }
  tx(fn) {
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const result = fn();
      this.db.exec("COMMIT");
      return result;
    } catch (e) {
      this.db.exec("ROLLBACK");
      throw e;
    }
  }
  wave(id) {
    const w = this.db.prepare("SELECT * FROM waves WHERE id=?").get(id);
    if (!w) throw new AppError("No s’ha trobat la campanya.", 404);
    return { ...w, config: JSON.parse(w.config), survey: JSON.parse(w.survey) };
  }
  validateConfig(c) {
    if (typeof c.objectiu !== "string" || !c.objectiu.trim() || c.objectiu.length > 2000)
      throw new AppError("Cal escriure la necessitat (màxim 2.000 caràcters).");
    for (const key of ["titol", "decisio", "context"])
      if (c[key] !== undefined && (typeof c[key] !== "string" || c[key].length > 2000))
        throw new AppError(`El camp ${key} admet fins a 2.000 caràcters.`);
    if (
      !Object.hasOwn(locations, c.sector) ||
      c.ubicacio !== locations[c.sector] ||
      !["Tots dos", "Dia", "Nit"].includes(c.torn)
    )
      throw new AppError("El públic ha de pertànyer al catàleg de demo.");
    if (!Number.isInteger(c.dies) || c.dies < 1 || c.dies > 30)
      throw new AppError("La finestra ha de ser entre 1 i 30 dies.");
    return {
      titol: c.titol?.trim() || c.objectiu.trim().slice(0, 160),
      objectiu: c.objectiu.trim(),
      decisio: c.decisio?.trim() || "",
      context: c.context?.trim() || "",
      conceptes: [],
      public: { sector: c.sector, ubicacio: c.ubicacio, torn: c.torn },
      dies: c.dies,
      exclusions:
        typeof c.exclusions === "string"
          ? c.exclusions.slice(0, 1000)
          : "Dades que identifiquin persones",
      protocol: "qr-v1",
      population: Math.round((c.sector==='Planta'?600:120)*(c.torn==='Dia'?.6:c.torn==='Nit'?.4:1)),
      opens: now(),
      closes: now() + c.dies * 86400000,
    };
  }
  provision(cycle, config) {
    const insert = this.db.prepare(
      "INSERT OR IGNORE INTO credentials VALUES(?,?,?)",
    );
    const count = config.public.sector === "Planta" ? 600 : 120;
    for (let i = 1; i <= count; i++)
      insert.run(
        cycle,
        this.pseudonym(cycle, `DEMO-${String(i).padStart(4, "0")}`),
        i <= Math.ceil(count * 0.6) ? "Dia" : "Nit",
      );
  }
  createWave(
    input,
    {
      id = randomUUID(),
      cycle = randomUUID(),
      parent = null,
      survey = template,
    } = {},
  ) {
    const c = this.validateConfig(input);
    this.tx(() => {
      this.db
        .prepare(
          "INSERT INTO waves(id,parent_id,cycle,config,survey,source,created_at) VALUES(?,?,?,?,?,?,?)",
        )
        .run(
          id,
          parent,
          cycle,
          json(c),
          json(survey),
          this.settings.mode === "demo" ? "local" : "typeform",
          now(),
        );
      this.provision(cycle, c);
    });
    return this.wave(id);
  }
  saveRevision(w) {
    this.db
      .prepare("INSERT OR IGNORE INTO revisions VALUES(?,?,?,?,?)")
      .run(w.id, w.version, json(w.survey), json(w.config), w.approved_hash);
  }
  edit(id, version, survey, configInput) {
    return this.tx(() => {
      const w = this.wave(id);
      if (!["draft", "approved"].includes(w.state) || w.version !== version)
        throw new AppError(
          "La versió ha canviat o ja està publicada. Torna a obrir la campanya.",
          409,
        );
      if (survey === undefined && configInput) {
        survey = w.survey;
      } else {
        const errors = validateSurvey(
          survey,
          w.parent_id ? this.wave(w.parent_id).survey : template,
        );
        if (errors.length) throw new AppError(errors.join(" "));
        if (!/pseudonimitz/i.test(survey.introduccio) || !/onad/i.test(survey.introduccio))
          throw new AppError("La introducció ha d’explicar la pseudonimització i el vincle entre onades.");
      }
      let config = w.config;
      if (configInput) {
        config = this.validateConfig(configInput);
        if (w.parent_id && json(config.public) !== json(w.config.public))
          throw new AppError(
            "El seguiment ha de conservar el públic original.",
          );
      }
      this.saveRevision(w);
      this.db
        .prepare(
          "UPDATE waves SET survey=?,config=?,version=version+1,state='draft',approved_hash=NULL WHERE id=?",
        )
        .run(json(survey), json(config), id);
      if (json(w.config.public)!==json(config.public)) {
        this.db.prepare('DELETE FROM credentials WHERE cycle=?').run(w.cycle);
      }
      this.provision(w.cycle, config);
      return this.wave(id);
    });
  }
  approve(id, version) {
    return this.tx(() => {
      const w = this.wave(id);
      if (w.state !== "draft" || w.version !== version)
        throw new AppError("Només es pot aprovar l’esborrany vigent.", 409);
      const errors = validateSurvey(
        w.survey,
        w.parent_id ? this.wave(w.parent_id).survey : template,
      );
      if (errors.length) throw new AppError(errors.join(" "));
      const hash = this.hash(json({ survey: w.survey, config: w.config }));
      this.db
        .prepare("UPDATE waves SET state='approved',approved_hash=? WHERE id=?")
        .run(hash, id);
      return this.wave(id);
    });
  }
  startPublish(id) {
    return this.tx(() => {
      const w = this.wave(id);
      if (w.form_id) return w;
      if (w.state === "uncertain")
        throw new AppError(
          "Resultat remot incert: reconcilia abans de reintentar.",
          409,
        );
      if (w.state !== "approved")
        throw new AppError(
          "Cal aprovar la versió exacta abans de publicar.",
          409,
        );
      if (
        this.hash(json({ survey: w.survey, config: w.config })) !==
        w.approved_hash
      )
        throw new AppError("L’aprovació no correspon al contingut.", 409);
      const title = `Escolta ${w.id} v${w.version} ${w.approved_hash.slice(0, 8)}`;
      this.db
        .prepare(
          "UPDATE waves SET state='publishing',publish_title=? WHERE id=?",
        )
        .run(title, id);
      return this.wave(id);
    });
  }
  finishPublish(id, formId, url) {
    const w = this.wave(id);
    if (!["publishing", "uncertain"].includes(w.state))
      throw new AppError("Publicació fora de seqüència.", 409);
    this.db
      .prepare(
        "UPDATE waves SET state='published',form_id=?,form_url=? WHERE id=?",
      )
      .run(formId, url, id);
    return this.wave(id);
  }
  rows(id) {
    return this.db
      .prepare(
        "SELECT a.answers,a.source,l.participant,l.shift AS torn FROM accepted a JOIN response_links l ON l.response_id=a.id WHERE a.wave_id=?",
      )
      .all(id)
      .map((r) => ({ ...r, answers: JSON.parse(r.answers) }));
  }
  delivery(id, credential) {
    if (typeof credential !== "string" || credential.length > 80)
      throw new AppError("No s’ha pogut autoritzar l’accés.", 403);
    const w = this.wave(id),
      participant = this.pseudonym(w.cycle, credential);
    const c = this.db
      .prepare("SELECT shift FROM credentials WHERE cycle=? AND participant=?")
      .get(w.cycle, participant);
    if (
      w.state !== "published" ||
      now() < w.config.opens ||
      now() > w.config.closes ||
      !c ||
      (w.config.public.torn !== "Tots dos" &&
        c.shift !== w.config.public.torn) ||
      this.db
        .prepare(
          "SELECT 1 FROM response_links WHERE wave_id=? AND participant=?",
        )
        .get(id, participant)
    )
      throw new AppError(
        "No s’ha pogut autoritzar l’accés. Comprova la credencial i la finestra; potser ja has respost.",
        403,
      );
    return this.issueDelivery(id, participant, c.shift);
  }
  browserDelivery(w, code) {
    const opened = now();
    if (
      w.source !== "typeform" ||
      w.state !== "published" ||
      opened < w.config.opens ||
      opened > w.config.closes
    )
      throw new AppError("Aquesta consulta no està oberta.", 403);
    const participant = this.pseudonym(w.cycle, "browser:" + this.hash(code));
    if (this.db.prepare("SELECT 1 FROM response_links WHERE wave_id=? AND participant=?")
      .get(w.id, participant))
      throw new AppError("Aquest navegador ja ha respost a la consulta.", 409);
    return this.issueDelivery(w.id, participant, "Desconegut");
  }
  issueDelivery(id, participant, shift) {
    const token = randomBytes(32).toString("base64url");
    const issued = now();
    this.db
      .prepare("INSERT INTO deliveries VALUES(?,?,?,?,?,?,0)")
      .run(
        this.hash(token),
        id,
        participant,
        shift,
        issued,
        issued + 30 * 60000,
      );
    return token;
  }
  checkDelivery(id, token, submitted = now(), importing = false) {
    const w = this.wave(id),
      d = this.db
        .prepare("SELECT * FROM deliveries WHERE token_hash=? AND wave_id=?")
      .get(this.hash(typeof token === "string" ? token : ""), id);
    if (
      w.state !== "published" ||
      !d ||
      d.consumed ||
      !Number.isFinite(submitted) ||
      submitted < d.created_at - 1000 ||
      submitted > d.expires_at ||
      (!importing && now() > d.expires_at) ||
      (importing && submitted > now() + 1000) ||
      submitted < w.config.opens ||
      submitted > w.config.closes
    )
      throw new AppError(
        "La sessió no és vàlida o ha caducat. Torna a accedir a la consulta.",
        403,
      );
    return { w, d };
  }
  accept(id, token, externalId, answers, source, submitted = now()) {
    return this.tx(() => {
      // Imports només coneixen el bearer rebut de Typeform; mai el pseudònim.
      const { w, d } = this.checkDelivery(id, token, submitted, source === "typeform");
      if (
        typeof externalId !== "string" ||
        !externalId ||
        externalId.length > 200
      )
        throw new AppError("Referència externa invàlida.");
      const cleaned = normalizeAnswers(w.survey, answers);
      for (const q of w.survey.preguntes)
        if (q.obligatoria && cleaned[q.id].estat === "omesa")
          throw new AppError("Falta una resposta obligatòria.");
      try {
        const inserted = this.db
          .prepare(
            "INSERT INTO accepted(wave_id,form_id,external_id,source,answers,submitted_at) VALUES(?,?,?,?,?,?)",
          )
          .run(id, w.form_id, externalId, source, json(cleaned), submitted);
        this.db
          .prepare("INSERT INTO response_links VALUES(?,?,?,?)")
          .run(id, d.participant, inserted.lastInsertRowid, d.shift);
        this.db
          .prepare("UPDATE deliveries SET consumed=1 WHERE token_hash=?")
          .run(d.token_hash);
        return Number(inserted.lastInsertRowid);
      } catch (e) {
        if (e.code?.startsWith("ERR_SQLITE"))
          throw new AppError(
            "La resposta ja s’ha acceptat per a aquesta onada.",
            409,
          );
        throw e;
      }
    });
  }
  close(id) {
    return this.tx(() => {
      const w = this.wave(id);
      if (w.state === "closed") return this.results(id);
      if (w.state !== "published")
        throw new AppError("Només es pot tancar una onada publicada.", 409);
      const rows = this.rows(id),
        snapshot = aggregate(
          rows,
          w.config.population,
          w.survey,
          w.config.public,
        );
      if (rows.length && rows.every((r) => r.torn === "Desconegut"))
        snapshot.torns = [];
      const sources = Object.entries(
        rows.reduce((out, r) => {
          out[r.source] = (out[r.source] || 0) + 1;
          return out;
        }, {}),
      );
      const safeSources = sources.every(([, n]) => n >= 10);
      snapshot.origens = sources.map(([source, n]) => ({
        source,
        n: safeSources ? n : null,
      }));
      snapshot.closed_at = new Date().toISOString();
      snapshot.historic = this.calibration(w.config.public);
      if (w.parent_id) {
        const parent = this.wave(w.parent_id);
        snapshot.comparacio = paired(
          {
            survey: parent.survey,
            public: parent.config.public,
            protocol: parent.config.protocol,
          },
          {
            survey: w.survey,
            public: w.config.public,
            protocol: w.config.protocol,
          },
          this.rows(parent.id),
          rows,
        );
      }
      this.db
        .prepare("UPDATE waves SET state='closed',snapshot=? WHERE id=?")
        .run(json(snapshot), id);
      return snapshot;
    });
  }
  results(id) {
    const w = this.wave(id);
    return w.snapshot
      ? JSON.parse(w.snapshot)
      : {
          total: null,
          taxa: null,
          population: w.config.population,
          metrics: [],
          torns: [],
          temes: [],
          evidence: [],
          textos: null,
          historic: this.calibration(w.config.public),
          recollint: true,
        };
  }
  proposals(id) {
    const w = this.wave(id);
    if (w.proposals) return JSON.parse(w.proposals);
    return this.results(id)
      .evidence.filter((e) => e.tema)
      .flatMap((e) =>
        catalog
          .filter((a) => a.tema === e.tema)
          .map((a) => ({
            accio_id: a.id,
            evidencia_ids: [e.id],
            motiu: `${e.n} textos analitzables de ${e.base} esmenten ${e.text.toLowerCase()}.`,
            origen: "Regles de demo · no és una crida IA",
          })),
      );
  }
  saveProposals(id, data) {
    const evidence = this.results(id).evidence;
    if (
      !Array.isArray(data.propostes) ||
      data.propostes.length > 5 ||
      data.propostes.some(
        (p) =>
          !catalog.some((a) => a.id === p.accio_id) ||
          !Array.isArray(p.evidencia_ids) ||
          !p.evidencia_ids.length ||
          p.evidencia_ids.some((e) => !evidence.some((x) => x.id === e)) ||
          typeof p.motiu !== "string" ||
          p.motiu.length > 1000 ||
          /[0-9]{7,}|@|https?:/i.test(p.motiu),
      )
    )
      throw new AppError(
        "La IA ha retornat una proposta sense evidència publicable vàlida.",
      );
    // Només es persisteixen IDs i explicació basada en dades agregades.
    this.db
      .prepare("UPDATE waves SET proposals=? WHERE id=?")
      .run(
        json(
          data.propostes.map((p) => ({
            accio_id: p.accio_id,
            evidencia_ids: p.evidencia_ids,
            motiu: p.motiu,
            origen: "IA connectada · proposta pendent de RRHH",
          })),
        ),
        id,
      );
  }
  followup(id, action) {
    const found = this.db
      .prepare("SELECT id FROM waves WHERE parent_id=?")
      .get(id);
    if (found) return this.wave(found.id);
    const w = this.wave(id),
      p = this.proposals(id).find((p) => p.accio_id === action);
    if (w.state !== "closed" || !p)
      throw new AppError("Cal una acció vinculada a evidència publicable.");
    const a = catalog.find((a) => a.id === action),
      survey = structuredClone(w.survey);
    survey.titol = "Seguiment · " + w.survey.titol;
    const c = w.config;
    const child = this.createWave(
      {
        titol: "Seguiment · " + c.titol,
        objectiu: c.objectiu,
        decisio: c.decisio,
        context: `${c.context}\nAcció seleccionada: ${a.descripcio}`,
        sector: c.public.sector,
        ubicacio: c.public.ubicacio,
        torn: c.public.torn,
        dies: c.dies,
        exclusions: c.exclusions,
      },
      { cycle: w.cycle, parent: id, survey },
    );
    this.db
      .prepare("UPDATE waves SET selected_action=? WHERE id=?")
      .run(
        json({
          ...a,
          evidence: p.evidencia_ids.map((eid) =>
            this.results(id).evidence.find((e) => e.id === eid),
          ),
          followup: child.id,
        }),
        id,
      );
    return child;
  }
  waveDTO(id) {
    const w = this.wave(id),
      results = this.results(id),
      child = this.db.prepare("SELECT id FROM waves WHERE parent_id=?").get(id);
    return {
      id: w.id,
      parent_id: w.parent_id,
      state: w.state,
      version: w.version,
      config: w.config,
      survey: w.survey,
      source: w.source,
      published: !!w.form_id,
      form_url: w.form_url,
      results,
      diagnostic: this.diagnostic(w),
      proposals:
        this.settings.mode === "demo" || w.proposals ? this.proposals(id) : [],
      selected_action: w.selected_action ? JSON.parse(w.selected_action) : null,
      followup: child?.id || null,
    };
  }
  list() {
    return this.db
      .prepare("SELECT id FROM waves ORDER BY created_at DESC,id")
      .all()
      .map(({ id }) => {
        const w = this.waveDTO(id);
        return {
          id,
          state: w.state,
          version: w.version,
          titol: w.config.titol,
          public: w.config.public,
          source: w.source,
          total: w.results.total,
          taxa: w.results.taxa,
          days: w.config.dies,
          parent_id: w.parent_id,
          has_questions: w.survey.preguntes.length > 0,
          has_followup: Boolean(w.followup),
          closes: w.config.closes,
        };
      });
  }
  diagnostic() {
    return [];
  }
  rateLimit(bucket, limit = 10) {
    const key = this.hash(bucket),
      r = this.db.prepare("SELECT * FROM rate_limits WHERE bucket=?").get(key);
    if (!r || r.expires_at < now()) {
      this.db
        .prepare("INSERT OR REPLACE INTO rate_limits VALUES(?,1,?)")
        .run(key, now() + 15 * 60000);
      return;
    }
    if (r.count >= limit)
      throw new AppError(
        "Massa intents. Espera 15 minuts abans de tornar-ho a provar.",
        429,
      );
    this.db
      .prepare("UPDATE rate_limits SET count=count+1 WHERE bucket=?")
      .run(key);
  }
  cleanup() {
    this.db.prepare("DELETE FROM sessions WHERE expires_at<?").run(now());
    this.db.prepare("DELETE FROM rate_limits WHERE expires_at<?").run(now());
    this.db
      .prepare(`DELETE FROM deliveries WHERE expires_at<? AND wave_id NOT IN
        (SELECT id FROM waves WHERE state='published' AND source='typeform')`)
      .run(now() - 7 * 86400000);
    const cutoff = now() - 30 * 86400000;
    // Purga els registres restringits i l’analítica individual; només resta la instantània agregada final.
    for (const { id, cycle } of this.db
      .prepare(
        `SELECT id,cycle FROM waves WHERE state='closed' AND
         CASE WHEN source='typeform' THEN COALESCE(unixepoch(json_extract(snapshot,'$.closed_at')) * 1000, created_at)
         ELSE created_at END < ?`,
      )
      .all(cutoff)) {
      this.db.prepare("DELETE FROM deliveries WHERE wave_id=?").run(id);
      this.db.prepare("DELETE FROM accepted WHERE wave_id=?").run(id);
      if (
        !this.db
          .prepare(
            "SELECT 1 FROM waves WHERE cycle=? AND (state!='closed' OR created_at>=?)",
          )
          .get(cycle, cutoff)
      )
        this.db.prepare("DELETE FROM credentials WHERE cycle=?").run(cycle);
    }
  }
}
