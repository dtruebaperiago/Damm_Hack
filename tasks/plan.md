---
status: proposta-pendent-de-revisio-de-lequip
---

# Pla · PostgreSQL i demo sintètica del cas A

## Objectiu i fonts

Demostrar el cicle necessitat → consulta generada amb Groq → aprovació → Typeform → respostes → resultats → proposta d’acció → seguiment. Font principal: `../guia_participants_repte_damm.md`, seccions 4, 5 (escenari A), 6 i 8. Context: `../.plans/escolta-activa-damm-spec.md` i `../stages/02_model-logic/CONTEXT.md`. Aquesta proposta incorpora les instruccions més recents de l’usuari: PostgreSQL, llenç inicial buit, dades sintètiques i ajornament del control d’un enviament per persona. No implementa els canvis. Les revisions humanes de les etapes 01 i 02 continuen pendents.

## Abast

Cas concret proposat: una fàbrica fictícia passa de torns fixos a rotació Dia/Nit. People vol entendre comprensió del canvi, dificultats i suport necessari. No s’incorporen preguntes prefabricades al producte: Groq les genera a partir d’aquesta descripció. El guió i les dades de demo es carreguen explícitament en una base separada.

Proposta de conjunt: 600 respostes sintètiques, 300 de la primera onada i 300 del seguiment, del mateix públic fictici. Introduir desequilibri de participació i dificultats de comunicació/formació, amb comentaris variats. Els patrons i les etiquetes esperades són metadades de prova ocultes al model. No prometre una millora en tots els indicadors ni inferir causalitat d’una diferència. La població elegible i la seva composició es documenten separadament del nombre de respostes. Aquest volum és una proposta del pla, no un requisit específic del cas A.

## Decisions

- PostgreSQL amb SQL per identitat tècnica, versions, relacions i restriccions; JSONB per definicions de preguntes, respostes i sortides validades del model.
- Adaptar la persistència existent de Node/SQLite; els accessos PostgreSQL són asíncrons i cal adaptar els cridadors i les transaccions, sense afegir un ORM per defecte.
- Primera ingesta real amb el botó d’importació Typeform existent. El webhook és posterior i opcional per a la demo.
- Separar respostes generades localment (`synthetic`) de respostes llegides realment de Typeform (`typeform`). No atribuir dades locals al proveïdor.
- La mateixa normalització i validació de pregunta/versió alimenta els dos orígens. La política d’admissió és explícita per origen: el generador no fabrica credencials de participant ni s’evadeix l’autorització de producció.
- El control d’un enviament per persona queda pendent. Es manté la unicitat tècnica formulari/resposta: deduplicar imports no demostra unicitat de persones. Les respostes de proves directes de Typeform necessiten un mode de demostració explícit i aïllat si encara no tenen autorització de plataforma.
- Groq no rep credencials de base de dades ni executa SQL. El servidor calcula mètriques, prepara context, valida la resposta del model i desa propostes pendents de revisió.
- No persistir ni enviar comentaris sense passar pel tractament de privacitat. La implementació actual exclou el text lliure: habilitar textos sintètics i revisar la depuració és una tasca explícita.

## Ordre de treball

1. Connexió PostgreSQL i migracions d’una base de demo aïllada.
2. Crear, editar, aprovar i publicar una campanya amb persistència PostgreSQL.
3. Adaptar la recollida, el tancament i la consulta de resultats a PostgreSQL.
4. Crear el primer formulari del cas A des de la descripció i congelar-ne la versió.
5. Normalitzar i importar una resposta real de prova de Typeform, sense duplicats.
6. Generar dades sintètiques vinculades a aquesta definició i carregar la primera onada.
7. Mostrar agregats fiables i habilitar l’anàlisi de comentaris sintètics amb Groq.
8. Desar propostes amb evidències, seleccionar una acció i generar el seguiment; carregar-ne les dades només quan existeixi la seva versió.
9. Assajar el recorregut complet i preparar captures/contingència.

Les tasques detallades i els punts de comprovació són a `todo.md`. Les àrees de fitxers són orientatives; si una tasca supera cinc fitxers o una sessió curta, dividir-la abans d’implementar.

## Criteris finals

- Arrencada buida; càrrega de demo explícita, repetible i sense duplicats.
- Consulta de 3–6 preguntes generada, editada i aprovada abans de publicar; menys de dos minuts pendent de comprovació amb persones.
- Una resposta real de Typeform importada i dataset local etiquetat amb origen correcte.
- Agregats comprovables, protecció de grups inferiors a 10 i complements petits; no mostrar participació sense denominador ni assumir representativitat.
- Comentaris depurats; classificació i propostes amb evidències existents i limitacions visibles.
- Seguiment comparable només per mesures que conserven significat i escala; sense vincular persones si no existeix un identificador sintètic fiable i autoritzat.
- Tests amb PostgreSQL i navegador; secrets fora del repositori i captures sense informació sensible.

## Pendents i riscos

La ubicació concreta de PostgreSQL (local o servei gestionat) s’ha de triar abans d’implementar la connexió. En local la demo no necessita publicar la base de dades. El control de participant únic, la infraestructura de producció i els webhooks queden fora del primer tall. Les dades sintètiques serveixen per demostrar el mètode, no per prendre decisions sobre persones reals. Conservar la versió inicial i els resultats del model permet reproduir la demo sense dependre d’una nova generació en directe.
