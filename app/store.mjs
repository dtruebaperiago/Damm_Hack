import { isDeepStrictEqual } from "node:util";
import { Database, decodeJSON } from "./db.mjs";
import { createHash, createHmac, randomBytes, randomUUID } from "node:crypto";
import {
  template,
  validateSurvey,
  normalizeAnswers,
  aggregate,
  historical,
  paired,
  catalog,
  THRESHOLD,
} from "./domain.mjs";
import { AppError } from "./providers.mjs";
import { compareSnapshots, makeReportBase, policyFor } from "./analysis.mjs";
const now = () => Date.now();
const json = JSON.stringify;
const locations = {
  Planta: "Planta de demo",
  Logística: "Magatzem de demo",
  Comercial: "Zona comercial de demo",
  Oficines: "Oficina de demo",
};
const caNumber = new Intl.NumberFormat("ca-ES", { maximumFractionDigits: 1 });
const measurement = (w) => ({ survey: w.survey, public: w.config.public, protocol: w.config.protocol });
const retention = 30 * 86400000;
const stableFingerprint = (value) => json(JSON.parse(value), (_, item) =>
  item && typeof item === "object" && !Array.isArray(item)
    ? Object.fromEntries(Object.keys(item).sort().map(key => [key, item[key]]))
    : item);

export class Store {
  constructor(path, config) {
    this.settings = config;
    this.db = new Database(path, config);
  }
  async init() {
    try {
      await this.db.migrate();
      if (!this.db.postgres)
        await this.db.exec(
          "UPDATE waves SET state='uncertain' WHERE state='publishing'",
        );
      return this;
    } catch (error) {
      await this.db.close();
      throw error;
    }
  }
  async calibration(audience) {
    const row = await this.db
      .prepare("SELECT data FROM historical_calibrations WHERE id=?")
      .get("setembre-2026");
    return historical(audience, row ? decodeJSON(row.data) : null);
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
  async tx(fn) {
    return this.db.transaction(fn);
  }
  async wave(id, { lock = true } = {}) {
    const w = await this.db
      .prepare(
        "SELECT * FROM waves WHERE id=?" +
          (lock && this.db.postgres && this.db.context.getStore() ? " FOR UPDATE" : ""),
      )
      .get(id);
    if (!w) throw new AppError("No s’ha trobat la campanya.", 404);
    return { ...w, config: decodeJSON(w.config), survey: decodeJSON(w.survey) };
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
      population: Math.round(
        (c.sector === "Planta" ? 600 : 120) *
          (c.torn === "Dia" ? 0.6 : c.torn === "Nit" ? 0.4 : 1),
      ),
      opens: now(),
      closes: now() + c.dies * 86400000,
    };
  }
  async provision(cycle, config) {
    const count = config.public.sector === "Planta" ? 600 : 120;
    const values = Array.from({ length: count }, (_, i) => [
      cycle,
      this.pseudonym(cycle, `DEMO-${String(i + 1).padStart(4, "0")}`),
      i < Math.ceil(count * 0.6) ? "Dia" : "Nit",
    ]);
    await this.db
      .prepare(
        `INSERT INTO credentials VALUES ${values.map(() => "(?,?,?)").join(",")} ON CONFLICT DO NOTHING`,
      )
      .run(...values.flat());
  }
  async createWave(
    input,
    { id = randomUUID(), cycle = randomUUID(), parent = null, survey = template } = {},
  ) {
    return this.tx(() => this.insertWave(id, cycle, parent, this.validateConfig(input), survey));
  }
  async insertWave(id, cycle, parent, config, survey) {
    await this.db
      .prepare(
        "INSERT INTO waves(id,parent_id,cycle,config,survey,source,created_at) VALUES(?,?,?,?,?,?,?)",
      )
      .run(id, parent, cycle, json(config), json(survey),
        this.settings.mode === "demo" ? "local" : "typeform", now());
    await this.provision(cycle, config);
    return this.wave(id);
  }
  async saveRevision(w) {
    await this.db
      .prepare("INSERT INTO revisions VALUES(?,?,?,?,?) ON CONFLICT DO NOTHING")
      .run(w.id, w.version, json(w.survey), json(w.config), w.approved_hash);
  }
  async edit(id, version, survey, configInput, generation) {
    return await this.tx(async () => {
      const w = await this.wave(id);
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
          w.parent_id ? (await this.wave(w.parent_id, { lock: false })).survey : template,
        );
        if (errors.length) throw new AppError(errors.join(" "));
        if (!/pseudonimitz/i.test(survey.introduccio) || !/onad/i.test(survey.introduccio))
          throw new AppError("La introducció ha d’explicar la pseudonimització i el vincle entre onades.");
      }
      let config = w.config;
      if (configInput) {
        config = this.validateConfig(configInput);
        if (w.parent_id && !isDeepStrictEqual(config.public, w.config.public))
          throw new AppError(
            "El seguiment ha de conservar el públic original.",
          );
      }
      if (configInput) {
        if (w.config.generacio) config.generacio = w.config.generacio;
        if (w.config.seguiment_accio) config.seguiment_accio = w.config.seguiment_accio;
        if (!isDeepStrictEqual(config.public, w.config.public))
          survey = { ...survey, adaptacions: survey.adaptacions.filter(a => a.pregunta_id === undefined) };
      }
      if (generation) config = { ...config, generacio: generation };
      await this.saveRevision(w);
      await this.db
        .prepare(
          "UPDATE waves SET survey=?,config=?,version=version+1,state='draft',approved_hash=NULL WHERE id=?",
        )
        .run(json(survey), json(config), id);
      if (!isDeepStrictEqual(w.config.public, config.public)) {
        await this.db
          .prepare("DELETE FROM credentials WHERE cycle=?")
          .run(w.cycle);
      }
      await this.provision(w.cycle, config);
      return await this.wave(id);
    });
  }
  async approve(id, version) {
    return await this.tx(async () => {
      const w = await this.wave(id);
      if (w.state !== "draft" || w.version !== version)
        throw new AppError("Només es pot aprovar l’esborrany vigent.", 409);
      const errors = validateSurvey(
        w.survey,
        w.parent_id ? (await this.wave(w.parent_id, { lock: false })).survey : template,
      );
      if (errors.length) throw new AppError(errors.join(" "));
      const hash = this.hash(json({ survey: w.survey, config: w.config }));
      await this.db
        .prepare("UPDATE waves SET state='approved',approved_hash=? WHERE id=?")
        .run(hash, id);
      return await this.wave(id);
    });
  }
  async startPublish(id) {
    return await this.tx(async () => {
      const w = await this.wave(id);
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
      await this.db
        .prepare(
          "UPDATE waves SET state='publishing',publish_title=? WHERE id=?",
        )
        .run(title, id);
      return await this.wave(id);
    });
  }
  async finishPublish(id, formId, url) {
    return this.tx(async () => {
      const w = await this.wave(id);
      if (w.state === "published" && w.form_id === formId) return w;
      if (!["publishing", "uncertain"].includes(w.state))
        throw new AppError("Publicació fora de seqüència.", 409);
      await this.db
        .prepare(
          "UPDATE waves SET state='published',form_id=?,form_url=? WHERE id=?",
        )
        .run(formId, url, id);
      return this.wave(id);
    });
  }
  async rows(id) {
    return (
      await this.db
        .prepare(
          "SELECT a.answers,a.source,l.participant,l.shift AS torn FROM accepted a JOIN response_links l ON l.response_id=a.id WHERE a.wave_id=?",
        )
        .all(id)
    ).map((r) => ({ ...r, answers: decodeJSON(r.answers) }));
  }
  async delivery(id, credential) {
    if (typeof credential !== "string" || credential.length > 80)
      throw new AppError("No s’ha pogut autoritzar l’accés.", 403);
    const w = await this.wave(id),
      participant = this.pseudonym(w.cycle, credential);
    const c = await this.db
      .prepare("SELECT shift FROM credentials WHERE cycle=? AND participant=?")
      .get(w.cycle, participant);
    if (
      w.state !== "published" ||
      now() < w.config.opens ||
      now() > w.config.closes ||
      !c ||
      (w.config.public.torn !== "Tots dos" &&
        c.shift !== w.config.public.torn) ||
      (await this.db
        .prepare(
          "SELECT 1 FROM response_links WHERE wave_id=? AND participant=?",
        )
        .get(id, participant))
    )
      throw new AppError(
        "No s’ha pogut autoritzar l’accés. Comprova la credencial i la finestra; potser ja has respost.",
        403,
      );
    return this.issueDelivery(id, participant, c.shift);
  }
  async browserDelivery(w, code) {
    const opened = now();
    if (
      w.source !== "typeform" ||
      w.state !== "published" ||
      opened < w.config.opens ||
      opened > w.config.closes
    )
      throw new AppError("Aquesta consulta no està oberta.", 403);
    const participant = this.pseudonym(w.cycle, "browser:" + this.hash(code));
    if (await this.db.prepare("SELECT 1 FROM response_links WHERE wave_id=? AND participant=?")
      .get(w.id, participant))
      throw new AppError("Aquest navegador ja ha respost a la consulta.", 409);
    return this.issueDelivery(w.id, participant, "Desconegut");
  }
  async issueDelivery(id, participant, shift) {
    const token = randomBytes(32).toString("base64url");
    const issued = now();
    await this.db
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
  async checkDelivery(id, token, submitted = now(), importing = false) {
    const w = await this.wave(id),
      d = await this.db
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
  async accept(id, token, externalId, answers, source, submitted = now()) {
    return await this.tx(async () => {
      // Imports només coneixen el bearer rebut de Typeform; mai el pseudònim.
      const { w, d } = await this.checkDelivery(id, token, submitted, source === "typeform");
      if (
        typeof externalId !== "string" ||
        !externalId ||
        externalId.length > 200
      )
        throw new AppError("Referència externa invàlida.");
      const cleaned = normalizeAnswers(w.survey, answers);
      for (const q of w.survey.preguntes)
        if (
          q.obligatoria &&
          ["omesa", "invalida"].includes(cleaned[q.id].estat)
        )
          throw new AppError("Falta una resposta obligatòria.");
      try {
        const inserted = await this.db
          .prepare(
            "INSERT INTO accepted(wave_id,form_id,external_id,source,answers,submitted_at) VALUES(?,?,?,?,?,?) RETURNING id",
          )
          .get(id, w.form_id, externalId, source, json(cleaned), submitted);
        await this.db
          .prepare("INSERT INTO response_links VALUES(?,?,?,?)")
          .run(id, d.participant, inserted.id, d.shift);
        await this.db
          .prepare("UPDATE deliveries SET consumed=1 WHERE token_hash=?")
          .run(d.token_hash);
        return Number(inserted.id);
      } catch (e) {
        if (e.code === "23505" || e.code?.startsWith("ERR_SQLITE"))
          throw new AppError(
            "La resposta ja s’ha acceptat per a aquesta onada.",
            409,
          );
        throw e;
      }
    });
  }
  async earlierWaves(wave) {
    const earlier = [];
    for (let id = wave.parent_id; id;) {
      const previous = await this.wave(id, { lock: false });
      earlier.unshift(previous);
      id = previous.parent_id;
    }
    return earlier;
  }
  async comparisonOptions(w) {
    return (await this.earlierWaves(w)).filter(previous => previous.snapshot &&
      paired(measurement(previous), measurement(w), [], []).estat === "comparable");
  }
  async close(id, baseline) {
    return this.tx(async () => {
      const w = await this.wave(id);
      if (w.state === "closed") return decodeJSON(w.snapshot);
      if (w.state !== "published")
        throw new AppError("Només es pot tancar una onada publicada.", 409);
      const previous = baseline
        ? (await this.comparisonOptions(w)).find(wave => wave.id === baseline)
        : (await this.earlierWaves(w))[0];
      if (baseline && !previous) throw new AppError("L’onada de referència no és compatible.");
      const rows = await this.rows(id),
        snapshot = aggregate(
          rows,
          w.config.population,
          w.survey,
          w.config.public,
        );
      if (rows.length && rows.every(r => r.torn === "Desconegut")) snapshot.torns = [];
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
      snapshot.historic = await this.calibration(w.config.public);
      snapshot.politica_analisi = policyFor(w.survey);
      if (previous) {
        snapshot.comparacio = paired(
          measurement(previous),
          measurement(w),
          await this.rows(previous.id),
          rows,
        );
        if (w.source === "typeform" && snapshot.comparacio.estat === "comparable")
          snapshot.comparacio.limit = "El seguiment vincula respostes del mateix navegador. Un navegador compartit pot correspondre a persones diferents.";
        snapshot.comparacio.referencia_id = previous.id;
        if (previous.snapshot)
          snapshot.comparacions = compareSnapshots(decodeJSON(previous.snapshot), snapshot, previous, w);
      }
      await this.db
        .prepare("UPDATE waves SET state='closed',snapshot=? WHERE id=?")
        .run(json(snapshot), id);
      return snapshot;
    });
  }
  async analysis(id) {
    const row = await this.db.prepare("SELECT revision,data FROM wave_analysis WHERE wave_id=?").get(id);
    return row ? { revision: row.revision, ...decodeJSON(row.data) } : { revision: 0 };
  }
  async writeAnalysis(id, revision, data) {
    const changed = revision === 0
      ? await this.db.prepare(
          `INSERT INTO wave_analysis(wave_id,revision,data) VALUES(?,1,?)
           ON CONFLICT(wave_id) DO NOTHING RETURNING revision`,
        ).get(id, json(data))
      : await this.db.prepare(
          `UPDATE wave_analysis SET revision=revision+1,data=?
           WHERE wave_id=? AND revision=? RETURNING revision`,
        ).get(json(data), id, revision);
    if (!changed) throw new AppError("La revisió ha canviat. Torna a obrir l’anàlisi.", 409);
  }
  usesAnalysis(w, state) {
    return w.source !== "simulation" &&
      (state.revision > 0 || this.settings.provider === "groq" ||
        (this.settings.mode !== "demo" && this.settings.provider !== "openai"));
  }
  canReviewTexts(w, snapshot) {
    const since = w.source === "typeform" ? (Date.parse(snapshot.closed_at) || w.created_at) : w.created_at;
    return Boolean(snapshot.textos >= THRESHOLD && since >= now() - retention);
  }
  reportBase(w, snapshot, themes) {
    return makeReportBase(w, snapshot, this.diagnostic(w.config.public, snapshot.historic),
      themes, value => this.hash(stableFingerprint(value)));
  }
  async results(id) {
    return this.resultFor(await this.wave(id));
  }
  async resultFor(w, state) {
    if (!w.snapshot) return {
      total: null, taxa: null, population: w.config.population,
      metrics: [], torns: [], temes: [], evidence: [], textos: null,
      historic: await this.calibration(w.config.public), recollint: true,
    };
    const snapshot = decodeJSON(w.snapshot);
    if (w.source === "simulation") return snapshot;
    state ??= await this.analysis(w.id);
    if (!this.usesAnalysis(w, state)) return snapshot;
    const themes = state.themes ?? [];
    const base = state.base ?? this.reportBase(w, snapshot, themes);
    return { ...snapshot, temes: state.themes ?? (snapshot.politica_analisi ? [] : snapshot.temes),
      evidence: base.evidencies, informe_base: base, informe: state.approved ?? null };
  }
  async proposals(id) {
    const w = await this.wave(id);
    return this.proposalsFor(w, await this.analysis(id));
  }
  proposalsFor(w, state) {
    if (state.approved) return state.approved.accions.map(a => ({
      ...a, accio_id: a.id, origen: "Groq · Revisada per People",
      evidencia: state.base.evidencies.filter(e => a.evidencia_ids.includes(e.id)),
      diagnostic: state.base.diagnostic_biaixos.filter(d => a.diagnostic_ids.includes(d.id)),
    }));
    if (w.proposals) return decodeJSON(w.proposals);
    if (this.usesAnalysis(w, state) || this.settings.mode !== "demo") return [];
    return (decodeJSON(w.snapshot)?.evidence ?? [])
      .filter((e) => e.tema)
      .flatMap((e) =>
        catalog.filter(a => a.tema === e.tema).map(a => ({
          accio_id: a.id,
          evidencia_ids: [e.id],
          motiu: `${e.n} textos analitzables de ${e.base} esmenten ${e.text.toLowerCase()}.`,
          origen: "Regles de demo · no és una crida IA",
        })));
  }
  async saveProposals(id, data) {
    const evidence = decodeJSON((await this.wave(id)).snapshot)?.evidence ?? [];
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
    await this.db.prepare("UPDATE waves SET proposals=? WHERE id=?").run(
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
  async followup(id, action) {
    return this.tx(() => this.selectFollowup(id, action));
  }
  async selectFollowup(id, action) {
    const w = await this.wave(id);
    const found = await this.db
      .prepare("SELECT id FROM waves WHERE parent_id=?")
      .get(id);
    if (found) {
      if (w.selected_action && decodeJSON(w.selected_action).id !== action)
        throw new AppError("L’onada ja té un seguiment vinculat a una altra acció.", 409);
      return this.wave(found.id, { lock: false });
    }
    const state = await this.analysis(id);
    const p = this.proposalsFor(w, state).find((p) => p.accio_id === action);
    if (w.state !== "closed" || !p)
      throw new AppError("Cal una acció vinculada a evidència publicable.");
    const a = p.seguiment ? { ...p, descripcio: p.primer_pas, responsable: p.rol_suggerit }
      : catalog.find((a) => a.id === action);
    const survey = structuredClone(w.survey);
    survey.titol = ("Seguiment · " + w.survey.titol).slice(0, 180);
    if (p.seguiment) {
      let questionId = "seguiment_accio";
      while (survey.preguntes.some(q => q.id === questionId)) questionId += "_nou";
      const follow = p.seguiment;
      const question = {
        id: questionId, text: follow.pregunta_adaptable,
        que_mesura: "Arribada o ús de l’acció seleccionada",
        quina_decisio_informa: "Valorar el seguiment de l’acció",
        tipus: "seleccio_unica", obligatoria: false, de_referencia: false,
        condicio_de_visualitzacio: null,
        opcions: follow.opcions_suggerides.map((etiqueta, i) => ({ id: `opcio_${i + 1}`, etiqueta })),
      };
      const branchParents = new Set(survey.preguntes.flatMap(q =>
        (q.condicio_de_visualitzacio?.totes ?? []).map(c => c.pregunta_id)));
      if (survey.preguntes.length < 6) survey.preguntes.push(question);
      else {
        const position = survey.preguntes.findLastIndex(q => !q.de_referencia && !branchParents.has(q.id));
        if (position !== -1) survey.preguntes[position] = question;
      }
    }
    const c = w.config;
    survey.adaptacions = survey.adaptacions.filter(a => a.pregunta_id === undefined || (
      (!c.generacio || isDeepStrictEqual(c.generacio.public, c.public)) &&
      survey.preguntes.some(q => q.id === a.pregunta_id)
    ));
    const childConfig = {
      ...c, titol: `Seguiment · ${c.titol}`.slice(0, 2000),
      context: `Acció seleccionada: ${a.descripcio}\n${c.context}`.slice(0, 2000),
      opens: now(), closes: now() + c.dies * 86400000,
    };
    delete childConfig.generacio;
    if (p.seguiment) childConfig.seguiment_accio = p.seguiment;
    const child = await this.insertWave(randomUUID(), w.cycle, id, childConfig, survey);
    await this.db
      .prepare("UPDATE waves SET selected_action=? WHERE id=?")
      .run(
        json({
          ...a,
          instantania_id: p.seguiment ? state.base.instantania_id : undefined,
          evidence: p.evidencia ?? p.evidencia_ids.map((eid) =>
            decodeJSON(w.snapshot).evidence.find((e) => e.id === eid),
          ),
          followup: child.id,
        }),
        id,
      );
    return child;
  }
  async waveDTO(id) {
    const w = await this.wave(id);
    const [state, child, calibration] = await Promise.all([
      this.analysis(id),
      this.db.prepare("SELECT id FROM waves WHERE parent_id=?").get(id),
      this.calibration(w.config.public),
    ]);
    const results = await this.resultFor(w, state);
    const diagnostic = this.diagnostic(w.config.public, calibration);
    const generation = w.config.generacio;
    let chart = calibration;
    if (generation && isDeepStrictEqual(generation.public, w.config.public)) {
      if (Object.hasOwn(generation, "distribucio_historica"))
        chart = generation.distribucio_historica;
      else if (!isDeepStrictEqual(generation.sondeig, diagnostic))
        chart = null;
    }
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
      diagnostic,
      distribucio_historica: chart?.percentatges
        ? { percentatges: chart.percentatges, bases: chart.bases }
        : null,
      proposals: this.proposalsFor(w, state),
      comparacions_disponibles: w.state === "published" && w.parent_id
        ? (await this.comparisonOptions(w))
          .map(wave => ({ id: wave.id, titol: wave.config.titol }))
        : [],
      analysis: w.state === "closed" && this.usesAnalysis(w, state) ? {
        tema: state.themes ? "revisat" : state.draft ? "tancat" : !this.canReviewTexts(w, results) ? "indisponible" :
          state.themeDraft ? "pendent" : "disponible",
        informe: state.approved ? "revisat" : state.draft ? "pendent" : "disponible",
      } : null,
      selected_action: w.selected_action ? decodeJSON(w.selected_action) : null,
      followup: child?.id || null,
    };
  }
  async list() {
    const records = await this.db
      .prepare("SELECT id FROM waves ORDER BY created_at DESC,id")
      .all();
    const list = [];
    for (const { id } of records) {
      const w = await this.waveDTO(id);
      list.push({
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
      });
    }
    return list;
  }
  diagnostic(audience, h) {
    if (!h || h.abast === "insuficient") return [];
    const [reference, voluntary] = h.bases;
    const [referenceExtremes, voluntaryExtremes] = h.extrems.map(n => caNumber.format(n));
    const metadata = {
      abast: h.abast,
      public: { ...audience, torn: "Tots dos" },
      periode: h.periode,
      origen: h.origen,
      pregunta: h.pregunta,
      estat: "senyal_mesurat",
    };
    return [
      {
        ...metadata,
        id: "historic_extrems",
        titol: "Pes de les respostes extremes",
        observacio: `Les puntuacions 1 i 5 sumen el ${voluntaryExtremes}% en la recollida voluntària (n=${voluntary}) i el ${referenceExtremes}% en la referència (n=${reference}). Diferència de ${caNumber.format(h.diferencia)} punts percentuals.`,
        limitacio: "El contrast apunta a un risc d’autoselecció en la recollida voluntària. La pregunta històrica és de clima i el resultat descriu aquella mostra.",
      },
      {
        ...metadata,
        id: "historic_participacio",
        titol: "Participació aparent i risc de no resposta",
        observacio: `La recollida voluntària va registrar ${voluntary} trameses${h.poblacio_elegible
          ? ` per a ${h.poblacio_elegible} persones elegibles` : ""} (${caNumber.format(h.taxa)}% de participació aparent).`,
        limitacio: "El QR compartit deixa la unicitat sense verificar. Les persones que no van respondre podrien tenir una experiència diferent.",
      },
    ];
  }
  async rateLimit(bucket, limit = 10) {
    const time = now();
    const row = await this.db
      .prepare(
        `INSERT INTO rate_limits VALUES(?,1,?)
      ON CONFLICT(bucket) DO UPDATE SET
      count=CASE WHEN rate_limits.expires_at<? THEN 1 ELSE rate_limits.count+1 END,
      expires_at=CASE WHEN rate_limits.expires_at<? THEN excluded.expires_at ELSE rate_limits.expires_at END
      RETURNING count`,
      )
      .get(this.hash(bucket), time + 15 * 60000, time, time);
    if (row.count > limit)
      throw new AppError(
        "Massa intents. Espera 15 minuts abans de tornar-ho a provar.",
        429,
      );
  }
  async cleanup() {
    await this.db.prepare("DELETE FROM sessions WHERE expires_at<?").run(now());
    await this.db.prepare("DELETE FROM rate_limits WHERE expires_at<?").run(now());
    await this.db
      .prepare(`DELETE FROM deliveries WHERE expires_at<? AND wave_id NOT IN
        (SELECT id FROM waves WHERE state='published' AND source='typeform')`)
      .run(now() - 7 * 86400000);
    const cutoff = now() - retention;
    // Purga els registres restringits i l’analítica individual; només resta la instantània agregada final.
    for (const { id, cycle } of await this.db
      .prepare(
        `SELECT id,cycle FROM waves WHERE state='closed' AND
         CASE WHEN source='typeform' THEN ${this.db.postgres ? "COALESCE(EXTRACT(EPOCH FROM (snapshot->>'closed_at')::timestamptz) * 1000, created_at)" : "COALESCE(unixepoch(json_extract(snapshot,'$.closed_at')) * 1000, created_at)"}
         ELSE created_at END < ?`,
      )
      .all(cutoff)) {
      await this.tx(async () => {
        await this.wave(id);
        await this.db.prepare("DELETE FROM deliveries WHERE wave_id=?").run(id);
        await this.db.prepare("DELETE FROM accepted WHERE wave_id=?").run(id);
        const [removeRestricted, hasRestricted] = this.db.postgres
          ? ["data - 'themeDraft' - 'themeReview'", "(jsonb_exists(data, 'themeDraft') OR jsonb_exists(data, 'themeReview'))"]
          : ["json_remove(data, '$.themeDraft', '$.themeReview')", "(json_type(data, '$.themeDraft') IS NOT NULL OR json_type(data, '$.themeReview') IS NOT NULL)"];
        await this.db.prepare("UPDATE wave_analysis SET data=" + removeRestricted +
          ",revision=revision+1 WHERE wave_id=? AND " + hasRestricted).run(id);
      });
      if (
        !(await this.db
          .prepare(
            "SELECT 1 FROM waves WHERE cycle=? AND (state!='closed' OR created_at>=?)",
          )
          .get(cycle, cutoff))
      )
        await this.db
          .prepare("DELETE FROM credentials WHERE cycle=?")
          .run(cycle);
    }
  }
}
