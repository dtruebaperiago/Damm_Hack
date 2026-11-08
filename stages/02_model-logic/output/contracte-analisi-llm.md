---
status: esborrany-per-revisar
---

# Contracte del LLM d’anàlisi i accions

Proposta per a la demo del canvi de torns. L’anàlisi comença amb la versió publicada de la microconsulta i les seves trameses. El servidor prepara l’evidència, un LLM la interpreta i proposa accions, i RRHH decideix quina acció vol aplicar i què vol tornar a mesurar. [Plantilla de microconsulta](plantilla-microconsulta.md) · [Model lògic](model-logic.md) · [Handoff de les dues parelles](../../../.plans/escolta-activa-damm-handoff.md)

## 1. Entrades i responsabilitats

| Qui ho lliura | Format d’entrada al servidor | Què arriba al pas 5 |
| --- | --- | --- |
| RRHH i parella del formulari | Campanya i onada, objectiu, decisió, públic autoritzat, finestra, llengua i restriccions. JSON exacte de la versió publicada, amb la correspondència entre formulari, camps i opcions de Typeform i IDs interns. | Objectiu, decisió, context depurat, públic, període, llengua i definició analítica dels ítems, incloent-hi `que_mesura`, `quina_decisio_informa` i salts. |
| Importador de Typeform | Trameses i codi extern, vinculats a la publicació. Camps normalitzats per ID de pregunta, amb torn opcional si s’ha habilitat. Les fixtures sintètiques tenen un origen i claus propis. | Instantània d’agregats publicables de l’onada, amb IDs d’evidència. L’identificador de tramesa queda al servidor i els comentaris només hi figuren com a temes agregats. |
| Parella de sondeig | Diagnòstic versionat del públic. Cada registre té `id`, `tipus` de biaix, `estat`, `origen`, públic, període, abast, observació, limitació i bases quan n’hi ha i es poden publicar. | Diagnòstic publicable separat dels resultats de l’onada. L’abast és `exacte`, `mes_ampli` o `sense_referencia`. Els estats segueixen la plantilla: `senyal_mesurat`, `risc` i `sense_dades_suficients`. Les hipòtesis de RRHH es lliuren separades i no són evidència. |

**Registre normalitzat d’exemple, intern**

```json
{
  "publicacio_id": "pub-01",
  "campanya_id": "torns-01",
  "onada": 1,
  "versio_formulari": 2,
  "response_id": "demo-001",
  "origen": "typeform_prova",
  "torn": null,
  "respostes": {
    "comprensio": {"estat": "valid", "valor": "1"},
    "suport": {"estat": "no_valorable", "valor": "no_valorable"},
    "dificultat_principal": {"estat": "valid", "valor": "funcionament"},
    "aclariment_comprensio": {"estat": "omes", "valor": null, "elegible": true, "mostrada": true}
  }
}
```

En aquest cas, el servidor ha pogut confirmar que Q4 s’ha mostrat. Si l’exportació només permet reconstruir que la tramesa era elegible, conserva aquesta dada per separat i registra l’exposició com a desconeguda.

### Exemple de JSON publicable que rep el pas 5

Extracte del paquet publicable d’una onada fictícia. `preguntes` conté els ítems de la versió publicada en el seu ordre, amb els mateixos camps que a la [plantilla](plantilla-microconsulta.md#2-què-retorna-el-generador). L’extracte n’abreuja els camps i mostra tres agregats publicables. Els IDs d’evidència són únics dins la instantània. És l’entrada del pas 5. El LLM de redacció rep les fitxes que el protocol deriva d’aquest paquet.

```json
{
  "versio_contracte": 1,
  "instantania_id": "torns-01-o1-v2-r01",
  "campanya_id": "torns-01",
  "onada": 1,
  "versio_formulari": 2,
  "llengua": "ca",
  "public": {"sector": "Planta", "ubicacio": "Planta de demo", "torn": "Tots dos"},
  "periode": "Primera setmana de consulta del canvi",
  "context": "La planta ha passat de torns fixos a una rotació Dia/Nit.",
  "objectiu": "Entendre com es viu la rotació Dia/Nit",
  "decisio_rrhh": "Decidir si cal reforçar la comunicació o el canal d’ajuda",
  "temes_exclosos": ["dades identificatives"],
  "preguntes": [
    {"id": "comprensio", "que_mesura": "Comprensió percebuda", "quina_decisio_informa": "Valorar si cal explicar millor el canvi", "condicio_de_visualitzacio": null},
    {"id": "suport", "que_mesura": "Coneixement declarat del canal d’ajuda", "quina_decisio_informa": "Valorar la visibilitat del canal", "condicio_de_visualitzacio": null},
    {"id": "dificultat_principal", "que_mesura": "Dificultat principal durant el període", "quina_decisio_informa": "Escollir quin problema operatiu investigar", "condicio_de_visualitzacio": null},
    {"id": "aclariment_comprensio", "que_mesura": "Què hauria facilitat entendre el canvi", "quina_decisio_informa": "Orientar millores de comunicació", "condicio_de_visualitzacio": {"totes": [{"pregunta_id": "comprensio", "opcions_ids": ["1"]}, {"pregunta_id": "dificultat_principal", "opcions_ids": ["funcionament", "antelacio", "canvis", "necessitats_personals", "altra"]}]}}
  ],
  "mostra": {
    "origen": "fixture_sintetica",
    "trameses_valides": 120,
    "taxa_aparent": {"estat": "indisponible", "motiu": "Sense denominador elegible de l’onada"}
  },
  "evidencies_onada": [
    {"id": "e_q1", "tipus": "escala_1_5", "pregunta_id": "comprensio", "base": 100, "recomptes_1_a_5": [40, 10, 10, 25, 15], "recompte_favorable": 40, "pct_favorable": 40},
    {"id": "e_q2", "tipus": "escala_1_5", "pregunta_id": "suport", "base": 100, "recomptes_1_a_5": [10, 10, 10, 40, 30], "recompte_favorable": 70, "pct_favorable": 70},
    {"id": "e_q4_instruccions", "tipus": "tema", "pregunta_id": "aclariment_comprensio", "tema_id": "instruccions_disperses", "tema": "Instruccions disperses", "recompte": 16, "base": 30, "base_unitat": "textos_analitzables", "elegibles": 40, "exposicio_verificada": null}
  ],
  "diagnostic_biaixos": {
    "id": "calibracio-setembre-v1",
    "troballes": [
      {
        "id": "b_setembre_extrems",
        "tipus": "autoseleccio",
        "estat": "senyal_mesurat",
        "origen": "sondeig_sintetic",
        "public": {"sector": "Planta", "ubicacio": "Planta de demo", "torn": "Tots dos"},
        "periode": "Setembre",
        "abast": "exacte",
        "observacio": "La recollida voluntària va concentrar més puntuacions extremes a la pregunta històrica de clima",
        "bases": {"referencia": 600, "voluntaria": 240},
        "diferencia_extrems_pp": 20.6,
        "limitacio": "L’autoselecció és una possible explicació. Es va mesurar una pregunta diferent de les del canvi de torns."
      }
    ]
  },
  "hipotesis_rrhh": [],
  "comparacions": [],
  "avisos_publicables": ["L’onada no disposa de denominador elegible", "Les dades són sintètiques"]
}
```

Cada evidència d’onada hereta públic, període i origen del paquet. Si s’habilita un tall, ha d’indicar els seus explícitament. Una evidència suprimida queda fora de la llista i la UI pot mostrar un estat genèric d’insuficiència. El diagnòstic pot contextualitzar riscos de cobertura, no resposta, autoselecció o moment. Els senyals de l’onada sobre participació o composició es calculen per separat. La calibració històrica no es fa servir per reponderar les respostes actuals.

## 2. Procés intern

Per al primer tall, un **flux fix al servidor** fa d’orquestrador. El motor analític aplica la política aprovada de l’enquesta. El LLM pot descobrir temes en els textos depurats i elaborar interpretacions i propostes amb referències a l’evidència. Els noms següents identifiquen peces proposades per implementar.

| Pas | Eina o script | Regla de pas |
| --- | --- | --- |
| 1. Importar | `importar_typeform` | Localitza la versió publicada amb l’ID del formulari, tradueix les referències externes a IDs interns i deduplica per `(formulari, response_id)`. Un formulari o una versió desconeguts bloquegen l’import corresponent. Descarta metadades alienes al cas i registra l’origen. |
| 2. Normalitzar i depurar | `normalitzar_respostes`, `depurar_text` | Aplica opcions i salts aprovats. Separa vàlid, no valorable, no aplicable o no ús, negativa, omès, no mostrat, invàlid i desconegut. Retira noms, contactes i detalls singulars del text o descarta el comentari si hi ha dubte. Conserva la part tancada vàlida. |
| 3. Calcular i descobrir temes | `calcular_agregats`, `descobrir_temes`, `verificar_suport` | El codi calcula distribucions, bases, cobertura i comparabilitat. L’agent proposa temes emergents a partir dels textos depurats i l’enunciat. El servidor comprova les referències i els fragments literals. Una persona revisora confirma el significat de cada suport comptat. Si el bloc temàtic queda pendent o falla, es manté l’anàlisi tancada. |
| 4. Protegir i contextualitzar | `preparar_evidencia` | Aplica el llindar `n ≥ 10` i la supressió complementària del model lògic a mètriques, talls, comparacions i actualitzacions. Per a un tema, exigeix també deu trameses diferents que el mencionin. Selecciona el diagnòstic pertinent i congela la instantània publicable. |
| 5. Interpretar i proposar | `aplicar_regles`, `sintetitzar_amb_llm`, `validar_propostes` | El servidor aplica la política d’anàlisi. El LLM proposa interpretacions i accions amb evidència publicable. Cada bloc generat passa una comprovació de referències i una revisió del significat. [Protocol del pas 5](protocol-interpretacio-llm.md) |
| 6. Validar i mostrar | `validar_informe`, `renderitzar_informe` | El servidor valida les referències i insereix xifres, bases, períodes i avisos de la instantània. RRHH veu els agregats i els blocs aprovats. Si la revisió està pendent, el bloc generat queda fora de la vista de resultats. |
| 7. Seleccionar i seguir | `seleccionar_accio`, `obrir_seguiment` | Quan RRHH confirma, el servidor desa l’acció i l’evidència exactes. Crea o recupera l’esborrany associat, conserva públic i preguntes de referència de la versió publicada i passa la pregunta adaptable al generador de microconsultes. RRHH revisa el nou formulari abans de publicar. |

**Regles de càlcul del pas 3**

- **Q1 i Q2.** Distribució sobre valors vàlids de l’1 al 5 i favorable igual a `(n4 + n5) / n_valides_1_5`. Els extrems vàlids compten. Els estats especials es compten per separat i se sotmeten al control de publicació.
- **Q3.** Distribució sobre opcions substantives, incloent-hi `cap`. `no_us`, `prefereixo_no_respondre` i les absències es compten separadament. El servidor configura explícitament la semàntica dels codis per versió per poder tractar altres opcions de no aplicabilitat en futurs ítems.
- **Q4.** El servidor separa elegibles, exposició verificada si està disponible, respostes i textos analitzables. Les mencions temàtiques es llegeixen sobre els textos analitzables de la branca. Una omissió de Q4 no canvia la puntuació de Q1.
- **Mostra.** Taxa aparent sobre la població elegible del mateix públic i període, si està disponible i es pot publicar. Un QR compartit permet comptar trameses. El torn desconegut pot comptar al total autoritzat i queda fora del càlcul per torn. Els criteris complets de composició i participació són al [model lògic](model-logic.md#regles-de-mesura-privacitat-i-ia).
- **Seguiment.** El servidor recupera onades anteriors autoritzades i comprova la comparabilitat. Distingeix entre evolució de les mostres i canvis de puntuació en respostes aparellades. [Contracte de comparació i aparellament](#comparació-amb-enquestes-anteriors)

### Comparació amb enquestes anteriors

Aquest apartat defineix les vistes de seguiment i el guió de demo. L’aplicació web actual utilitza credencials sintètiques i un pseudònim limitat al cicle per autoritzar la recollida. [Contracte de la implementació web](../../../docs/implementation.md)

El seguiment pren per defecte la primera onada de la sèrie. RRHH pot escollir una altra onada anterior autoritzada i compatible. El primer prototip recupera onades guardades a l’eina i deixa la importació d’enquestes externes per a una fase posterior. El servidor recupera la versió del formulari, les respostes depurades encara disponibles i les metadades de públic, finestra i recollida. Per a cada ítem, verifica que el concepte, l’enunciat, l’ordre, l’escala i les seves etiquetes, l’obligatorietat i la branca siguin equivalents. Si l’ítem té IDs diferents en formularis anteriors, cal una correspondència explícita revisada per l’equip. La coincidència d’ID per si sola és insuficient. Si només es conserven agregats, el sistema pot comparar mostres quan són compatibles.

| Vista | Com es calcula | Què veu RRHH |
| --- | --- | --- |
| **Evolució de les mostres** | Compara la mètrica equivalent de cada onada, amb el denominador propi de cadascuna. | Dues dates, dues bases i el canvi observat en el grup. Indica els límits per canvis de cobertura o composició. |
| **Evolució de respostes aparellades** | Enllaça respostes de dues onades de la mateixa sèrie amb `participant_id`. Per a cada escala de l’1 al 5, compara la puntuació anterior amb l’actual. El codi classifica el parell en «puja», «igual» o «baixa». | Nombre de parells vàlids i distribució agregada dels canvis publicables. Una puntuació més alta s’interpreta segons el significat de l’ítem. |

**Identificació abans del formulari.** En el flux acordat, la pàgina del QR assigna automàticament un codi aleatori en una cookie pròpia de la plataforma i limitat a la sèrie. El servidor passa a Typeform una referència temporal per associar la tramesa al codi en importar-la. `response_id` continua servint per deduplicar imports. La comparació aparellada descriu respostes enllaçades des del mateix navegador. Si es perd el codi, la resposta encara pot comptar a la seva onada. Un navegador compartit pot agrupar respostes de persones diferents. [Decisió sobre la cookie](../../../docs/adr/0002-codi-de-seguiment-al-navegador.md)

**Text proposat abans de respondre.** «El navegador desa un codi aleatori per poder comparar les respostes d’aquest seguiment si hi tornes amb el mateix navegador. Pots respondre sense escriure el teu nom ni cap credencial. RRHH només veurà resultats agrupats.»

**Franja de resposta.** En importar una tramesa completada, el servidor converteix `submitted_at` a l’hora local del centre i desa `franja_resposta`. Per a la demo, les franges són matí (06:00–14:00), tarda (14:00–22:00) i nit (22:00–06:00). Cada franja inclou l’hora d’inici i acaba just abans de l’hora següent. Una data absent o invàlida dona `desconeguda`. RRHH pot comparar opinions segons quan es va respondre, amb base i privacitat per franja. El torn de feina és una dada diferent. [Data d’enviament a Typeform](https://www.typeform.com/developers/webhooks/example-payload/)

**Demo.** Es recull una resposta de prova en directe a Typeform. El càlcul aparellat es mostra amb dues onades sintètiques preparades i codis ja assignats. La identificació en directe queda fora del guió.

**Regles del parell.** Després de deduplicar imports, cal un únic registre vàlid per codi i onada, i una puntuació vàlida de l’ítem en totes dues. Si hi ha múltiples trameses amb el mateix codi en una onada, el parell queda exclòs fins a resoldre l’ambigüitat. Sense codi, amb codi perdut o amb una resposta antiga recollida sense codi, la tramesa pot seguir comptant a la vista de mostres. El servidor evita reconstruir identitats a partir del torn, el text o altres dades. Per al primer tall, els comentaris oberts continuen mostrant-se com a temes per onada.

**Publicació i límits.** El pas 4 aplica `n ≥ 10` a la base efectiva de cada ítem i tall, així com la supressió de categories protegides i complementàries. El LLM i RRHH reben bases i transicions agregades. Els codis i els recorreguts de cada persona queden a l’enllaç intern del servidor, en línia amb el requisit del repte de mostrar resultats agregats. La vista aparellada representa qui va aportar dues respostes enllaçables. Un canvi observat després d’una acció es descriu amb aquest abast. [Guia del repte](../../../guia_participants_repte_damm.md#8-privacitat-i-ús-responsable)

| Exemple sintètic · Comprensió percebuda | Resultat publicable |
| --- | --- |
| **Mostres de cada onada** | 40 de 100 respostes favorables a la primera onada i 54 de 90 al seguiment. La proporció observada passa del 40% al 60%. |
| **Respostes aparellades** | Entre els 50 parells vàlids, 25 donen una puntuació més alta, 15 donen la mateixa i 10 en donen una de més baixa. |

Al paquet del pas 5, `comparacions` distingeix els tipus `entre_mostres` i `aparellada`. Cada entrada porta ID d’evidència, IDs i períodes d’ambdues onades, ítem, mètriques publicables, base o bases i limitacions. Si el servidor no pot publicar una comparació, el paquet només en conserva l’estat i el motiu publicable.

## 3. Sortida per a RRHH

El servidor munta les troballes i propostes i hi afegeix les xifres, la base, el període i la procedència de cada evidència citada. L’exemple mostra l’objecte de sortida després de l’assemblatge. La referència a la instantània permet recuperar el resultat exacte encara que s’actualitzi la campanya.

```json
{
  "instantania_id": "torns-01-o1-v2-r01",
  "troballes": [
    {
      "id": "t_comprensio",
      "text": "L’acord amb l’ítem de comprensió queda dins del rang que RRHH ha fixat per revisar la comunicació.",
      "evidencia_ids": ["e_q1"],
      "limitacio": "L’ítem recull comprensió percebuda entre les trameses que han donat una resposta vàlida."
    },
    {
      "id": "t_instruccions",
      "text": "Entre els comentaris analitzables de la repregunta apareixen dificultats per trobar instruccions en un sol lloc.",
      "evidencia_ids": ["e_q4_instruccions"],
      "limitacio": "La repregunta és opcional i només s’activa en un recorregut concret."
    }
  ],
  "context_biaixos": [
    {
      "diagnostic_id": "b_setembre_extrems",
      "text": "Al setembre la recollida voluntària va concentrar més puntuacions extremes. El contrast històric aporta context sobre el risc d’autoselecció a l’onada actual."
    }
  ],
  "accions": [
    {
      "id": "a_resum_torns",
      "tipus": "canvi",
      "titol": "Centralitzar les instruccions del nou sistema de torns",
      "troballa_ids": ["t_comprensio", "t_instruccions"],
      "diagnostic_ids": [],
      "rol_suggerit": "Supervisió de Planta",
      "primer_pas": "Preparar una guia breu amb un únic punt de consulta i presentar-la als dos torns.",
      "quan": "A l’inici de cada torn durant la setmana següent a l’aprovació",
      "seguiment": {
        "quan": "Una setmana després de difondre la guia",
        "pregunta_adaptable": "Durant els darrers set dies, has pogut trobar les instruccions del nou sistema de torns quan les has necessitat?",
        "opcions_suggerides": ["Sí", "No", "No les he necessitat", "Prefereixo no respondre"],
        "preguntes_referencia_ids": ["comprensio", "suport"]
      }
    }
  ]
}
```

El validador exigeix IDs existents de la instantània vigent per a la vista. Cada troballa sobre l’onada ha de tenir evidència actual, i cada acció ha de referenciar troballes o diagnòstics pertinents segons el tipus `canvi` o `recollida`. El servidor rebutja camps inesperats, cites a resultats suprimits i accions de canvi que només citin l’històric. Una persona revisora confirma que el significat i l’abast del bloc coincideixen amb l’evidència abans d’incorporar-lo a l’informe.

### Exemple de targeta a la pantalla

| Bloc | Què veu RRHH |
| --- | --- |
| **Mostra** | Planta de demo · Dia i Nit · Primera setmana de consulta · 120 trameses vàlides sintètiques. Taxa aparent indisponible perquè falta el denominador de l’onada. |
| **Resultats del canvi** | Comprensió percebuda amb un 40% favorable de 100 respostes vàlides. Coneixement declarat del canal d’ajuda amb un 70% de 100. «Instruccions disperses» apareix en 16 de 30 textos analitzables de la branca opcional. |
| **Context històric** | Setembre · 600 respostes de referència i 240 de la voluntària · 20,6 punts percentuals més als extrems en la voluntària. El contrast correspon a la pregunta històrica de clima i orienta la cautela sobre autoselecció. |
| **Acció proposada** | Centralitzar les instruccions i presentar la guia a l’inici de cada torn. Rol suggerit, Supervisió de Planta. La targeta enllaça la comprensió percebuda i el tema dels comentaris amb les seves bases. |
| **Seguiment** | Una setmana després de difondre la guia, recuperar Q1 i Q2 i preguntar si s’han pogut trobar les instruccions quan han calgut. Botó **Seleccionar acció i obrir esborrany**. |

Amb evidència insuficient del canvi, la vista indica **Dades insuficients per proposar una acció sobre el canvi**. Si hi ha un senyal pertinent de cobertura, pot mostrar una targeta de recollida, per exemple, oferir el QR en una franja que cobreixi tots dos torns. Si tampoc hi ha evidència per a aquesta proposta, la vista mostra l’estat sense cap targeta d’acció.

## 4. Comprovació de les dues parelles

| Prova | Resultat esperat |
| --- | --- |
| Importar dues vegades la mateixa tramesa de prova, amb Q1 igual a `1`, Q3 substantiva i Q4 omesa. | Una tramesa. Q1 compta i Q4 no aporta text. Una tramesa amb `no_us` a Q3 no compleix el salt. Si falta informació per saber si es va mostrar Q4, l’exposició queda desconeguda. |
| Provar text amb dades identificatives o instruccions incrustades. Afegir un tema emergent amb nou mencions confirmades. | El text identificatiu es redacta o descarta abans de l’IA. L’agent tracta les instruccions incrustades com a dades. El tema amb nou mencions no arriba a l’agent de síntesi ni a RRHH. |
| Provar la targeta amb una cel·la petita reconstruïble per resta o per diferència entre actualitzacions. | El servidor protegeix també els totals o talls complementaris necessaris abans de preparar el paquet. |
| Substituir l’evidència actual per una calibració de planta quan el públic és Nit. | El context indica l’abast més ampli. La sortida no genera cap acció sobre la comprensió del canvi basada en aquesta calibració. |
| Injectar un ID inventat o una acció de canvi que només citi l’històric. | El servidor rebutja la proposta i manté accessibles els agregats publicables. |
| Escollir l’acció d’exemple i demanar dues vegades el seguiment. Repetir la comparació amb Q1 modificada o amb nou respostes vàlides. | L’acció conserva el vincle amb l’evidència exacta i recupera el mateix esborrany amb Q1 i Q2 intactes. Els casos alterats no mostren la tendència directa de l’ítem afectat. |

Queda pendent que l’equip confirmi el contracte de camps de Typeform, els talls per torn, el rol de revisió d’evidència, el proveïdor del LLM i el nombre d’accions seleccionables per campanya.
