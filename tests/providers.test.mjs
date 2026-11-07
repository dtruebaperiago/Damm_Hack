import test from "node:test";
import assert from "node:assert/strict";
import { typeformClient, generateSurvey, llmJSON, requestJSON } from "../app/providers.mjs";
import { template } from "../app/domain.mjs";

test('generation attaches canonical reference questions even when the LLM rewrites, reorders or omits them',async t=>{
  const generated=structuredClone(template);
  generated.preguntes[0].text='Text reescrit per la IA';
  generated.preguntes[0].que_mesura='Metadada modificada';
  generated.preguntes[0].opcions[0].etiqueta="Gens d'acord";
  generated.preguntes.splice(1,1);
  generated.preguntes.push(generated.preguntes.shift());
  t.mock.method(globalThis,'fetch',async()=>new Response(JSON.stringify({choices:[{message:{content:JSON.stringify(generated)}}]}),{status:200}));
  const result=await generateSurvey({objectiu:'Torns'},{provider:'groq',groqKey:'synthetic',model:'openai/gpt-oss-120b'});
  assert.deepEqual(result.preguntes,template.preguntes);
});

test('Groq uses GPT OSS chat JSON without sending credentials in the payload',async t=>{
  let target,body,auth;
  t.mock.method(globalThis,'fetch',async(url,options)=>{
    target=url;body=JSON.parse(options.body);auth=options.headers.Authorization;
    return new Response(JSON.stringify({choices:[{message:{content:JSON.stringify(template)}}]}),{status:200});
  });
  assert.deepEqual(await generateSurvey({objectiu:'Torns'},{provider:'groq',groqKey:'synthetic-test',model:'openai/gpt-oss-120b'}),template);
  assert.equal(target,'https://api.groq.com/openai/v1/chat/completions');
  assert.equal(body.response_format.type,'json_object');
  assert.equal(body.model,'openai/gpt-oss-120b');
  assert.equal(auth,'Bearer synthetic-test');
  assert.ok(!JSON.stringify(body).includes('synthetic-test'));
  assert.ok(JSON.stringify(body).length<16000);
  assert.ok(body.max_completion_tokens<=3000);
});

test('429 preserves the provider cooldown and never retries form creation',async t=>{
  let calls=0;
  t.mock.method(globalThis,'fetch',async()=>{calls++;return new Response('{}',{status:429,headers:{'Retry-After':'45'}});});
  await assert.rejects(requestJSON('https://api.typeform.com/forms',{method:'POST'}),e=>e.status===429&&e.retryAfter===45&&!e.message.includes('configuració'));
  assert.equal(calls,1);
});
test('LLM retries a short 429 once, but never loops on persistent throttling',async t=>{
  let calls=0;
  t.mock.method(globalThis,'fetch',async()=>++calls===1?new Response('{}',{status:429,headers:{'Retry-After':'0'}}):new Response('{"ok":true}',{status:200}));
  assert.deepEqual(await requestJSON('https://api.groq.com/openai/v1/chat/completions',{},true),{ok:true});
  assert.equal(calls,2);
  calls=0;t.mock.method(globalThis,'fetch',async()=>{calls++;return new Response('{}',{status:429,headers:{'Retry-After':'0'}});});
  await assert.rejects(requestJSON('https://api.groq.com/openai/v1/chat/completions',{},true),e=>e.status===429);
  assert.equal(calls,2);
});

test("Typeform pagination, stable remote mapping and reconciliation use exact titles", async () => {
  const calls = [];
  const client = typeformClient("test-token", async (url, options) => {
    calls.push({ url, method: options.method });
    if (url.includes("/responses"))
      return calls.filter((c) => c.url.includes("/responses")).length === 1
        ? {
            items: Array.from({ length: 1000 }, (_, i) => ({ token: "r" + i })),
          }
        : { items: [{ token: "last" }] };
    return {
      items: [
        { id: "one", title: "Exact title" },
        { id: "other", title: "Exact title copy" },
      ],
      page_count: 1,
    };
  });
  assert.equal((await client.responses("form1")).length, 1001);
  assert.ok(calls[1].url.includes("before=r999"));
  assert.equal((await client.find("Exact title")).id, "one");
  assert.equal(calls.filter((c) => c.method === "POST").length, 0);
});
test("LLM uses versioned Markdown, JSON and distinct task contexts; invalid output is rejected", async (t) => {
  let request;
  t.mock.method(globalThis, "fetch", async (url, options) => {
    request = JSON.parse(options.body);
    return new Response(
      JSON.stringify({
        output: [
          {
            content: [{ type: "output_text", text: JSON.stringify(template) }],
          },
        ],
      }),
      { status: 200 },
    );
  });
  const config = { openaiKey: "test-key", model: "test-model" };
  const s = await generateSurvey({ objectiu: "Torns" }, config);
  assert.deepEqual(s, template);
  assert.ok(request.instructions.includes("Mètode de generació en JSON"));
  assert.ok(request.instructions.includes("credencials sintètiques"));
  assert.equal(request.store, false);
  assert.ok(!JSON.stringify(request).includes("test-key"));
  await llmJSON(
    "classification",
    { elements: [{ id: "t0", text: "Les instruccions estan disperses." }] },
    config,
  );
  assert.ok(request.instructions.includes("ID efímer rebut"));
  assert.ok(!request.instructions.includes("Mètode de generació en JSON"));
  t.mock.method(
    globalThis,
    "fetch",
    async () =>
      new Response(
        JSON.stringify({
          output: [
            { content: [{ type: "output_text", text: '{"preguntes":[]}' }] },
          ],
        }),
        { status: 200 },
      ),
  );
  await assert.rejects(generateSurvey({}, config), /títol|preguntes/);
  await assert.rejects(generateSurvey({}, {}), /Configura/);
});
