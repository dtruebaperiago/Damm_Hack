---
status: esborrany-per-revisar
---

# Escolta activa Damm · Model lògic del prototip

El cas de demo és el canvi de torns en una planta fictícia. El diagnòstic orienta la difusió de la primera microconsulta i la calibració històrica ajuda a interpretar-ne la mostra. Les respostes de la microconsulta permeten a RRHH escollir una acció i obrir una segona onada per veure com evoluciona la percepció del canvi.

La guia del repte fixa els requisits i l’especificació de l’equip concreta el recorregut del model conceptual. Les decisions noves d’aquest model es presenten com a propostes per a la demo. [Guia del repte](../../../guia_participants_repte_damm.md) · [Especificació](../../../.plans/escolta-activa-damm-spec.md) · [Model conceptual](../../../model_conceptual_escolta_activa_damm.svg)

## Actors i límits

Actualització de la implementació: s’incorpora l’accés amb credencial fictícia i el seguiment pseudonimitzat del [prompt de construcció](../../../.plans/prompt-agent-web-completa.md). Consulta el [contracte implementat](../../../docs/implementation.md) i el [README](../../../README.md) per a persistència, autorització i límits. L’estat d’esborrany per revisar es conserva.

| Actor | Responsabilitat |
| --- | --- |
| RRHH | Defineix necessitat, públic i restriccions. Revisa i aprova la versió, decideix quan publicar-la i tria l’acció. |
| Persona participant | Obre el QR al mòbil i introdueix una credencial sintètica autoritzada, sense crear compte. Pot aportar una resposta acceptada per onada. El comentari és opcional; el torn ve del registre fictici restringit. |
| Plataforma | Valida, publica i importa des del servidor. Depura entrades, calcula agregats, aplica les regles de privacitat i conserva els vincles amb l’evidència. |
| Typeform | Allotja el formulari publicat i retorna les respostes de prova. |
| IA | Proposa preguntes i adaptacions, assenyala possibles problemes de redacció, etiqueta comentaris depurats i redacta síntesis i propostes basades en evidència publicable. |

## Entitats i relacions

Els identificadors i les cardinalitats descriuen les regles del domini. La implementació utilitza SQLite amb migració versionada i taules separades per a revisions, credencials pseudonimitzades, sessions d’entrega, respostes depurades i vincles restringits. Les instantànies agregades es conserven amb l’onada.

| Entitat | Dades mínimes i relacions |
| --- | --- |
| **Segment** | Identificador, sector, ubicació fictícia i torn quan pertoqui. El catàleg tancat valida les combinacions. El públic d’una campanya selecciona un o més segments compatibles. |
| **Calibració històrica** | Segment, període, població elegible, pregunta, escala i dues recollides sintètiques amb modalitat, canal, finestra, base vàlida i recomptes per puntuació. Es vincula al públic i es manté separada de les onades del canvi. La comparació opera sobre agregats. |
| **Campanya** | Identificador, objectiu, context, públic, finestra, durada màxima i temes a evitar. Cada campanya és una onada amb una o més versions. La de seguiment referencia l’acció que la va originar. |
| **Diagnòstic** | Instantània que vincula públic i troballes amb font, període, base, regla i limitació. Registra si la calibració correspon al públic exacte, és context d’un públic més ampli o és insuficient. Cada troballa té un identificador i es classifica com a senyal mesurat, risc o dades insuficients. Una versió referencia el diagnòstic que va motivar les adaptacions. |
| **Versió de consulta** | Clau `(campanya, número de versió)`, estat, títol, introducció, preguntes i ordre, branca, temps estimat, proposta de difusió i registre d’aprovació. L’aprovació fixa també el públic, la finestra i les restriccions que s’han revisat. |
| **Pregunta** | Dins la versió, identificador estable, posició, enunciat, tipus, opcions, obligatorietat i condició de salt si escau. Les dues preguntes de referència conserven la seva definició entre onades. |
| **Publicació** | Vincula una versió aprovada a un formulari de Typeform amb mapatge estable. El QR apunta a l’accés de la plataforma, no al formulari públic. Un formulari per onada i versió. La demo local utilitza el formulari de contingència i n’etiqueta l’origen. |
| **Resposta depurada** | Versió, origen, finestra i respostes normalitzades. Unicitat tècnica `(formulari, resposta externa)` i unicitat restringida `(pseudònim, onada)`. El vincle de cicle permet aparellar onades; ni pseudònim ni resposta individual es retornen a RRHH. Les fixtures tenen origen separat. |
| **Resultat i evidència** | Instantània d’una onada amb període, segment, base, origen de les dades, regles d’anàlisi i diagnòstic històric aplicable. Cada troballa publicable té un identificador estable dins la instantània. L’acció conserva la referència a la troballa exacta encara que s’actualitzi el dashboard. |
| **Acció seleccionada** | Campanya d’origen, troballes publicables, acció concreta, rol responsable suggerit i punt a comprovar. Proposta de demo: una acció seleccionada per campanya, que dona lloc a un únic esborrany de seguiment. |

```mermaid
flowchart LR
    H[Calibració històrica] --> D[Diagnòstic]
    D -->|Cobertura i moment| V[Versió de consulta]
    C[Campanya] --> V
    V --> P[Publicació a Typeform]
    P --> R[Respostes depurades]
    R --> E[Resultat i evidència]
    D -->|Context de no resposta i autoselecció| E
    E --> A[Acció seleccionada per RRHH]
    A --> S[Campanya de seguiment]
```

## Transicions i contractes

| Pas | Entrada → sortida | Condició |
| --- | --- | --- |
| **Preparar** | Necessitat + segment + calibració disponible → diagnòstic i versió en **esborrany** | El sistema cerca el públic aplicable, calcula els senyals i els mostra a RRHH. La IA proposa 3–6 preguntes i suggereix canal i finestra amb referències al diagnòstic de cobertura i moment. Un error d’IA permet reintentar o editar l’esborrany. |
| **Aprovar** | **Esborrany** → **aprovada** | RRHH aprova la versió exacta després de revisar el recorregut més llarg. El sistema valida format, preguntes fixes, opcions, salts i referències. Es comprova al mòbil que el recorregut més llarg dura menys de dos minuts. |
| **Editar després d’aprovar** | **Aprovada** → nova versió en **esborrany** | Es conserva la versió anterior com a registre i només es pot publicar la revisió vigent un cop aprovada. Amb una publicació ja activa, els canvis es preparen en una nova onada. |
| **Publicar** | Versió **aprovada** vigent → **publicada** + URL i QR | L’intent reserva l’onada i fixa la revisió que es publica. Mentre està pendent, es bloqueja crear una nova revisió o iniciar un altre intent. Si falla de manera confirmada, s’allibera la reserva i es conserva l’aprovació. Si es desconeix el resultat remot, cal reconciliar l’intent amb Typeform abans de continuar. |
| **Importar i analitzar** | Formulari vinculat + respostes → registres depurats i agregats contextualitzats | Import manual i repetible per RRHH. Validació contra la versió publicada i deduplicació pel codi tècnic. Aplicar les regles de privacitat abans de retornar resultats. Mostrar el contrast històric publicable al costat dels resultats observats. |
| **Escollir i seguir** | Evidència publicable → acció seleccionada i campanya de seguiment en **esborrany** | RRHH confirma l’acció. Repetir la creació recupera el mateix esborrany. El seguiment copia el públic i les dues preguntes fixes i torna a passar per aprovació. |

## Regles de mesura, privacitat i IA

- **Participació.** La calibració voluntària històrica conserva la taxa aparent. Les onades noves calculen respostes autoritzades acceptades sobre credencials elegibles del mateix públic i període, sense garantir la identitat física ni representativitat. Si falta el denominador o el numerador el supera, no es mostra taxa. No s’exposen recomptes de recollides obertes.
- **Composició.** El pes d’un torn a la mostra i el seu pes a la població s’han de calcular sobre el mateix conjunt de torns. Si hi ha torns sense declarar, es mostra la base de torns coneguts quan és publicable i s’explica la limitació. El diagnòstic distingeix el desequilibri observat de la seva possible causa.
- **Contrast històric.** El percentatge de cada puntuació es calcula sobre les respostes vàlides a la pregunta en cada recollida. La diferència als extrems és el percentatge de puntuacions 1 o 5 de la voluntària menys el de la referència, en punts percentuals. Calen el mateix públic elegible, pregunta i escala i un període comparable. Entre plantes es pot comparar la magnitud del contrast quan els protocols siguin equivalents. Un avís de patró recurrent requereix diversos sondejos comparables.
- **Aplicació del context.** Associar la calibració pel sector i la ubicació. Si l’onada apunta a un torn i només hi ha dades de tota la fàbrica, indicar l’abast ampli de la referència. Sense calibració pertinent, retornar «Dades insuficients». El contrast de setembre aporta context a les interpretacions i es mostra separat de les mètriques de l’onada, que conserven els valors observats.
- **Protecció de resultats.** Aplicar `n ≥ 10` a cada tall, mètrica, tema i parella, protegint complements petits. La publicació local és una única instantània final i immutable quan RRHH tanca l’onada; es bloquegen imports posteriors. No s’envien cel·les protegides al navegador. No hi ha filtres arbitraris.
- **Text lliure.** Abans de persistir text per a l’anàlisi o enviar-lo a la IA, eliminar dades identificatives o descartar el comentari si hi ha dubte. La resta de la resposta pot continuar sent vàlida. Els identificadors tècnics, el text cru i les metadades alienes al cas queden fora de les sortides i dels logs.
- **Comparació entre onades.** Comprensió i suport mantenen la definició completa i la posició, amb no valorable separat. Les bases de cada onada es mostren separadament. La comparació aparellada només usa ítems numèrics vàlids a les dues onades del mateix cicle, públic i protocol comparables, amb llindar per parelles i pèrdues publicables. No es vincula la calibració històrica a persones. La diferència observada no és una atribució causal a l’acció.
- **Traçabilitat de la IA.** Validar estructura, restriccions i identificadors abans de mostrar una proposta. Les accions només poden citar evidència publicable. Si la base és insuficient per sustentar una acció sobre el canvi, la sortida pot proposar millorar la recollida si hi ha evidència que ho justifiqui.

## Comprovació amb dades sintètiques

| Cas | Resultat esperat |
| --- | --- |
| **Calibració.** Seleccionar la fàbrica del [sondeig sintètic de setembre](../../../.plans/escolta-activa-damm-spec.md#sondeig-sintètic-i-diagnòstic). | La voluntària mostra un 40% de participació aparent i 20,6 punts percentuals més als extrems. El gràfic mostra les dues bases i el diagnòstic diferencia el contrast mesurat del risc per a la consulta actual. |
| **Abast.** Seleccionar Nit amb calibració de tota la fàbrica, o seleccionar una altra ubicació sense calibració. | En el primer cas apareix l’avís d’abast ampli. En el segon es mostren dades insuficients per a aquella ubicació. |
| **Publicació.** RRHH edita una pregunta adaptable després d’aprovar. Després aprova el nou esborrany i torna a prémer publicar. | El formulari només es crea després de la segona aprovació. Les repeticions retornen el mateix formulari i el QR obre la versió publicada. |
| **Importació.** S’envia una resposta de prova pel QR i es recupera dues vegades. El comentari conté un telèfon fictici. | Es compta una tramesa vàlida en el registre intern. El telèfon es redacta o es descarta el comentari abans de l’anàlisi. Si el total exacte compromet una cel·la protegida, la vista publicada es manté suprimida o agrupada. |
| **Privacitat.** En una altra mostra, Dia té 44 respostes i Nit en té 9. | Amb el total de 53, cal ocultar el tall de Dia juntament amb el de Nit. Sense denominador, s’omet la taxa. |
| **Acció.** Almenys deu respostes diferents esmenten que les instruccions estan disperses i el tema supera les comprovacions de privacitat. | La proposta de resum a l’inici del torn referencia la troballa. RRHH la selecciona i obre un seguiment en esborrany. Una base de nou respostes vàlides en una pregunta fixa impedeix mostrar-ne la tendència. |

## Decisions per revisar amb l’equip

1. **Tall inicial.** Es proposa provar primer l’aprovació, el Typeform real, el QR i dues importacions de la mateixa resposta. A continuació, completar diagnòstic, resultats i seguiment amb dades sintètiques en el mateix recorregut.
2. **Mesura per torn.** Es proposa un QR compartit i torn autodeclarat opcional. Cal acordar les vistes predefinides, els denominadors disponibles i com es publiquen actualitzacions sense revelar cel·les protegides per diferència.
3. **Contractes del prototip.** Confirmar una publicació per onada i una acció amb seguiment per campanya. Un cop confirmat, concretar la reconciliació d’una publicació incerta, l’origen de les fixtures i les opcions de Typeform i d’IA.

El quiosc i Teams/M365 queden com a extensions de l’[especificació](../../../.plans/escolta-activa-damm-spec.md). L’[estudi d’IA](../../../IA%20en%20Enquestes%20de%20Clima.md) recull tècniques per valorar quan es concreti la implementació.
