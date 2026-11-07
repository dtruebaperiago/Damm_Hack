# Contracte d’implementació · Escolta activa

Estat: implementació local; revisió humana de les etapes 01 i 02 pendent.

Una aplicació Node.js 24 amb SQLite, frontend HTML/CSS/JS i un únic paquet de QR sense scripts d’instal·lació. Cap servei extern és necessari per a la demo. Typeform i OpenAI són adaptadors del servidor, habilitats només en mode connectat amb secrets en variables d’entorn. La generació utilitza un contracte JSON sense exemples de contingut. Les campanyes comencen buides; la plantilla antiga i les dades de calibració només existeixen com a fixtures de tests. Groq i OpenAI són proveïdors alternatius.

## Límit de confiança

L’accés al formulari de Typeform continua sent públic al proveïdor. El camp ocult `delivery` és un bearer token aleatori, caducable, vinculat al servidor a una onada i a un pseudònim. No és el pseudònim persistent. El servidor verifica l’autorització en importar: només una resposta autoritzada pot entrar als agregats. El proveïdor pot rebre trameses no autoritzades; no es promet impedir-les. Cal restringir l’accés al compte Typeform i netejar-ne les respostes de prova, incloses les rebutjades.

Les credencials fictícies es normalitzen amb NFKC, trim i majúscules, i es validen contra un conjunt provisionat. HMAC-SHA256 inclou versió i cicle: el mateix pseudònim es manté entre onades del mateix cicle. Mai s’emmagatzema l’ID original. El registre restringit d’autoritzacions està separat de les respostes analítiques. RRHH només accedeix a DTOs agregats, mai a tokens, pseudònims o respostes individuals. HMAC no verifica qui posseeix físicament una credencial.

## Publicació de resultats

Les onades obertes no exposen recomptes canviants. RRHH tanca la recollida per obtenir una única instantània immutable; els imports posteriors queden bloquejats. Això evita revelar respostes noves per diferència entre actualitzacions. Bases inferiors a 10 se suprimeixen; els talls per torn se suprimeixen conjuntament si un és petit. Distribucions i mètriques també protegeixen categories i complements petits. El seguiment utilitza només parelles vàlides comparables i protegeix la base i les pèrdues.

## Disseny visual

Eina editorial de treball: barra lateral clara, vermell de marca, fons càlid i dades amb molt contrast. El resum permet obrir una campanya o crear una consulta. El detall separa preparació, consulta, difusió i resultats/acció. A mòbil, navegació compacta i una columna; formulari de participant separat i sense navegació de RRHH. S’utilitzen els tokens de la skill; el nom és text corrent perquè no s’ha aportat un logotip oficial.

## Fonts de les integracions

- [Crear formularis](https://www.typeform.com/developers/create/reference/create-form/), [salts lògics](https://www.typeform.com/developers/create/logic-jumps/) i [recuperar respostes](https://www.typeform.com/developers/responses/reference/retrieve-responses/), consultats el 7/11/2026. No es pressuposa idempotència remota ni disponibilitat de funcions de pagament.
- [OpenAI · sortida estructurada](https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=responses): Responses API amb JSON i validació autoritativa al servidor. Model configurable, sense atribuir una crida real a les fixtures.

## Canvi de llenç en blanc · 7/11/2026

La petició de l’usuari substitueix la inicialització prefabricada de la demo. No s’insereixen campanyes, preguntes, textos classificats ni calibracions en arrencar. La configuració local apunta a una base nova i preserva les bases anteriors. Els diagnòstics previs no mostren insights sense dades. Les seleccions arbitràries es compten per l’ID real de cada pregunta amb la mateixa supressió de complements.

Difusió ofereix dos QR: l’accés de plataforma per autoritzar imports i l’URL Typeform directe per obrir el formulari des d’un mòbil. Les trameses directes sense bearer no entren als agregats de la plataforma. El text lliure es descarta fins que existeixi una depuració de privacitat revisada; s’han retirat les antigues frases i classificacions fixes.

La prova real ha creat https://form.typeform.com/to/k5rLOGmj a partir d’una descripció d’acollida a logística amb Groq. Quatre preguntes, esborrany v2 previ a l’aprovació, lectura posterior de Typeform coincident i QR descodificat al mateix URL. Evidència a `test-results/live-proof.json`. 23 tests Node i el recorregut Chromium passen. La revisió humana de les etapes continua pendent.
