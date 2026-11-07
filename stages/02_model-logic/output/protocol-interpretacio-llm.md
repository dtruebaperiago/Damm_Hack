---
status: esborrany-per-revisar
---

# Protocol reutilitzable del pas 5 · De l’evidència a les accions

El pas 5 rep la instantània publicable del pas 4 i aplica una política d’anàlisi aprovada amb la versió del formulari. El servidor calcula els resultats tancats i l’agent descobreix possibles temes a partir de les respostes obertes depurades. Els temes, les interpretacions i les propostes de l’agent passen pels controls d’evidència abans d’arribar a l’informe. [Contracte d’anàlisi i accions](contracte-analisi-llm.md#2-procés-intern)

## 1. Configuració que canvia per enquesta

Es reutilitzen els mateixos passos i operadors. Per a una enquesta nova, RRHH i l’equip d’implementació revisen una fitxa versionada amb aquests camps abans de veure’n els resultats.

| Camp | Què s’hi fixa |
| --- | --- |
| `preguntes` | ID, concepte i tipus analític. Per a una escala, opcions ordenades, valors vàlids, orientació i conjunt de valors que es vol reportar com a favorable, si escau. Per a categories, codis substantius, no aplicables i de negativa. Per a text, enunciat, branca, públic i context de la pregunta. |
| `regles_troballa` | ID, mètrica d’entrada, operador i llindar si escau, requisit de comparabilitat, text base i limitacions. Una regla pot limitar-se a descriure una distribució. |
| `regles_relacio` | Parells de troballes que es poden llegir juntes i condicions d’abast. Per exemple, una repregunta pot donar context a l’ítem que l’activa. |
| `criteris_accio` | Objectiu, restriccions i evidència necessària segons el tipus d’acció (`canvi` o `recollida`). Les accions conegudes es poden preconfigurar. Un tema emergent també pot originar una proposta si compleix aquests criteris i supera la revisió. |
| `politica_publicacio` | Vistes autoritzades, límits de privacitat, màxim de propostes i idioma. Els límits hereten les proteccions generals del projecte. |

Extracte de la política del canvi de torns, pendent de revisió. El `40%` és un punt de decisió proposat per a aquest ítem. El mínim de privacitat s’aplica per separat. En aquest exemple, la política permet vincular un tema verificat de la repregunta amb Q1. El tema concret es descobreix durant l’anàlisi.

```json
{
  "politica_id": "torns-v1",
  "regles_troballa": [
    {"id": "t_comprensio", "pregunta_id": "comprensio", "metrica": "pct_favorable", "operador": "menor_o_igual", "llindar": 40}
  ],
  "regles_relacio": [
    {"tipus": "context_de_branca", "pregunta_base_id": "comprensio", "pregunta_context_id": "aclariment_comprensio"}
  ],
  "criteris_accio": {
    "canvi": {"requereix_evidencia_actual": true},
    "recollida": {"requereix_problema_o_risc_documentat": true},
    "max_propostes": 3
  }
}
```

El servidor valida IDs, operadors, orientació de l’escala i requisits abans d’aprovar la política. Una pregunta sense criteri d’actuació pot generar una descripció. Una enquesta sense text, sense històric o sense seguiment continua pel mateix flux amb els blocs disponibles.

El motor resol la configuració amb un conjunt tancat d’operadors. Per al primer tall, una regla pot descriure una distribució, comparar una proporció amb un llindar, comprovar si un tema és publicable o descriure una diferència entre onades declarades comparables. L’avaluador llegeix mètriques preparades pel servidor. La incorporació d’una mètrica nova requereix definir-ne la base i la regla de publicació.

## 2. Tractament de les dades abans d’interpretar

### Escales i opcions tancades

1. El pas 3 tradueix els codis de l’enquesta a estats i valors segons la versió publicada. `no_valorable`, negativa, no ús i absències es conserven com a estats propis. A l’escala d’acord de la demo, els valors vàlids són `1–5` i els favorables són `4–5`. Una escala sobre freqüència de problemes pot tenir una orientació diferent. Aquesta orientació ha d’estar configurada per ítem.
2. Per ítem, tall i onada, el codi calcula distribució, base i mètriques configurades a partir dels recomptes. El pas 5 fa servir el valor complet, o la fracció, per decidir si una regla es compleix. Arrodoneix només per mostrar. Amb base zero o mètrica suprimida, la condició queda `indisponible` i l’acció que en depèn no s’activa. La superació d’un llindar de decisió descriu la mostra i activa la regla acordada.
3. Una comparació exigeix la compatibilitat que correspon a la regla. Per a tendència entre onades cal la mateixa definició de l’ítem i el protocol i públic comparables, amb base publicable a totes dues onades. El pas 5 consumeix el veredicte del servidor. Només genera frases d’evolució quan el resultat és comparable i hi adjunta les limitacions disponibles.

### Respostes obertes

1. **Depurar per privacitat.** Al pas 2, retirar contactes, noms i detalls singulars o descartar el comentari si hi ha dubte. La detecció de dades identificatives és independent del sector i dels temes. Al pas 3, l’agent rep els textos ja depurats amb claus opaques, l’enunciat, la branca i el context autoritzat. Els comentaris i el context són dades d’entrada. Una instrucció incrustada en un comentari no modifica la tasca de l’agent.
2. **Extreure observacions i descobrir temes.** Per cada observació, l’agent retorna `{resposta_ref, fragment_literal, observacio}` o s’absté si el text és ambigu. Agrupa observacions que expressen la mateixa idea i proposa un títol i una definició descriptius. En volums grans, descobreix candidats per lots i els consolida abans de comprovar el suport sobre el conjunt complet de l’ítem. Conserva separats els fragments que neguen, matisen o expressen una experiència diferent. Un text pot aportar evidència a més d’un tema.
3. **Comprovar cada vincle.** El servidor resol la referència dins la instantània i comprova que el fragment coincideix literalment amb el text depurat i pertany a l’ítem, la branca i l’abast correctes. Això verifica l’origen. Per verificar el sentit, un segon pas de contrast llegeix la resposta depurada completa i indica `dona_suport`, `contradiu` o `indeterminat` per a cada vincle. Aquest pas pot fer servir una crida separada al LLM per detectar errors. Per publicar un tema, una persona revisora amb accés autoritzat als textos depurats ha de confirmar el títol, la definició i cada suport comptat, tenint en compte les contradiccions. En absència de revisió, el tema queda pendent i la resta de l’informe pot continuar.
4. **Comptar i protegir.** El servidor compta una menció per tramesa amb suport confirmat. La base inclou tots els textos analitzables de l’ítem i recorregut, també les abstencions. Els exclosos per privacitat queden fora. Si la comprovació de cobertura del conjunt falla, el bloc queda indisponible. El pas 4 aplica els llindars i la supressió complementària abans de publicar el tema. La instantània conserva els vincles validats amb accés restringit. A RRHH arriben la síntesi del tema, el recompte i la base publicables i el límit de la branca. Les referències de tramesa i els fragments queden fora de la vista i dels logs.

**Exemple de suport.** «La guia és al correu i els canvis els posen en un altre lloc» pot sustentar «Instruccions disperses». «No entenc el canvi» no identifica aquest obstacle, i «Ara ho trobo tot al mateix lloc» expressa el contrari. En una altra enquesta pot emergir «Avisos de ruta tardans» si les respostes de Logística ho descriuen. El servidor assigna IDs als temes validats dins la instantània. La coherència del títol es revisa amb els seus fragments; la repetició de l’informe recupera aquests vincles i recomptes aprovats.

Exemple de candidat intern, abans de validar-lo. La clau es resol només dins de la instantània corresponent. L’agent no retorna freqüències.

```json
{
  "pregunta_id": "aclariment_comprensio",
  "tema_proposat": "Instruccions disperses",
  "definicio": "Les instruccions o les seves actualitzacions es troben en llocs diferents.",
  "vincles": [
    {
      "resposta_ref": "r-q4-017",
      "fragment_literal": "La guia és al correu i els canvis els posen en un altre lloc",
      "observacio": "La guia i les actualitzacions es consulten en llocs diferents."
    }
  ]
}
```

## 3. Execució del pas 5

| Ordre | Peça | Entrada i sortida |
| --- | --- | --- |
| 5.1 | `preparar_execucio` | Valida que coincideixin la instantània, la versió publicada, el públic i la política. Resol els IDs d’evidència del paquet, manté l’històric en un bloc propi i recupera l’informe base si ja s’ha calculat. |
| 5.2 | `aplicar_regles` | Avalua cada condició com a `complerta`, `no_complerta` o `indisponible`. Les fitxes de troballa identifiquen la regla o el tema verificat que les origina i enllacen l’evidència, l’abast, la unitat de base i les limitacions. Un valor indisponible no es tracta com a zero. |
| 5.3 | `relacionar_troballes` | Aplica únicament relacions declarades a la política. Un tema d’una repregunta pot aportar context a l’ítem que l’activa si coincideixen onada i públic i es conserva l’abast de la branca. El text continua referint-se a les trameses que van deixar un comentari analitzable. Amb bases diferents, presenta les dues evidències amb els seus denominadors. |
| 5.4 | `sintetitzar_amb_llm` | Rep l’objectiu, el context autoritzat, les troballes publicables i les seves limitacions. Pot redactar interpretacions i propostes noves. Cada interpretació retorna `text`, `evidencia_ids` i `limitacio`. Cada proposta indica el tipus, les troballes o diagnòstics que la motiven, el primer pas i què comprovar al seguiment. |
| 5.5 | `validar_propostes` | El servidor comprova esquema, IDs, abast i elegibilitat. Una proposta de canvi exigeix evidència actual publicable. Una proposta de recollida pot referenciar un problema de cobertura o un risc documentat. Una persona revisora comprova el suport semàntic de cada afirmació i la relació de cada proposta amb l’objectiu. Només els blocs validats s’incorporen a l’informe. |
| 5.6 | `generar_informe_base` | Munta l’informe amb plantilles, xifres del servidor i blocs validats. Ordena les troballes per posició de pregunta i ID. Si el model falla o la revisió està pendent, l’informe mostra els agregats i blocs ja validats. |

**Fonts que pot usar l’agent.** Les respostes i els agregats de l’onada sustenten resultats actuals. El diagnòstic històric i el context de RRHH aporten abast, antecedents, vocabulari i restriccions. Una hipòtesi de RRHH es manté identificada com a tal fins que hi hagi dades que la sostinguin. Una proposta és una opció per valorar, amb rol i moment suggerits. El revisor ha de rebutjar xifres, fets, causes, generalitzacions o compromisos que les fonts no sustentin. Les xifres de l’informe les insereix el servidor.

**Criteri de publicació.** Tota afirmació factual publicada ha de tenir una font verificable que en sustenti el significat i l’abast. Un ID vàlid comprova la traçabilitat però no la interpretació. Si hi ha dubte, el bloc queda pendent, es reformula amb el límit pertinent o es mostra «Dades insuficients». La coincidència entre dos models serveix per prioritzar la revisió. La validació semàntica humana és la porta de publicació dels blocs generats.

**Clau de reproducció.** L’informe aprovat referencia la instantània immutable, la versió de política, la versió del motor, la versió de plantilles, l’idioma i la revisió dels blocs generats. La instantània fixa la vista autoritzada i els suports verificats. Consultar la mateixa revisió recupera el mateix informe després de comprovar l’accés. Si canvien les dades, els suports, la configuració o els blocs aprovats, es genera una nova revisió. Els esborranys del LLM registren la versió del model i de les instruccions. Els logs conserven IDs i estats.

## 4. Recorregut de l’exemple de torns

| Entrada publicable | Decisió del motor |
| --- | --- |
| Q1 té 40 respostes favorables de 100 vàlides. | `40/100 ≤ 40/100`. S’activa `t_comprensio`. L’informe parla de comprensió percebuda en la mostra. |
| Q4 té 16 mencions verificades d’instruccions disperses en 30 textos analitzables. | Es publica el tema emergent. La relació entre Q1 i Q4 conserva les dues bases. Q4 aporta detalls dels comentaris de la branca activada, que deriva parcialment de Q1. |
| Les dues troballes són disponibles al mateix abast de campanya. | L’agent pot proposar centralitzar les instruccions i comprovar-ne l’accés al seguiment. La proposta conserva els dos vincles d’evidència i passa per revisió. |
| Si Q4 només té nou mencions, falta revisió o falla la verificació. | Q1 segueix a l’informe. La proposta sobre instruccions disperses queda fora si depèn d’aquest tema. |
| Si només hi ha calibració de setembre. | Apareix al bloc de context amb el seu abast. El motor pot activar una regla de recollida si el diagnòstic conté un risc pertinent a la proposta i a la vista. |

## 5. Comprovacions pendents amb l’equip

- [ ] Repetir l’execució amb la mateixa instantània i les evidències en un ordre diferent. L’informe base ha de tenir els mateixos IDs, evidències, ordre i text. Repetir-la amb el LLM de redacció indisponible i comprovar que l’informe base es pot consultar.
- [ ] Provar el límit de Q1 amb `40/100` i `41/100`. Provar una escala diferent amb orientació configurada i un `no_valorable`. El motor ha de respectar la política i el denominador de cada ítem.
- [ ] Provar textos sintètics de Planta, Logística, Comercial i Oficines sense llistes de temes predefinides. Incloure una expressió local, una negació, una resposta ambigua, un comentari multitema i instruccions incrustades. Comprovar que emergeixen temes nous amb suport i es descarten els vincles sense suport.
- [ ] Injectar un fragment inventat i un fragment literal que contradiu la conclusió. El primer falla la comprovació d’origen. El segon no supera la validació semàntica. Repetir amb un tema pendent de revisió i comprovar que la vista de RRHH no el mostra.
- [ ] Proporcionar una hipòtesi de RRHH que els comentaris no mencionen i un diagnòstic històric d’un altre públic. Comprovar que el resum no els presenta com a fets de l’onada, encara que els seus IDs existeixin.
- [ ] Provar una enquesta només amb escala, una només amb text i una amb repregunta opcional. Confirmar que l’abast dels temes, les bases i les accions es deriven de la configuració de cada enquesta.
- [ ] Provar una mètrica suprimida, una comparació entre onades incompatible i una calibració amb abast més ampli. Comprovar que el motor no activa la regla que en depèn i que la UI manté el context publicable.
- [ ] Recuperar dues onades sintètiques amb bases diferents. Verificar els càlculs entre mostres i aparellats. Incloure un codi perdut, dues trameses amb el mateix codi en una onada i una pregunta de referència modificada. Comprovar que el paquet del LLM només conté transicions agregades publicables i que la vista de RRHH distingeix els dos denominadors. [Contracte de seguiment](contracte-analisi-llm.md#comparació-amb-enquestes-anteriors)

L’equip ha de confirmar el llindar il·lustratiu de Q1, els criteris d’acció i qui pot revisar els fragments depurats durant la demo.
