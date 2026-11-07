# Brandkit de treball · Estrella Damm

Observació de webs públiques i del seu CSS el 8 de novembre de 2026. És una guia per al prototip, no un manual oficial ni una declaració de totes les variants de marca. Les webs i els seus recursos poden canviar.

## Fonts i evidència

| Font | Observació verificable | Abast |
| --- | --- | --- |
| [Estrella Damm](https://www.estrelladamm.com/es/es) · [CSS del tema](https://www.estrelladamm.com/sites/default/files/css/css_QzXLWTnmOYF8zIYY7V7DOuZSons2h44pY1wTLl7Vk1c.css) | Declara Futura i Garamond Pro en diversos pesos; `#151515` apareix com a color de text. `#cd1321` es fa servir per a errors. | Web de marca; no s'ha comprovat que siguin els únics tipus o colors. |
| [Damm corporatiu](https://www.damm.com/es) · [CSS del tema](https://www.damm.com/sites/default/files/css/css_D3MQzXMCNnPAGlwkytU3MSVDu-IfFU1NoqdoFIMhStE.css) | `#eb0505` en accions i hover; declaracions Neue Haas Unica Pro Black sota l'àlies `Bottles Titles`, Didot i Grotesque. | Grup Damm, no equival automàticament a Estrella Damm. |
| [Visites Estrella Damm](https://visitas.estrelladamm.com/es/) · [CSS](https://visitas.estrelladamm.com/themes/custom/damm_fabrica/css/style.css) | `#e70404` en títols, botons i navegació seleccionada; Neue Haas Unica Pro Black en títols, Roboto en text; títols grans de 100 px en una regla d'escriptori. | Web de visites; no és una norma general de mida ni de color. |
| [Logotip negre de la web de marca](https://www.estrelladamm.com/themes/custom/estrelladamm/svg/logo-black.svg) · [variant blanca](https://www.estrelladamm.com/themes/custom/estrelladamm/svg/logo-white.svg) | Recursos enllaçats per la web oficial. | Procedència verificada, drets de reutilització no verificats. |

Els HEX són observacions de CSS, no equivalències Pantone ni especificacions globals. Els fitxers de fonts i imatges oficials poden tenir drets o llicències pròpies; no els empaquetem ni fem hotlink als prototips. Usa'ls només amb autorització o llicència adequada. Les famílies alternatives són aproximacions i no substitueixen els originals.

## Traducció al prototip

La web de visites aporta una direcció útil per a una eina clara: blanc, negre, vermell viu, titulars sans serif molt contundents, composició oberta i imatge editorial de gran format quan tingui sentit. La web principal utilitza també un registre editorial amb Futura i Garamond; adapta'l a peces de marca, no el barregis indiscriminadament amb el sistema corporatiu. L'exemple HTML és una interpretació funcional, no una còpia exacta de cap pàgina.

| Token | Valor | Estat i ús |
| --- | --- | --- |
| `--ed-brand-red` | `#e70404` | Observat a la web de visites; detalls i titulars grans. |
| `--ed-red` | `#b90000` | Adaptació més fosca per a accions amb text blanc i contrast. |
| `--ed-red-hover` | `#900000` | Adaptació per a hover. |
| `--ed-ink` | `#151515` | Observat a la web principal per al text. |
| `--ed-paper`, `--ed-surface` | `#f7f6f4`, `#fff` | Fons neutres proposats per a la UI. |
| `--ed-muted`, `--ed-border`, `--ed-control-border` | `#555`, `#d8d8d8`, `#767676` | Valors funcionals proposats. |
| `--ed-focus`, `--ed-success`, `--ed-warning`, `--ed-error` | `#175e83`, `#256344`, `#805500`, `#a51d2d` | Estats funcionals proposats; acompanya'ls d'etiquetes. |
| `--ed-gold` | `#d5ad55` | Detall opcional proposat; no identificat com a valor global als CSS revisats. |

Titulars: Neue Haas Unica Pro Black si se'n disposa legalment; alternativa `Arial Black, Arial, sans-serif`. Cos: Roboto si està disponible amb llicència; alternativa `Arial, sans-serif`. Per al registre editorial de la web principal, Futura i Garamond Pro amb alternatives `Arial` i `Georgia`; no distribuir les fonts originals sense drets. No imitis el lettering del logotip.

Escala i espaiat de l'exemple són decisions del prototip: cos 16–18 px, títols fluids, unitat de 4 px i controls de com a mínim 44 px. L'original de visites utilitza títols molt grans en escriptori; redueix-los en pantalles petites. Preferir formes simples i separadors discrets; no atribuir una cantonada concreta al manual oficial.

## Logotip, fotografia i veu

Conserva el logotip oficial íntegre i selecciona la variant adequada al fons. Sense manual, no inventis una zona de protecció ni una mida mínima oficial. L'exemple mostra el nom en text corrent perquè no s'han verificat els drets de redistribució. La fotografia ha de ser autoritzada; no presentis una imatge generada com a campanya oficial.

To proper, directe i concret. En el prototip, prioritza preguntes neutrals i confiança; no converteixis l'eina de treball en publicitat de cervesa. No atribueixis a la marca els textos de mostra ni prometis anonimat o representativitat sense verificació.

## Comprovació

Revisa el resultat al suport final: contrast de text i controls, focus, zoom al 200%, mòbil de 320 px, jerarquia i integritat del logotip. El vermell de marca no substitueix les etiquetes d'error. Els tokens per si sols no garanteixen accessibilitat. La revisió humana de cada etapa del repositori continua pendent dels checks de l'equip.
