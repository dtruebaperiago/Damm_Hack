# UAB THE HACK! 2026 REPTE DAMM

**Damm**  
*UAB The Hack! 2026 Repte Damm*

## Com podem mesurar el clima laboral de manera àgil, contínua i intel·ligent amb IA?
### Escoltar millor, actuar abans

**Guia per als equips participants**  
*7 i 8 de novembre de 2026 | Escola d'Enginyeria UAB*

---

## 1. Benvinguts al repte de Damm

Gràcies per escollir el nostre repte! Durant aquest cap de setmana us proposem treballar sobre una necessitat real de Damm: escoltar millor les persones que hi treballen i transformar el que ens expliquen en accions que millorin el seu benestar.

Aquesta guia recull tot el que necessiteu per començar: el context, què esperem que construïu, com treballar amb Typeform, com generar les vostres dades, les normes de seguretat i privacitat, què heu d'entregar i com avaluarem les propostes.

> **Idea clau:** no busquem una enquesta més. Busquem una nova manera d'escoltar, entendre i actuar.

---

## 2. Context

### 2.1. Qui som
Damm és un grup de begudes i alimentació amb origen a Barcelona. Hi treballen persones amb realitats molt diverses: fàbriques, logística, equips comercials, oficines i equips de direcció, en diferents centres i horaris.

El repte el plantegen conjuntament l'àrea de People (Sostenibilitat & ESG i Desenvolupament de Persones) i l'equip de Data & IA de Damm.

### 2.2. La necessitat
Avui l'escolta de les persones es basa sobretot en enquestes periòdiques. Això funciona, però té tres limitacions que volem superar:

| Limitació | Què passa avui | Què ens agradaria |
| :--- | :--- | :--- |
| **Participació poc representativa** | Respon només una part de la plantilla, sovint sempre les mateixes persones. Fàbrica, logística i producció participen menys per temps, accés o interès. | Feedback representatiu de tots els col·lectius, sense saturar ningú. |
| **Una enquesta per a tothom** | Una única enquesta no reflecteix la realitat d'un operari, un comercial, una persona d'oficina o un manager. | Consultes rellevants per a cada col·lectiu sense dissenyar desenes d'enquestes a mà. |
| **Molt feedback, poca anàlisi** | Centenars o milers de comentaris oberts s'analitzen manualment. Quan es detecta un problema, sovint ja és tard. | Convertir automàticament el feedback en informació útil per decidir abans. |

Fa uns anys ja es va valorar una eina amb un enfocament similar, però no es va tirar endavant. També s'han revisat solucions de mercat que, per cost, encaix o complexitat d'implantació, no cobreixen del tot la necessitat. Amb les possibilitats actuals de la IA, creiem que és el moment de tornar-hi.

---

## 3. El repte

### Pregunta del repte
> **Com podríem dissenyar una plataforma d'escolta activa, basada en IA, que permeti crear microconsultes de clima adaptades a cada col·lectiu i moment, aconseguir una participació representativa sense saturar les persones, i convertir automàticament les respostes en insights i accions, garantint sempre l'anonimat i la privacitat?**

Un sol repte, un flux continu. Participació, personalització i anàlisi no són tres projectes separats: són tres parts d'un mateix cicle. Esperem que la vostra solució les connecti en un únic flux, de la necessitat a l'acció. Podeu aprofundir més en una part, però totes han d'estar presents.

### 3.1. El cicle d'escolta que volem veure
$$ \text{NECESSITAT} \longrightarrow \text{CONSULTA ADAPTADA} \longrightarrow \text{PARTICIPACIÓ} \longrightarrow \text{RESPOSTES} \longrightarrow \text{ANÀLISI} \longrightarrow \text{VISUALITZACIÓ} \longrightarrow \text{ACCIÓ} \longrightarrow \text{NOVA CONSULTA} $$

### 3.2. Qui és l'usuari
* **Usuari principal:** una persona de People/RRHH que vol entendre una situació concreta i actuar-hi.
* **Usuari que respon:** qualsevol persona de Damm (fàbrica, logística, comercial, oficina, manager), sovint amb poc temps i des del mòbil.
* **Usuari secundari:** responsables d'equip o direcció que reben resultats agregats i recomanacions.

---

## 4. Flux funcional mínim

Tots els equips han de cobrir aquest recorregut, encara que algunes parts siguin més senzilles que d'altres:

| # | Pas | Què ha de fer la solució |
| :---: | :--- | :--- |
| **1** | **Definir la necessitat** | RRHH descriu l'objectiu, el col·lectiu, el context, la durada màxima i què no s'ha de preguntar. |
| **2** | **Generar la consulta amb IA** | Proposa títol, introducció, 3-6 preguntes, tipus de resposta, lògica condicional i temps estimat, adaptats al col·lectiu (to, longitud, canal). |
| **3** | **Validació humana** | RRHH pot editar, eliminar, reordenar i aprovar. La IA no publica mai sense aprovació. |
| **4** | **Publicar a Typeform** | Crear el formulari via API (o connectar-se a un formulari existent) i obtenir l'enllaç / QR per compartir-lo. |
| **5** | **Participació** | Estratègia per arribar a tothom sense saturar: mòbil, QR, freqüència, recordatoris, control de representativitat. |
| **6** | **Recollir i analitzar** | Llegir respostes via API. Agrupar comentaris per temes, resumir, detectar tendències i senyals febles, comparar col·lectius o períodes. |
| **7** | **Visualitzar** | Dashboard senzill: participació, representativitat, temes principals, evolució, alertes, mida de la mostra. |
| **8** | **Recomanar i tancar el cicle** | Proposar accions concretes i una nova microconsulta de seguiment. Les recomanacions són propostes, no decisions automàtiques. |

**Bonus:** integració amb eines existents (p. ex. Microsoft Teams), recomanacions accionables de benestar, indicador de representativitat, preguntes de seguiment dinàmiques, multiidioma, experiència específica per a persones sense ordinador.

---

## 5. Escenaris de demostració

Us proposem tres escenaris ficticis. Feu servir com a mínim un per a la demo final (idealment, que el vostre flux pugui resoldre'ls tots).

* **Escenari A — Canvi organitzatiu:**  
  Un equip ha canviat recentment la manera de treballar (p. ex. nou sistema de torns o nova eina). RRHH vol saber si el canvi s'ha entès, quines dificultats genera i què cal reforçar, amb una consulta de menys de 2 minuts.

* **Escenari B — Col·lectiu de planta o logística:**  
  Persones amb poc temps, sense ordinador i amb accés limitat al correu. Cal una experiència mòbil, accessible via QR, molt breu, i un control que avisi si la mostra no és representativa.

* **Escenari C — Gran volum de comentaris:**  
  RRHH té uns 500 comentaris oberts sobre benestar, lideratge, comunicació, eines, organització i desenvolupament. Cal agrupar-los, resumir-los, detectar temes emergents respecte d'un període anterior i proposar àrees d'actuació, explicant els límits de l'anàlisi.

---

## 6. Dades: genereu les vostres dades sintètiques

> ### Important
> Damm no us facilitarà cap dada real de persones treballadores. Heu de treballar exclusivament amb dades sintètiques generades per vosaltres o amb respostes de prova que introduïu vosaltres mateixos als formularis.

### 6.1. Com generar-les
* Amb un LLM (el que vulgueu), amb scripts (p. ex. Python + Faker) o combinant-ho.
* Responent els vostres propis Typeforms diverses vegades simulant perfils diferents.
* Enviant respostes sintètiques via script per omplir el formulari (sense saturar l'API; respecteu els límits).
* Introduint biaixos intencionats (col·lectius que responen poc, temes emergents, canvis entre períodes) per demostrar que la vostra solució els detecta.

### 6.2. Esquema orientatiu

| Camp | Exemple | Notes |
| :--- | :--- | :--- |
| `id_resposta` | `r_00123` | Identificador aleatori, mai vinculat a una persona. |
| `data` | `2026-10-15` | Per simular períodes i tendències. |
| `col·lectiu` | Planta / Logística / Comercial / Oficina / Manager | Categories àmplies, no equips petits. |
| `centre_tipus` | Fàbrica / Magatzem / Oficina | Evitar centres concrets identificables. |
| `canal` | Mòbil-QR / Correu / Teams | Per analitzar participació per canal. |
| `preguntes_escala` | 1-5 o 0-10 | Benestar, càrrega, comunicació, reconeixement... |
| `comentari_obert` | Text lliure | Variat, realista, amb soroll i faltes. |
| `tema_real` *(opcional)* | Comunicació, torns... | Etiqueta oculta per validar la vostra classificació. |

* **Volum recomanat:** entre 300 i 1.000 respostes, repartides en almenys dos períodes i diversos col·lectius amb participació desigual.
* **Recordeu:** no feu servir noms, correus, telèfons ni cap informació real de Damm o de persones reals, encara que sigui pública.

---

## 7. Llibertat tecnològica i normes de seguretat

Com que treballareu amb dades sintètiques, teniu llibertat per triar llenguatges, frameworks, models d'IA (comercials, open source o locals com Ollama), bases de dades i eines de visualització. Si feu servir APIs de pagament, assegureu-vos de tenir crèdit o alternatives gratuïtes.

### Prohibit
* Pujar tokens, claus d'API o contrasenyes a repositoris, presentacions o captures.
* Compartir el token de Typeform fora del vostre equip.
* Carregar a qualsevol eina (LLMs inclosos) informació real de Damm o dades personals reals.
* Intentar accedir a workspaces d'altres equips o fer un ús abusiu de l'API.

### Bones pràctiques
* Variables d'entorn i fitxer `.env` inclòs al `.gitignore`; compartiu un `.env.example` sense valors.
* Repositori públic només si no conté secrets (reviseu l'historial de commits).
* Prepareu un vídeo o captures de seguretat per si la demo en directe falla.

---

## 8. Privacitat i ús responsable

És una de les claus del repte. Una solució que no generi confiança no farà que la gent respongui. Principis mínims:

* **Resultats sempre agregats:** mai respostes individuals identificables.
* **Llindar mínim de respostes** per mostrar un segment (p. ex. 5-10); per sota, no es mostra.
* **Detecció i eliminació automàtica de dades identificatives** als comentaris (noms, correus, telèfons...).
* **Cap perfil individual ni inferència** sobre persones concretes; la solució no pot servir per avaluar ningú.
* **Transparència:** explicar a qui respon per a què serveix la consulta i com es tracten les dades.
* **Explicabilitat:** mostrar mida de mostra, confiança i límits de l'anàlisi; no presentar correlacions com a causes.
* **Control humà:** RRHH valida consultes i recomanacions abans d'actuar.
* **Minimització i caducitat:** guardar només el necessari i durant el temps necessari.

---

## 9. Com avaluarem

| Criteri | Pes |
| :--- | :---: |
| **Adequació al problema i valor per a les persones** | 20% |
| **Qualitat i usabilitat del prototip** | 15% |
| **Ús útil i justificat de la IA** | 15% |
| **Privacitat, anonimat i ús responsable** | 15% |
| **Representativitat i inclusió de tots els col·lectius** | 10% |
| **Qualitat de l'anàlisi i dels insights** | 10% |
| **Possibilitat de futures integracions amb M365 corporatiu** | 10% |
| **Claredat de la presentació i potencial d'evolució** | 5% |

* **Criteris excloents:** ús de dades personals reals, resultats individuals identificables, absència de control humà o tokens exposats.
* **Premi:** l'equip guanyador del repte de Damm rebrà un premi de 500 €, gestionat per l'organització de UAB The Hack.

### Qui us ajudarà
* **People / RRHH (negoci):** necessitat, col·lectius, processos actuals i criteris d'èxit. Presentació del repte dissabte al matí, mentoria dissabte a la tarda i avaluació diumenge.
* **Data & IA (tècnica):** arquitectura, models, dades sintètiques i bones pràctiques de seguretat.

---

## 10. Preguntes freqüents

* **Podem centrar-nos només en l'anàlisi?**  
  Podeu aprofundir-hi més, però el flux complet ha d'estar present, encara que algunes parts siguin senzilles.

* **Ens heu de passar dades?**  
  No. Genereu dades sintètiques (vegeu la secció 6).

* **Podem fer servir ChatGPT, Claude, Copilot, Ollama...?**  
  Sí, amb dades sintètiques. Mai amb informació real.

* **La solució s'implantarà?**  
  El hackathon és un punt de partida. Les millors idees es podran evolucionar internament o amb partners, però no hi ha compromís d'implantació.

* **Què fem si ens encallem?**  
  Pregunteu a les mentores i mentors de Damm: per això hi som!

---

## 11. Checklist abans d'entregar

- [ ] El flux funciona de la necessitat a la recomanació.
- [ ] Hi ha validació humana abans de publicar.
- [ ] Les dades són 100% sintètiques.
- [ ] Hi ha llindar mínim i resultats només agregats.
- [ ] Cap token ni secret al codi o a la presentació.
- [ ] README i `.env.example` inclosos.
- [ ] Demo de seguretat (vídeo o captures) preparada.

**Molta sort i a gaudir-ho!**