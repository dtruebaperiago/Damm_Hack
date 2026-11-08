---
status: handoff-tecnic
updated: 2026-11-08
---

# Handoff · PostgreSQL/Supabase i Typeform

## Estat vigent · 8/11/2026

- Integració Supabase a `main` des de `0a0d6d8`; càrrega PostgreSQL explícita corregida a `70bbf04`.
- 37 proves Node, comprovacions de sintaxi i prova Chromium superades.
- Dues enquestes sintètiques provades amb Typeform real i importació manual a Supabase; dues respostes acceptades en total en acabar les proves de l’agent.
- A petició de l’usuari, les sis campanyes de l’etapa 03 ja són a la base Supabase connectada: 1.140 respostes representades en agregats i quatre accions amb seguiment. La segona càrrega insereix zero campanyes; es conserven les cinc campanyes prèvies i les dues respostes Typeform. No s’han inserit files individuals sintètiques a `accepted`.
- Evidència local exclosa de Git: `test-results/realistic-survey-proof.json` i `test-results/supabase-stage03-seed-proof.json`.
- Web local a `http://127.0.0.1:3002`. Recepció automàtica remota pendent de servidor HTTPS. La deduplicació per navegador impedeix repetir la mateixa onada amb la mateixa cookie.
- Els apartats següents conserven el traspàs històric; les afirmacions anteriors a aquesta actualització no descriuen necessàriament l’estat vigent. Les revisions humanes de les etapes continuen pendents.

## Actualització · comprovació del 8/11/2026

La integració sobre `58fdfe5` s’ha recuperat preservant l’accés per navegador, importació diferida, simulació i metadades de la UI. L’estat descrit més avall és el punt de partida històric.

- Connexió real Supabase amb TLS verificat i migració 1 comprovada.
- Consulta existent `373b2017-d63c-4e3d-bee8-a360165bdecc`, versió 3, aprovada i publicada per a la prova sintètica: `TQfGnETl`.
- Una resposta sintètica enviada al Typeform real des de `/participa/{id}`. Importada mitjançant el servidor a `escolta.accepted` i `escolta.response_links`; repetir la importació deixa un únic registre. Valors comprovats, torn desconegut i resultat individual protegit.
- Evidència sense secrets: `test-results/typeform-supabase-proof.json` (local, exclosa de Git).
- Les altres dues campanyes existents s’han conservat. No s’ha carregat la simulació a Supabase.
- Falta desplegar el servidor en HTTPS i provar el lliurament remot del webhook. Les revisions de les etapes continuen pendents.

## Encàrrec i abast

Reprendre la integració de la base de dades compartida amb Typeform per a la demo del cas A del hackathon. L’usuari vol que l’equip pugui consultar la mateixa informació des d’una web compartida, amb dades exclusivament sintètiques. Deixar fora els problemes de generació/creació de l’enquesta: aquest handoff tracta persistència, recepció de respostes, accés i desplegament.

Llegir primer `AGENTS.md`, `CONTEXT.md` i el contracte de l’etapa afectada. Les revisions humanes de les etapes continuen pendents.

## Estat de Git: comprovar abans de tocar res

Estat observat en preparar aquest document:

- Branca activa: `main`, commit `58fdfe5` — «Connecta la simulació, simplifica les consultes i enllaça respostes de Typeform».
- La integració PostgreSQL/Supabase està al commit local `0aca97c`, branca `codex/integrate-supabase-new-ui`. No s’ha fet push d’aquesta branca des d’aquest xat.
- **El main actual encara utilitza SQLite**: `app/store.mjs` importa `DatabaseSync`. No hi ha `app/db.mjs` ni `app/typeform-ingest.mjs` a l’arbre actiu. Són a la branca d’integració.
- GitHub Desktop conserva dues reserves (`git stash list`): una de la branca d’integració i una de main. No aplicar-les ni eliminar-les a cegues. La branca/commit és la font principal per recuperar la integració; les reserves poden contenir feina addicional fora d’aquest abast.
- La web del port 3002 pot tenir un procés que va carregar codi abans del canvi de branca. Verificar el procés i reiniciar-lo després d’integrar; veure una web oberta no demostra quin backend s’està executant.

**Prioritat:** integrar `0aca97c` sobre el main actual en una branca nova i resoldre els conflictes conservant les millores de `58fdfe5`. No restaurar una versió antiga de main sencera ni perdre els canvis del company.

## Supabase ja existeix i s’ha verificat

- Projecte: **damm hack**, organització **Damm Hack**, regió Frankfurt (`eu-central-1`).
- Referència: `csdjtzpusvijtnarwvzv`.
- Panell: https://supabase.com/dashboard/project/csdjtzpusvijtnarwvzv
- Esquema privat: `escolta`. Migració d’aplicació 1, registrada a `escolta.migrations`.
- Deu taules: `migrations`, `historical_calibrations`, `waves`, `revisions`, `credentials`, `deliveries`, `accepted`, `response_links`, `sessions`, `rate_limits`.
- JSONB per a configuració, definició de preguntes, respostes i resultats/propostes. Relacions i unicitat en SQL. RLS activat a les deu taules; sense accés públic a l’esquema.
- S’ha verificat una escriptura sintètica i el flux de campanya dins d’una transacció revertida, més inici de sessió/lectura/tancament de sessió del servidor real.
- S’ha creat posteriorment una consulta real de prova des de la web. Es pot reutilitzar l’esborrany `373b2017-d63c-4e3d-bee8-a360165bdecc` si encara existeix: «Cas A · Canvi de torns · Prova RRHH». L’última comprovació el deixava en v3, quatre preguntes, sense aprovació ni publicació. No es van enviar respostes de participant.
- No buidar la base ni carregar-hi automàticament exemples. No assumir que continua buida; preservar les campanyes de l’usuari.

## Secrets i connexió

Les credencials ja són al `.env` local, exclòs de Git. **No imprimir-lo, no copiar claus al xat ni pujar-les al repositori.** Comprovar presència de variables sense mostrar valors.

Variables rellevants:

- `DATABASE_URL`: connexió PostgreSQL al Session pooler, adequada per IPv4. Host `aws-1-eu-central-1.pooler.supabase.com`, port 5432, usuari `postgres.csdjtzpusvijtnarwvzv`, base `postgres`. La contrasenya queda només al secret local.
- `DATABASE_SSL_CA_FILE=app/certs/supabase-ca.crt`: CA pública oficial. El fitxer és a la branca d’integració. La connexió real va requerir aquesta CA; **no desactivar `rejectUnauthorized` ni TLS**.
- `TYPEFORM_TOKEN`, `TYPEFORM_WEBHOOK_SECRET`, `PUBLIC_ORIGIN`, `ADMIN_PASSWORD`, `HMAC_SECRET`.
- `LLM_PROVIDER`, `GROQ_API_KEY`, `GROQ_MODEL`: per als adaptadors ja existents; Groq no té credencials ni accés directe a PostgreSQL.

El `.env` es conserva entre canvis de branca: que contingui DATABASE_URL no vol dir que el main SQLite la faci servir. A `0aca97c`, DATABASE_URL selecciona PostgreSQL, buit selecciona SQLite i una connexió remota fallida no provoca alternativa silenciosa.

## Fitxers a recuperar de la integració

- `app/db.mjs`: pool pg, TLS verificat, consultes parametritzades, transaccions, migracions.
- `app/migrations/postgres/001_initial.sql`: esquema privat, JSONB, índexs, unicitat i RLS.
- `app/certs/supabase-ca.crt`: certificat públic oficial, no és una clau privada.
- `app/store.mjs`: contracte asíncron (`await new Store(...).init()`), bloqueig de fila, persistència i tancament immutable.
- `app/server.mjs`: `createApplication` asíncron, selecció de base i endpoints integrats.
- `app/typeform-ingest.mjs`: normalització i admissió compartides per import manual i webhook.
- `app/providers.mjs`: client Typeform amb registre del webhook.
- `scripts/database.mjs`, `package.json`, `pnpm-lock.yaml`: `pnpm db:check`, dependència `pg` i PGlite només per a proves.
- `docs/postgresql-setup.md`: configuració detallada, disponible en aquesta branca.
- Proves: `tests/database.test.mjs`, `tests/postgres-store.test.mjs`, `tests/webhook.test.mjs` i els cridadors adaptats a async.

Llegir-los amb `git show codex/integrate-supabase-new-ui:RUTA` abans d’integrar si cal. No substituir indiscriminadament els fitxers nous de main pels antics de la branca.

## Novetats de main que cal preservar en la migració

`58fdfe5` aporta `app/simulation.mjs`, canvis de la UI i de la consulta, i un nou accés Typeform per navegador. Revisar especialment `tests/typeform-browser.test.mjs` i `docs/adr/0002-codi-de-seguiment-al-navegador.md`.

- `browserDelivery` deriva un participant pseudonimitzat d’una cookie per sèrie. No exigeix la credencial manual de demo per a Typeform. Marca el torn com a **Desconegut**; no inventar Dia/Nit.
- Cookie de sèrie `ea_series_…`; bearer d’entrega en `ea_typeform_delivery`, amb camí `/go/{id}`. El redirect passa el bearer al paràmetre ocult `delivery` de Typeform.
- El control és per navegador/cookie i sèrie, **no prova una persona única**. L’usuari ha ajornat el control fort d’identitat.
- La importació diferida comprova que la resposta es va enviar dins de la finestra vàlida del bearer. **Ja no exigeix que la importació es faci abans de la caducitat actual del bearer.** No reintroduir la limitació antiga de la branca Supabase.
- La neteja conserva entregues d’onades Typeform obertes i aplica la conservació posterior segons el tancament. La SQL nova de SQLite utilitza `unixepoch` i `json_extract`: cal traduir-la a PostgreSQL, mantenint la mateixa política de conservació.
- Cal adaptar els nous mètodes, cridadors i tests a async, mantenint `has_questions` i `has_followup` per al cicle de la UI.
- Preservar la separació entre dades de simulació, dades locals i respostes Typeform reals. Una fila sintètica local no és una tramesa rebuda del proveïdor.

## Flux Typeform → base de dades

Dues vies previstes, amb la mateixa validació:

1. **Manual:** People prem «Importar respostes de Typeform». El servidor consulta Responses API i desa respostes admissibles. La unicitat `(form_id, external_id)` impedeix duplicar una importació.
2. **Automàtica, implementada a la branca d’integració:** `POST /api/webhooks/typeform`. Verifica HMAC sobre els bytes originals amb TYPEFORM_WEBHOOK_SECRET; desa abans de confirmar recepció. La resta d’endpoints conserva CSRF.

L’acció autenticada `POST /api/campaigns/{id}/webhook` registra al proveïdor un webhook de respostes completes. La UI l’activa amb «Connectar recepció automàtica». Exigeix PUBLIC_ORIGIN HTTPS pública i secret de signatura. El localhost actual no és un endpoint públic per a Typeform.

**QR d’accés de plataforma** → `/participa/{id}` → emissió del bearer → `/go/{id}` → Typeform amb `delivery` → resposta admissible. **QR directe Typeform** → formulari sense aquest pas → la tramesa pot existir al proveïdor, però sense bearer vàlid queda fora dels agregats. No confondre disponibilitat del formulari amb admissió de la resposta.

Les respostes es desen a `escolta.accepted` i els vincles restringits a `escolta.response_links`. No exposem respostes individuals al dashboard. Els resultats s’obren en tancar la recollida i protegeixen bases inferiors a 10 i complements petits.

## Groq: límit de responsabilitat

El servidor valida les respostes, calcula mètriques i prepara evidències agregades. Groq retorna propostes estructurades; el servidor les valida i RRHH decideix. El webhook de la branca d’integració no espera una crida Groq. El text lliure arbitrari continua requerint una depuració de privacitat revisada i, per a recepció automàtica, processament diferit persistent. No donar aquesta part per resolta perquè hi hagi una connexió SQL.

## Següents passos, en ordre

1. Revisar branques/reserves i integrar Supabase sobre main actual preservant l’accés per navegador, simulació i importació diferida descrits abans.
2. Instal·lar amb lockfile congelat. Executar `pnpm db:check` **després** de recuperar aquesta ordre. Comprovar amb una escriptura sintètica revertida i reiniciar una única instància del servidor.
3. Des de la UI, reutilitzar una consulta revisada, aprovar-ne la versió i publicar a Typeform. No crear un segon formulari si ja hi ha `form_id`.
4. Obrir l’accés de plataforma, enviar una resposta sintètica a Typeform i importar-la manualment. Comprovar el registre a Supabase. Repetir importació: ha de continuar havent-hi un sol registre.
5. Provar també una importació posterior als 30 minuts amb `submitted_at` vàlid, cookies per sèrie, torn desconegut, resposta repetida i onada tancada.
6. Desplegar **també el servidor Node** en HTTPS públic. Supabase només allotja la base; no publica aquesta web automàticament. No hi ha allotjament web públic seleccionat ni verificat encara.
7. Configurar PUBLIC_ORIGIN i secrets al servidor desplegat; registrar el webhook. Enviar una altra resposta real sintètica i verificar automàticament Typeform → servidor → Supabase, incloent reentrega sense duplicats.
8. Donar accés als desenvolupadors a Supabase i als usuaris a la web amb permisos adequats. Encara no s’han enviat invitacions des d’aquest xat. No compartir una contrasenya administrativa al navegador ni assumir que compartir l’agent concedeix accés als companys.

## Comprovacions i evidència

Sobre `0aca97c` es van verificar 31 proves Node, Chromium a 320/768/1024/1440 i connexió real Supabase. **No extrapolar aquest resultat al main actual ni a la futura fusió.** Cal tornar a executar els tests després d’integrar, especialment els nous de Typeform per navegador.

Ordres un cop integrada la branca:

```powershell
pnpm install --frozen-lockfile --ignore-scripts
pnpm test
pnpm check
pnpm db:check
python tests/browser.py
```

Si pnpm no és al PATH, en aquest ordinador s’ha fet servir el `pnpm.cjs` del runtime Node de Codex. No és un requisit portable del projecte.

Evidència local exclosa de Git: `test-results/supabase-proof.json`, `test-results/supabase-ready.jpg`, `test-results/rrhh-ui-check.json`, `test-results/rrhh-supabase-check.json`. Aquesta última comprovació va confirmar quatre enunciats visibles exactament iguals al JSONB de Supabase, amb zero respostes de participant per a aquella consulta.

**Encara no s’ha verificat una resposta real de Typeform entrant a aquesta base Supabase, ni el lliurament remot del webhook.** Una prova sintètica transaccional o un webhook simulat no substitueix aquesta comprovació.
