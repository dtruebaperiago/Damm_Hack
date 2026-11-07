import test from 'node:test';
import assert from 'node:assert/strict';
import { Store } from '../app/store.mjs';
import { generateSurvey } from '../app/providers.mjs';
import { template } from './fixtures.mjs';
const need={titol:'Acollida',objectiu:'Entendre la incorporació',decisio:'Millorar la primera setmana',context:'Personal nou de logística',sector:'Logística',ubicacio:'Magatzem de demo',torn:'Dia',dies:7};
test('new campaigns have no questions, insights or historical fixtures and cannot be approved',()=>{
 const s=new Store(':memory:',{secret:'synthetic',mode:'demo'});
 try {
  assert.deepEqual(s.list(),[]);
  const w=s.createWave(need);
  assert.deepEqual(w.survey.preguntes,[]);
  assert.equal(w.survey.titol,'');
  assert.deepEqual(w.config.conceptes,[]);
  assert.deepEqual(s.waveDTO(w.id).diagnostic,[]);
  assert.deepEqual(s.waveDTO(w.id).proposals,[]);
  assert.equal(s.calibration({sector:'Planta',ubicacio:'Planta de demo',torn:'Tots dos'}).abast,'insuficient');
  assert.throws(()=>s.approve(w.id,1),/preguntes|títol/);
 } finally {s.db.close();}
});
test('initial generation sends no premade content and preserves every generated question',async t=>{
 const generated=structuredClone(template);
 generated.preguntes=Array.from({length:3},(_,i)=>({id:'acollida_'+i,text:'Com valores la incorporació '+i+'?',que_mesura:'Acollida',quina_decisio_informa:'Millorar la primera setmana',tipus:'seleccio_unica',opcions:[{id:'si',etiqueta:'Sí'},{id:'no',etiqueta:'No'}],obligatoria:false,de_referencia:false,condicio_de_visualitzacio:null}));
 let payload;
 t.mock.method(globalThis,'fetch',async(url,opts)=>{payload=JSON.parse(opts.body);return Response.json({choices:[{message:{content:JSON.stringify(generated)}}]});});
 const result=await generateSurvey(need,{provider:'groq',groqKey:'synthetic',model:'openai/gpt-oss-120b'});
 assert.deepEqual(result.preguntes,generated.preguntes);
 assert.ok(!JSON.stringify(payload).includes('nou sistema de torns'));
 assert.ok(!JSON.stringify(payload).includes('participacio_nit'));
});
import { aggregate, normalizeAnswers } from '../app/domain.mjs';
test('custom choice questions publish their own counts and protect small complements',()=>{
 const q={id:'acollida',text:'Què cal millorar?',que_mesura:'Acollida',quina_decisio_informa:'Prioritzar',tipus:'seleccio_unica',opcions:[{id:'eines',etiqueta:'Eines'},{id:'formacio',etiqueta:'Formació'}],obligatoria:false,de_referencia:false,condicio_de_visualitzacio:null};
 const survey={...template,preguntes:[q]};
 const rows=Array.from({length:20},(_,i)=>({torn:'Dia',answers:normalizeAnswers(survey,{acollida:i<10?'eines':'formacio'})}));
 assert.deepEqual(aggregate(rows,120,survey).seleccions,[{id:q.id,text:q.text,base:20,opcions:[{...q.opcions[0],n:10},{...q.opcions[1],n:10}]}]);
 assert.deepEqual(aggregate(rows.slice(0,19),120,survey).seleccions,[]);
});
