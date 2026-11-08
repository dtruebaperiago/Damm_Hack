---
status: pendent-de-revisio-de-lequip
---

# 03 · Simular la recollida i el seguiment

## Inputs

- Cas i condicions de participació · `../../.plans/escolta-activa-damm-handoff.md`
- Recomptes de setembre i regles de comparació · `../../.plans/escolta-activa-damm-spec.md` (apartats de sondeig i comparabilitat)
- Ítems i bases de càlcul · `../02_model-logic/output/plantilla-microconsulta.md` (apartats 4 i 5)
- Abast del codi de participació · `../../docs/adr/0001-abast-del-codi-de-participacio.md`
- Qüestionari base de la demo web · `consulta.json`

## Procés

1. Conserva la calibració de setembre en un conjunt separat de les onades del canvi.
2. Des de l’arrel, executa `python -B stages/03_simulacio/genera.py`. Els gràfics requereixen Matplotlib. Per obtenir només les dades, indica `--sense-grafics --sortida` amb una carpeta sense gràfics previs.
3. Llegeix els [supòsits i les instruccions d’ús](metode.md) abans de preparar les pantalles de la demo.

## Sortida

- `output/` conté els CSV de prova, els agregats publicables, el diagnòstic de setembre i dos gràfics PNG.
- La web carrega `output/demo_web.json` amb les metadades, els KPI i les comparacions publicables. Consulta el [README](../../README.md) per activar la càrrega en cada mode.

## Check

L’equip recorre els dos gràfics i un parell d’onades al prototip. Confirma que el 40% històric es presenta com a taxa aparent, que comprensió i suport tenen bases pròpies i que el seguiment mostra mostres comparables. Comprova que el jurat pot identificar l’origen sintètic i els supòsits dels dos escenaris. La revisió queda pendent fins a l’assaig.
