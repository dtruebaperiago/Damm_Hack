---
status: pendent-de-revisio-de-lequip
---

# Escolta activa Damm · Especificació del prototip

## Propòsit i fonts

El prototip permet a People/RRHH entendre com s’ha rebut un canvi organitzatiu, arribar als col·lectius amb menys accés digital i decidir una acció que es pugui revisar amb una segona microconsulta. La demo segueix l’**Escenari A de la guia**. Una fàbrica fictícia de Catalunya, sense ubicació exacta, ha passat de torns fixos a una rotació entre Dia i Nit. El canvi es va comunicar dues setmanes abans de la consulta. RRHH vol saber si s’ha entès, quines dificultats genera i què cal reforçar. Respondre ha de portar menys de dos minuts.

| Origen | Què estableix |
| --- | --- |
| [Guia de participants](../guia_participants_repte_damm.md) | Requisits del repte. Flux complet, 3–6 preguntes, aprovació humana, publicació i recollida via Typeform, dades sintètiques, privacitat, anàlisi, acció i seguiment. |
| [Presentació del repte](../repte_estrella_damm_uab_the_hack_2026.md) | Context de negoci, categories de biaix, criteris d’avaluació i exemple de canvi de torns. |
| [Esquema de l’equip](../esquema_clima_laboral.svg) | Proposta de l’equip. Sondeig, diagnòstic abans de publicar, adaptació de la consulta i canals segons el col·lectiu. |
| Entrevista de l’equip | Cas de demo, segmentació controlada per RRHH, diagnòstic de biaixos mesurats i riscos, QR real, quiosc com a extensió, dues preguntes fixes i selecció d’una acció amb seguiment. |

Els valors numèrics, els textos d’exemple i les regles operatives d’aquest document són decisions de prototip. Totes les dades, ubicacions, comentaris i respostes de la demo són ficticis o de prova. En una aplicació futura, el sondeig podria recollir respostes reals amb els controls corresponents. L’stack i el proveïdor d’IA els triarà l’equip. Es preveu disposar d’accés a Typeform i a un LLM.

## Usuaris i segmentació

**Actualització d’implementació (7/11/2026).** S’incorpora l’accés amb credencial sintètica autoritzada, una resposta acceptada per credencial i onada i seguiment pseudonimitzat dins del mateix cicle, segons el [prompt de construcció](prompt-agent-web-completa.md). La calibració de setembre continua agregada i sense aparellament. [Contracte i límit de confiança](../docs/implementation.md). La revisió de l’equip continua pendent.

- **RRHH** introdueix la necessitat, tria el públic, revisa el diagnòstic, edita i aprova la consulta, llegeix resultats agregats i selecciona una acció i el seguiment.
- **Persona treballadora** obre l’accés de la plataforma des del QR i introdueix una credencial fictícia autoritzada, sense crear un compte. La introducció explica la finalitat, el tractament pseudonimitzat i el vincle entre onades. El comentari lliure és opcional; la durada és estimada fins a la prova amb persones.
- **Responsables i direcció** poden rebre conclusions agregades. A la demo, RRHH és l’únic rol amb flux propi.

RRHH selecciona el sector i una ubicació compatible d’un catàleg tancat. Els sectors són **Planta, Logística, Comercial i Oficines**. Les ubicacions són fictícies i predefinides. A Planta es pot triar **Dia**, **Nit** o **Tots dos**. La IA rep la selecció com a context de lectura. El catàleg i l’abast els governa RRHH. A la implementació local, el torn procedeix del registre restringit de credencials sintètiques, no del text de les respostes.

## Recorregut del producte

| Pas | Com es veu a la demo |
| --- | --- |
| **1. Definir** | RRHH explica el canvi i l’objectiu en llenguatge natural. Tria sector, ubicació i torn si escau, defineix la durada màxima i indica temes a evitar. |
| **2. Diagnosticar i generar** | Quan RRHH descriu la necessitat i selecciona sector i ubicació, la plataforma recupera la calibració pertinent i mostra els senyals, riscos i dades insuficients. La IA genera títol, introducció, 3–6 preguntes, tipus de resposta, una branca senzilla quan aporti valor i durada estimada. Proposa canal i finestra segons el context de cobertura i moment i explica cada adaptació rellevant. |
| **3. Revisar i aprovar** | RRHH pot editar, eliminar o reordenar les preguntes i revisar la branca. La vista prèvia mostra el recorregut més llarg. Aprovar fixa la versió. Una edició posterior torna la versió a esborrany i exigeix una nova aprovació. |
| **4. Publicar i distribuir** | El servidor publica la versió aprovada a Typeform i desa el vincle amb la campanya. L’enllaç i el QR són compartibles. RRHH veu una proposta de finestra i recordatori col·lectiu per arribar als torns amb poca cobertura. La demo empra difusió manual i evita seguiment individual. |
| **5. Recollir** | RRHH importa les respostes via API mentre la finestra està oberta. La plataforma valida l’autorització i la caducitat i aplica unicitat per credencial/onada i formulari/resposta. Els agregats es publiquen en una única instantània final quan RRHH tanca la recollida; no hi ha recomptes canviants durant la recollida. |
| **6. Analitzar** | El dashboard mostra la mida de la mostra actual, participació, respostes d’escala i temes. Presenta per separat el contrast històric entre referència i voluntària per contextualitzar el risc de no resposta i autoselecció. Mostra evolució quan hi ha base comparable i explica les limitacions al mateix lloc. |
| **7. Actuar i tornar a escoltar** | La IA proposa accions vinculades a evidència agregada. RRHH en selecciona una i obre una consulta de seguiment que reutilitza el públic i les dues preguntes de referència. La consulta neix com a esborrany i segueix el mateix flux d’aprovació. |

El **quiosc** es mostra com a extensió de producte. Una pantalla compartida en un espai que permeti respondre en privat obriria la consulta aprovada i tornaria al punt d’inici després de cada ús, sense exposar la sessió anterior. QR i mòbil són el canal funcional de la demo. Teams i M365 són vies d’evolució.

## Sondeig sintètic i diagnòstic

La demo aprofundeix en una única fàbrica fictícia de Catalunya (sector Planta al catàleg). Al **setembre**, inici de l’any financer en l’escenari, es simulen dues recollides sobre les mateixes **600 persones elegibles**, amb el mateix enunciat i escala i en condicions tan comparables com sigui possible. La calibració és històrica i caracteritza la participació en aquest públic, independentment del canvi de torns i de les accions de RRHH. Les enquestes anteriors a la implantació també poden aportar context si se’n coneixen l’abast i les condicions.

- **Referència completa.** Sondeig breu plantejat com a obligatori en la simulació, amb 600 respostes. La completitud és una premissa del cas sintètic. En una recollida real caldria comprovar la cobertura efectiva i considerar la pressió percebuda.
- **Voluntària.** Sondeig amb QR compartit i 240 respostes vàlides sintètiques del mateix públic. La taxa aparent és del 40%. El QR identifica trameses i deixa la unicitat de participants sense verificar.
- **Pregunta comuna.** «Em sento a gust en el meu entorn de treball i condicions», en una escala d’1 a 5. La puntuació recull una valoració conjunta dels dos aspectes.

| Puntuació | Referència completa · n = 600 | Voluntària · n = 240 |
| --- | ---: | ---: |
| 1 | 53 · 8,8% | 46 · 19,2% |
| 2 | 109 · 18,2% | 32 · 13,3% |
| 3 | 275 · 45,8% | 68 · 28,3% |
| 4 | 112 · 18,7% | 49 · 20,4% |
| 5 | 51 · 8,5% | 45 · 18,8% |

El gràfic de demo agrupa dues barres per puntuació i mostra percentatges, mida de cada mostra, període i etiqueta de dades sintètiques. Els extrems (1 i 5) sumen **17,3% a la referència i 37,9% a la voluntària**, una diferència de **20,6 punts percentuals**. Els recomptes són deliberadament irregulars i cada categoria voluntària es pot generar com un subconjunt de la categoria de referència. Es comparen agregats sense vincular persones entre recollides. Els agregats de població, les respostes històriques i les trameses de la microconsulta actual es guarden separadament.

El contrast mesura fins a quin punt les dues distribucions observades divergeixen en aquesta pregunta. L’autoselecció és el mecanisme que s’ha simulat i una possible explicació en dades reals, juntament amb altres diferències de recollida. Si una altra planta fes el mateix sondeig amb una referència comparable i tingués, per exemple, una diferència de 5 punts percentuals als extrems, la de Catalunya presentaria una desviació observada més gran en aquest indicador. La demo mostra una sola planta. Amb diversos sondejos comparables, la plataforma podria avisar d’un patró recurrent. Amb un sol sondeig, el missatge cita l’episodi de setembre i el seu abast.

Cada diagnòstic conserva període, públic, denominadors disponibles, regles aplicades i evidència. Classifica cada biaix o problema de qualitat com a **senyal mesurat**, **risc** o **sense dades suficients**. Un senyal mesurat descriu un fet de la mostra. La seva causa pot continuar oberta.

| Biaix o problema | Evidència i resposta del producte |
| --- | --- |
| **Cobertura** | Inventari sintètic d’accés per grup i canal, quan estigui disponible. Mostrar el desajust entre canal i accés. Proposar QR a la planta, format mòbil i una finestra que arribi als dos torns. Sense dades d’accés, marcar la cobertura com a risc o desconeguda segons el context. |
| **No resposta** | Mostrar respostes acceptades sobre població elegible del mateix públic i període. La unicitat de la calibració històrica voluntària continua sense verificar (taxa aparent). Les onades noves limiten l’acceptació per credencial, sense verificar qui la posseeix físicament. Sense denominador, no calcular taxa. La participació no garanteix representativitat. |
| **Autoselecció** | Comparar els percentatges per puntuació i la proporció d’extrems amb la referència quan sigui comparable. La diferència és un senyal mesurat. L’autoselecció és un risc per interpretar la consulta voluntària i els extrems en són una manifestació possible. |
| **Segmentació** | Comparar el pes de cada grup a la mostra amb el seu pes a la població elegible. Assenyalar desequilibris i limitar les comparacions a grups autoritzats i publicables. El resultat global incorpora el límit de composició de la mostra. |
| **Moment** | Mostrar la finestra, el període i la proximitat al canvi si RRHH ha indicat la data. Advertir del risc si la recollida s’ha concentrat en una franja o coincideix amb un fet recent. Proposar una finestra que cobreixi els torns seleccionats. |
| **Desitjabilitat social** | Assenyalar el risc si el context suggereix poca privacitat o pressió percebuda. Proposar resposta individual, introducció clara i redacció neutral. |
| **Redacció** | Assenyalar preguntes dirigides, dobles o amb supòsits sobre l’experiència de la persona. Proposar una redacció neutral perquè RRHH la revisi. |
| **Valors atípics i qualitat** | Deduplicar imports pel codi tècnic de resposta, validar rangs i separar registres malformats segons regles reproduïbles. Conservar les opinions extremes vàlides. Mostrar el recompte d’exclusions i el criteri quan sigui segur publicar-los. |

**Cobertura i moment a la demo.** S’expliquen com a extensions del mateix mètode. Es podrien comparar consultes equivalents distribuïdes per QR i per correu, o en finestres diferents. Per interpretar els contrastos cal registrar la població a què arriba cada canal, els torns i les condicions de cada finestra. Sense aquestes dades, RRHH veu el risc o la insuficiència i el model pot proposar un canal accessible o una finestra que inclogui els dos torns.

## Personalització i comparabilitat

L’entrada a la generació combina l’objectiu de RRHH, les restriccions, el públic escollit, els resultats agregats del sondeig i els riscos contextuals. Les regles de validació s’apliquen fora del model. La sortida identifica per a cada adaptació el senyal o risc que la motiva. Una baixa cobertura pot portar a simplificar el format o canviar la distribució. La redacció continua sent neutral respecte del resultat esperat.

Després de recollir la microconsulta, el dashboard mostra la calibració del públic seleccionat com a context d’interpretació de la no resposta i l’autoselecció. Indica l’abast, el període, l’enunciat i les bases històriques i conserva els percentatges observats de la consulta actual. Si només hi ha calibració per al conjunt de la fàbrica i s’ha seleccionat un torn, s’etiqueta com a context del conjunt. Si falta una referència pertinent, es mostra «Dades insuficients». La pregunta de clima de setembre i les preguntes de la microconsulta del canvi es mostren com a mesures diferents.

> Al sondeig sintètic de setembre d’aquesta fàbrica, la recollida voluntària va concentrar més puntuacions extremes que la referència. Tingues en compte el risc de no resposta i autoselecció en interpretar la mostra actual.

Per comparar la **primera microconsulta del canvi** amb la **de seguiment**, mantenir aquests elements:

- **Comprensió.** «Tinc clar com funciona el nou sistema de torns.»
- **Suport.** «Sé on demanar ajuda si tinc un dubte sobre el nou sistema de torns.»
- Mateixos identificadors, text, ordre, obligatorietat i escala a les dues onades. Escala d’1 a 5, de «Gens d’acord» a «Totalment d’acord», amb una opció separada «No ho puc valorar». Mostrar el nombre de respostes vàlides per pregunta i comptar aquesta opció per separat quan superi el llindar.
- Mateix públic elegible, protocol de distribució, condicions equivalents de resposta i regles d’anàlisi. Registrar versions, dates, canal i cobertura a cada onada. Si canvia algun element rellevant, mostrar el motiu i marcar la comparació com a limitada o indisponible segons el canvi. Canviar el text, l’escala o el públic objectiu desactiva la tendència directa de les preguntes afectades.

Per a la demo, una tercera pregunta pot demanar quina dificultat ha generat el canvi, amb «Cap» com a opció. Si s’indica una dificultat, oferir una pregunta breu de seguiment. Afegir un comentari opcional. El camí més llarg ha de cabre dins dels dos minuts al mòbil. Al seguiment, les preguntes adaptables poden preguntar si l’acció seleccionada ha arribat al torn i què continua faltant. Les dues preguntes fixes ajuden a comparar onades. La composició de la mostra i la proximitat a altres canvis continuen condicionant la interpretació.

## Resultats, privacitat i accions

- **Llindar del prototip.** Aplicar `n ≥ 10` al servidor a cada tall, onada, mètrica, tema i base aparellada. Comptar un tema una vegada per resposta. Protegir categories i complements petits. La implementació publica una sola instantània immutable per onada tancada i bloqueja imports posteriors, per evitar diferències entre actualitzacions.
- **Minimització.** Recollir les respostes, les categories àmplies aprovades i les metadades tècniques imprescindibles. El codi de resposta serveix per deduplicar registres i queda fora de la UI. Excloure noms, correus, telèfons i identificadors de persones del formulari. Descartar en la ingesta metadades alienes al cas, com IP o informació del dispositiu si el proveïdor les retorna.
- **Text obert.** Redactar o descartar contingut identificatiu abans d’enviar text a un LLM o desar-lo per a l’anàlisi. Cobrir patrons de contacte i possibles noms o detalls singulars. Si el filtre no pot decidir amb prou confiança, excloure el comentari de l’anàlisi textual. Mostrar síntesis de temes amb suport suficient. Les respostes crues queden fora del dashboard, les exportacions i els logs. Netejar les dades de prova de l’entorn i de Typeform quan acabi la demo segons els controls disponibles.
- **Dashboard.** Mostrar recompte i finestra, població elegible si és coneguda, taxa aparent i diferències de composició. Presentar resultats per pregunta amb la seva base, temes amb recompte i, si escau, una tendència entre períodes comparables. Si l’evidència és insuficient, mostrar aquest estat. Un tema poc freqüent pot ser important, però requereix més recollida si el llindar impedeix mostrar-lo.
- **Evidència i acció.** Cada recomanació visible indica la troballa, el públic, la base i els límits que la sustenten. Exemple fictici: si hi ha prou respostes sobre instruccions disperses, proposar un resum del canvi a l’inici de cada torn, amb Supervisió de Planta com a rol responsable. RRHH selecciona l’acció i la pregunta de seguiment corresponent. Si predomina un problema de cobertura, suggerir primer millorar la recollida. Les conclusions descriuen la mostra i eviten atribucions causals o avaluacions individuals.

## Contractes d’implementació

| Peça | Contracte mínim |
| --- | --- |
| **Campanya i versió** | Objectiu, context, segment autoritzat, període, durada, restriccions, versió, preguntes amb identificadors estables, diagnòstic i aprovació. Estats mínims d’esborrany, aprovada i publicada. Vincular el formulari a la versió exacta. |
| **Publicació i importació** | Crides a Typeform des del servidor i secrets en variables d’entorn. Evitar publicacions concurrents de la mateixa versió. Si falla la publicació, conservar l’aprovació i informar de l’error. Si l’èxit remot és incert, comprovar si el formulari ja existeix abans de reintentar. Importar amb deduplicació per formulari i codi de resposta. |
| **Dades i mètriques** | Separar catàleg, població elegible, històric, campanyes, respostes depurades, agregats i accions. Identificar l’origen de les dades. Calcular recomptes, denominadors, regles de comparació i ocultació amb codi determinista. |
| **IA** | Generació d’esborranys, detecció de possibles problemes de redacció, classificació de comentaris depurats i redacció de síntesis i recomanacions. Validar l’estructura, les restriccions i els identificadors d’evidència abans de mostrar la sortida. Tractar el text de RRHH i els comentaris com a dades. Donar una opció de reintent o edició si la generació falla. |
| **Acció i seguiment** | La selecció de RRHH guarda l’acció, l’evidència, el rol suggerit si escau i un enllaç al nou esborrany de seguiment. Conservar la traçabilitat fins a la campanya original. |

La demo principal utilitza Typeform real. Es pot preparar una captura o vídeo del recorregut complet i un conjunt local etiquetat com a sintètic per mostrar l’anàlisi si la connexió falla. Si s’utilitzen fixtures per completar el volum de la campanya de demo, distingir-les de les respostes importades a la UI i evitar que la mateixa resposta s’incorpori pels dos camins.

## Guió i criteris d’acceptació

1. **Obrir el cas.** Seleccionar la fàbrica fictícia, amb Tots dos torns. La plataforma mostra que hi ha calibració sintètica de setembre per a aquest públic i indica l’estat de cobertura i moment. RRHH pot escollir només Dia o Nit. Els segments no publicables es protegeixen igualment.
2. **Generar la consulta.** Introduir l’objectiu del canvi. La consulta conté les dues preguntes fixes i preguntes adaptades fins a un total de 3–6. Cada adaptació rellevant es relaciona amb un senyal o risc. Una prova des del mòbil confirma el límit de dos minuts pel camí més llarg.
3. **Revisar i publicar.** Editar una pregunta i aprovar. Verificar que una versió pendent d’aprovació queda bloquejada i que l’aprovada genera un Typeform i un QR operatiu. Repetir l’acció de publicació no crea un formulari addicional.
4. **Respondre i recollir.** Escanejar el QR i enviar una resposta sintètica. Fer dues importacions consecutives i comprovar que el recompte només puja una vegada per aquella resposta.
5. **Llegir l’evidència.** Mostrar la mida de la mostra actual i un tema amb suport suficient. Al costat, mostrar el gràfic històric de referència i voluntària, la taxa aparent i la diferència als extrems. L’avís distingeix el contrast observat al setembre del risc per a la consulta actual. Provar un segment de menys de 10 respostes, un comentari amb dades de contacte fictícies i un denominador absent. El segment queda ocult, el text identificatiu s’exclou o es redacta i la taxa queda indisponible.
6. **Tancar el cicle.** Seleccionar una acció de la IA i obrir-ne el seguiment. Verificar el vincle amb l’evidència, el públic, les dues preguntes fixes i l’estat d’esborrany. Si es mostra evolució, comprovar que una pregunta modificada o una mostra insuficient impedeix la comparació directa.
7. **Preparar l’entrega.** Incloure un README amb els passos d’execució, la càrrega de l’històric i la configuració de Typeform i IA. Incloure `.env.example` sense valors, excloure `.env` del repositori i preparar la demo de contingència.
