# Damm_Hack · Escolta activa

Prototip Node.js 24 + SQLite per crear microconsultes a partir d’una necessitat de People. Les campanyes noves comencen sense preguntes ni insights. La IA genera un esborrany; una aprovació explícita de la versió vigent precedeix la publicació a Typeform.

## Executar

```powershell
pnpm install --frozen-lockfile --ignore-scripts
pnpm start
```

No cal compilació. L’origen per defecte és http://127.0.0.1:3000. En mode local la contrasenya sintètica és `equip-damm`. Copia `.env.example` a `.env` per configurar les connexions. Les claus són exclusivament del servidor; `.env` i `data/` estan exclosos de Git.

| Variable | Ús |
| --- | --- |
| `APP_MODE` | `demo` local o `connected` per publicar a Typeform |
| `PORT`, `HOST`, `PUBLIC_ORIGIN` | Port, interfície i origen exacte; HTTPS en remot connectat |
| `DB_PATH` | Base SQLite; un camí nou crea un espai buit |
| `ADMIN_PASSWORD` | Obligatòria en connectat, mínim 8 caràcters |
| `HMAC_SECRET` | Obligatòria en connectat, mínim 32 caràcters; estable durant el cicle |
| `LLM_PROVIDER` | `groq` o `openai` |
| `GROQ_API_KEY`, `GROQ_MODEL` | Groq Chat Completions; model verificat `openai/gpt-oss-120b` |
| `OPENAI_API_KEY`, `OPENAI_MODEL` | Alternativa OpenAI Responses |
| `TYPEFORM_TOKEN` | Token de Typeform per crear i consultar formularis/respostes |

La configuració local de la verificació utilitza `data/blank.sqlite`. Les bases anteriors es conserven i no s’han eliminat. El servidor actualitzat s’ha executat a http://127.0.0.1:3002 perquè 3001 ja estava ocupat. No es migren ni es netegen automàticament bases existents.

## Flux des de zero

1. **Nova consulta:** escriu nom, objectiu, decisió i context; escull el públic i les exclusions. Els camps descriptius comencen buits.
2. **Consulta:** inicialment no conté preguntes i no es pot aprovar. «Generar amb IA real» envia la descripció a Groq. No envia exemples de contingut ni insereix les antigues preguntes sobre torns.
3. **Revisió:** comprova i edita el títol, introducció, preguntes, opcions, ordre i condicions. El JSON complet també es pot editar. El servidor valida 3–6 preguntes i cada recorregut, durada estimada inferior a 120 segons i referències de condicions.
4. **Aprovació:** aprova la versió exacta. Una edició revoca l’aprovació. Els errors del proveïdor conserven l’esborrany; un 429 mostra l’espera indicada.
5. **Publicació:** crea el formulari real a Typeform en mode connectat. La repetició recupera la publicació existent; un resultat remot incert exigeix reconciliació.
6. **Difusió:** mostra l’enllaç Typeform i permet descarregar-ne el QR directe. També conserva l’accés amb credencial de la plataforma i el seu QR.
7. **Resultats:** es calculen a partir de respostes acceptades en tancar l’onada. Les escales i seleccions utilitzen els ítems de cada consulta, sense insights sintètics inicials.

El QR directe Typeform funciona amb el mòbil sense un servidor local públic. Per importar respostes als agregats de l’app cal accedir a través de la plataforma: el bearer `delivery` ha de ser vàlid. Les trameses directes sense aquest bearer poden existir al proveïdor però l’app les rebutja. El QR de plataforma amb localhost només funciona al mateix ordinador; per a mòbils externs cal un `PUBLIC_ORIGIN` accessible.

## Privacitat i límits

- Només dades sintètiques. Les credencials `DEMO-0001`–`DEMO-0600` són per Planta; els altres públics tenen 120 credencials. No s’hi han d’introduir IDs reals.
- Sessions HttpOnly/SameSite, comprovació d’origen, HMAC per cicle i una resposta acceptada per credencial/onada. La credencial no prova identitat física.
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

23 proves Node; prova Chromium de login, esborrany buit, edició, aprovació, QR, participants, condicions, enviament únic, tancament, privacitat i seguiment. Amplades 320/768/1024/1440 px sense desbordament i sense errors JS. Una mutació del llindar de privacitat fa fallar la prova de recomptes personalitzats. Les dades i campanyes antigues només es carreguen explícitament des de `tests/fixtures/` als tests aïllats.

`python tests/live-survey.py` és una prova optativa amb efectes reals: utilitza les claus locals, genera amb Groq i publica una consulta sintètica a Typeform. Requereix una instància connectada amb base buida i `LIVE_ORIGIN` (per defecte http://127.0.0.1:3002). No és part de `pnpm test`. Les captures i JSON de prova es desen a `test-results/`, exclòs de Git.

**Prova real del 7/11/2026:** descripció d’acollida a logística → quatre preguntes Groq → esborrany v2 → aprovació → [Typeform real](https://form.typeform.com/to/k5rLOGmj). Lectura posterior de Typeform confirma els quatre enunciats. El QR directe s’ha descodificat i coincideix amb aquest URL. Evidència local: `test-results/live-proof.json`, `groq-draft.json`, `typeform-definition.json`, `typeform-qr.svg` i captures.

Fonts: [Groq JSON](https://console.groq.com/docs/structured-outputs), [Typeform Create API](https://www.typeform.com/developers/create/reference/create-form/). JSON mode garanteix sintaxi; el contracte es valida al servidor.

## Context del projecte

[Mapa ICM](CONTEXT.md) · [Especificació](.plans/escolta-activa-damm-spec.md) · [Model lògic](stages/02_model-logic/output/model-logic.md) · [Contracte d’implementació](docs/implementation.md).

La petició d’un llenç en blanc substitueix l’antiga inicialització amb exemple i calibració sintètica. La revisió humana de les etapes 01 i 02 continua pendent.
