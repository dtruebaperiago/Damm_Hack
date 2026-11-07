# Escolta activa Damm · Handoff per al hackathon

## Punt de partida

Som quatre persones i treballarem en **dues parelles en paral·lel**. Una prepara el sondeig sintètic i el diagnòstic de biaixos. L’altra dissenya el formulari per a la plantilla i defineix les dades que generarà. Cada parella pot completar el seu lliurament amb dades i exemples propis. A la posada en comú encaixarem els dos lliuraments i decidirem com processar les respostes de la microconsulta, analitzar-les i convertir les troballes en accions que RRHH pugui escollir.

| Document | Quan consultar-lo |
| --- | --- |
| [Guia de participants](../guia_participants_repte_damm.md) | Requisits oficials, dades permeses, criteris de privacitat i avaluació. |
| [Presentació del repte](../repte_estrella_damm_uab_the_hack_2026.md) | Context de negoci, biaixos i exemple de canvi de torns. |
| [Esquema inicial de l’equip](../esquema_clima_laboral.svg) | Origen de la proposta de sondeig, personalització, canals i tancament del cicle. |
| [Especificació acordada](escolta-activa-damm-spec.md) | Abast del prototip, criteris d’acceptació i guió de demo. |
| [Model conceptual en SVG](../model_conceptual_escolta_activa_damm.svg) | Recorregut visual del sondeig a l’acció i al seguiment. |
| [Model lògic en esborrany](../stages/02_model-logic/output/model-logic.md) | Actors, entitats, estats, contractes i propostes que l’equip ha de revisar. |

## Decisions de l’entrevista

- **Cas de demo.** Seguim l’Escenari A de la guia. Una planta fictícia ha canviat el sistema de torns. RRHH vol saber si s’ha entès, quines dificultats genera i què cal reforçar. La microconsulta té **3–6 preguntes** i dura **menys de dos minuts**.
- **Públic.** RRHH explica l’objectiu, el context i els temes a evitar, i selecciona el públic d’un catàleg tancat. Els quatre sectors són **Planta, Logística, Comercial i Oficines**, amb ubicacions fictícies predefinides. A Planta es pot seleccionar **Dia, Nit o Tots dos**, amb el mateix llindar de privacitat que a la resta de talls. La IA adapta la proposta al públic seleccionat. La selecció del públic correspon a RRHH.
- **Sondeig.** L’històric de diagnòstic és sintètic. Serveix per calcular senyals que tenen dades suficients i marcar els altres casos com a riscos o com a manca de dades. El model rep aquest context per ajustar les preguntes, el to, la brevetat i la proposta de distribució. En una aplicació futura, el sondeig podria recollir respostes reals amb els controls corresponents.
- **Participació.** RRHH pot editar, eliminar i reordenar preguntes i ha d’aprovar la versió abans de publicar. La demo ha de publicar i recuperar respostes de **Typeform**, amb un **QR real** que obre la microconsulta al mòbil. El **quiosc compartit** a planta queda com a extensió. Teams i M365 són vies d’evolució.
- **Comparabilitat.** La consulta del canvi i el seguiment comparteixen públic, protocol de distribució, condicions de mesura, regles d’anàlisi i **dues preguntes fixes sobre comprensió i suport**. Es mantenen text, identificadors, ordre, obligatorietat i escala. La resta s’adapta al cas i als biaixos. Si canvien les condicions, la comparació ha de mostrar el límit o quedar indisponible segons el canvi.
- **Acció.** La IA proposa accions a partir d’evidència agregada i explica els límits de la troballa. RRHH en selecciona una i obre un esborrany de seguiment que passa pel mateix circuit d’aprovació.
- **Tecnologia.** Es preveu obtenir accés a Typeform i a un model de llenguatge. L’stack, la persistència i el proveïdor del model estan oberts.

### Regles comunes del prototip

- Treballar exclusivament amb dades sintètiques i respostes de prova. Excloure dades personals reals i secrets del repositori, les captures i les presentacions.
- Depurar el text lliure abans de guardar-lo per a l’anàlisi o d’enviar-lo a la IA. Si hi ha dubte sobre si identifica algú, descartar el comentari. Mostrar només resultats agregats.
- Aplicar el llindar proposat de **`n ≥ 10`** a la base efectiva del tall, mètrica o tema, i protegir els talls que es puguin reconstruir per diferència. La publicació de resultats per torn depèn d’aquest control.
- Calcular recomptes i regles d’ocultació amb codi determinista. En un QR compartit, parlar de **taxa de participació aparent**. El recompte correspon a respostes vàlides, i la unicitat de les persones queda sense verificar. Sense població elegible del mateix grup i període, ometre la taxa.
- Separar dues preguntes de negoci. El sondeig indica **a qui pot estar deixant fora la consulta i com adaptar-la**. Les respostes de la consulta indiquen **quines dificultats amb el canvi tenen suport en la mostra i poden justificar una acció**.

## Parella 1 · Sondeig sintètic i diagnòstic de biaixos

**Entrada.** El cas de canvi de torns i les regles comunes. Podeu definir els camps del vostre històric i preparar els exemples abans de veure el formulari de l’altra parella.

- [ ] **Dissenyar l’escenari.** Definir població elegible fictícia i respostes per sector, ubicació, torn i període quan escaigui. Preparar un cas de participació baixa a Nit, un de denominador absent i un tall que quedi per sota del llindar.
- [ ] **Generar dades reproduïbles.** Lliurar el script i una mostra exportable. Separar els agregats de població de les respostes. L’especificació proposa **400–600 respostes sintètiques** en dos períodes i quatre sectors per a l’històric complet. Per comprovar la lògica, n’hi ha prou de començar amb el cas de planta.
- [ ] **Calcular els senyals mesurables.** Documentar el període i els denominadors, la taxa aparent per grup i el pes a la mostra davant del pes a la població. Per a cobertura, comparar canal i accés si hi ha un inventari sintètic. Separar els registres malformats i els duplicats segons una regla explícita i conservar els valors extrems vàlids.
- [ ] **Preparar la fitxa de biaixos.** Per a cada element, anotar l’evidència, el càlcul quan escaigui, l’estat i una possible adaptació. Cobrir cobertura, no resposta, segmentació, autoselecció, moment, desitjabilitat social, redacció i valors atípics o qualitat. Distingir **senyal mesurat**, **risc** i **sense dades suficients**. La concentració de respostes extremes pot suggerir un risc d’autoselecció. El fet de comptar-la només descriu la mostra.
- [ ] **Preparar dues adaptacions demostrables.** Per exemple, ampliar la finestra de difusió perquè inclogui Nit i simplificar la consulta per facilitar la resposta al mòbil. Explicar quina evidència o quin risc justifica cada canvi.

**Lliurament.** Script i mostra sintètica, fitxa de diagnòstic i dos exemples d’adaptació. Com a prova, si de 80 persones elegibles per torn hi ha 44 respostes de Dia i 12 de Nit, les taxes aparents són 55% i 15%. Nit és el 50% de la població elegible i aproximadament el 21% de la mostra. Aquest resultat dona suport a una adaptació de la difusió.

## Parella 2 · Formulari per a la plantilla

**Entrada.** El cas de canvi de torns i les regles comunes. Podeu dissenyar la primera versió i inventar les respostes d’exemple abans de rebre el diagnòstic de biaixos.

- [ ] **Redactar una microconsulta mòbil de 3–6 preguntes.** Escriure una introducció amb finalitat, durada i tractament de les respostes. Afegir les dues preguntes fixes, una pregunta tancada sobre dificultats i un comentari opcional. Si hi ha una branca condicional, fer-la curta i indicar quan es mostra.
- [ ] **Concretar les preguntes fixes.** L’especificació proposa «Tinc clar com funciona el nou sistema de torns» i «Sé on demanar ajuda si tinc un dubte sobre el nou sistema de torns». Mateixa escala d’1 a 5, de «Gens d’acord» a «Totalment d’acord», amb «No ho puc valorar» com a opció separada.
- [ ] **Fer la taula de camps.** Per a cada pregunta, posar ID estable, text, tipus, valors permesos, obligatorietat i condició d’aparició. Distingir una pregunta que no s’ha mostrat, una d’opcional que s’ha deixat en blanc i una resposta explícita com «No ho puc valorar».
- [ ] **Marcar què es pot personalitzar.** Identificar el text, les opcions, el to, les preguntes adaptables i la proposta de distribució. Marcar les dues preguntes fixes com a referència per a la comparació.
- [ ] **Crear dues respostes de prova.** Preparar-ne una de completa i una sense comentari. Incloure la referència a la campanya i la versió, els IDs de pregunta i el torn quan estigui disponible. Comprovar el recorregut més llarg en mòbil perquè duri menys de dos minuts.

**Lliurament.** Esborrany de la microconsulta, taula de camps i dues respostes de prova. La publicació real a Typeform forma part de la demo final. Per a la reunió, el lliurament és el disseny del formulari i de les dades que produirà.

## Posada en comú · De les respostes a les accions

1. **Encaixar sondeig i formulari.** Agafar una fitxa de diagnòstic i decidir quin canvi faria RRHH al formulari o a la distribució. Registrar la justificació i preservar les dues preguntes fixes.
2. **Tancar el contracte de resposta.** Acordar campanya, onada, versió, identificador tècnic de tramesa, torn opcional, IDs de pregunta, valors i absències. Definir quins camps es retenen, quins es depuren o es descarten i quins poden arribar a la IA. Acordar com es vincula la versió publicada amb les respostes de Typeform.
3. **Recórrer un cas d’anàlisi.** Importar una resposta d’exemple, evitar que una segona importació la dupliqui, depurar el comentari, normalitzar valors i proposar l’agregació. Acordar la base vàlida de cada pregunta, com comptar temes, quan amagar resultats i quan una comparació té prou base.
4. **Convertir una troballa en una acció.** Si prou respostes indiquen que les instruccions del canvi estan disperses, proposar un resum a l’inici de cada torn. Lligar la proposta a una troballa publicable, amb públic, període, recompte i límits. Si l’evidència indica principalment baixa cobertura, proposar una millora de la recollida. RRHH tria l’acció i obre un seguiment amb les preguntes fixes i una pregunta adaptable sobre l’acció.

**Sortida de la reunió.** Un formulari acordat, una resposta d’exemple en el format final i una acció vinculada a evidència agregada, amb la pregunta de seguiment corresponent. A partir d’això es podrà repartir la feina d’ingesta, privacitat, anàlisi i generació d’accions.

## Decisions que cal confirmar abans de la integració

- Concretar el format final de dades i els camps de Typeform. El model lògic proposa un QR compartit i torn autodeclarat opcional. Cal acordar la forma de recollir-lo, els denominadors i les vistes que es publicaran.
- Confirmar si el primer tall implementa una publicació per onada i una acció amb seguiment per campanya, com proposa el model lògic.
- Escollir l’stack, el proveïdor d’IA i la persistència. Confirmar accessos, tractament dels reintents de publicació i origen de les dades de prova. Diferenciar sempre les respostes importades de les mostres precarregades.
- Preparar la contingència de demo amb vídeo o captures, i documentar els passos d’execució i les variables necessàries a `.env.example` sense secrets.
