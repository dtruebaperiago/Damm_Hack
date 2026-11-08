# 02 · Modelar les dades i el flux

## Inputs

- Artefacte de l’etapa 01 · `../../.plans/escolta-activa-damm-spec.md`
- Referència del repte, seccions 4, 6 i 8 · `../../guia_participants_repte_damm.md`
- Per al contracte d’anàlisi · `output/model-logic.md`, `output/plantilla-microconsulta.md` i la posada en comú de `../../.plans/escolta-activa-damm-handoff.md`

Obre la presentació, l’esquema o l’estudi d’IA a través del [contracte de definició](../01_definicio/CONTEXT.md) només si cal resoldre una discrepància amb les fonts.

## Procés

1. Identifica actors, dades, relacions i estats a partir del recorregut de la demo.
2. Escriu les regles d’aprovació, importació, privacitat i comparació. Delimita què decideix RRHH, què calcula el sistema i què proposa la IA.
3. Comprova el recorregut amb el cas sintètic de l’especificació. Verifica la selecció de la calibració pel públic, el càlcul del contrast i la separació entre agregats històrics i resultats de la campanya. Identifica les decisions pendents abans de prototipar.

## Sortida

- [Model lògic](output/model-logic.md)
- [Plantilla de microconsulta](output/plantilla-microconsulta.md)
- [Contracte d’anàlisi i accions amb LLM](output/contracte-analisi-llm.md)
- [Protocol reutilitzable d’interpretació i accions](output/protocol-interpretacio-llm.md)
- [Pipeline visual de les dades a les accions](output/pipeline-dades.svg)

## Check

L’equip repassa els casos de comprovació del model i resol les decisions pendents que afecten el primer tall. El model conserva l’estat d’esborrany fins a aquesta revisió.

Les dues parelles recorren l’exemple sintètic del contracte d’anàlisi, verifiquen els camps que intercanvien i executen els casos del protocol d’interpretació, inclosa la repetició amb la mateixa evidència. El contracte i el protocol queden pendents fins a aquesta revisió.
