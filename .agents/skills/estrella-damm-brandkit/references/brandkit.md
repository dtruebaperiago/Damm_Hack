# Brandkit de treball · Estrella Damm

Fonts consultades el 7 de novembre de 2026. Estat: proposta de prototip pendent de validació de marca.

## Fonts oficials i límits

- [Web de marca](https://www.estrelladamm.com/es/es): denominació i continguts de cinema, cervesa i sostenibilitat.
- [Damm · Estrella Damm](https://www.damm.com/es/cervezas/estrella-damm?afsrc=1): vincle mediterrani i origen de la cervesa el 1876.
- [Visites oficials](https://visitas.estrelladamm.com/es/): relació amb la fàbrica i la història de la marca.

La consulta no ha proporcionat un manual gràfic verificat. No s’han extret codis HEX del CSS oficial ni identificat la tipografia corporativa. No s’inclouen logotips, fotografies ni fitxers de fonts oficials. Les propostes següents no són especificacions de marca.

## Direcció visual proposada

Pren el territori mediterrani documentat com a punt de partida: llum, calidesa, claredat i espai. Aquesta traducció visual és una decisió del kit.

Per a peces editorials, fotografia natural de llocs, trobades o textures mediterrànies quan ajudi el missatge. En dashboards i formularis, prioritza dades i tasques. Utilitza imatges aportades, autoritzades o amb llicència adequada; no presentis una imatge generada com una campanya oficial.

## Paleta provisional

Tots els codis són **propostes de prototip**, inclosos vermell i daurat. No són equivalències oficials Pantone, CMYK ni RGB.

| Token CSS | Valor | Ús |
| --- | --- | --- |
| `--ed-red` | `#C8102E` | Marca i botó principal amb text blanc |
| `--ed-red-hover` | `#A30D26` | Hover del botó principal |
| `--ed-gold` | `#D5AD55` | Detall ornamental; text fosc si fa de fons |
| `--ed-paper` | `#FAF7F0` | Fons càlid |
| `--ed-surface` | `#FFFFFF` | Superfície de lectura |
| `--ed-ink` | `#24201D` | Text principal |
| `--ed-muted` | `#625B54` | Text secundari |
| `--ed-border` | `#D9D1C5` | Separador decoratiu; no únic límit d’un control |
| `--ed-control-border` | `#81776A` | Contorn funcional d’inputs |
| `--ed-focus` | `#175E83` | Focus de teclat |
| `--ed-success` | `#256344` | Estat correcte, amb etiqueta |
| `--ed-warning` | `#805500` | Avís, amb etiqueta |
| `--ed-error` | `#A51D2D` | Error, amb missatge explícit |

El vermell de marca no és una escala de gravetat. En gràfics, diferencia sèries amb etiquetes i, quan calgui, patrons o traços. No converteixis una escala d’opinió en un indicador de rendiment individual.

## Tipografia i ritme proposats

- UI i cos: `Arial, Helvetica, sans-serif`, alternativa de sistema sense descàrregues. No és la tipografia corporativa verificada.
- Títols: mateixa família amb pes 700, jerarquia per mida i espai. No imitis el lettering del logotip.
- Editorial opcional: `Georgia, "Times New Roman", serif` per a titulars de portada si encaixa amb el suport.
- Web: cos base 16 px, interlineat 1,5; títols fluids de 28–48 px. Text llarg d’uns 60–75 caràcters d’amplada.
- Espaiat: unitat de 4 px; valors recurrents 8, 16, 24, 32 i 48 px. Cantonades de 8 px per a controls i 12 px per a contenidors.

## Logotip

Conserva el recurs oficial com una unitat. No separis símbol i nom, recoloris, deformis o afegeixis efectes. Selecciona una variant oficial adequada al fons quan estigui disponible.

Sense manual, no inventis una mida mínima o zona de protecció corporativa. Com a decisió provisional de maquetació, deixa espai lliure i comprova la lectura a mida final. Documenta si falta un original vectorial o una variant per a fons fosc.

## Veu i microcopy proposats

To directe, proper, concret i respectuós. Adapta la llengua al destinatari. No afegeixis eslògans o superlatius com si fossin missatges oficials.

| Context | Exemple proposat |
| --- | --- |
| Entrada a consulta | «Com estàs vivint el canvi de torns?» |
| Acció principal | «Revisar consulta» |
| Aprovació i publicació | «Aprovar i publicar», quan faci totes dues accions |
| Fi de resposta | «Gràcies per compartir la teva experiència.» |
| Base insuficient | «Dades insuficients per mostrar aquest resultat.» |

Són textos de producte del kit, no frases oficials de la marca. Evita preguntes dirigides com «Explica’ns com ha millorat el nou sistema».

## Adaptació al suport

| Suport | Aplicació proposada |
| --- | --- |
| Dashboard | Fons paper, superfícies blanques i accent vermell limitat. Jerarquia entre mètrica, base i límits. |
| Formulari mòbil | Una tasca principal per pantalla; controls còmodes d’uns 44 px i errors al costat del camp. |
| Presentació | Portada amb un focus clar; interiors amb una idea dominant per diapositiva. Preserva les notes d’evidència. |
| Document | Títols foscos, petits accents vermells i taules llegibles. |
| Peça de marca | Composició més expressiva, fotografia justificada i text breu. |

## Verificació del resultat

Comprova les combinacions realment utilitzades: contrast mínim 4,5:1 en text normal, 3:1 en text gran i contorns funcionals. Daurat, transparències, fotos i nous fons requereixen revisió específica. Els tokens no garanteixen l’accessibilitat del resultat.

En web revisa focus visible, zoom al 200% i amplada de 320 px sense perdre contingut. En documents o slides inspecciona el renderitzat. Indica els recursos oficials que faltin. La revisió humana de les etapes del repositori continua pendent fins als checks de l’equip.
