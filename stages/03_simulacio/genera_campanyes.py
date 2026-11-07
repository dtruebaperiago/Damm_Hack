"""Genera trameses voluntàries per al cas fictici de rotació Dia/Nit."""

import hashlib
import json
import math
from bisect import bisect_right
from datetime import date, timedelta
from random import Random

from genera_calibracio import POBLACIO_ELEGIBLE, RECOMPTES


POBLACIO_TORNS = {"dia": 360, "nit": 240}
PROTOCOL_ID = "qr-compartit-mobil-7d-recordatori-collectiu-dos-torns-v1"
PUBLIC_ID = "planta-catalunya"
ACCIO_ID = "resum-canvi-inici-torn"
ACCIO = "Centralitzar les instruccions i presentar-ne un resum a l’inici de cada torn."
ESCENARIS = ("millora", "estable")

# Només la participació aparent de setembre orienta l'ordre de magnitud de la recollida.
# El desplaçament del context és una hipòtesi de simulació, no un ajust de les respostes.
TAXA_HISTORICA = sum(RECOMPTES["voluntaria"]) / POBLACIO_ELEGIBLE
INTERCEPT_PARTICIPACIO = math.log(TAXA_HISTORICA / (1 - TAXA_HISTORICA)) - 0.315

OPCIONS_ESCALA = (
    ("1", "Gens d’acord"),
    ("2", "Més aviat en desacord"),
    ("3", "Ni d’acord ni en desacord"),
    ("4", "Més aviat d’acord"),
    ("5", "Totalment d’acord"),
    ("no_valorable", "No ho puc valorar"),
)

PREGUNTES_FIXES = tuple(
    {
        "id": pregunta_id,
        "ordre": ordre,
        "text": text,
        "tipus": "escala_1_5",
        "opcions": OPCIONS_ESCALA,
        "obligatoria": False,
        "condicio_de_visualitzacio": None,
    }
    for ordre, (pregunta_id, text) in enumerate(
        (
            ("comprensio", "Tinc clar com funciona el nou sistema de torns."),
            ("suport", "Sé on demanar ajuda si tinc un dubte sobre el nou sistema de torns."),
        ),
        start=1,
    )
)

SIGNATURES = {
    pregunta["id"]: hashlib.sha256(
        json.dumps(pregunta, ensure_ascii=False, sort_keys=True).encode("utf-8")
    ).hexdigest()
    for pregunta in PREGUNTES_FIXES
}

DIFICULTATS = ("funcionament", "antelacio", "canvis", "necessitats_personals", "altra")
COMENTARIS = {
    "instruccions_disperses": (
        "Entre el tauler i el full de torn hi ha instruccions diferents.",
        "Un únic lloc per consultar les instruccions, ara no sé quina versió val.",
        "Vaig veure dos papers amb indicacions diferents. Quin és el bo?",
        "El que es va dir al relleu no ho vaig trobar al quadrant.",
        "Amb tot repartit costa trobar la informació quan toca.",
        "Mateix full al tauler i al mòbil, si pot ser.",
        "Em vaig fer un embolic, hi havia un full nou i l’antic seguia penjat.",
    ),
    "exemple_torns": (
        "Un exemple amb un canvi de nit a dia, pas a pas.",
        "Un esquema senzill del que passa després de l’últim torn de nit.",
        "Amb un dibuix del quadrant ho hauria vist més clar.",
    ),
    "antelacio_quadrant": (
        "Tenir el quadrant de la setmana vinent una mica abans.",
        "Que avisin abans si es mou el dia de descans.",
        "El vaig veure tard i ja m’havia organitzat.",
    ),
    "gestio_canvis": (
        "Que quedi escrit com es pot demanar un intercanvi.",
        "Saber on anar quan el canvi ja està fet i no el pots fer.",
    ),
    "conciliacio": (
        "Veure la rotació amb temps per organitzar-me a casa.",
        "Explicar com encaixar els dies de descans entre els torns.",
    ),
    "altres": (
        "Més exemples, amb l’explicació sola em vaig perdre.",
        "Ho vaig preguntar al relleu, m’aniria bé poder-ho consultar després.",
        "La informació en 2 minuts a l’inici hauria anat bé.",
    ),
}
TEMA_PER_DIFICULTAT = {
    "funcionament": "exemple_torns",
    "antelacio": "antelacio_quadrant",
    "canvis": "gestio_canvis",
    "necessitats_personals": "conciliacio",
    "altra": "altres",
}

# Obertura, variació de disponibilitat, abast del resum, desplaçament latent de Q1 i de Q2.
ONADES = (
    (date(2026, 10, 5), -0.02, 0.00, 0.00, 0.00),
    (date(2026, 10, 26), 0.13, 0.71, 0.30, 0.36),
    (date(2026, 11, 16), -0.10, 0.83, 0.41, 0.49),
)


def _escala(rng, latent, poc_contacte):
    """Torna un codi ordinal, una omissió o una opció explícita fora d’escala."""
    resposta = rng.random()
    if resposta < 0.022:
        return ""
    if resposta < 0.067 + 0.12 * poc_contacte:
        return "no_valorable"
    return str(1 + bisect_right((-1.14, -0.43, 0.30, 1.12), latent))


def _dificultat(rng, comprensio, poc_contacte, nit):
    opcions = (*DIFICULTATS, "cap", "no_us", "prefereixo_no_respondre", "")
    pesos = (
        max(7, 28 - 18 * comprensio),
        14 + 5 * nit,
        11,
        17 + 8 * nit,
        5,
        max(5, 24 + 19 * comprensio),
        3 + 30 * poc_contacte,
        2,
        2,
    )
    return rng.choices(opcions, weights=pesos)[0]


def _aclariment(rng, comprensio, dificultat):
    if comprensio != "1" or dificultat not in DIFICULTATS:
        return "no_mostrada", "", ""
    if rng.random() < 0.26:
        return "omes", "", ""
    tema = "instruccions_disperses" if rng.random() < 0.61 else TEMA_PER_DIFICULTAT[dificultat]
    return "valid", rng.choice(COMENTARIS[tema]), tema


def _resposta(rng, perfil, nit, disponibilitat, abast, millora_q1, millora_q2):
    disposicio, familiaritat, coneixement, sensibilitat = perfil
    poc_contacte = rng.random() < 0.10 + 0.07 * nit
    ha_rebut_resum = rng.random() < max(0.0, abast - 0.12 * nit)
    efecte = sensibilitat * (0.25 + 0.75 * ha_rebut_resum)
    comprensio = -0.26 + familiaritat - 0.18 * nit + millora_q1 * efecte + rng.gauss(0, 0.60)
    suport = -0.36 + coneixement - 0.23 * nit + millora_q2 * efecte + rng.gauss(0, 0.65)

    # Es decideix si participa abans de produir una tramesa. El QR és el mateix a cada onada.
    intensitat = min(2.5, max(abs(comprensio), abs(suport)))
    log_odds = (
        INTERCEPT_PARTICIPACIO + disponibilitat - 0.76 * nit
        + disposicio + 0.52 * (intensitat - 0.9)
    )
    if rng.random() >= 1 / (1 + math.exp(-log_odds)):
        return None

    torn = "nit" if nit else "dia"
    if rng.random() < 0.09 + 0.06 * nit:
        torn = ""
    comprensio_escala = _escala(rng, comprensio, poc_contacte)
    suport_escala = _escala(rng, suport, poc_contacte)
    dificultat = _dificultat(rng, comprensio, poc_contacte, nit)
    if not (comprensio_escala or suport_escala or dificultat):
        return None

    arribada = ""
    if abast:
        opcio = rng.random()
        if opcio >= 0.025:
            arribada = "no_ho_se" if opcio < 0.085 else ("si" if ha_rebut_resum else "no")
    estat, text, tema = _aclariment(rng, comprensio_escala, dificultat)

    return {
        "torn": torn,
        "comprensio": comprensio_escala,
        "suport": suport_escala,
        "dificultat_principal": dificultat,
        "aclariment_comprensio": text,
        "estat_aclariment": estat,
        "tema_aclariment": tema,
        "arribada_resum": arribada,
    }


def genera_campanyes(seed: int, escenari: str = "millora") -> tuple[list[dict], list[dict]]:
    """Retorna metadades de tres onades i les trameses, sense vincular persones."""
    if escenari not in ESCENARIS:
        raise ValueError(f"Escenari desconegut: {escenari}. Valors admesos: {ESCENARIS}")

    rng = Random(seed)
    poblacio = sum(POBLACIO_TORNS.values())
    perfils = []
    for _ in range(poblacio):
        familiaritat = rng.gauss(0, 0.72)
        coneixement = 0.52 * familiaritat + rng.gauss(0, 0.63)
        perfils.append((rng.gauss(0, 0.78), familiaritat, coneixement, rng.gauss(1, 0.67)))

    serie_id = f"rotacio-torns-{escenari}"
    metadades = []
    respostes = []
    for index, (inici, disponibilitat, abast, millora_q1, millora_q2) in enumerate(ONADES):
        onada = index + 1
        campanya_id = f"{serie_id}-o{onada}"
        versio_id = f"{campanya_id}-v1"
        seguiment = onada > 1
        metadades.append({
            "escenari": escenari,
            "serie_id": serie_id,
            "campanya_id": campanya_id,
            "versio_id": versio_id,
            "onada": onada,
            "periode_inici": inici.isoformat(),
            "periode_fi": (inici + timedelta(days=6)).isoformat(),
            "public_id": PUBLIC_ID,
            "poblacio_elegible": poblacio,
            "protocol_id": PROTOCOL_ID,
            "canal": "qr_compartit",
            "signatura_comprensio": SIGNATURES["comprensio"],
            "signatura_suport": SIGNATURES["suport"],
            "campanya_origen_id": f"{serie_id}-o{onada - 1}" if seguiment else "",
            "accio_id": ACCIO_ID if seguiment else "",
            "accio": ACCIO if seguiment else "",
            "origen": "sintetic",
        })

        if escenari == "estable":
            millora_q1 = millora_q2 = 0.0

        trameses = []
        for persona, perfil in enumerate(perfils):
            # La posició és privada. La rotació manté les bases de torn a cada onada.
            nit = (persona + 179 * index) % poblacio >= POBLACIO_TORNS["dia"]
            # El mateix flux base en ambdós escenaris evita que una branca alteri altres persones.
            rng_persona = Random(rng.getrandbits(64))
            dia_tramesa = rng_persona.choices(range(7), weights=(19, 16, 12, 17, 14, 11, 11))[0]
            resposta = _resposta(rng_persona, perfil, nit, disponibilitat, abast, millora_q1, millora_q2)
            if resposta is not None:
                resposta["data_tramesa"] = (inici + timedelta(days=dia_tramesa)).isoformat()
                trameses.append(resposta)

        Random(rng.getrandbits(64)).shuffle(trameses)
        for numero, resposta in enumerate(trameses, start=1):
            respostes.append({
                "escenari": escenari,
                "campanya_id": campanya_id,
                "versio_id": versio_id,
                "response_id": f"{campanya_id}-r{numero:03d}",
                "origen": "sintetic",
                **resposta,
            })

    return metadades, respostes
