# Contracte d’implementació · Escolta activa

Estat: implementació integrada; revisió humana de les etapes pendent. [Estat tècnic](estat-tecnic.md).

Aplicació Node.js 24 amb frontend HTML/CSS/JS i persistència en SQLite o PostgreSQL. La demo local funciona amb SQLite. Typeform, Groq i OpenAI es configuren amb variables del servidor. Les campanyes comencen sense preguntes i la generació usa un contracte JSON amb els senyals agregats aplicables.

## Límit de confiança

L’accés al formulari de Typeform continua sent públic al proveïdor. El camp ocult `delivery` és un bearer token aleatori, caducable, vinculat al servidor a una onada i a un pseudònim. No és el pseudònim persistent. El servidor verifica l’autorització en importar: només una resposta autoritzada pot entrar als agregats. El proveïdor pot rebre trameses no autoritzades; no es promet impedir-les. Cal restringir l’accés al compte Typeform i netejar-ne les respostes de prova, incloses les rebutjades.

Les credencials fictícies es normalitzen amb NFKC, trim i majúscules, i es validen contra un conjunt provisionat. HMAC-SHA256 inclou versió i cicle: el mateix pseudònim es manté entre onades del mateix cicle. Mai s’emmagatzema l’ID original. El registre restringit d’autoritzacions està separat de les respostes analítiques. RRHH només accedeix a DTOs agregats, mai a tokens, pseudònims o respostes individuals. HMAC no verifica qui posseeix físicament una credencial.

En mode connectat, el QR de la plataforma obre la pantalla de participació. Quan la persona continua a Typeform, el servidor crea o renova una cookie pròpia aleatòria amb abast per sèrie, `HttpOnly`, `SameSite=Strict` i `Secure` amb HTTPS. La cookie caduca al cap de 30 dies. El servidor deriva el pseudònim intern amb HMAC i passa a Typeform només el camp `delivery` d’un sol ús, vinculat a l’onada i vàlid durant 30 minuts. La importació valida la data de tramesa i pot recuperar respostes enviades a temps mentre l’onada continuï en estat publicat.

Esborrar la cookie o canviar de navegador permet respondre amb un codi nou. Les respostes es poden comparar dins d’una sèrie quan provenen del mateix navegador i es conserva el codi. Els registres individuals de Typeform es purguen 30 dies després del tancament. El codi de navegador deixa el torn de feina desconegut. [Decisió de seguiment al navegador](adr/0002-codi-de-seguiment-al-navegador.md)

## Publicació de resultats

Les onades obertes no exposen recomptes canviants. RRHH tanca la recollida per obtenir una única instantània immutable; els imports posteriors queden bloquejats. Això evita revelar respostes noves per diferència entre actualitzacions. Bases inferiors a 10 se suprimeixen; els talls per torn se suprimeixen conjuntament si un és petit. Distribucions i mètriques també protegeixen categories i complements petits. El seguiment utilitza només parelles vàlides comparables i protegeix la base i les pèrdues.

## Disseny visual

Eina editorial de treball: barra lateral clara, vermell de marca, fons càlid i dades amb molt contrast. El resum permet obrir una campanya o crear una consulta. El detall separa preparació, consulta, difusió i resultats/acció. A mòbil, navegació compacta i una columna; formulari de participant separat i sense navegació de RRHH. S’utilitzen els tokens de la skill; el nom és text corrent perquè no s’ha aportat un logotip oficial.

## Anàlisi revisable i interfície

El tancament conserva els agregats immutables. Groq rep fitxes qualitatives amb referències a evidència publicable; el servidor conserva les xifres, comprova les cites i desa la revisió a `wave_analysis`. People confirma els suports dels temes i revisa la síntesi abans de seleccionar una acció i obrir-ne el seguiment. El diàleg autenticat de temes només mostra fragments sintètics admesos i referències efímeres. La purga retira els esborranys de temes i els suports restringits.

En la demo SQLite, si manca la calibració a la base, el servidor llegeix el resum sintètic de setembre. A **Consulta**, `adaptacions[].pregunta_id` enllaça una justificació de format amb una pregunta. **Cobertura** i **Moment** indiquen riscos contextuals; **Baixa participació** remet al sondeig aplicable. Aquestes notes són per a People i no formen part del formulari del participant.

**Presentació** mostra la diapositiva de la demo. **Difusió** incorpora el QR, els controls d’importació i webhook Typeform i una simulació de Microsoft Teams. **Resultats** separa els agregats de les campanyes, la comparació entre mostres i els KPI de l’etapa 03.

## Fonts de les integracions

- [Crear formularis](https://www.typeform.com/developers/create/reference/create-form/), [salts lògics](https://www.typeform.com/developers/create/logic-jumps/) i [recuperar respostes](https://www.typeform.com/developers/responses/reference/retrieve-responses/), consultats el 7/11/2026. No es pressuposa idempotència remota ni disponibilitat de funcions de pagament.
- [OpenAI · sortida estructurada](https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=responses): Responses API amb JSON i validació autoritativa al servidor. Model configurable, sense atribuir una crida real a les fixtures.

## Canvi de llenç en blanc · context del 7/11/2026

La petició de l’usuari substitueix la inicialització prefabricada de la demo. No s’insereixen campanyes, preguntes, textos classificats ni calibracions en arrencar. La configuració local apunta a una base nova i preserva les bases anteriors. Els diagnòstics previs no mostren insights sense dades. Les seleccions arbitràries es compten per l’ID real de cada pregunta amb la mateixa supressió de complements.

Difusió ofereix dos QR: l’accés de plataforma per autoritzar imports i l’URL Typeform directe per obrir el formulari des d’un mòbil. Les trameses directes sense bearer no entren als agregats de la plataforma. El text lliure es descarta fins que existeixi una depuració de privacitat revisada; s’han retirat les antigues frases i classificacions fixes.

La prova real ha creat https://form.typeform.com/to/k5rLOGmj a partir d’una descripció d’acollida a logística amb Groq. Quatre preguntes, esborrany v2 previ a l’aprovació, lectura posterior de Typeform coincident i QR descodificat al mateix URL. Evidència a `test-results/live-proof.json`. 23 tests Node i el recorregut Chromium passen. La revisió humana de les etapes continua pendent.

## PostgreSQL/Supabase i webhook · 8/11/2026

`DATABASE_URL` selecciona PostgreSQL; buit conserva SQLite local. `app/db.mjs` gestiona el pool pg, TLS verificat, paràmetres, transaccions amb el mateix client i migracions serialitzades a l’esquema privat `escolta`. JSONB es descodifica sense assumir ordre de claus. Les comparacions de públic són estructurals; les escriptures de campanya s’ordenen amb bloqueig de fila i els límits d’intents s’actualitzen atòmicament. No es cancel·la una publicació PostgreSQL en curs quan arrenca una altra instància: es pot reconciliar explícitament.

La persistència i els cridadors passen a ser asíncrons. `createApplication` retorna una promesa i `Store` requereix `await new Store(...).init()`. Les dades SQLite existents es conserven i no hi ha migració de contingut automàtica.

`app/typeform-ingest.mjs` és el camí compartit d’importació. `/api/webhooks/typeform` verifica la signatura HMAC dels bytes originals abans de desar; la resta d’endpoints manté la comprovació CSRF. El registre del webhook és explícit des de Difusió, exigeix HTTPS públic i no publica secrets al client. El webhook no espera Groq. Text lliure arbitrari i admissió sintètica sense participant continuen pendents.

Validació: 30 tests Node, incloent PostgreSQL embegut PGlite i clients de pool controlats; navegador a quatre amplades sense errors; auditoria de producció sense vulnerabilitats conegudes. La prova de connexió Supabase real i la recepció remota depenen de la creació del projecte, DATABASE_URL i allotjament HTTPS. La revisió humana de les etapes continua pendent.

Connexió Supabase real verificada el 8/11/2026 després d’afegir `DATABASE_SSL_CA_FILE` amb la CA oficial inclosa al repositori (certificat públic, sense clau privada). S’han verificat deu taules amb RLS, una prova de persistència revertida i l’API del servidor real. El desplegament HTTPS i l’entrega real del webhook continuen pendents. Evidència a `test-results/supabase-proof.json`.

## Integració amb Escoltamm · 8/11/2026

S’ha recuperat la implementació PostgreSQL/Supabase desada per GitHub Desktop i s’ha integrat amb la interfície `1886970`. Es preserven el logotip, els estils, els textos i el selector del cicle. `Store.list()` retorna també `has_questions` i `has_followup`, que determinen el pas actiu del cicle. El botó de recepció automàtica Typeform s’incorpora a la nova vista de difusió.

La funció compartida `seedCampaigns` i el comandament local `demo:seed` utilitzen el contracte asíncron, sense duplicar la lògica ni afegir exemples a l’arrencada o a Supabase. 31 proves Node, navegador amb el cicle complet a quatre amplades i connexió real Supabase verificats. La reserva original de GitHub Desktop es conserva com a còpia de recuperació. Les revisions humanes de les etapes continuen pendents.
