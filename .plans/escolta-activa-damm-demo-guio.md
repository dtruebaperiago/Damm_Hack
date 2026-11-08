---
status: esborrany-per-assajar
---

# Escolta activa Damm · Guió de presentació i demo

**Idea que volem que recordi el jurat.** El que RRHH pot decidir depèn de qui ha pogut respondre i de qui ha triat fer-ho. La plataforma ajuda a arribar als torns abans de publicar i posa la mostra en context abans de recomanar una acció.

**Format proposat.** Dues diapositives per introduir la solució i explicar la calibració. A continuació, la plataforma en directe amb un únic cas de principi a fi. El minutatge de cinc minuts és orientatiu per al primer assaig. [Especificació](escolta-activa-damm-spec.md) · [Flux del repte](../guia_participants_repte_damm.md#4-flux-funcional-mínim)

**Preparació actual:** executa `pnpm demo:scenario-a` i obre [127.0.0.1:3010](http://127.0.0.1:3010/), o el port configurat. Les dades són sintètiques i es reinicien en reiniciar el procés; la generació i l’anàlisi simulen Groq i el QR obre el formulari local. La consulta creada en directe és diferent de la còpia tancada amb 194 respostes preparades. El guió següent és una proposta per assajar: les referències a Typeform, importació en directe i comparacions aparellades requereixen verificar el recorregut disponible. Consulta els [ports i modes](../README.md#portals-locals-demo-amb-dades-i-portal-net).

## Ordre i posada en escena

| Temps | Què es veu | Què expliquem |
| --- | --- | --- |
| **0:00–0:30 · Introducció** | Diapositiva amb la proposta en una frase i el recorregut «Escoltar → entendre → actuar → tornar a escoltar». | «Quan una fàbrica canvia els torns, RRHH necessita saber què s’ha entès i on falta suport. Amb Escolta activa Damm, RRHH pot crear una microconsulta adaptada, recollir respostes i decidir què reforçar.» |
| **0:30–1:25 · Defensa dels biaixos** | Una diapositiva amb el gràfic de barres agrupades de l’1 al 5. A sota, setembre, fàbrica fictícia de Catalunya i dades sintètiques. Ressaltem el **17,3% → 37,9%** als extrems. | Presentem la mateixa pregunta de clima en dues recollides simulades del mateix públic: una referència completa de **600** respostes i una voluntària per QR de **240**. A la voluntària hi ha **20,6 punts percentuals més** de respostes extremes. El contrast fa visible com pot variar la mostra. L’autoselecció és el mecanisme simulat i la causa d’una diferència real s’hauria d’estudiar. |
| **1:25–2:10 · Escenari A: obrir el cas i adaptar** | Pantalla de RRHH amb `Planta · fàbrica fictícia · Dia i Nit`, necessitat, diagnòstic i esborrany generat. | La planta ha passat de torns fixos a una rotació Dia/Nit. Mostrem un suggeriment concret de **cobertura** (QR en un espai accessible per a tots dos torns) i un de **moment** (finestra que inclogui tots dos torns). Connectem cada proposta amb el risc corresponent i indiquem si falten dades. |
| **2:10–2:55 · Revisar, publicar i respondre** | Vista prèvia de les quatre preguntes, aprovació de RRHH, QR de Typeform i resposta de prova des del mòbil. | Ensenyem què revisa RRHH i l’acció d’aprovar. Una segona persona escaneja el QR i envia la tramesa de prova mentre es manté la pantalla principal de RRHH. |
| **2:55–3:50 · Llegir l’evidència** | Dashboard amb base actual, resultats agregats i una troballa publicable. Al costat, el contrast històric i l’avís de no resposta i autoselecció. | Identifiquem les trameses de prova precarregades i la que s’importa en directe. La calibració parla de la pregunta de clima de setembre i ajuda a interpretar la mostra actual. La troballa sobre els torns surt de les respostes actuals. Mostrem un tall protegit per sota del mínim si ja és visible al dashboard. |
| **3:50–4:35 · Decidir i fer seguiment** | Proposta d’acció de la IA amb l’enllaç a la troballa. RRHH la selecciona i obre un esborrany de seguiment. | Si l’agregat de prova sustenta que les instruccions estan disperses, la IA proposa fer-ne un resum a l’inici de cada torn. RRHH decideix i veu que el seguiment conserva les dues preguntes de comprensió i suport. |
| **4:35–5:00 · Tancament** | Comparació de dues onades sintètiques preparades amb els codis ja assignats. | Mostrem quantes puntuacions han pujat, s’han mantingut o han baixat. Si es consulta una franja, expliquem que matí, tarda i nit corresponen a l’hora d’enviament. |

## Frases per enllaçar els blocs

**De la introducció al gràfic.** «Abans d’obrir la plataforma, mirem què pot passar amb una mateixa pregunta quan canvia qui respon.»

**Del gràfic a la demo.** «Aquest sondeig és la calibració històrica de la fàbrica. Ara som RRHH i volem saber què necessita la plantilla després del canvi de torns.»

**Text per obrir el cas a la plataforma.** «Fa dues setmanes vam comunicar la rotació entre Dia i Nit. Vull saber si les persones dels dos torns entenen el nou sistema, quines dificultats tenen i si saben on demanar ajuda. Prepara una microconsulta de menys de dos minuts.»

**Del dashboard a l’acció.** «Ara que sabem quina mostra tenim i què indiquen les respostes, podem proposar una acció concreta i decidir com en farem el seguiment.»

## Preparació de l’assaig

- [ ] Prepareu les dues diapositives i deixeu la plataforma oberta a l’inici del cas. Repartiu els papers de narració, operació de la plataforma i resposta des del mòbil. [Pròxims passos](escolta-activa-damm-next-steps.md)
- [ ] Prepareu una troballa agregada publicable amb dades de prova, una recomanació que la citi i una pregunta de seguiment sobre l’acció. Etiqueteu les bases històriques i actuals amb l’origen corresponent.
- [ ] Proveu el QR des del dispositiu de l’assaig i feu una importació completa. Tingueu a punt una gravació del mateix recorregut per reprendre la narració si es talla el directe.
- [ ] Cronometreu el guió. Si cal escurçar, retalleu les explicacions metodològiques i els passos repetits de verificació. Mantingueu el gràfic, una adaptació, l’aprovació, el QR i el vincle entre troballa, acció i seguiment.
- [ ] Demaneu a algú de l’equip que escolti el guió i després expliqui què mostra el contrast de setembre, què indiquen les respostes sobre els torns i per què RRHH tria l’acció. La revisió queda pendent d’aquest assaig.
