# PostgreSQL compartit amb Supabase

La via prevista per a l’equip és Supabase. Docker (`compose.yaml`) continua disponible com a alternativa local opcional. No cal instal·lar PostgreSQL al vostre ordinador per utilitzar la base compartida.

## Crear el projecte

1. Crear el projecte de demo a l’organització de l’equip amb el pla gratuït si està disponible i una regió europea.
2. Introduir personalment la contrasenya de PostgreSQL i conservar-la al gestor de secrets de l’equip.
3. Desactivar **Enable Data API**. El nostre backend utilitza `pg`, no `supabase-js` des del navegador.
4. Esperar que el projecte estigui preparat.

El servidor crea les taules a l’esquema privat `escolta`, amb JSONB per a la informació variable i restriccions per a versions, enllaços i respostes úniques. Les taules tenen RLS activat sense polítiques públiques; el servidor de demo utilitza la connexió administrativa de PostgreSQL. Abans d’utilitzar dades reals cal un rol d’aplicació limitat separat del rol de migracions. Les bases SQLite anteriors no s’eliminen ni es copien automàticament a Supabase.

## Connectar el servidor

Al projecte Supabase, obrir **Connect** i seleccionar **Session pooler**, que és adequat per al nostre backend Node persistent i permet connexió IPv4. Copiar la connexió al `.env` local com a `DATABASE_URL`, substituint el marcador de contrasenya amb el valor real codificat per a URL. No posar-la al xat, al frontend ni a Git.

Exemple de format, sense credencials reals:

```dotenv
DATABASE_URL=postgresql://postgres.REFERENCIA:CONTRASENYA_CODIFICADA@HOST_POOLER:5432/postgres?sslmode=require
DATABASE_SSL_CA_FILE=app/certs/supabase-ca.crt
```

El client exigeix TLS amb verificació del certificat en connexions remotes. El certificat arrel públic de Supabase està inclòs a `app/certs/supabase-ca.crt` i es configura amb `DATABASE_SSL_CA_FILE`; s’ha descarregat des de l’enllaç oficial del panell de Database Settings. No conté claus privades. No es permet desactivar la verificació per resoldre errors de certificat.

Des de l’arrel del repositori:

```powershell
pnpm install --frozen-lockfile --ignore-scripts
pnpm db:check
pnpm start
```

`db:check` comprova la connexió i aplica les migracions pendents. L’arrencada del servidor també les aplica dins d’una transacció amb bloqueig de migració. Amb `DATABASE_URL` buit s’utilitza SQLite; una URL configurada que falla no provoca un canvi silenciós a SQLite. No hi ha càrrega de dades de demo a l’arrencada amb PostgreSQL. La demo SQLite conserva la simulació opcional de l’etapa 03.

## Compartir amb l’equip

Invitar explícitament els desenvolupadors al projecte/organització Supabase amb els permisos adequats. Compartir una sessió d’agent no concedeix accés als companys. Els usuaris de People entren a la web amb les credencials de l’aplicació; no necessiten credencials PostgreSQL.

Per a una web compartida també cal desplegar aquest servidor Node en un allotjament amb HTTPS i configurar-hi `DATABASE_URL`, `PUBLIC_ORIGIN`, `ADMIN_PASSWORD`, `HMAC_SECRET`, les claus del model i Typeform. La base al núvol no publica automàticament la web.

## Recepció automàtica de Typeform

1. Configurar `TYPEFORM_WEBHOOK_SECRET` al servidor amb almenys 32 caràcters aleatoris i mantenir-lo estable entre instàncies. El secret local ja s’ha generat a `.env` sense mostrar-lo.
2. Configurar `PUBLIC_ORIGIN` amb la URL pública HTTPS exacta del servidor.
3. Publicar una consulta amb aprovació prèvia i obrir **Difusió → Connectar recepció automàtica**. L’app registra un webhook de Typeform a `/api/webhooks/typeform`, només per a respostes completes, amb signatura HMAC i verificació SSL.
4. Respondre a través de l’accés autoritzat de la plataforma. El servidor verifica la signatura dels bytes originals, normalitza els IDs segons la versió i desa la resposta abans de confirmar recepció. No retorna dades privades al remitent.
5. El botó d’importació manual continua disponible. Ambdós camins comparteixen validació i deduplicació formulari/resposta.

El control d’una resposta per credencial continua existent. Les trameses directes sense bearer vàlid no entren als agregats: ajornar el control d’identitat no implica eliminar silenciosament l’autorització. El mode d’admissió de dades sintètiques sense participant és una tasca posterior explícita. Els bearers actuals caduquen als 30 minuts; un retard d’entrega/importació pot deixar una resposta fora, encara que existeixi a Typeform.

El webhook no executa el model durant la recepció, per respectar el termini del proveïdor. El text lliure arbitrari continua exclòs pel filtre actual; abans d’habilitar-lo cal depuració revisada i processament diferit persistent per a la classificació. Les mètriques tancades es calculen al servidor; la generació de preguntes i les propostes d’accions continuen passant pels adaptadors Groq/OpenAI existents.

## Proves

`pnpm test` comprova SQLite i PostgreSQL amb PGlite (motor PostgreSQL embegut de proves), JSONB, migracions repetibles, integritat, transaccions, concurrència de versions, sessions compartides entre servidors i signatures Typeform. Les proves de pool de `pg` verifiquen l’ús d’un mateix client fins a COMMIT/ROLLBACK. `python tests/browser.py` recorre la UI amb dades de prova aïllades. Això no substitueix `pnpm db:check` i una prova amb la base Supabase real.

## Docker local opcional

```powershell
docker compose up -d postgres
docker compose exec postgres pg_isready -U damm_demo -d damm_demo
```

Utilitzar una `DATABASE_URL` local pròpia per a aquesta alternativa. `POSTGRES_PASSWORD` només inicialitza el volum al primer inici. Per aturar sense perdre dades: `docker compose stop postgres`. No utilitzar `down -v` per aturar: elimina el volum.

Fonts: [connexions Supabase](https://supabase.com/docs/guides/database/connecting-to-postgres), [TLS de node-postgres](https://node-postgres.com/features/ssl), [webhooks Typeform](https://www.typeform.com/developers/webhooks/reference/create-or-update-webhook/).

## Estat real · 8/11/2026

Projecte [damm hack](https://supabase.com/dashboard/project/csdjtzpusvijtnarwvzv) creat a l’organització Damm Hack, regió Frankfurt. Migració 1 aplicada: deu taules a `escolta`, totes amb RLS activat. La URL i la contrasenya s’han configurat només al `.env` local. `pnpm db:check` connecta correctament amb el certificat arrel oficial i la verificació TLS activada.

Verificació sobre Supabase real: creació d’esborrany buit, edició, aprovació, publicació local de prova, acceptació d’una resposta sintètica i supressió de base petita, dins d’una transacció revertida al final. El recompte de campanyes és el mateix abans i després. S’ha provat l’inici de sessió, consulta de campanyes i tancament de sessió del servidor real a http://127.0.0.1:3002, connectat a Supabase. Evidència sense secrets a `test-results/supabase-proof.json` i `test-results/supabase-ready.jpg`.

Pendent: allotjament HTTPS compartit de la web i prova real de lliurament del webhook Typeform. La base al núvol ja està preparada; la web continua executant-se localment. No s’ha carregat el conjunt de dades sintètiques del cas A ni s’han convidat membres de l’equip.
