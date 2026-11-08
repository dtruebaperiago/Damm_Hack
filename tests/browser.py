"""Browser checks on an isolated demo database. Requires Python Playwright + Chromium."""
import json
import os
from pathlib import Path
import subprocess
import tempfile
import time
import urllib.request
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / 'test-results'
OUTPUT.mkdir(exist_ok=True)
BASE = 'http://127.0.0.1:3017'

with tempfile.TemporaryDirectory(prefix='escolta-browser-') as temp:
    env = {**os.environ, 'APP_MODE': 'demo', 'PORT': '3017', 'PUBLIC_ORIGIN': BASE,
           'DB_PATH': str(Path(temp) / 'demo.sqlite'), 'ADMIN_PASSWORD': 'equip-damm',
           'HMAC_SECRET': 'browser-test-secret-not-for-production'}
    server = subprocess.Popen(['node', 'tests/browser-server.mjs'], cwd=ROOT, env=env,
                              stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                              creationflags=getattr(subprocess, 'CREATE_NO_WINDOW', 0))
    try:
        for _ in range(50):
            try:
                urllib.request.urlopen(BASE + '/api/health', timeout=1).close()
                break
            except OSError:
                time.sleep(.1)
        else:
            raise RuntimeError('Test server failed to start')
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            context = browser.new_context(viewport={'width': 1440, 'height': 1050})
            page = context.new_page()
            errors = []
            page.on('pageerror', lambda e: errors.append(str(e)))
            page.goto(BASE)
            page.get_by_label('Contrasenya de l’equip').fill('incorrecta')
            page.get_by_role('button', name='Entrar a l’espai').click()
            expect(page.locator('#login-error')).not_to_be_empty()
            page.get_by_label('Contrasenya de l’equip').fill('equip-damm')
            page.get_by_role('button', name='Entrar a l’espai').click()
            expect(page.get_by_role('heading', name='Consultes de People')).to_be_visible()
            page.screenshot(path=str(OUTPUT / 'dashboard-desktop.png'), full_page=True)
            for width in [320, 768, 1024, 1440]:
                page.set_viewport_size({'width': width, 'height': 1000})
                assert not page.evaluate('document.documentElement.scrollWidth > innerWidth'), width
                page.screenshot(path=str(OUTPUT / f'dashboard-{width}.png'), full_page=True)
            page.set_viewport_size({'width': 1440, 'height': 1050})
            page.get_by_role('button', name='Nova consulta', exact=True).click()
            page.get_by_label('Nom de la campanya').fill('Prova E2E · torns')
            page.locator('#new-objectiu').fill('Entendre el canvi de torns')
            page.locator('#new-decisio').fill('Millorar la comunicació')
            page.locator('#new-context').fill('Cas sintètic de torns')
            page.get_by_role('button', name='Crear esborrany').click()
            expect(page.get_by_role('heading', name='Prova E2E · torns')).to_be_visible()
            campaign = page.url.split('#campaign/')[1].split('/')[0]
            cycle_picker = page.get_by_label('Campanya del cicle')
            current_step = page.locator('#cycle-steps [aria-current="step"]')
            page.goto(BASE + '/#overview')
            expect(cycle_picker).to_have_value(campaign)
            expect(current_step).to_contain_text('Definir la necessitat')
            page.goto(BASE + '/#campaign/' + campaign + '/need')
            page.get_by_role('link', name='Consulta', exact=True).click()
            expect(page.get_by_role('heading', name='Encara no hi ha preguntes')).to_be_visible()
            page.get_by_role('button', name='Editar JSON complet').click()
            fixture = json.loads((ROOT / 'tests/fixtures/survey.json').read_text(encoding='utf-8'))
            page.locator('#json-input').fill(json.dumps(fixture, ensure_ascii=False))
            page.get_by_role('button', name='Validar i desar').click()
            expect(page.locator('#preview-q1')).to_be_visible()
            page.locator('#preview-q1').select_option('1')
            page.locator('#preview-q3').select_option('canvis')
            expect(page.locator('#preview-path')).to_contain_text('4 preguntes')
            page.locator('#preview-q1').select_option('2')
            expect(page.locator('#preview-path')).to_contain_text('3 preguntes')
            page.locator('#survey-title').fill('Consulta E2E revisada')
            page.get_by_role('button', name='Desar canvis').click()
            expect(page.get_by_role('button', name='Aprovar versió 3')).to_be_visible()
            page.get_by_role('button', name='Aprovar versió 3').click()
            expect(page.get_by_role('button', name='Publicar consulta')).to_be_visible()
            page.goto(BASE + '/#overview')
            expect(current_step).to_contain_text('Revisar i aprovar')
            page.goto(BASE + '/#campaign/' + campaign + '/survey')
            page.get_by_role('button', name='Publicar consulta').click()
            expect(page.get_by_text('En recollida', exact=True)).to_be_visible()
            page.goto(BASE + '/#overview')
            expect(current_step).to_contain_text('Recollir respostes')
            page.locator('.cycle-card').screenshot(path=str(OUTPUT / 'cycle-active.png'), animations='disabled')
            page.goto(BASE + '/#campaign/' + campaign + '/survey')
            page.get_by_role('link', name='Difusió', exact=True).click()
            expect(page.get_by_alt_text('QR de l’accés a aquesta consulta')).to_be_visible()
            page.screenshot(path=str(OUTPUT / 'campaign-qr.png'), full_page=True)

            mobile = browser.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True)
            participant = mobile.new_page()
            participant.on('pageerror', lambda e: errors.append(str(e)))
            participant.goto(BASE + '/participa/' + campaign)
            participant.get_by_label('Credencial de demo').fill('invàlida')
            participant.get_by_role('button', name='Accedir a la consulta').click()
            expect(participant.locator('#participant-error')).not_to_be_empty()
            participant.get_by_label('Credencial de demo').fill('DEMO-0001')
            participant.get_by_role('button', name='Accedir a la consulta').click()
            q1 = participant.locator('#participant-q-comprensio')
            q3 = participant.locator('#participant-q-dificultat_principal')
            branch = participant.locator('#participant-q-aclariment_comprensio')
            q1.get_by_label('Gens d’acord', exact=True).check()
            q3.get_by_label('Gestionar canvis de torn', exact=True).check()
            expect(branch).to_be_visible()
            q3.get_by_label('No he utilitzat el nou sistema en aquest període', exact=True).check()
            expect(branch).to_be_hidden()
            q3.get_by_label('Gestionar canvis de torn', exact=True).check()
            q1.get_by_label('No ho puc valorar', exact=True).check()
            expect(branch).to_be_hidden()
            q1.get_by_role('button', name='Deixar sense resposta').click()
            expect(branch).to_be_hidden()
            q1.get_by_label('Gens d’acord', exact=True).check()
            expect(branch).to_be_visible()
            branch.get_by_role('textbox').fill('Les instruccions estan disperses.')
            participant.screenshot(path=str(OUTPUT / 'participant-mobile.png'), full_page=True)
            assert not participant.evaluate('document.documentElement.scrollWidth > innerWidth')
            participant.get_by_role('button', name='Enviar la meva resposta').click()
            expect(participant.get_by_role('heading', name='Gràcies per compartir la teva experiència.')).to_be_visible()
            participant.reload()
            participant.get_by_label('Credencial de demo').fill('DEMO-0001')
            participant.get_by_role('button', name='Accedir a la consulta').click()
            expect(participant.locator('#participant-error')).to_contain_text('No s’ha pogut autoritzar')
            page.get_by_role('button', name='Tancar recollida i calcular resultats').click()
            page.get_by_role('button', name='Tancar i calcular resultats', exact=True).click()
            expect(page.get_by_text('Dades insuficients per mostrar resultats d’aquesta onada.', exact=False)).to_be_visible()
            page.goto(BASE + '/#overview')
            expect(current_step).to_contain_text('Llegir els resultats')

            page.goto(BASE + '/#campaign/torns-inicial/action')
            expect(page.get_by_role('heading', name='Propostes d’acció')).to_be_visible()
            page.get_by_role('button', name='Escollir acció i crear seguiment').first.click()
            expect(page.locator('#main')).to_contain_text('Seguiment · Nou sistema de torns')
            expect(page.locator('[data-question="comprensio"] summary')).to_contain_text('Tinc clar com funciona el nou sistema de torns.')
            page.goto(BASE + '/#overview')
            cycle_picker.select_option('torns-inicial')
            expect(current_step).to_contain_text('Decidir i fer seguiment')
            page.goto(BASE + '/#campaign/torns-inicial/results')
            page.get_by_text('Detall de les respostes i de la mostra', exact=True).click()
            expect(page.get_by_role('heading', name='Resultats de la consulta')).to_be_visible()
            page.screenshot(path=str(OUTPUT / 'results-desktop.png'), full_page=True)
            page.goto(BASE + '/#calibration')
            expect(page.get_by_role('heading', name='Sense dades històriques')).to_be_visible()
            page.goto(BASE + '/#actions')
            expect(page.get_by_role('heading', name='Accions i seguiment')).to_be_visible()
            page.goto(BASE + '/#campaigns')
            expect(page.locator('#campaign-search')).to_be_visible()
            page.locator('#campaign-search').fill('NO-MATCH')
            expect(page.get_by_role('heading', name='Cap coincidència')).to_be_visible()
            page.goto(BASE + '/#settings')
            expect(page.get_by_role('heading', name='Integracions')).to_be_visible()
            assert not errors, errors
            browser.close()
            print(json.dumps({'ok': True, 'browser_errors': errors, 'breakpoints': [320, 768, 1024, 1440],
                              'flows': ['RRHH login/error', 'create/edit/approve/publish', 'QR', 'participant branches/error/submit',
                                        'single-response', 'close/privacy', 'action/follow-up', 'results', 'calibration', 'search', 'integrations']}, ensure_ascii=True))
    finally:
        server.terminate()
        server.wait(timeout=10)
