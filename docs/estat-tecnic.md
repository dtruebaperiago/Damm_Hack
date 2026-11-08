# Estat tècnic i arquitectura · 8/11/2026

El prototip integra la presentació i l’editor de consultes d’Escoltamm amb l’anàlisi revisable, la simulació de l’etapa 03 i la persistència a SQLite o PostgreSQL/Supabase. El [README](../README.md) explica com executar-lo. El [contracte d’implementació](implementation.md) descriu el límit de confiança i les regles de privacitat.

| Peça | Responsabilitat |
| --- | --- |
| `public/` | Presentació, espai People, editor, difusió, resultats i formulari de participant. |
| `app/server.mjs` i `app/typeform-ingest.mjs` | Sessions, autorització, importació manual i webhook signat amb admissió compartida. |
| `app/domain.mjs` i `app/analysis.mjs` | Validació, calibració, agregació, protecció de bases, comparació i revisió d’evidències. |
| `app/db.mjs`, `app/store.mjs` i `app/migrations/` | Persistència i migracions, versions, instantànies, revisions d’anàlisi i retenció. |
| `app/providers.mjs` | Generació amb Groq o OpenAI i adaptador Typeform. |
| `app/scenario-a.mjs` i `scripts/demo-scenario-a.mjs` | Escenari A independent amb cinc campanyes sintètiques en memòria i proveïdor simulat; port 3010 per defecte, configurable amb `PORT`. |
| `app/simulation.mjs` i `stages/03_simulacio/` | Sis onades sintètiques amb KPI agregats i seguiments; calibració de setembre separada. |

Amb `DATABASE_URL`, el servidor selecciona PostgreSQL i aplica les migracions de l’esquema privat. La segona migració crea `wave_analysis` per a les revisions d’anàlisi. En mode local, SQLite conserva les dades existents. Les respostes Typeform s’admeten amb una referència temporal emesa per la plataforma. El codi per navegador permet enllaçar respostes dins d’una sèrie i el torn queda desconegut.

People tanca la recollida per congelar els agregats. Les onades de simulació ja tenen KPI agregats, amb una vista i seguiments propis. Per a les consultes amb respostes admeses i Groq configurat, el tancament inicia l’anàlisi automàtica, que prepara evidència publicable i valida la proposta perquè People pugui seleccionar una acció. Només es conserven els comentaris sintètics d’una llista tancada.

**Entorns locals:** 3010 és el port habitual de l’Escenari A; també es pot arrencar al 3022 amb `PORT`. El 3000 és el port habitual del servidor normal, que només està net si s’utilitza una base nova i es desactiva la càrrega de simulació. Vegeu els [comandaments i condicions](../README.md#portals-locals-demo-amb-dades-i-portal-net).

La verificació local cobreix SQLite, PostgreSQL embegut i el recorregut Chromium. El [traspàs Supabase i Typeform](../.plans/handoff-supabase-typeform.md) recull les proves externes prèvies i l’estat de la recepció HTTPS. Les revisions de les etapes [01](../stages/01_definicio/CONTEXT.md), [02](../stages/02_model-logic/CONTEXT.md) i [03](../stages/03_simulacio/CONTEXT.md) continuen pendents de l’equip.
