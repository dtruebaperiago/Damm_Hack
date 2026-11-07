"""Genera la calibració històrica de setembre definida a l'especificació."""

import csv
import json
from collections import Counter
from pathlib import Path
from random import Random


POBLACIO_ELEGIBLE = 600
PERIODE = "Setembre"
ORIGEN = "sondeig_sintetic"
PREGUNTA = "Em sento a gust en el meu entorn de treball i condicions"
FONT = ".plans/escolta-activa-damm-spec.md#sondeig-sintètic-i-diagnòstic"
ESCALA = (1, 2, 3, 4, 5)
RECOMPTES = {
    "referencia": (53, 109, 275, 112, 51),
    "voluntaria": (46, 32, 68, 49, 45),
}
LLINDAR_PUBLICACIO = 10


def casos_qa_calibracio() -> dict:
    """Retorna entrades de prova internes i vistes esperades per publicar."""
    return {
        "denominador_absent": {
            "entrada_interna": {"trameses_valides": 120, "poblacio_elegible": None},
            "vista_publicable": {
                "trameses_valides": 120,
                "taxa_aparent": {
                    "estat": "indisponible",
                    "motiu": "Falta el denominador del mateix públic i període",
                },
            },
        },
        "talls_protegits": {
            "entrada_interna": {"trameses_valides": 53, "per_torn": {"Dia": 44, "Nit": 9}},
            "vista_publicable": {
                "trameses_valides": 53,
                "per_torn": {"Dia": "suprimit", "Nit": "suprimit"},
                "motiu": "Els talls per torn es protegeixen també per diferència",
            },
        },
    }


def gen_calibracio(seed: int, public_id: str = "planta-catalunya") -> dict:
    """Expandeix els recomptes fixats en trameses sintètiques independents."""
    rng = Random(seed)
    poblacio = {
        "poblacio_id": f"{public_id}-setembre",
        "public_id": public_id,
        "sector": "Planta",
        "ubicacio": "Fàbrica fictícia de Catalunya",
        "torn": "Tots dos",
        "periode": PERIODE,
        "poblacio_elegible": POBLACIO_ELEGIBLE,
        "origen": ORIGEN,
    }
    recollides = {}
    respostes = []
    distribucions = {}
    for recollida, recomptes_fixats in RECOMPTES.items():
        recollida_id = f"setembre-{recollida}"
        voluntaria = recollida == "voluntaria"
        recollides[recollida] = {
            "recollida_id": recollida_id,
            "poblacio_id": poblacio["poblacio_id"],
            "periode": PERIODE,
            "modalitat": "voluntaria" if voluntaria else "obligatoria_simulada",
            "canal": "qr_compartit" if voluntaria else None,
            "unicitat": "sense_verificar" if voluntaria else "premissa_simulada",
            "origen": ORIGEN,
        }
        puntuacions = [
            puntuacio
            for puntuacio, recompte in zip(ESCALA, recomptes_fixats)
            for _ in range(recompte)
        ]
        rng.shuffle(puntuacions)
        for index, puntuacio in enumerate(puntuacions, start=1):
            respostes.append({
                "response_id": f"{recollida_id}-{index:04}",
                "recollida_id": recollida_id,
                "pregunta_id": "clima_setembre",
                "puntuacio": puntuacio,
                "origen": ORIGEN,
            })

        base = len(puntuacions)
        frequencia = Counter(puntuacions)
        recomptes = [frequencia[puntuacio] for puntuacio in ESCALA]
        if min(recomptes) < LLINDAR_PUBLICACIO:
            raise ValueError("La distribució històrica conté cel·les protegides")
        distribucions[recollida] = {
            "base": base,
            "recomptes_1_a_5": recomptes,
            "pct_1_a_5": [round(100 * recompte / base, 1) for recompte in recomptes],
            "pct_extrems": round(100 * (recomptes[0] + recomptes[-1]) / base, 1),
        }

    referencia = distribucions["referencia"]
    voluntaria = distribucions["voluntaria"]
    extrems_ref = sum(referencia["recomptes_1_a_5"][index] for index in (0, -1))
    extrems_vol = sum(voluntaria["recomptes_1_a_5"][index] for index in (0, -1))
    resum = {
        "origen": ORIGEN,
        "font": FONT,
        "periode": PERIODE,
        "pregunta_id": "clima_setembre",
        "pregunta": PREGUNTA,
        "escala": list(ESCALA),
        "distribucions": distribucions,
        "taxa_aparent_voluntaria_pct": round(100 * voluntaria["base"] / POBLACIO_ELEGIBLE, 1),
        "diferencia_extrems_pp": round(
            100 * (extrems_vol / voluntaria["base"] - extrems_ref / referencia["base"]), 1,
        ),
        "limitacio": (
            "El QR compartit compta trameses vàlides i deixa la unicitat sense verificar. "
            "El contrast de setembre aporta context sobre el risc d’autoselecció i no resposta. "
            "La pregunta és independent de les onades sobre el canvi de torns."
        ),
    }
    return {
        "poblacio": poblacio,
        "recollides": recollides,
        "respostes": respostes,
        "resum": resum,
        "casos_privacitat": casos_qa_calibracio(),
    }


def exporta_calibracio(destinacio: Path, seed: int, public_id: str = "planta-catalunya") -> None:
    """Desa la població, les trameses i els agregats en fitxers separats."""
    dades = gen_calibracio(seed, public_id)
    destinacio.mkdir(parents=True, exist_ok=True)
    for nom, files in (
        ("calibracio_poblacio.csv", [dades["poblacio"]]),
        ("calibracio_respostes.csv", dades["respostes"]),
    ):
        with (destinacio / nom).open("w", encoding="utf-8", newline="") as fitxer:
            escriptor = csv.DictWriter(fitxer, fieldnames=files[0].keys(), lineterminator="\n")
            escriptor.writeheader()
            escriptor.writerows(files)

    exportacio_publica = {
        "poblacio": dades["poblacio"],
        "recollides": dades["recollides"],
        "resum": dades["resum"],
        "casos_qa_sintetics": {
            nom: cas["vista_publicable"] for nom, cas in dades["casos_privacitat"].items()
        },
    }
    with (destinacio / "calibracio_resum.json").open("w", encoding="utf-8", newline="\n") as fitxer:
        json.dump(exportacio_publica, fitxer, ensure_ascii=False, indent=2)
        fitxer.write("\n")
