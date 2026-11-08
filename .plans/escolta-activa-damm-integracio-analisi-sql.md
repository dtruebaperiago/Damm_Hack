# Integració de l’anàlisi amb el SQL compartit

Estat: pla històric d’integració del 8/11/2026. La implementació combinada es descriu a l’[estat tècnic](../docs/estat-tecnic.md). La revisió de l’equip continua pendent.

L’objectiu és conservar el motor local de troballes, temes i accions, i alimentar-lo amb les consultes SQL que ja fa el servidor remot. El backend tria PostgreSQL/Supabase amb `DATABASE_URL` o SQLite per a la demo local. Tots dos motors han de produir les mateixes evidències per a les mateixes respostes. No cal un segon magatzem ni traspassar les respostes a Groq.

## Punt d’entrada i contracte

```text
Typeform → importació manual o webhook signat → accepted + response_links
                                                    ↓ Store.rows(onada)
Tancament → aggregate + policyFor + comparacions → waves.snapshot
                                                    ↓
Anàlisi → makeReportBase → synthesisInput → Groq → validació → revisió de People
```

`Store.rows(id)` ja llegeix respostes normalitzades per onada amb una consulta parametritzada. `accepted.answers` és JSONB a PostgreSQL i JSON serialitzat a SQLite. El vincle amb el torn i el pseudònim es resol dins del backend per calcular agregats i comparacions. El torn del flux Typeform per navegador és `Desconegut`: no es pot inferir Dia/Nit.

El tancament calcula i desa una instantània immutable amb l’abast, la versió, l’origen, la política, els agregats protegits i les comparacions disponibles. L’anàlisi llegeix aquesta instantània; `synthesisInput` passa al LLM les fitxes qualitatives amb IDs d’evidència. El servidor conserva els recomptes, aplica el mínim de 10 i la supressió complementària i valida les cites. Groq no rep credencials, SQL executable, identificadors de tramesa ni pseudònims. La descoberta de temes és una via separada: només pot tornar a llegir les frases sintètiques admeses, amb referències efímeres, abans de la purga i quan concorden amb la base de la instantània.

Si més endavant cal un assistent de consultes, es poden exposar operacions predefinides com ara «resum d’onada» i «comparació compatible». El servidor ha de validar l’onada i el tipus d’operació i retornar les mateixes fitxes publicables. El flux actual, on la pantalla ja coneix l’onada i l’operació, no necessita aquesta capa.

## Ordre d’integració

1. **Prendre `origin/main` (`e127ebc`) com a base en una branca d’integració.** La còpia de treball parteix de `1886970` i conté canvis locals sense commit, inclosos `app/analysis.mjs` i `tests/analysis.test.mjs`. Preservar-los abans d’integrar i reaplicar el flux d’anàlisi sobre el `Store` asíncron del remot. No substituir la recepció Typeform, l’accés amb cookie, la importació diferida ni la càrrega de la simulació.
2. **Adaptar `app/store.mjs`.** Conservar `rows`, transaccions i bloqueig de l’onada del remot. Portar `policyFor`, `comparisonOptions`, `compareSnapshots`, `analysis`, `writeAnalysis`, `reportBase` i la construcció del seguiment. Esperar totes les operacions d’I/O i usar `decodeJSON` per a configuració, instantània i anàlisi. Mantenir el tancament idempotent i la separació entre comparació de mostres i de parelles. Fer estable l’ID d’evidència/instantània davant diferències d’ordre de claus del JSONB, sense canviar la verificació d’aprovacions de publicació existents.
3. **Afegir persistència en els dos motors.** Migració PostgreSQL nova per a `escolta.wave_analysis(wave_id, revision, data JSONB)`, amb clau forana, RLS i sense permisos públics; no modificar la migració 1 ja aplicada. Crear l’equivalent de SQLite amb `data TEXT`. Desar amb `ON CONFLICT DO NOTHING` per a la primera revisió i `UPDATE … WHERE wave_id = ? AND revision = ? RETURNING revision` per a les següents. Dues instàncies poden generar esborranys alhora, però només una revisió vigent es desa. Fer caducar també els esborranys de temes i els suports restringits amb la política de retenció del remot. La purga ha d’impedir que una descoberta iniciada abans de l’expiració torni a desar fragments.
4. **Reconciliar API i interfície.** Portar `themes`, `theme-review`, `proposals` i `analysis-review`, l’exportació i el seguiment validat, mantenint el webhook i els botons Typeform. El camí principal sintetitza després del tancament; cap crida al model dins de la transacció d’ingesta o tancament. Evitar que la classificació opcional de la importació manual del remot generi temes en paral·lel amb el flux revisable local. Les propostes de catàleg, la selecció guardada i els seguiments que ja existeixen han de continuar visibles.
5. **Separar les onades simulades.** Les sis instantànies de l’etapa 03 contenen KPI i comparacions ja agregats, però no `metrics`/`torns` en el format que espera `makeReportBase`, ni files individuals a `accepted`. Mantenir inicialment la vista de simulació i els seus seguiments. Si cal sintetitzar-les amb Groq, afegir un adaptador explícit que només tradueixi els KPI publicables i els etiqueti com a simulats; no reconstruir respostes, recomptes exactes ni textos inexistents. No reescriure instantànies històriques ni barrejar fonts per completar un llindar.

## Verificació i demo

- La consulta de només lectura a Supabase ha confirmat la migració 1, l’absència de `wave_analysis`, dues respostes Typeform acceptades en dues onades diferents, cap onada Typeform tancada i sis instantànies simulades tancades. La importació manual està documentada al [handoff remot](https://github.com/dtruebaperiago/Damm_Hack/blob/e127ebc/.plans/handoff-supabase-typeform.md). El lliurament automàtic real del webhook continua pendent d’un servidor públic HTTPS segons aquest handoff.
- Línies de base verificades per separat: 26 proves Node a la còpia local; 37 i comprovació de sintaxi a una còpia aïllada d’`origin/main`. Aquests resultats no verifiquen una fusió.
- Prova de compatibilitat feta en PostgreSQL embegut: les respostes sintètiques acceptades pel `Store` remot s’han recuperat en JSONB i s’han passat al motor local. L’ítem de comprensió no apareix a l’entrada de síntesi amb 9 respostes i hi apareix amb 24 i una distribució publicable, sense IDs de tramesa ni pseudònims. S’ha validat la projecció local, sense cridar Groq.
- Prova d’acceptació de la integració, en SQLite i PostgreSQL aïllat: importar dues vegades una tramesa Typeform admissible i comptar-la un sol cop; rebutjar una tramesa sense bearer vàlid; tancar una onada per sota del llindar i comprovar que el payload no conté la mètrica; repetir amb una base publicable i verificar l’ID de l’evidència, la revisió, el seguiment i la persistència en reobrir el servidor. Comprovar que la simulació continua visible i que l’exportació i el payload de síntesi no contenen registres individuals.
- Per a la demo, mostrar la recepció Typeform amb una resposta sintètica i, per mostrar un informe complet, utilitzar una onada sintètica separada amb prou respostes o la vista de KPI simulats identificada com a tal. No cal tancar ni alterar les dues onades de prova de la base compartida durant la integració local.
