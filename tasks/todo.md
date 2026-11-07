# Tasques · PostgreSQL i cas A

Estat: implementació PostgreSQL i webhook en curs; verificació remota pendent. Dependències indicades per número.

| # | Tasca | Acceptació | Verificació | Depèn de | Àrees previstes |
|---|---|---|---|---|---|
| 1 | Connectar PostgreSQL | DATABASE_URL només al servidor; migració versionada; base demo separada | Crear una base buida i reconnectar després de reiniciar | — | package.json, lockfile, .env.example, app/db.mjs, migració SQL |
| 2 | Persistir la preparació de campanyes | Crear/editar/aprovar/publicar desa versions; editar revoca aprovació; publicació repetida no duplica | Test d’integració PostgreSQL de versions, transaccions i cridadors async | 1 | app/store.mjs, app/server.mjs, tests/store.test.mjs, tests/http.test.mjs |
| 3 | Persistir recollida i resultats | Respostes i vincles consistents; tancament immutable; tests existents adaptats a PostgreSQL | Provar acceptació, duplicats, rollback, reinici i tancament sobre PostgreSQL | 2 | app/store.mjs, app/server.mjs, tests/store.test.mjs, tests/http.test.mjs |
| 4 | Crear la consulta inicial del cas A | Descripció sobre rotació de torns; 3–6 preguntes generades; aprovació anterior a Typeform | Browser: generar, revisar, aprovar i recuperar definició publicada; cronometratge humà pendent | 2 | tests/live-survey.py, document del guió, app/providers.mjs si cal |
| 5 | Importar Typeform a PostgreSQL | Mateixa normalització per versió; unicitat formulari/resposta; admissió demo explícita i separada de producció | Una resposta real de prova; importar-la dos cops deixa un registre; imports no autoritzats bloquejats fora de demo | 3, 4 | app/providers.mjs, app/server.mjs, app/store.mjs, tests/providers.test.mjs, tests/http.test.mjs |
| 6 | Generar i carregar la primera onada sintètica | Script amb llavor reproduïble; respostes vàlides per IDs reals; origen synthetic i etiquetes esperades fora de la IA | Carregar 300 respostes; repetir sense duplicar; comprovar recompte i que arrencar l’app no carrega fixtures | 3, 4 | scripts/generate-demo.mjs, app/domain.mjs, app/store.mjs, tests/demo.test.mjs |
| 7a | Mostrar agregats del cas A | Mètriques calculades en servidor; distribucions i participació amb bases; protecció n<10 i complements | Dataset conegut; torn desequilibrat, omissions, manca de denominador i grup petit | 6 | app/domain.mjs, public/app.js, tests/domain.test.mjs, tests/browser.py |
| 7b | Habilitar comentaris sintètics per a Groq | Retirar dependència de frases admissibles fixes; excloure dades identificatives; guardar temes validats i versió del model | Provar noms/contactes sintètics, text buit, instruccions dins del comentari i fallada de Groq; comparar amb etiquetes ocultes | 5, 6 | app/domain.mjs, app/providers.mjs, app/server.mjs, tests/domain.test.mjs, tests/providers.test.mjs |
| 8a | Proposar accions amb evidència | Groq rep només evidència publicable; cada proposta cita IDs existents; People aprova | Rebutjar IDs inventats i comprovar preservació de resultats quan Groq falla | 7a, 7b | app/providers.mjs, app/store.mjs, app/server.mjs, public/app.js, tests/providers.test.mjs |
| 8b | Crear i comparar seguiment | Acció i context generen esborrany; conservar mesures comparables; 300 respostes noves només després de definir versió | Comparar períodes per bases i composició; no mostrar evolució aparellada sense vincles fiables; no inferir causalitat | 8a | app/store.mjs, scripts/generate-demo.mjs, app/domain.mjs, tests/store.test.mjs, tests/domain.test.mjs |
| 9 | Assajar demo completa | Etiquetes sintètiques visibles; cap insight prefabricat; captures de contingència i límits explicats | Suite Node sobre PostgreSQL; navegador desktop/mòbil; execució completa del guió | 5–8b | tests/browser.py, tests/live-survey.py, README.md, docs/implementation.md, document del guió |

## Comprovacions de l’equip

- [ ] Després de 1–3: persistència PostgreSQL, contractes i autorització revisats; dades anteriors preservades.
- [ ] Després de 4–6: consulta del cas A revisada, import Typeform real i càrrega sintètica diferenciats.
- [ ] Després de 7a–8b: revisar privacitat, classificació, evidències i comparabilitat; deixar constància dels límits.
- [ ] Després de 9: assaig de menys de dos minuts per respondre i comprovació de la demo amb l’equip.

## Fora del primer tall

- [ ] Control d’un enviament per persona: pendent, sense declarar-lo resolt per deduplicació tècnica.
- [ ] Webhook signat amb recuperació via Responses API: només si el flux manual ja funciona i queda temps.
- [ ] Desplegament i tractament de dades personals reals: fora de la demo.

## Progrés · Preparació PostgreSQL

- [x] Configuració local Compose, port només localhost i volum persistent.
- [x] Variables documentades i secrets locals generats fora de Git.
- [ ] Instal·lar/obrir Docker Desktop i comprovar PostgreSQL amb connexió real.
- [ ] Client Node i migracions de l’aplicació: encara pendents; la tasca 1 no està completada.

Instruccions: `../docs/postgresql-setup.md`. La web encara utilitza SQLite.


## Progrés · Supabase i connexió remota

- [x] Client pg, persistència asíncrona i proves SQLite conservades.
- [x] Migració PostgreSQL amb JSONB, esquema privat, RLS i transaccions.
- [x] Proves PostgreSQL embegut: versions, unicitat, tancament, seguiment i sessions compartides.
- [x] Recepció Typeform signada i registre de webhook des de Difusió; importació manual compartida.
- [x] Proves Node/navegador i auditoria de dependències de producció.
- [x] Projecte Supabase creat al compte de l’equip; DATABASE_URL i CA oficial configurats només al servidor.
- [x] `pnpm db:check` contra Supabase, escriptura sintètica revertida i inici de sessió/lectura/tancament de sessió del servidor real verificats.
- [ ] Desplegar web HTTPS i comprovar notificació real Typeform → servidor → Supabase.

Docker és opcional. Les comprovacions humanes d’etapa continuen pendents.
