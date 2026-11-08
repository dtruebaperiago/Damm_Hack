import test from 'node:test';
import assert from 'node:assert/strict';
import { Store } from '../app/store.mjs';
import { generateSurvey } from '../app/providers.mjs';
import { template } from './fixtures.mjs';
const need={titol:'Acollida',objectiu:'Entendre la incorporació',decisio:'Millorar la primera setmana',context:'Personal nou de logística',sector:'Logística',ubicacio:'Magatzem de demo',torn:'Dia',dies:7};
test('new campaigns have no questions, insights or historical fixtures and cannot be approved',async()=>{
 const s=await new Store(':memory:',{secret:'synthetic',mode:'demo'}).init();
 try {
  assert.deepEqual(await s.list(),[]);
  const { objectiu, sector, ubicacio, torn, dies } = need;
  const w=await s.createWave({ objectiu, sector, ubicacio, torn, dies });
  assert.equal(w.config.titol, objectiu);
  assert.equal(w.config.context, "");
  assert.equal(w.config.decisio, "");
  assert.deepEqual(w.survey.preguntes,[]);
  assert.equal(w.survey.titol,'');
  assert.deepEqual(w.config.conceptes,[]);
  assert.deepEqual((await s.waveDTO(w.id)).diagnostic,[]);
  assert.deepEqual((await s.waveDTO(w.id)).proposals,[]);
  assert.equal((await s.calibration(w.config.public)).abast,'insuficient');
  assert.equal((await s.db.prepare('SELECT COUNT(*) AS n FROM historical_calibrations').get()).n, 0);
  await assert.rejects(()=>s.approve(w.id,1),/preguntes|títol/);
 } finally {await s.db.close();}
});
test("initial generation sends no premade content and preserves every generated question", async (t) => {
  const generated = structuredClone(template);
  generated.adaptacions = [];
  generated.preguntes = Array.from({ length: 3 }, (_, i) => ({
    id: "acollida_" + i,
    text: "Com valores la incorporació " + i + "?",
    que_mesura: "Acollida",
    quina_decisio_informa: "Millorar la primera setmana",
    tipus: "seleccio_unica",
    opcions: [
      { id: "si", etiqueta: "Sí" },
      { id: "no", etiqueta: "No" },
    ],
    obligatoria: false,
    de_referencia: false,
    condicio_de_visualitzacio: null,
  }));
  let payload;
  t.mock.method(globalThis, "fetch", async (url, opts) => {
    payload = JSON.parse(opts.body);
    return Response.json({
      choices: [{ message: { content: JSON.stringify(generated) } }],
    });
  });
  const result = await generateSurvey(need, {
    provider: "groq",
    groqKey: "synthetic",
    model: "openai/gpt-oss-120b",
  });
  assert.deepEqual(result.preguntes, generated.preguntes);
  assert.ok(!JSON.stringify(payload).includes("nou sistema de torns"));
  assert.ok(!JSON.stringify(payload).includes("participacio_nit"));
});
test('generation repairs an unconditional comment and normalizes equivalent scale options', async (t) => {
  const generated = structuredClone(template);
  generated.adaptacions = [];
  generated.introduccio = "Volem entendre com ha anat l’acollida.";
  for (const question of generated.preguntes) question.de_referencia = false;
  const scale = generated.preguntes[0];
  scale.opcions = scale.opcions.slice(0, 5).reverse().map((option) => ({
    ...option, id: Number(option.id),
  }));
  const comment = generated.preguntes[3];
  comment.obligatoria = true;
  comment.opcions = null;
  comment.condicio_de_visualitzacio.totes[0].opcions_ids = [1];
  let attempts = 0;
  t.mock.method(globalThis, 'fetch', async (_, options) => {
    const request = JSON.parse(JSON.parse(options.body).messages[1].content);
    attempts++;
    const survey = structuredClone(generated);
    if (attempts === 1) survey.preguntes[3].condicio_de_visualitzacio = null;
    else assert.match(request.errors_de_validacio.join(" "), /text lliure/);
    return Response.json({ choices: [{ message: { content: JSON.stringify(survey) } }] });
  });
  const survey = await generateSurvey({ objectiu: need.objectiu }, {
    provider: "groq", groqKey: "synthetic", model: "openai/gpt-oss-120b",
  });
  assert.equal(attempts, 2);
  assert.match(survey.introduccio, /pseudonimitzen.*onades/);
  assert.deepEqual(survey.preguntes[0].opcions.map(({ id }) => id), ["1", "2", "3", "4", "5", "no_valorable"]);
  assert.deepEqual(survey.preguntes[3].opcions, []);
  assert.equal(survey.preguntes[3].obligatoria, false);
  assert.deepEqual(survey.preguntes[3].condicio_de_visualitzacio.totes[0].opcions_ids, ["1"]);
});
import { aggregate, normalizeAnswers } from '../app/domain.mjs';
test('custom choice questions publish their own counts and protect small complements',()=>{
 const q={id:'acollida',text:'Què cal millorar?',que_mesura:'Acollida',quina_decisio_informa:'Prioritzar',tipus:'seleccio_unica',opcions:[{id:'eines',etiqueta:'Eines'},{id:'formacio',etiqueta:'Formació'}],obligatoria:false,de_referencia:false,condicio_de_visualitzacio:null};
 const survey={...template,preguntes:[q]};
 const rows=Array.from({length:20},(_,i)=>({torn:'Dia',answers:normalizeAnswers(survey,{acollida:i<10?'eines':'formacio'})}));
 assert.deepEqual(aggregate(rows,120,survey).seleccions,[{id:q.id,text:q.text,base:20,opcions:[{...q.opcions[0],n:10},{...q.opcions[1],n:10}]}]);
 assert.deepEqual(aggregate(rows.slice(0,19),120,survey).seleccions,[]);
});
