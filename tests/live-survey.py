"""Opt-in real Groq → reviewed draft → Typeform proof. Creates one synthetic survey."""
import json, os, urllib.request
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'test-results'; OUT.mkdir(exist_ok=True)
BASE=os.environ.get('LIVE_ORIGIN','http://127.0.0.1:3002')
env={}
for line in (ROOT/'.env').read_text(encoding='utf-8-sig').splitlines():
 if '=' in line and not line.startswith('#'):
  k,v=line.split('=',1);env[k]=v.strip().strip('"').strip("'")
need={'titol':'Prova real · Acollida a logística', 'objectiu':'Entendre si les persones incorporades recentment a logística tenen les eines, la formació inicial i les instruccions necessàries durant la primera setmana.', 'decisio':'Decidir quina part de l’acollida cal millorar primer: formació pràctica, materials o accés a les eines.', 'context':'Cas completament fictici. Un magatzem ha incorporat personal nou aquest mes. Volem detectar dificultats de la primera setmana, sense preguntar sobre canvis de torns ni recollir dades personals.'}
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True)
 page=browser.new_page(viewport={'width':1440,'height':1050})
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(BASE)
 page.get_by_label('Contrasenya de l’equip').fill(env['ADMIN_PASSWORD'])
 page.get_by_role('button',name='Entrar a l’espai').click()
 expect(page.get_by_role('heading',name='Escoltar millor. Actuar abans.')).to_be_visible()
 campaigns=page.request.get(BASE+'/api/campaigns').json()['campaigns']
 assert len(campaigns)<=1 and all(c['titol']==need['titol'] and c['state']=='draft' for c in campaigns), 'Use an empty proof database; completed proofs are never republished.'
 for width in [320,768,1024,1440]:
  page.set_viewport_size({'width':width,'height':1000})
  assert not page.evaluate('document.documentElement.scrollWidth > innerWidth'),width
 page.screenshot(path=str(OUT/'blank-canvas.png'),full_page=True)
 if campaigns:
  campaign=campaigns[0]['id'];page.goto(BASE+'/#campaign/'+campaign+'/need')
 else:
  page.get_by_role('button',name='Nova consulta',exact=True).click()
  for key in ['titol','objectiu','decisio','context']:
   assert page.locator('#new-'+key).input_value()==''
   page.locator('#new-'+key).fill(need[key])
  page.locator('#new-sector').select_option(label='Logística')
  page.get_by_role('button',name='Crear esborrany',exact=True).click()
  expect(page.get_by_role('heading',name=need['titol'])).to_be_visible()
  campaign=page.url.split('#campaign/')[1].split('/')[0]
 page.get_by_role('link',name='Consulta',exact=True).click()
 current=page.request.get(BASE+'/api/campaigns/'+campaign).json()
 if not current['survey']['preguntes']:
  expect(page.get_by_role('heading',name='Encara no hi ha preguntes')).to_be_visible()
  assert page.locator('[data-act=approve]').count()==0
  page.screenshot(path=str(OUT/'empty-survey.png'),full_page=True)
  page.get_by_role('button',name='Generar amb IA real').click()
  expect(page.locator('.question').first).to_be_visible(timeout=60000)
 draft=page.request.get(BASE+'/api/campaigns/'+campaign).json()
 assert draft['state']=='draft' and not draft['published']
 assert 3<=len(draft['survey']['preguntes'])<=6
 assert not any(q['id'] in ['comprensio','suport','dificultat_principal'] for q in draft['survey']['preguntes'])
 assert not any(q['de_referencia'] for q in draft['survey']['preguntes'])
 assert draft['diagnostic']==[] and draft['results']['total'] is None
 (OUT/'groq-draft.json').write_text(json.dumps({'description':need,'draft':draft},ensure_ascii=False,indent=2),encoding='utf-8')
 page.screenshot(path=str(OUT/'groq-draft.png'),full_page=True)
 # The task explicitly authorizes creating and publishing this synthetic verification survey.
 page.get_by_role('button',name='Aprovar versió '+str(draft['version'])).click()
 expect(page.get_by_role('button',name='Publicar consulta')).to_be_visible()
 page.get_by_role('button',name='Publicar consulta').click()
 expect(page.get_by_text('En recollida',exact=True)).to_be_visible(timeout=45000)
 published=page.request.get(BASE+'/api/campaigns/'+campaign).json()
 assert published['published'] and published['form_url'].startswith('https://')
 page.get_by_role('link',name='Difusió',exact=True).click()
 expect(page.get_by_alt_text('QR de l’accés a aquesta consulta')).to_be_visible()
 page.screenshot(path=str(OUT/'typeform-publication.png'),full_page=True)
 qr=page.request.get(BASE+'/api/campaigns/'+campaign+'/qr')
 assert qr.status==200 and '<svg' in qr.text()
 (OUT/'platform-qr.svg').write_text(qr.text(),encoding='utf-8')
 direct=page.request.get(BASE+'/api/campaigns/'+campaign+'/typeform-qr')
 assert direct.status==200 and '<svg' in direct.text()
 (OUT/'typeform-qr.svg').write_text(direct.text(),encoding='utf-8')
 # Read back the created definition from Typeform, not just our stored publication state.
 form_id=published['form_url'].rstrip('/').split('/')[-1]
 req=urllib.request.Request('https://api.typeform.com/forms/'+form_id,headers={'Authorization':'Bearer '+env['TYPEFORM_TOKEN']})
 with urllib.request.urlopen(req,timeout=30) as response:definition=json.load(response)
 assert [q['title'] for q in definition['fields']]==[q['text'] for q in draft['survey']['preguntes']]
 (OUT/'typeform-definition.json').write_text(json.dumps(definition,ensure_ascii=False,indent=2),encoding='utf-8')
 remote=browser.new_page();remote.goto(published['form_url']);remote.wait_for_timeout(3000)
 remote.screenshot(path=str(OUT/'typeform-live.png'),full_page=True)
 assert not errors,errors
 proof={'campaign_id':campaign,'origin':BASE,'survey_url':published['form_url'],'questions':len(definition['fields']),'draft_version':draft['version'],'browser_errors':errors,'breakpoints':[320,768,1024,1440],'provider':'groq','model':env.get('GROQ_MODEL'),'typeform_readback_matches':True}
 (OUT/'live-proof.json').write_text(json.dumps(proof,indent=2),encoding='utf-8')
 print(json.dumps(proof));browser.close()
