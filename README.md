# Damm_Hack · Escolta activa

Proposta per al repte Damm de la UAB The Hack! 2026. El cas de demo és un canvi de torns en una fàbrica fictícia de Catalunya. RRHH prepara una microconsulta, la publica per QR amb Typeform i utilitza els resultats agregats per decidir una acció i preparar-ne el seguiment. Un sondeig històric sintètic compara una referència completa amb una recollida voluntària i aporta context per interpretar la mostra.

## Executar la web

Cal **Node.js 24 o superior** i **pnpm 11.25.0**. No hi ha pas de compilació ni serveis locals addicionals.

```powershell
pnpm install --frozen-lockfile --ignore-scripts
pnpm start
```

Sense pnpm al PATH, instal·la aquesta versió amb el teu gestor habitual. També es pot cridar directament el seu `bin/pnpm.cjs` amb Node. Un cop instal·lada l’única dependència, es pot arrencar sense gestor:

```powershell
node --env-file-if-exists=.env app/server.mjs
```

Obre [http://127.0.0.1:3000](http://127.0.0.1:3000). En mode de demo, la contrasenya sintètica de People és **`equip-damm`**. La sessió dura 8 hores i es guarda en una cookie HttpOnly/SameSite. El botó «EP» tanca la sessió.

El mode per defecte és **demo local**, sense crides a Typeform ni generació IA simulada. SQLite crea la migració i la llavor automàticament en la primera arrencada. Les dades persisteixen a `data/demo.sqlite`; els reinicis no tornen a inserir la llavor. La clau local aleatòria de pseudonimització també persisteix dins de `data/`, exclòs de Git.

## Recorregut de demo

1. **Visió general.** Tres campanyes inicials: una tancada amb 180 fixtures, una oberta sense respostes i un esborrany. Només les onades tancades publiquen recomptes; un guió indica dades no disponibles o protegides.
2. **Campanya inicial → Resultats.** Comprensió i suport separats, bases vàlides, dificultats, temes i composició. La llavor té 132 respostes de Dia i 48 de Nit, sobre una població sintètica de 360 i 240. Els percentatges descriuen aquesta mostra.
3. **Calibració.** Setembre: referència `[53,109,275,112,51]` (600) i voluntària `[46,32,68,49,45]` (240). Taxa aparent 40%; extrems 17,3% i 37,9%; diferència 20,6 punts abans d’arrodonir. No es relaciona amb identitats ni es fa servir per corregir les puntuacions actuals.
4. **Nova consulta.** Completa necessitat i públic. L’editor parteix de l’exemple exacte de la plantilla, amb una introducció adaptada al tractament pseudonimitzat. Edita preguntes adaptables, opcions i obligatorietat, o utilitza l’editor JSON per canviar tipus, afegir preguntes o definir condicions. El servidor valida tot el contracte. Moure o eliminar un ítem fix no està permès.
5. **Previsualització.** Q1=`1` i Q3 amb una dificultat mostren l’aclariment; Q1=`2`, no valorable, no ús, negativa i omissions no l’activen. Les tres preguntes comunes i l’aclariment són opcionals a l’exemple inicial. La durada de 90 s és estimada, pendent de cronometratge amb persones.
6. **Aprovar i publicar.** Aprova la versió exacta. Editar-la crea una revisió nova pendent d’aprovació. Publicar dues vegades recupera la mateixa publicació. Un cop publicada, no es pot editar aquesta onada.
7. **Difusió.** Descarrega el QR SVG o imprimeix-lo. El QR obre la pàgina pròpia d’accés. En demo utilitza el formulari local; no s’atribueix aquesta recollida a Typeform.
8. **Respondre.** Obre l’enllaç en una pestanya privada o en mòbil i utilitza una credencial fictícia `DEMO-0001`–`DEMO-0600` per a Planta: 0001–0360 són Dia; 0361–0600 són Nit. Els altres col·lectius tenen 120 credencials de demo (72 Dia, 48 Nit). Les credencials són pròpies de cada cicle i es reutilitzen entre les seves onades. No introdueixis IDs reals. Una sessió abandonada permet tornar a accedir; una resposta acceptada impedeix una segona acceptació a aquella onada.
9. **Tancar recollida.** Confirma el tancament per obtenir una única instantània immutable. Si hi ha menys de 10 respostes, les dades queden protegides. El tancament bloqueja nous enviaments i imports. No es pot reobrir aquesta onada.
10. **Acció i seguiment.** A la campanya inicial, escull «Un únic lloc per a les instruccions». Es crea un únic esborrany de seguiment amb el mateix públic, cicle i ítems fixos. Publica’l i respon amb les mateixes credencials fictícies per provar l’aparellament. Sense base suficient i pèrdues publicables no es mostra evolució de parelles. No s’infereix causalitat.

El QR amb `127.0.0.1` només és útil al mateix ordinador. Per provar-lo des d’un telèfon, configura un origen accessible amb `PUBLIC_ORIGIN` i, si cal, `HOST`. La protecció CSRF exigeix fer servir exactament l’origen configurat. En desplegament remot connectat s’exigeix HTTPS.

## Connectar Typeform i IA

Copia `.env.example` a `.env` i completa els valors localment. No enganxis secrets al xat, no els pugis a Git ni els capturis en pantalla.

| Variable | Ús |
| --- | --- |
| `APP_MODE` | `demo` (per defecte) o `connected` |
| `PORT`, `HOST` | Per defecte `3000`, `127.0.0.1` |
| `PUBLIC_ORIGIN` | Origen exacte amb esquema i port, sense barra final |
| `DB_PATH` | Opcional. Per defecte `data/demo.sqlite` o `data/connected.sqlite`, separats |
| `ADMIN_PASSWORD` | Obligatòria en connectat, mínim 8 caràcters; utilitza’n una llarga i única |
| `HMAC_SECRET` | Obligatòria en connectat, mínim 32 caràcters aleatoris. Mantén-la durant tot un cicle |
| `TYPEFORM_TOKEN` | Token només al servidor amb accés als formularis de prova |
| `OPENAI_API_KEY`, `OPENAI_MODEL` | Responses API amb un model del teu compte compatible amb JSON |

No es crea cap Site, compte de pagament ni desplegament automàtic. El mode connectat comença amb una base buida; crea una campanya des de la UI. La plantilla fixa continua disponible si la IA falla. Les crides al model poden reintentar un únic 429 si el proveïdor indica una espera de fins a 3 segons; en esperes més llargues es retorna el termini al navegador. Les fallades conserven l’esborrany.

Per a Typeform, comprova al compte la disponibilitat de Create API, Responses API, paràmetres ocults i salts lògics. Amb OAuth, utilitza els àmbits mínims `forms:write`, `forms:read`, `responses:read` per als formularis de prova; un token personal s’ha de restringir tant com permeti el compte. El compte/pla real no s’ha pogut verificar. La neteja al proveïdor pot requerir permisos addicionals.

La publicació transforma cada escala en selecció única amb les sis opcions etiquetades, sense aleatoritzar-les. Els salts utilitzen els IDs estables i condicions AND/OR. La importació manual recorre les pàgines, reconstrueix el salt i deduplica per formulari/resposta, a més de la unicitat per credencial/onada.

Un error HTTP remot confirmat que no pot haver creat el formulari conserva l’aprovació. Un timeout o resultat incert bloqueja reintents fins a reconciliar. «Reconciliar publicació» cerca el marcador únic i valida camps/opcions. Si el resultat continua sense resoldre’s, revisa el compte abans d’intentar crear-ne cap altre. No es pressuposa una clau d’idempotència de Typeform.

**Límit de confiança:** Typeform pot rebre enviaments directes. Un paràmetre ocult no és autenticació. L’app només accepta una resposta amb bearer d’entrega vàlid i no consumit, vinculat a l’onada i a una credencial autoritzada. No s’envia el pseudònim persistent al proveïdor. Les sessions d’entrega caduquen als 30 minuts: en aquest prototip cal importar dins d’aquest termini. Les respostes rebutjades queden fora dels agregats, però poden continuar al compte Typeform fins que es netegin.

## Privacitat i conservació

- Només dades sintètiques. HMAC-SHA256 al servidor amb normalització NFKC/trim/majúscules, versió i cicle. No es desa l’ID original ni es mostra el pseudònim al dashboard. Conèixer la credencial permet suplantar-la: aquesta demo no prova identitat física.
- Taules restringides de credencials, sessions i aparellament separades de l’analítica. Les API de People només retornen agregats. No hi ha endpoint de respostes individuals ni exportació de text cru.
- `n ≥ 10` al servidor, supressió complementària en torns, categories, orígens i bases aparellades. No hi ha recomptes incrementals ni filtres arbitraris: es publica una instantània immutable al tancament.
- **Filtre de text restrictiu de demo:** només s’accepten les cinc frases sintètiques explícites d’`app/domain.mjs`. Qualsevol altre text es descarta abans de persistir-lo o enviar-lo al model; les respostes tancades vàlides es conserven. Això evita atribuir a una expressió regular una detecció perfecta de noms o detalls singulars. Cal substituir i validar aquest filtre abans d’analitzar comentaris reals.
- La IA de generació rep la plantilla versionada. La classificació només rep textos admissibles amb IDs efímers; les recomanacions reben evidència agregada i un catàleg tancat d’accions. Les mètriques i els llindars sempre els calcula el servidor. La demo utilitza regles explícites, etiquetades com a tals.
- Neteja local automàtica a l’arrencada i cada hora: sessions caducades, intents caducats i entregues antigues. Als 30 dies s’eliminen respostes individuals i vincles d’onades tancades; poden deixar de ser aparellables. Les credencials s’eliminen quan tot el cicle està tancat i ha superat el termini. Les instantànies agregades finals es conserven.
- **Neteja de Typeform i còpies:** elimina manualment les respostes de prova (acceptades i rebutjades) i els formularis de demo al proveïdor quan acabi la prova; elimina també les còpies de SQLite i backups. La purga local no esborra dades del proveïdor ni de còpies externes. Un ús real requeriria revisió d’autenticació, base jurídica i conservació abans de carregar dades.

## Comprovacions

```powershell
pnpm test
pnpm check
pnpm audit --prod --audit-level high
```

La prova de navegador utilitza una base temporal i no modifica la demo de treball. Opcionalment, amb Python, Playwright i Chromium instal·lats:

```powershell
python tests/browser.py
```

Verificacions executades: **20 proves Node** de domini, persistència, autorització, concurrència de sessions, ocultació, adaptadors amb mocks i HTTP local; instal·lació congelada sense scripts; auditoria sense vulnerabilitats conegudes. Prova Chromium del recorregut de RRHH i participant amb errors, branques, QR, tancament, acció/seguiment i amplades de 320, 768, 1024 i 1440 px, sense errors JS. Les captures es generen a `test-results/`, exclòs de Git.

**Verificació connectada (Groq + Typeform):** generació real amb `openai/gpt-oss-120b`, creació del formulari de quatre preguntes, activació real de l’aclariment, enviament sintètic, classificació amb Groq i dues importacions amb una sola resposta acceptada. OpenAI i la reconciliació remota d’un timeout no s’han provat amb el compte. El cronometratge amb persones i la revisió humana de les etapes continuen pendents. El brandkit és provisional i no s’ha aportat un logotip oficial.

## Documents del projecte

- [Model lògic del prototip](stages/02_model-logic/output/model-logic.md) · proposta per revisar amb l’equip.
- [Model conceptual](model_conceptual_escolta_activa_damm.svg) · recorregut visual del cas.
- [Especificació del prototip](.plans/escolta-activa-damm-spec.md) · abast i guió de demo.
- [Handoff del hackathon](.plans/escolta-activa-damm-handoff.md) · acords de l’entrevista i tasques de les parelles.
- [Guia del repte](guia_participants_repte_damm.md) · requisits i criteris d’avaluació.
- [Mapa de treball ICM](CONTEXT.md) · etapes, entrades i revisions.

## Connexió Groq

El servidor també admet `LLM_PROVIDER=groq`, `GROQ_API_KEY` i `GROQ_MODEL=openai/gpt-oss-120b`. Utilitza Chat Completions de Groq amb JSON i la mateixa validació de contracte. Les claus només són a `.env`, exclòs de Git. La instància connectada local utilitza el port 3001. [Documentació de Groq](https://console.groq.com/docs/model/openai/gpt-oss-120b).

La prova real ha generat quatre preguntes amb Groq i ha creat un formulari de Typeform amb les opcions i els salts. El JSON del proveïdor utilitza OR d’AND amb referències de tipus `choice`; cada llista té com a màxim un salt `always`, al final. Les proves externes de resposta/importació es registren separadament de les proves amb mocks.

La instància connectada està a http://127.0.0.1:3001 (People: contrasenya local de prova `equip-damm`). El formulari de verificació és https://form.typeform.com/to/gDVtKShZ. El QR a `data/qr-groq-typeform.svg` obre l’accés local autoritzat, no el formulari públic sense sessió. Per obrir aquest accés des d’un mòbil extern cal un origen HTTPS accessible.

Les preguntes de referència s’incorporen de manera determinista al servidor després de la generació. No es confia en la còpia literal del LLM. La validació d’edicions i aprovacions continua protegint la definició i la posició d’aquests ítems.

El generador envia només la secció operativa de la plantilla i un exemple d’adaptables, evitant carregar tot el manual a cada crida. En la comprovació connectada el consum ha estat d’uns 3.500 tokens. Un 429 conserva `Retry-After`, es mostra com a límit temporal i bloqueja la generació amb compte enrere. Les publicacions Typeform no es reintenten automàticament. Compte enrere comprovat al navegador amb una resposta 429 simulada.
