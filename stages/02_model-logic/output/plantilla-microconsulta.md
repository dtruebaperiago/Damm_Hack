---
status: esborrany-per-revisar
---

# Plantilla de microconsulta generada amb IA

**Actualització del tractament (7/11/2026).** El [prompt de construcció](../../../.plans/prompt-agent-web-completa.md) incorpora credencials sintètiques autoritzades i aparellament pseudonimitzat entre onades del mateix cicle. La implementació carrega aquest Markdown al generador, conserva íntegrament els ítems fixos de l’exemple i substitueix la introducció per explicar aquest tractament i la durada pendent de cronometratge. Els JSON següents conserven el context de disseny original; la sortida aplicada és a `app/template.json`. La revisió humana continua pendent.

La plantilla defineix què rep el generador, què retorna i com es podrà interpretar cada resposta. Integra les sis regles acceptades per l’equip i els criteris del `handoff-psicometria-flux-seguiment.md` aportat a la conversa. L’exemple de torns proposa una configuració concreta perquè la parella del formulari la pugui provar. [Especificació del prototip](../../../.plans/escolta-activa-damm-spec.md) · [Model lògic](model-logic.md)

## 1. Què rep el generador

| Entrada | Contingut |
| --- | --- |
| Decisió de RRHH | Què vol entendre, quina decisió podria prendre i quins conceptes necessita mesurar. |
| Context i públic | Canvi, data si es coneix, llengua i sector, ubicació o torn escollits per RRHH. |
| Sondeig | Evidència agregada amb origen, període i limitacions. Diferenciar senyals mesurats, riscos, manca de dades i hipòtesis de RRHH. |
| Restriccions | Temes exclosos, canal, 3–6 preguntes i menys de dos minuts en el recorregut més llarg. |
| Seguiment, si escau | Acció escollida i definició completa de les preguntes de referència. Incloure la data d’aplicació si està confirmada. |

La IA pot adaptar el vocabulari, les preguntes específiques i la proposta de difusió. Una participació aparent baixa al torn de nit pot justificar canviar la franja de difusió. La percepció del canvi al torn de nit s’ha de mesurar amb les seves respostes.

## 2. Què retorna el generador

Retorna un esborrany amb `titol`, `introduccio`, `preguntes` ordenades i `temps_estimat_segons`. Si proposa una adaptació motivada pel sondeig, indica quina evidència o risc hi ha al darrere. La introducció explica el propòsit, la durada, què es recull i qui veu els resultats agregats. El text sobre privacitat ha de coincidir amb la configuració real.

| Camp de cada pregunta | Regla |
| --- | --- |
| `id` i `text` | Identificador estable i enunciat que es mostrarà a la plantilla. |
| `que_mesura` i `quina_decisio_informa` | Un concepte concret i una decisió que les respostes poden orientar. |
| `tipus` i `opcions` | `escala_1_5`, `seleccio_unica` o `text_lliure`. Cada opció tancada té `id` i `etiqueta`. El text lliure porta `opcions: []`. |
| `obligatoria` i `de_referencia` | Indicar si exigeix resposta i si queda fixada per comparar onades. El text lliure és sempre opcional. |
| `condicio_de_visualitzacio` | `null` si es mostra sempre. En una repregunta, un objecte `totes` amb les condicions que s’han de complir. |

### Mètode de generació en JSON

El servidor envia al LLM les instruccions d’aquest apartat i un objecte JSON amb el context de la campanya. Valida que l’objectiu, la decisió, els conceptes i el públic estiguin definits abans de fer la crida. La sortida és **un únic objecte JSON**, amb els camps del contracte i sense text addicional. Aquest format és propi de l’app. Després de l’aprovació de RRHH, el servidor el converteix al format de Typeform.

**Ordre que segueix el LLM**

1. Llegir l’objectiu, la decisió, els conceptes i les restriccions. Fer servir el públic escollit per RRHH i tractar els senyals del sondeig segons el seu estat. Una diferència de participació pot orientar la difusió. El contingut de la consulta ha de permetre esbrinar com es viu el canvi.
2. Si hi ha `preguntes_referencia`, copiar-les a les mateixes posicions amb tots els camps. En una primera onada, proposar com a referència els ítems que RRHH voldrà tornar a mesurar. Completar la consulta amb preguntes que cobreixin els conceptes necessaris. Per a cada ítem, indicar `que_mesura` i `quina_decisio_informa`.
3. Assignar a cada pregunta un tipus i un identificador únic, curt i estable. Fer servir IDs d’opció de tipus cadena. Per a `escala_1_5`, usar `"1"` a `"5"` en ordre i `"no_valorable"` com a opció separada. En la lectura analítica, només els cinc primers codis es converteixen en valors numèrics.
4. Afegir una repregunta si una resposta explícita pot justificar un aclariment que orienti una decisió. A `totes`, cada condició té un `pregunta_id` anterior i una llista `opcions_ids`. Dins de la llista n’hi ha prou amb una coincidència. Entre condicions cal que coincideixin totes. Una resposta absent, invàlida o amb un codi fora de la llista fa que la condició sigui falsa. Fer servir només opcions que expressin la resposta que activa el salt i deixar la repregunta com a opcional.
5. Escriure el títol i la introducció a partir del context i del tractament de dades facilitat. Estimar la durada del camí més llarg i indicar a `adaptacions` els canvis que es proposen a partir del sondeig. Cada adaptació porta `senyal_id` i `proposta`. Si no hi ha cap adaptació basada en el sondeig, retornar `[]`.

**Exemple d’entrada del servidor**

```json
{
  "objectiu": "Entendre com s'està vivint el canvi de torns",
  "decisio_rrhh": "Decidir si cal reforçar la comunicació del canvi o el canal d'ajuda",
  "conceptes": ["comprensió percebuda", "coneixement del canal d'ajuda", "dificultat principal"],
  "context": "S'ha introduït un nou sistema de torns en una planta fictícia",
  "public": {"sector": "Planta", "ubicacio": "Planta de demo", "torn": "Tots dos"},
  "llengua": "ca",
  "sondeig": [
    {
      "id": "participacio_nit",
      "estat": "senyal_mesurat",
      "origen": "sondeig sintètic",
      "periode": "onada prèvia",
      "observacio": "Participació aparent del 15% a Nit i del 55% a Dia",
      "limitacio": "Amb QR compartit es compten trameses"
    }
  ],
  "hipotesis_rrhh": [],
  "restriccions": {
    "canal": "QR mòbil",
    "min_preguntes": 3,
    "max_preguntes": 6,
    "durada_inferior_a_segons": 120,
    "temes_exclosos": ["dades que identifiquin persones"],
    "tractament_respostes": "RRHH veu resultats agregats. El comentari és opcional."
  },
  "seguiment": null,
  "preguntes_referencia": []
}
```

Per a un seguiment, `seguiment` és un objecte amb `accio` i `data_aplicacio` (`AAAA-MM-DD` o `null`). Cada element de `preguntes_referencia` conté la `posicio` a partir d’1 i l’objecte `pregunta` aprovat a l’onada anterior. Els valors d’`estat` admesos a `sondeig` són `senyal_mesurat`, `risc` i `sense_dades_suficients`. Les hipòtesis van a `hipotesis_rrhh`.

**Exemple de sortida del LLM**

```json
{
  "titol": "Com estàs vivint el nou sistema de torns?",
  "introduccio": "Volem entendre com s'està vivint el canvi de torns. La consulta dura menys de dos minuts. Et preguntarem per la comprensió del canvi, el canal d'ajuda i les dificultats. RRHH veurà resultats agrupats. Si deixes un comentari, evita incloure dades que identifiquin algú.",
  "temps_estimat_segons": 90,
  "adaptacions": [
    {"senyal_id": "participacio_nit", "proposta": "Difondre el QR també a l'inici del torn de nit"}
  ],
  "preguntes": [
    {
      "id": "comprensio",
      "text": "Tinc clar com funciona el nou sistema de torns.",
      "que_mesura": "Comprensió percebuda del canvi",
      "quina_decisio_informa": "Valorar si cal explicar millor el funcionament",
      "tipus": "escala_1_5",
      "opcions": [
        {"id": "1", "etiqueta": "Gens d’acord"},
        {"id": "2", "etiqueta": "Més aviat en desacord"},
        {"id": "3", "etiqueta": "Ni d’acord ni en desacord"},
        {"id": "4", "etiqueta": "Més aviat d’acord"},
        {"id": "5", "etiqueta": "Totalment d’acord"},
        {"id": "no_valorable", "etiqueta": "No ho puc valorar"}
      ],
      "obligatoria": false,
      "de_referencia": true,
      "condicio_de_visualitzacio": null
    },
    {
      "id": "suport",
      "text": "Sé on demanar ajuda si tinc un dubte sobre el nou sistema de torns.",
      "que_mesura": "Coneixement declarat del canal d’ajuda",
      "quina_decisio_informa": "Valorar si cal fer més visible el canal d’ajuda",
      "tipus": "escala_1_5",
      "opcions": [
        {"id": "1", "etiqueta": "Gens d’acord"},
        {"id": "2", "etiqueta": "Més aviat en desacord"},
        {"id": "3", "etiqueta": "Ni d’acord ni en desacord"},
        {"id": "4", "etiqueta": "Més aviat d’acord"},
        {"id": "5", "etiqueta": "Totalment d’acord"},
        {"id": "no_valorable", "etiqueta": "No ho puc valorar"}
      ],
      "obligatoria": false,
      "de_referencia": true,
      "condicio_de_visualitzacio": null
    },
    {
      "id": "dificultat_principal",
      "text": "En els darrers set dies, quina ha estat la principal dificultat que has trobat amb el nou sistema de torns?",
      "que_mesura": "Dificultat principal durant el període",
      "quina_decisio_informa": "Escollir quin problema operatiu convé investigar primer",
      "tipus": "seleccio_unica",
      "opcions": [
        {"id": "funcionament", "etiqueta": "Entendre com funciona"},
        {"id": "antelacio", "etiqueta": "Conèixer el torn amb antelació"},
        {"id": "canvis", "etiqueta": "Gestionar canvis de torn"},
        {"id": "necessitats_personals", "etiqueta": "Compatibilitzar el torn amb necessitats personals"},
        {"id": "altra", "etiqueta": "Una altra dificultat"},
        {"id": "cap", "etiqueta": "Cap dificultat"},
        {"id": "no_us", "etiqueta": "No he utilitzat el nou sistema en aquest període"},
        {"id": "prefereixo_no_respondre", "etiqueta": "Prefereixo no respondre"}
      ],
      "obligatoria": false,
      "de_referencia": false,
      "condicio_de_visualitzacio": null
    },
    {
      "id": "aclariment_comprensio",
      "text": "Si vols, explica breument què t’hauria ajudat a entendre millor el canvi. Evita incloure noms o dades identificatives.",
      "que_mesura": "Què hauria facilitat entendre el canvi en aquest recorregut",
      "quina_decisio_informa": "Orientar una millora de la comunicació del canvi",
      "tipus": "text_lliure",
      "opcions": [],
      "obligatoria": false,
      "de_referencia": false,
      "condicio_de_visualitzacio": {
        "totes": [
          {"pregunta_id": "comprensio", "opcions_ids": ["1"]},
          {
            "pregunta_id": "dificultat_principal",
            "opcions_ids": ["funcionament", "antelacio", "canvis", "necessitats_personals", "altra"]
          }
        ]
      }
    }
  ]
}
```

**Comprovacions del servidor i de RRHH**

- El servidor comprova els camps obligatoris, els tipus i els valors admesos. Valida la durada estimada com a enter positiu inferior a 120 i el nombre de preguntes. Si la resposta és invàlida, indica el camp que falla i permet reintentar o editar abans de l’aprovació.
- Comprova que els IDs de pregunta són únics i que els IDs d’opció són únics dins de cada pregunta. Cada salt ha de referenciar una pregunta anterior que sempre es mostra i opcions que existeixen. La llista de condicions i cada llista d’opcions han de contenir algun element. Comprova que cada recorregut té entre 3 i 6 preguntes i com a màxim una repregunta, i que el text lliure és opcional i condicionat.
- En el seguiment, compara la posició i la definició completa de cada pregunta de referència amb la versió aprovada. Comprova que cada `senyal_id` citat existeix a l’entrada. RRHH revisa si les preguntes són neutrals, si serveixen per a la decisió i si el temps estimat es compleix al mòbil. L’aprovació correspon a la versió exacta que el servidor convertirà a Typeform.

## 3. Regles de redacció i mesura

1. **Començar per la decisió.** Si una resposta difícilment canviaria què fa RRHH, revisar la pregunta. Per exemple, preguntar si la plantilla sap on demanar ajuda pot orientar on i com comunicar el canal de suport.
2. **Una idea per pregunta.** Fer servir frases curtes, neutrals i fàcils d’entendre al mòbil. Preguntar per experiències o percepcions que la persona pot declarar. Evitar enunciats que pressuposen una queixa, un benefici, una causa o una motivació. [Guia de disseny de qüestionaris](https://analysisfunction.civilservice.gov.uk/policy-store/questionnaire-design-guidance/)
3. **Triar el format segons el que es vol saber.** L’escala etiquetada mesura el grau d’acord amb un enunciat. La selecció única identifica una dificultat prioritària. El text lliure opcional aporta context que les categories poden deixar fora. Preveure opcions com «Cap dificultat», «No ho puc valorar», «No aplica» o «Prefereixo no respondre» quan tinguin sentit per a l’ítem. [Guia de disseny de qüestionaris](https://analysisfunction.civilservice.gov.uk/policy-store/questionnaire-design-guidance/)
4. **Una repregunta condicional com a màxim per recorregut.** Les condicions i la redacció s’aproven abans de publicar. Una resposta explícita pot activar una petició de context opcional. En cas de no ús, negativa o manca d’una resposta necessària per a la condició, ometre la branca. Una puntuació baixa vàlida compta encara que el comentari quedi en blanc.
5. **Mesurar cada ítem per separat.** «Tinc clar com funciona» recull comprensió percebuda. «Sé on demanar ajuda» recull coneixement declarat del canal de suport. Les conclusions es limiten a aquestes percepcions. Per a la demo, presentar els dos indicadors per separat, sense sumar-los en un índex de clima ni inferir trets, sinceritat o salut mental.

## 4. Exemple per muntar a Typeform · Canvi de torns

**Títol.** Com estàs vivint el nou sistema de torns?

> Volem entendre com s’està vivint el canvi de torns. La consulta dura menys de dos minuts. Et preguntarem si el canvi s’entén, si saps on demanar ajuda i quines dificultats has trobat. RRHH veurà resultats agrupats. Si deixes un comentari, evita incloure noms o altres dades que identifiquin algú.

| Ordre i ID | Enunciat | Format i recorregut | Què mesura i quina decisió informa |
| --- | --- | --- | --- |
| 1 · `comprensio` | Tinc clar com funciona el nou sistema de torns. | Escala d’acord 1–5. Referència. | Comprensió percebuda. Valorar si cal explicar millor el funcionament. |
| 2 · `suport` | Sé on demanar ajuda si tinc un dubte sobre el nou sistema de torns. | Mateixa escala 1–5. Referència. | Coneixement declarat del canal d’ajuda. Valorar si cal fer-lo més visible. |
| 3 · `dificultat_principal` | En els darrers set dies, quina ha estat la principal dificultat que has trobat amb el nou sistema de torns? | Selecció única. | Dificultat prioritzada durant el període. Escollir el primer problema operatiu que convé investigar. |
| 4 · `aclariment_comprensio` | Si vols, explica breument què t’hauria ajudat a entendre millor el canvi. Evita incloure noms o dades identificatives. | Text opcional. Es mostra si Q1 és `1` i a Q3 s’ha declarat alguna dificultat. | Context sobre què hauria ajudat les persones que han donat aquesta resposta. Orientar una millora de la comunicació. |

**Escala de Q1 i Q2.** `1` Gens d’acord · `2` Més aviat en desacord · `3` Ni d’acord ni en desacord · `4` Més aviat d’acord · `5` Totalment d’acord. Oferir `no_valorable` «No ho puc valorar» com a opció separada de l’escala.

**Opcions de Q3.** `funcionament` Entendre com funciona · `antelacio` Conèixer el torn amb antelació · `canvis` Gestionar canvis de torn · `necessitats_personals` Compatibilitzar el torn amb necessitats personals · `altra` Una altra dificultat · `cap` Cap dificultat · `no_us` No he utilitzat el nou sistema en aquest període · `prefereixo_no_respondre` Prefereixo no respondre. `cap`, `no_us` i `prefereixo_no_respondre` porten al final del formulari, igual que una omissió si Q3 és opcional.

**Proposta a revisar.** Tres preguntes comunes que es poden deixar en blanc i una repregunta opcional, sense comentari universal al final. La finestra de set dies, les opcions de Q3, l’obligatorietat de Q1–Q3 i el disparador exacte de Q4 s’han de confirmar amb RRHH. Si l’equip ja coneix les categories que vol comptar a la repregunta, es pot provar una selecció única en lloc del text, mantenint-la opcional.

## 5. Com s’analitza i es fa el seguiment

- **Valors i absències.** Conservar per separat valor vàlid, no valorable, no aplicable o no ús, negativa, pregunta mostrada però omesa, pregunta no mostrada i valor invàlid. Si falta informació per reconstruir el salt, registrar estat desconegut. Deduplicar imports i marcar valors fora del rang. Conservar les puntuacions extremes vàlides.
- **Denominadors.** Per a l’escala, informar de la distribució i del nombre de respostes numèriques vàlides. Si es fa servir l’indicador favorable proposat, és `respostes 4–5 / respostes vàlides 1–5`. Mostrar separadament els «No ho puc valorar» quan el llindar ho permeti. Per a Q3, indicar la base de la distribució i mostrar el no ús i la negativa per separat quan sigui publicable.
- **Repregunta i temes.** Registrar quantes trameses complien la condició, quantes van veure la pregunta si es pot comprovar i quantes la van respondre. Si només es pot reconstruir l’elegibilitat, etiquetar aquesta dada com a tal. Per a temes, comptar un tema com a màxim una vegada per tramesa i indicar la base de textos analitzables. Un comentari descartat per privacitat queda fora d’aquesta base.
- **Privacitat.** Depurar o descartar text identificatiu abans de persistir-lo o enviar-lo a IA. Aplicar `n ≥ 10` a bases, temes, talls i parelles, amb supressió complementària. La implementació publica una instantània final per onada. `response_id` deduplica trameses i el registre restringit de pseudònims permet aparellar ítems comparables dins del cicle. La introducció ha d’explicar aquest vincle. RRHH i la IA reben agregats. La calibració històrica es manté separada. [Contracte de seguiment](contracte-analisi-llm.md#comparació-amb-enquestes-anteriors) · [Límit de confiança](../../../docs/implementation.md)
- **Acció i interpretació.** Si una troballa publicable indica que les instruccions són difícils de trobar, RRHH pot escollir centralitzar-les i presentar-les a l’inici de cada torn. Al seguiment, conservar Q1 i Q2 i fer servir una pregunta adaptable per saber si les instruccions noves han arribat. Mostrar la diferència observada entre mostres amb les bases de cada onada i els canvis de composició o cobertura. Interpretar-la com a evolució observada després de l’acció.

## 6. Comprovació abans d’aprovar

- [ ] Amb el mòbil, completar tant el camí de tres preguntes com el de quatre i cronometrar el recorregut més llarg, incloent-hi el comentari.
- [ ] Demanar a persones de l’equip que expliquin què han entès per «tenir clar el canvi» i «saber on demanar ajuda», i com han triat la resposta. Aquesta prova de comprensió ajuda a detectar ambigüitats. La demo tracta els ítems com a mesures descriptives. [CDC · Entrevistes cognitives](https://www.cdc.gov/nchs/ccqder/question-evaluation/cognitive-interviewing.html)
- [ ] Provar quatre casos sintètics. Q1=`1` amb dificultat i comentari, Q1=`1` amb dificultat i comentari en blanc, Q1=`1` amb `no_us`, i Q1=`no_valorable`. Verificar el salt, l’estat analític i el recompte de cada cas.
- [ ] Simular un seguiment i comprovar que les dues preguntes de referència es conserven íntegres. Verificar que una base insuficient o un canvi que trenca la comparabilitat impedeixen mostrar la tendència directa.
