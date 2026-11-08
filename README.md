# Damm_Hack · Escolta activa

Prototip Node.js 24 amb PostgreSQL/Supabase o SQLite local per crear microconsultes a partir d’una necessitat de People. Les campanyes noves comencen sense preguntes ni resultats propis. La IA genera un esborrany; una aprovació explícita de la versió vigent precedeix la publicació a Typeform.

## Portals locals: demo amb dades i portal net

Els ports següents són els valors habituals, no bases de dades per si mateixos. Cal arrencar cada servidor i deixar la terminal oberta. Instal·la les dependències una vegada:

```powershell
pnpm install --frozen-lockfile --ignore-scripts
```

### Després d’apagar o reiniciar el PC: demo al 3022

La instància més recent comprovada el 8/11/2026 era la del port **3022**. Després de reiniciar el PC no queda engegada automàticament. Per tornar a preparar-la, obre PowerShell i executa:

```powershell
cd <ruta-del-repositori>
$env:PORT = '3022'
pnpm demo:scenario-a
```

Substitueix `<ruta-del-repositori>` per la ruta local del projecte (entre cometes si conté espais). Deixa la terminal oberta i entra a [http://127.0.0.1:3022/](http://127.0.0.1:3022/). La demo prepara les cinc campanyes sintètiques i el seguiment de l’acció seleccionada. Els canvis posteriors d’un assaig no es conserven, perquè la base és en memòria. En arrencar, s’utilitza el codi que hi hagi al repositori en aquell moment, de manera que un `pull` o una edició poden canviar la demo. El port 3022 identifica aquesta demo només mentre s’hi executi aquest comandament.

**Estat preparat del 8/11/2026:** el repositori recrea el seguiment de l’acció «Compartir un resum únic de la rotació» a cada arrencada de la demo. També hi ha una còpia local de les dades visibles originals a `data/rescat-demo-3022-20261108-060933.json`, exclosa de Git. Aquesta còpia JSON no és una base completa ni intervé en l’arrencada; els identificadors i dates generats del seguiment recreat poden diferir.

| Portal | Adreça i arrencada | Dades |
| --- | --- | --- |
| **Demo preparada** | [127.0.0.1:3010](http://127.0.0.1:3010/) · `pnpm demo:scenario-a` | Cinc campanyes sintètiques, un seguiment i resultats preparats en memòria. Es reinicien a cada arrencada. Groq i Teams se simulen. |
| **Portal net** | [127.0.0.1:3000](http://127.0.0.1:3000/) · passos de sota | Base SQLite nova, sense campanyes ni respostes. Les dades creades es desen al fitxer escollit; la calibració històrica sintètica pot continuar disponible com a context. |
| **Servidor normal configurable** | `pnpm start` · 3000 per defecte | Segons la configuració pot usar una base existent, PostgreSQL/Supabase o carregar la simulació. El port no garanteix que estigui buit. |

Per iniciar el portal net, obre una altra terminal PowerShell a l’arrel i utilitza una ruta de base que encara no existeixi:

```powershell
$env:APP_MODE = 'demo'
$env:PORT = '3000'
$env:HOST = '127.0.0.1'
$env:PUBLIC_ORIGIN = 'http://127.0.0.1:3000'
$env:DATABASE_URL = ''
$env:DB_PATH = 'data/portal-net.sqlite'
$env:LOAD_SIMULATION = '0'
pnpm start
```

Si `data/portal-net.sqlite` ja existeix, tria un altre nom a `DB_PATH` per començar en blanc: `LOAD_SIMULATION=0` no esborra dades existents. Les variables afecten la terminal actual i tenen prioritat sobre els fitxers d’entorn. La contrasenya local per defecte és `equip-damm`, tret que s’hagi configurat `ADMIN_PASSWORD`. Per aturar un servidor, prem Ctrl+C a la seva terminal. Si el port està ocupat, atura la instància corresponent o canvia `PORT` i ajusta `PUBLIC_ORIGIN` i l’URL. L’Escenari A també accepta `PORT` i utilitza 3010 per defecte.

Per exemple, per executar l’Escenari A a [127.0.0.1:3022](http://127.0.0.1:3022/), en una terminal independent executa `$env:PORT = '3022'` i després `pnpm demo:scenario-a`. És una instància separada: el 3010 i el 3022 tenen cadascun la seva pròpia base en memòria i els canvis d’un no es reflecteixen a l’altre.

No cal compilació. Copia `.env.example` a `.env` per configurar les connexions. També s’admet el fitxer local `env`; si tots dos defineixen una variable, preval `.env`. Els fitxers de claus i `data/` estan exclosos de Git.

Executa `pnpm demo:seed` per carregar manualment la simulació de l’etapa 03 a `data/demo.sqlite`, no a la base en memòria de l’Escenari A ni necessàriament a la base del servidor configurat. La càrrega també es fa per defecte en arrencar el servidor normal en mode demo amb SQLite.

| Variable | Ús |
| --- | --- |
| `APP_MODE` | `demo` local o `connected` per publicar a Typeform |
| `PORT`, `HOST`, `PUBLIC_ORIGIN` | Port, interfície i origen exacte; HTTPS en remot connectat |
| `DB_PATH` | Base SQLite local si `DATABASE_URL` és buit |
| `DATABASE_URL` | Connexió PostgreSQL/Supabase exclusiva del servidor |
| `DATABASE_SSL_CA_FILE` | CA pública per TLS verificat: `app/certs/supabase-ca.crt` |
| `TYPEFORM_WEBHOOK_SECRET` | Secret de signatura de la recepció automàtica |
| `LOAD_SIMULATION` | La demo local carrega l’etapa 03 per defecte. Usa `0` amb una base nova per començar en blanc, o `1` per carregar-la en una base de demo SQLite o PostgreSQL/Supabase dedicada. Amb `DATABASE_URL`, no es carrega per defecte. |
| `ADMIN_PASSWORD` | Obligatòria en connectat, mínim 8 caràcters |
| `HMAC_SECRET` | Obligatòria en connectat, mínim 32 caràcters; estable durant el cicle |
| `LLM_PROVIDER` | `groq` o `openai`; si s’omet, es tria Groq quan hi ha `GROQ_API_KEY` |
| `GROQ_API_KEY`, `GROQ_MODEL` | Groq Chat Completions; model verificat `openai/gpt-oss-120b` |
| `OPENAI_API_KEY`, `OPENAI_MODEL` | Alternativa OpenAI Responses |
| `TYPEFORM_TOKEN` | Token de Typeform per crear i consultar formularis/respostes |

La demo incorpora sis onades tancades de l’etapa 03. A **Campanyes** hi ha els resultats de cada onada. A **Accions i seguiment** es pot obrir cada seguiment vinculat a l’acció simulada. La càrrega afegeix només els identificadors de simulació que falten i conserva les campanyes existents.

## Assaig de l’Escenari A

Executa `pnpm demo:scenario-a` i obre la [portada](http://127.0.0.1:3010/). Després de la presentació, la **Visió general** s’obre sense contrasenya en aquesta demo local. Cada arrencada prepara una base en memòria amb cinc campanyes i un seguiment. **Nova consulta** crea un esborrany addicional. La generació de preguntes i l’anàlisi simulen Groq. El QR obre el formulari local i Teams mostra una simulació d’enviament.

1. Obre **Nova consulta**, comprova els camps preemplenats i prem **Simular crida a Groq**. A **Consulta**, mostra el senyal històric i la pregunta breu sobre la dificultat principal. Prem **Editar preguntes manualment**, desa el canvi i aprova la versió.
2. Prem **Publicar consulta** i mostra les opcions de **Difusió**. Obre **Campanyes** i entra a **Veure resultats** a la fila marcada com a **Resultats preparats de l’Escenari A**. Les 194 respostes són del qüestionari base de la còpia tancada. L’edició feta en directe pertany a la nova consulta.
3. A **Resultats numèrics**, mostra la dificultat més triada i el desglossament per torn protegit. A **Anàlisi amb IA**, el mapa de temes està preparat amb 25 comentaris sintètics dels 35 casos elegibles. Escull l’acció **Resum del nou sistema de torns** per obrir el seguiment amb la pregunta sobre l’arribada del resum.

## Flux des de zero

Fes clic a la portada vermella d’Escoltamm per reproduir el vídeo d’introducció en pantalla completa. Quan s’acaba, s’obre automàticament la diapositiva de **Presentació** en pantalla completa. Fes clic a la diapositiva o activa l’enllaç **Continuar a la visió general** per obrir el tauler. Si cal, l’accés de People es demana en aquest pas. També pots obrir directament la diapositiva a `/#presentation`.

1. **Nova consulta:** escriu la necessitat i prem «Generar amb IA», o desa un esborrany. El nom, la decisió i el context són opcionals. Pots ajustar el públic i les exclusions.
2. **Consulta:** inicialment no conté preguntes i no es pot aprovar. «Generar amb IA» envia la descripció i els senyals agregats aplicables al proveïdor configurat. La calibració sintètica de setembre correspon a Planta; si es tria un sol torn, es mostra com a context del conjunt de la planta.
3. **Revisió:** comprova i edita el títol, introducció, preguntes, opcions, ordre i condicions. Les notes de disseny associen els senyals i riscos contextuals amb les preguntes. El servidor valida 3–6 preguntes i cada recorregut, durada estimada inferior a 120 segons i referències de condicions.
4. **Aprovació:** aprova la versió exacta. Una edició revoca l’aprovació. Els errors del proveïdor conserven l’esborrany; un 429 mostra l’espera indicada.
5. **Publicació:** crea el formulari real a Typeform en mode connectat. La repetició recupera la publicació existent; un resultat remot incert exigeix reconciliació.
6. **Difusió:** comparteix el QR de la plataforma per recollir respostes que es puguin importar. En connectat, el navegador obté un codi de seguiment de la sèrie i continua a Typeform sense credencial. El formulari local de demo continua amb credencial fictícia. La targeta de Microsoft Teams simula l’enviament a un canal de prova.
7. **Resultats:** es calculen a partir de respostes acceptades en tancar l’onada. Les escales i seleccions utilitzen els ítems de cada consulta, sense insights sintètics inicials.
8. **Anàlisi i seguiment:** amb Groq configurat, el tancament inicia l’anàlisi automàtica. Els resultats numèrics estan disponibles mentre la IA agrupa els comentaris i el servidor comprova els suports i els llindars de privacitat. A **Anàlisi amb IA**, People pot consultar el resultat i escollir una proposta per crear el seguiment.

El QR directe Typeform obre el formulari per previsualitzar-lo. Per importar una resposta cal obrir-la des de la plataforma amb una referència temporal `delivery` vàlida en el moment de la tramesa. Per compartir el QR de la plataforma amb mòbils externs, configura un `PUBLIC_ORIGIN` HTTPS accessible.

## Privacitat i límits

- Només dades sintètiques. Les credencials `DEMO-0001`–`DEMO-0600` són per Planta; els altres públics tenen 120 credencials. No s’hi han d’introduir IDs reals.
- En connectat, la cookie de seguiment dura 30 dies i es renova en continuar a Typeform. Es permet una resposta per navegador i onada mentre es conserva el codi. Canviar de navegador o esborrar la cookie permet respondre amb un codi nou. El mateix navegador pot ser compartit. En local, la deduplicació és per credencial i onada.
- L’app publica una instantània immutable al tancament. Bases inferiors a 10 i complements petits estan protegits. No exposa respostes individuals.
- **Text lliure:** el prototip admet una llista tancada de frases sintètiques. L’anàlisi automàtica mostra temes agregats amb prou suport verificat. Els comentaris arbitraris es descarten abans de desar la resposta.
- Groq rep fitxes qualitatives d’evidència publicable. El servidor adjunta les xifres i desa les revisions a `wave_analysis`. Les sis onades simulades de l’etapa 03 es mostren amb els seus KPI i seguiments.
- Les preguntes marcades explícitament com a referència es preserven en seguiments; les noves consultes no incorporen referències prefabricades.
- La purga local no elimina formularis/respostes del compte Typeform ni còpies externes. Neteja les proves remotes quan deixin de ser necessàries.

## Verificació

```powershell
pnpm test
pnpm check
python tests/browser.py
```

Les proves Node cobreixen el flux de Typeform a l’informe revisat en SQLite i PostgreSQL embegut amb respostes sintètiques i proveïdor Groq simulat. La prova Chromium recorre l’edició, la participació, el tancament i el seguiment.

`python tests/live-survey.py` és una prova optativa amb efectes reals: utilitza les claus locals, genera amb Groq i publica una consulta sintètica a Typeform. Requereix una instància connectada amb base buida i `LIVE_ORIGIN` (per defecte http://127.0.0.1:3002). No és part de `pnpm test`. Les captures i JSON de prova es desen a `test-results/`, exclòs de Git.

**Prova real del 7/11/2026:** descripció d’acollida a logística → quatre preguntes Groq → esborrany v2 → aprovació → [Typeform real](https://form.typeform.com/to/k5rLOGmj). Lectura posterior de Typeform confirma els quatre enunciats. El QR directe s’ha descodificat i coincideix amb aquest URL. Evidència local: `test-results/live-proof.json`, `groq-draft.json`, `typeform-definition.json`, `typeform-qr.svg` i captures.

Fonts: [Groq JSON](https://console.groq.com/docs/structured-outputs), [Typeform Create API](https://www.typeform.com/developers/create/reference/create-form/). JSON mode garanteix sintaxi; el contracte es valida al servidor.

## Context del projecte

[Mapa ICM](CONTEXT.md) · [Especificació](.plans/escolta-activa-damm-spec.md) · [Model lògic](stages/02_model-logic/output/model-logic.md) · [Contracte d’implementació](docs/implementation.md).

La revisió humana de les tres etapes continua pendent. Consulta l’[estat tècnic](docs/estat-tecnic.md) per al mapa de l’aplicació.


Connexió compartida: [Supabase i webhook Typeform](docs/postgresql-setup.md). `pnpm db:check` comprova la connexió i prepara les migracions; si la connexió remota falla, el servidor no canvia silenciosament a SQLite.

**Prova real del 8/11/2026:** accés de plataforma → [Typeform de prova](https://form.typeform.com/to/TQfGnETl) → resposta sintètica completada → importació manual → un registre a `escolta.accepted` i un vincle a `escolta.response_links`. Una segona importació manté un únic registre. Valors comprovats i torn `Desconegut`; resultats individuals ocults. Evidència local exclosa de Git: `test-results/typeform-supabase-proof.json`. La recepció automàtica remota continua pendent d’un servidor públic HTTPS.
