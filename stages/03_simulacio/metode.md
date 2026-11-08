---
status: pendent-de-revisio-de-lequip
---

# Dades de prova per a la demo d’Escolta activa

**Integració actual:** `output/demo_web.json` aporta sis onades sintètiques amb KPI i seguiments. `pnpm demo:seed` les incorpora a `data/demo.sqlite`; el servidor normal les carrega per defecte en mode demo amb SQLite, tret que `LOAD_SIMULATION=0`. Amb PostgreSQL només les carrega si `LOAD_SIMULATION=1`. La calibració de setembre també pot servir de context alternatiu en SQLite. La demo de l’Escenari A és independent: prepara cinc campanyes en memòria. Consulta els [ports i instruccions](../../README.md#portals-locals-demo-amb-dades-i-portal-net) i l’[estat tècnic](../../docs/estat-tecnic.md).

## Què s’ha simulat

La fàbrica fictícia té **600 persones elegibles**. A cada onada es modelen 360 oportunitats de recollida al torn de dia i 240 al de nit. Les persones roten entre torns. Les onades mantenen les mateixes dues preguntes de referència i el mateix protocol voluntari amb QR compartit, mòbil, set dies de recollida i recordatori col·lectiu als dos torns. Les dates són fictícies.

| Conjunt | Què representa |
| --- | --- |
| Calibració de setembre | Pregunta de clima anterior al canvi de torns. La referència completa i la recollida voluntària tenen 600 i 240 respostes. Els extrems passen del 17,3% al 37,9%. Es conserven els recomptes fixats per l’equip. |
| `millora` | Consulta inicial i dos seguiments, separats per tres setmanes. Després de la consulta inicial, RRHH centralitza les instruccions i en presenta un resum a l’inici de torn. S’assumeix un efecte mitjà progressiu i heterogeni sobre comprensió i suport. |
| `estable` | Mateixa població de partida, acció i protocol, amb l’efecte de l’acció sobre les dues percepcions fixat a zero. La rotació, la no resposta i el soroll poden moure els percentatges. |

La font numèrica disponible és el sondeig **sintètic** de l’especificació. La taxa aparent històrica i la sobrerepresentació d’opinions extremes orienten els supòsits de participació. El codi calcula els KPI de torns a partir de les trameses generades per a cada onada, amb bases i preguntes pròpies. Els desplaçaments sobre comprensió i suport són hipòtesis de demo. [Especificació del sondeig](../../.plans/escolta-activa-damm-spec.md#sondeig-sintètic-i-diagnòstic)

La simulació incorpora propensions de resposta diferents, menys oportunitats a Nit, més predisposició entre opinions intenses, variació de disponibilitat entre finestres i soroll a cada ítem. Algunes respostes queden en blanc o marquen «No ho puc valorar». El seguiment exporta comparacions entre mostres. Cada identificador tècnic correspon a una tramesa dins de la seva onada. Els perfils interns serveixen per generar la simulació.

La consulta inicial segueix les quatre preguntes de la plantilla. Els seguiments hi afegeixen `arribada_resum`, «T’ha arribat el resum sobre el nou sistema de torns?», amb `si`, `no` i `no_ho_se`. Aquesta pregunta és opcional i es mostra també quan se salta la repregunta de text. [Plantilla de microconsulta](../02_model-logic/output/plantilla-microconsulta.md#4-exemple-per-muntar-a-typeform--canvi-de-torns)

## Com llegir els KPI

| Indicador | Càlcul i interpretació |
| --- | --- |
| Participació aparent | Trameses vàlides dividides per població elegible del mateix públic i període. El QR compartit deixa la unicitat sense verificar. |
| Comprensió favorable | Puntuacions 4–5 sobre respostes vàlides 1–5 a `comprensio`. Mesura l’acord declarat que s’entén el nou sistema. |
| Suport favorable | Puntuacions 4–5 sobre respostes vàlides 1–5 a `suport`. Mesura l’acord declarat que se sap on demanar ajuda. |
| Dificultat amb el funcionament | Proporció de `funcionament` sobre respostes substantives de Q3, inclosa l’opció «Cap dificultat». |
| Instruccions disperses | Recompte de trameses amb aquest tema sintètic entre els aclariments de la branca de Q4. El camp de tema ve del generador i només descriu les persones que han respost la repregunta. |
| Arribada del resum | Proporció de totes les trameses vàlides que declaren haver rebut el resum. La resta inclou respostes negatives, incertesa i omissions. |
| Composició | Pes del torn de dia entre les trameses amb torn declarat, comparat amb el seu pes del 60% entre les oportunitats elegibles. |

Els CSV deixen en blanc els resultats indisponibles o protegits. Les mètriques tenen una base mínima de 10. Quan es pot deduir una categoria petita restant una xifra visible del total, s’oculta també la xifra que la revelaria. «No ho puc valorar» queda fora de les escales numèriques i pot aparèixer com a recompte separat quan és publicable.

Amb la llavor de demo, `funcionament` és la dificultat triada en 68 de les 181 respostes substantives de l’onada inicial. Aquesta dada i les bases de comprensió i suport donen context a l’acció proposada. Al seguiment, el gràfic deixa un buit a l’escenari estable quan la mètrica de suport queda protegida.

## Fitxers per a la demo

- [Gràfic del seguiment](output/seguiment-kpi.png) i [gràfic de la calibració de setembre](output/calibracio-setembre.png) per a la presentació.
- [KPI per onada](output/kpi_onades.csv), [comparacions en punts percentuals](output/comparacions_kpi.csv) i [resum històric](output/calibracio_resum.json) per al dashboard. El resum històric inclou els estats esperats dels casos de denominador absent i tall protegit.
- [Metadades d’onades](output/prova_onades.csv) i [trameses de prova](output/prova_trameses.csv) per reproduir els agregats. Filtra per `escenari` i `campanya_id`. El càlcul deduplica les trameses per `response_id` dins de cada onada.
- [Agregats per a la web](output/demo_web.json) per precarregar les sis onades tancades. La web llegeix aquest fitxer, la calibració separada i el qüestionari base. Si regeneres les dades, usa una base nova per visualitzar les noves instantànies.
- [Població de setembre](output/calibracio_poblacio.csv) i [respostes de la calibració](output/calibracio_respostes.csv) per reproduir els agregats històrics. El `recollida_id` separa els formularis.

Els CSV fan servir comes com a separador i punt decimal. Les files individuals són fixtures per a proves del prototip. Per al jurat, mostra els agregats i identifica qualsevol tramesa de Typeform que arribi en directe amb el seu origen propi.

## Reproducció

Des de l’arrel, amb Python 3.11 i Matplotlib per als gràfics:

```powershell
python -B stages/03_simulacio/genera.py
python -B stages/03_simulacio/genera.py --sense-grafics --llavor 41 --sortida "$env:TEMP/damm-simulacio-41"
```

La llavor de demo és `20261107`. Es va fixar a partir de la data de preparació. Les onades poden evolucionar diferent amb altres llavors. Els recomptes històrics són fixos i canvia l’ordre de les trameses.

## Frase per al jurat

> Amb 600 persones elegibles, RRHH veu quantes trameses arriben, a qui pot estar deixant fora el QR i si comprensió i suport evolucionen després de l’acció. En aquest escenari sintètic, els dos indicadors milloren mentre la participació aparent fluctua. En una prova de camp, la no resposta i l’autoselecció limitarien la lectura del canvi observat.
