# Damm_Hack · Escolta activa

Prototip Node.js 24 amb PostgreSQL/Supabase o SQLite local per crear microconsultes a partir d’una necessitat de People. Les campanyes noves comencen sense preguntes ni insights. La IA genera un esborrany; una aprovació explícita de la versió vigent precedeix la publicació a Typeform.

## Executar

```powershell
pnpm install --frozen-lockfile --ignore-scripts
pnpm start
```

No cal compilació. L’origen per defecte és http://127.0.0.1:3000. En mode local la contrasenya sintètica és `equip-damm`. Copia `.env.example` a `.env` per configurar les connexions. Les claus són exclusivament del servidor; `.env` i `data/` estan exclosos de Git.

Executa `pnpm demo:seed` per carregar manualment la simulació de l’etapa 03 a `data/demo.sqlite`. La mateixa càrrega es fa en arrencar la demo local.

| Variable | Ús |
| --- | --- |
| `APP_MODE` | `demo` local o `connected` per publicar a Typeform |
| `PORT`, `HOST`, `PUBLIC_ORIGIN` | Port, interfície i origen exacte; HTTPS en remot connectat |
| `DB_PATH` | Base SQLite local si `DATABASE_URL` és buit |
| `DATABASE_URL` | Connexió PostgreSQL/Supabase exclusiva del servidor |
| `DATABASE_SSL_CA_FILE` | CA pública per TLS verificat: `app/certs/supabase-ca.crt` |
| `TYPEFORM_WEBHOOK_SECRET` | Secret de signatura de la recepció automàtica |
| `LOAD_SIMULATION` | La demo local carrega l’etapa 03 per defecte. Usa `0` amb una base nova per començar en blanc, o `1` per carregar-la en mode connectat amb SQLite. Supabase no carrega simulacions a l’arrencada. |
| `ADMIN_PASSWORD` | Obligatòria en connectat, mínim 8 caràcters |
| `HMAC_SECRET` | Obligatòria en connectat, mínim 32 caràcters; estable durant el cicle |
| `LLM_PROVIDER` | `groq` o `openai` |
| `GROQ_API_KEY`, `GROQ_MODEL` | Groq Chat Completions; model verificat `openai/gpt-oss-120b` |
| `OPENAI_API_KEY`, `OPENAI_MODEL` | Alternativa OpenAI Responses |
| `TYPEFORM_TOKEN` | Token de Typeform per crear i consultar formularis/respostes |

La demo incorpora sis onades tancades de l’etapa 03. A **Campanyes** hi ha els resultats de cada onada. A **Accions i seguiment** es pot obrir cada seguiment vinculat a l’acció simulada. La càrrega afegeix només els identificadors de simulació que falten i conserva les campanyes existents.

## Flux des de zero

1. **Nova consulta:** escriu la necessitat i prem «Generar amb IA», o desa un esborrany. El nom, la decisió i el context són opcionals. Pots ajustar el públic i les exclusions.
2. **Consulta:** inicialment no conté preguntes i no es pot aprovar. «Generar amb IA real» envia la descripció a Groq. No envia exemples de contingut ni insereix les antigues preguntes sobre torns.
3. **Revisió:** comprova i edita el títol, introducció, preguntes, opcions, ordre i condicions. El JSON complet també es pot editar. El servidor valida 3–6 preguntes i cada recorregut, durada estimada inferior a 120 segons i referències de condicions.
4. **Aprovació:** aprova la versió exacta. Una edició revoca l’aprovació. Els errors del proveïdor conserven l’esborrany; un 429 mostra l’espera indicada.
5. **Publicació:** crea el formulari real a Typeform en mode connectat. La repetició recupera la publicació existent; un resultat remot incert exigeix reconciliació.
6. **Difusió:** comparteix el QR de la plataforma per recollir respostes que es puguin importar. En connectat, el navegador obté un codi de seguiment de la sèrie i continua a Typeform sense credencial. El formulari local de demo continua amb credencial fictícia.
7. **Resultats:** es calculen a partir de respostes acceptades en tancar l’onada. Les escales i seleccions utilitzen els ítems de cada consulta, sense insights sintètics inicials.

El QR directe Typeform obre el formulari per previsualitzar-lo. Per importar una resposta cal obrir-la des de la plataforma amb una referència temporal `delivery` vàlida en el moment de la tramesa. Per compartir el QR de la plataforma amb mòbils externs, configura un `PUBLIC_ORIGIN` HTTPS accessible.

## Privacitat i límits

- Només dades sintètiques. Les credencials `DEMO-0001`–`DEMO-0600` són per Planta; els altres públics tenen 120 credencials. No s’hi han d’introduir IDs reals.
- En connectat, la cookie de seguiment dura 30 dies i es renova en continuar a Typeform. Es permet una resposta per navegador i onada mentre es conserva el codi. Canviar de navegador o esborrar la cookie permet respondre amb un codi nou. El mateix navegador pot ser compartit. En local, la deduplicació és per credencial i onada.
- L’app publica una instantània immutable al tancament. Bases inferiors a 10 i complements petits estan protegits. No exposa respostes individuals.
- **Text lliure:** després de retirar les frases i classificacions prefabricades, no hi ha textos admissibles en producció. Es descarten abans de persistir o enviar al model. Cal implementar i revisar la depuració de privacitat per analitzar comentaris arbitraris.
- El catàleg d’accions i temes de la demo continua limitat a comunicació, suport i planificació. No genera insights sense evidència publicable. La generació de consultes és oberta a altres temes.
- Les preguntes marcades explícitament com a referència es preserven en seguiments; les noves consultes no incorporen referències prefabricades.
- La purga local no elimina formularis/respostes del compte Typeform ni còpies externes. Neteja les proves remotes quan deixin de ser necessàries.

## Verificació

```powershell
pnpm test
pnpm check
python tests/browser.py
```

36 proves Node; prova Chromium de login, esborrany buit, edició, aprovació, QR, participants, condicions, enviament únic, tancament, privacitat i seguiment. Amplades 320/768/1024/1440 px sense desbordament i sense errors JS. Una mutació del llindar de privacitat fa fallar la prova de recomptes personalitzats.

`python tests/live-survey.py` és una prova optativa amb efectes reals: utilitza les claus locals, genera amb Groq i publica una consulta sintètica a Typeform. Requereix una instància connectada amb base buida i `LIVE_ORIGIN` (per defecte http://127.0.0.1:3002). No és part de `pnpm test`. Les captures i JSON de prova es desen a `test-results/`, exclòs de Git.

**Prova real del 7/11/2026:** descripció d’acollida a logística → quatre preguntes Groq → esborrany v2 → aprovació → [Typeform real](https://form.typeform.com/to/k5rLOGmj). Lectura posterior de Typeform confirma els quatre enunciats. El QR directe s’ha descodificat i coincideix amb aquest URL. Evidència local: `test-results/live-proof.json`, `groq-draft.json`, `typeform-definition.json`, `typeform-qr.svg` i captures.

Fonts: [Groq JSON](https://console.groq.com/docs/structured-outputs), [Typeform Create API](https://www.typeform.com/developers/create/reference/create-form/). JSON mode garanteix sintaxi; el contracte es valida al servidor.

## Context del projecte

[Mapa ICM](CONTEXT.md) · [Especificació](.plans/escolta-activa-damm-spec.md) · [Model lògic](stages/02_model-logic/output/model-logic.md) · [Contracte d’implementació](docs/implementation.md).

La revisió humana de les etapes 01 i 02 continua pendent.


Connexió compartida: [Supabase i webhook Typeform](docs/postgresql-setup.md). `pnpm db:check` comprova la connexió i prepara les migracions; si la connexió remota falla, el servidor no canvia silenciosament a SQLite.

**Prova real del 8/11/2026:** accés de plataforma → [Typeform de prova](https://form.typeform.com/to/TQfGnETl) → resposta sintètica completada → importació manual → un registre a `escolta.accepted` i un vincle a `escolta.response_links`. Una segona importació manté un únic registre. Valors comprovats i torn `Desconegut`; resultats individuals ocults. Evidència local exclosa de Git: `test-results/typeform-supabase-proof.json`. La recepció automàtica remota continua pendent d’un servidor públic HTTPS.
