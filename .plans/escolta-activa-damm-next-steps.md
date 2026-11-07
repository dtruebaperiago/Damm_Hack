---
status: proposat-per-a-lequip
---

# Escolta activa Damm · Pròxims passos

**Objectiu.** En una primera sessió, tenir un gràfic de calibració que es pugui ensenyar, una microconsulta que es pugui provar al mòbil i una resposta que les dues parelles puguin seguir fins a una acció de RRHH.

**Enfocament.** Les parelles treballen en paral·lel. La primera prepara els agregats de setembre i la segona prepara la microconsulta del canvi. A la posada en comú es valida com es connecten amb el dashboard i el seguiment. [Handoff](escolta-activa-damm-handoff.md) · [Especificació](escolta-activa-damm-spec.md) · [Model lògic](../stages/02_model-logic/output/model-logic.md)

## Primera ronda · Dos resultats visibles en paral·lel

Temps orientatius per ajudar a repartir la sessió.

| Qui | Quick win | Fet quan… |
| --- | --- | --- |
| Parella 1 · 25 min | Copieu els cinc recomptes de cada distribució a `calibracio-setembre.csv`, amb les columnes `puntuacio`, `referencia` i `voluntaria`. Feu un gràfic de barres agrupades i deseu-lo com a `calibracio-setembre.png`. | Es llegeixen el període, les dues bases (600 i 240), l’origen sintètic i els extrems (17,3% i 37,9%). La taxa aparent és del 40%. |
| Parella 2 · 25 min | Escriviu `microconsulta-canvi.md` amb quatre preguntes. Mantingueu les dues preguntes fixes de l’especificació, afegiu una pregunta tancada sobre dificultats i un comentari opcional. Anoteu l’ID estable i els valors de cada camp. | Una persona de l’altra parella fa el recorregut complet al mòbil en menys de dos minuts i entén per a què es faran servir les respostes. |
| Parella 2 · 15 min | Comproveu l’accés a Typeform i proveu un formulari de prova aprovat per RRHH. Obriu-lo amb un QR des del mòbil, envieu una tramesa sintètica i recupereu-la via API. | Teniu una tramesa recuperada i podeu identificar a quin formulari i versió correspon. Si l’accés falla, anoteu el bloqueig i prepareu `resposta-prova.json` per continuar la posada en comú. |

## Posada en comú · 20 minuts

- [ ] **5 min.** Poseu el gràfic de setembre al costat de la microconsulta. Escriviu una proposta de canal o finestra de difusió i un avís curt per a l’anàlisi que separi el contrast històric del risc per a la mostra actual.
- [ ] **10 min.** Fixeu una resposta d’exemple compartida a `resposta-prova.json`. Incloeu campanya, onada, versió, formulari, codi tècnic de tramesa, origen i valors per ID de pregunta. Acordeu com representar el torn sense declarar, el comentari en blanc i «No ho puc valorar». La parella 1 ha de poder llegir l’exemple i saber què entra a cada agregat.
- [ ] **5 min.** Recorreu una troballa publicable amb un agregat de prova, com ara instruccions disperses en almenys 10 trameses diferents, si supera les regles de privacitat. Vinculeu-hi una acció i un esborrany de seguiment que conservi les dues preguntes fixes. Anoteu les decisions i les comprovacions pendents als artefactes de cada etapa. [Contracte de definició](../stages/01_definicio/CONTEXT.md) · [Contracte del model lògic](../stages/02_model-logic/CONTEXT.md)

## Segona ronda · Connectar el recorregut de demo

- [ ] **Publicació i ingesta.** Amb l’stack i els accessos acordats per l’equip, connecteu l’esborrany generat amb IA, la revisió de RRHH i el Typeform aprovat. Verifiqueu que un esborrany sense aprovar queda bloquejat i que importar dues vegades la mateixa tramesa afegeix un sol registre.
- [ ] **Dashboard.** Mostreu els resultats actuals i la calibració històrica en blocs separats. Etiqueteu l’origen de cada base. Proveu un tall de 9 respostes, un denominador absent i una ubicació sense calibració. El primer queda protegit també per diferència, la taxa aparent s’omet sense denominador i la ubicació sense referència mostra «Dades insuficients». Depureu el text lliure abans de guardar-lo per a l’anàlisi o enviar-lo a la IA.
- [ ] **Acció i seguiment.** Feu que la IA proposi una acció vinculada a una troballa agregada i que RRHH la seleccioni per obrir un esborrany de seguiment. Recorreu la demo sencera amb dades sintètiques i graveu una còpia de contingència.

La primera passada se centra en una sola fàbrica. La comparació entre plantes, els sondejos per canal o moment, el quiosc i M365 queden per a l’explicació o una iteració posterior.
