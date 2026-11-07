"""Agregats publicables de les trameses sintètiques del canvi de torns."""

from collections import Counter, defaultdict


LLINDAR = 10
ITEMS_FIXOS = ("comprensio", "suport")
ESCALA = ("1", "2", "3", "4", "5")
DIFICULTATS = ("funcionament", "antelacio", "canvis", "necessitats_personals", "altra", "cap")
CAMPS_ONADA = (
    "escenari", "serie_id", "campanya_id", "versio_id", "onada", "periode_inici",
    "periode_fi", "public_id", "protocol_id", "canal", "origen",
)
LIMIT_COMPARACIO = (
    "Mostres voluntàries sense aparellar. La no resposta, l’autoselecció "
    "i els canvis de composició poden afectar el contrast."
)


def _clau(onada):
    return onada["escenari"], onada["campanya_id"]


def _pct(recompte, base):
    return round(100 * recompte / base, 1)


def _protegit(recompte):
    return 0 < recompte < LLINDAR


def _agrupa_trameses(onades, respostes):
    metadades = {_clau(onada): onada for onada in onades}
    camps_analitics = (
        "torn", *ITEMS_FIXOS, "dificultat_principal", "arribada_resum",
        "estat_aclariment", "tema_aclariment", "aclariment_comprensio",
    )
    trameses = {}
    conflictes = set()
    for resposta in respostes:
        clau = resposta.get("escenari"), resposta.get("campanya_id")
        if not all(isinstance(valor, str) for valor in clau):
            continue
        onada = metadades.get(clau)
        response_id = resposta.get("response_id")
        if (
            onada is None
            or resposta.get("versio_id") != onada["versio_id"]
            or resposta.get("origen") != "sintetic"
            or not isinstance(response_id, str)
            or not response_id.strip()
        ):
            continue
        # Un reimport idèntic compta una vegada. Un ID amb dades en conflicte s'exclou.
        clau_tramesa = (*clau, response_id)
        contingut = {}
        for camp in camps_analitics:
            valor = resposta.get(camp)
            contingut[camp] = valor if isinstance(valor, str) else ""
        if onada["onada"] == 1:
            contingut["arribada_resum"] = ""
        if trameses.setdefault(clau_tramesa, contingut) != contingut:
            conflictes.add(clau_tramesa)

    agrupades = defaultdict(list)
    for clau_tramesa, resposta in trameses.items():
        tancada_valida = (
            any(resposta[item] in (*ESCALA, "no_valorable") for item in ITEMS_FIXOS)
            or resposta["dificultat_principal"] in (*DIFICULTATS, "no_us", "prefereixo_no_respondre")
            or resposta["arribada_resum"] in ("si", "no", "no_ho_se")
        )
        if clau_tramesa not in conflictes and tancada_valida:
            agrupades[clau_tramesa[:2]].append(resposta)
    return agrupades


def _binari(prefix, recompte, base, total, exigeix_mencions=False):
    """Protegeix la base i les dues categories que es podrien deduir del percentatge."""
    base_publicable = base >= LLINDAR and not _protegit(total - base)
    percentatge_publicable = base_publicable and not any(
        _protegit(categoria) for categoria in (recompte, base - recompte)
    ) and (not exigeix_mencions or recompte >= LLINDAR)
    return {
        f"{prefix}_base": base if base_publicable else None,
        f"{prefix}_n": recompte if percentatge_publicable else None,
        f"{prefix}_pct": _pct(recompte, base) if percentatge_publicable else None,
        f"{prefix}_estat": "publicable" if percentatge_publicable else "no_publicable",
    }


def _escala(item, respostes):
    recomptes = {valor: sum(resposta[item] == valor for resposta in respostes) for valor in ESCALA}
    base = sum(recomptes.values())
    no_valorable = sum(resposta[item] == "no_valorable" for resposta in respostes)
    altres = len(respostes) - base - no_valorable
    favorable = _binari(item, recomptes["4"] + recomptes["5"], base, len(respostes))
    publica_especial = no_valorable >= LLINDAR and not any(
        _protegit(recompte) for recompte in (altres, len(respostes) - no_valorable)
    )
    publica_mitjana = favorable[f"{item}_n"] is not None and not any(
        _protegit(recompte) for recompte in recomptes.values()
    )
    return {
        f"{item}_base_escala": favorable[f"{item}_base"],
        f"{item}_favorable_n": favorable[f"{item}_n"],
        f"{item}_favorable_pct": favorable[f"{item}_pct"],
        f"{item}_mitjana": (
            round(sum(int(valor) * n for valor, n in recomptes.items()) / base, 2)
            if publica_mitjana else None
        ),
        f"{item}_no_valorable": no_valorable if publica_especial else None,
        f"{item}_estat": favorable[f"{item}_estat"],
    }


def _composicio(respostes, poblacio_elegible, poblacio_torns):
    torns = Counter(resposta["torn"] for resposta in respostes)
    coneguts = torns["dia"] + torns["nit"]
    publica_mostra = min(torns["dia"], torns["nit"]) >= LLINDAR and not _protegit(
        len(respostes) - coneguts
    )
    publica_poblacio = (
        poblacio_torns is not None
        and all(
            type(poblacio_torns.get(torn)) is int and poblacio_torns[torn] >= LLINDAR
            for torn in ("dia", "nit")
        )
        and poblacio_torns["dia"] + poblacio_torns["nit"] == poblacio_elegible
    )
    dia_mostra = _pct(torns["dia"], coneguts) if publica_mostra else None
    dia_poblacio = _pct(poblacio_torns["dia"], poblacio_elegible) if publica_poblacio else None
    return {
        "base_torns_declarats": coneguts if publica_mostra else None,
        "pes_dia_mostra_pct": dia_mostra,
        "pes_dia_poblacio_pct": dia_poblacio,
        "diferencia_pes_dia_pp": (
            round(100 * (torns["dia"] / coneguts - poblacio_torns["dia"] / poblacio_elegible), 1)
            if publica_mostra and publica_poblacio else None
        ),
    }


def resumeix_campanyes(onades, respostes, poblacio_torns=None):
    """Retorna una fila global per onada. La població opcional per torn és del mateix públic."""
    if len({onada["public_id"] for onada in onades}) > 1:
        poblacio_torns = None
    agrupades = _agrupa_trameses(onades, respostes)
    agregats = []
    for onada in onades:
        mostra = agrupades[_clau(onada)]
        total = len(mostra)
        poblacio = onada.get("poblacio_elegible")
        if type(poblacio) is not int or poblacio <= 0:
            poblacio = None
        if total < LLINDAR:
            estat_participacio = "no_publicable"
        elif poblacio is None:
            estat_participacio = "sense_denominador"
        elif total > poblacio:
            estat_participacio = "trameses_superen_elegibles"
        else:
            estat_participacio = "publicable"
        agregat = {
            **{camp: onada[camp] for camp in CAMPS_ONADA},
            "poblacio_elegible": poblacio,
            "respostes_valides": total if total >= LLINDAR else None,
            "participacio_aparent_pct": _pct(total, poblacio) if estat_participacio == "publicable" else None,
            "participacio_estat": estat_participacio,
            **_composicio(mostra, poblacio, poblacio_torns),
        }
        for item in ITEMS_FIXOS:
            agregat.update(_escala(item, mostra))

        dificultats = Counter(resposta["dificultat_principal"] for resposta in mostra)
        base_dificultats = sum(dificultats[codi] for codi in DIFICULTATS)
        agregat.update(_binari("dificultat_funcionament", dificultats["funcionament"], base_dificultats, total))
        textos = [
            resposta for resposta in mostra
            if resposta["estat_aclariment"] == "valid" and resposta["aclariment_comprensio"]
        ]
        agregat.update(_binari(
            "tema_instruccions_disperses",
            sum(resposta["tema_aclariment"] == "instruccions_disperses" for resposta in textos),
            len(textos),
            total,
            exigeix_mencions=True,
        ))
        # Proporció de totes les trameses vàlides que declaren haver rebut el resum.
        arribada = sum(resposta["arribada_resum"] == "si" for resposta in mostra)
        base_arribada = total if onada["onada"] > 1 else 0
        agregat.update(_binari("arribada_resum_si", arribada, base_arribada, total))
        if onada["onada"] == 1:
            agregat["arribada_resum_si_estat"] = "no_aplicable"
        agregats.append(agregat)
    return agregats


def _motiu_indisponible(anterior, actual, abans, despres, item):
    if not anterior["public_id"] or anterior["public_id"] != actual["public_id"]:
        return "Públic elegible diferent o desconegut"
    if not anterior["protocol_id"] or any(anterior[camp] != actual[camp] for camp in ("protocol_id", "canal")):
        return "Protocol de recollida diferent o desconegut"
    signatura = f"signatura_{item}"
    if not anterior.get(signatura) or anterior[signatura] != actual.get(signatura):
        return "Definició de la pregunta diferent o desconeguda"
    if any(agregat[f"{item}_favorable_n"] is None for agregat in (abans, despres)):
        return "Mètrica no publicable en alguna onada"
    return None


def compara_onades(onades, agregats):
    """Compara cada onada amb l'anterior i amb la inicial, dins del mateix escenari."""
    per_onada = {_clau(agregat): agregat for agregat in agregats}
    series = defaultdict(list)
    for onada in onades:
        series[onada["escenari"], onada["serie_id"]].append(onada)

    files = []
    for (escenari, serie_id), onades_serie in series.items():
        ordenades = sorted(onades_serie, key=lambda onada: onada["onada"])
        for index, actual in enumerate(ordenades[1:], start=1):
            referencies = [(ordenades[index - 1], "onada_anterior")]
            if index > 1:
                referencies.append((ordenades[0], "onada_inicial"))
            for anterior, referencia in referencies:
                abans, despres = per_onada[_clau(anterior)], per_onada[_clau(actual)]
                for item in ITEMS_FIXOS:
                    motiu = _motiu_indisponible(anterior, actual, abans, despres, item)
                    base_abans = abans[f"{item}_base_escala"] if motiu is None else None
                    base_despres = despres[f"{item}_base_escala"] if motiu is None else None
                    delta = (
                        round(100 * (
                            despres[f"{item}_favorable_n"] / base_despres
                            - abans[f"{item}_favorable_n"] / base_abans
                        ), 1)
                        if motiu is None else None
                    )
                    files.append({
                        "origen": actual["origen"],
                        "escenari": escenari,
                        "serie_id": serie_id,
                        "public_id": actual["public_id"],
                        "referencia": referencia,
                        "campanya_origen_id": anterior["campanya_id"],
                        "campanya_desti_id": actual["campanya_id"],
                        "onada_origen": anterior["onada"],
                        "onada_desti": actual["onada"],
                        "periode_origen_inici": anterior["periode_inici"],
                        "periode_origen_fi": anterior["periode_fi"],
                        "periode_desti_inici": actual["periode_inici"],
                        "periode_desti_fi": actual["periode_fi"],
                        "pregunta_id": item,
                        "estat": "indisponible" if motiu else "comparable_amb_limits",
                        "motiu_o_limit": motiu or LIMIT_COMPARACIO,
                        "base_origen": base_abans,
                        "base_desti": base_despres,
                        "favorable_origen_pct": abans[f"{item}_favorable_pct"] if motiu is None else None,
                        "favorable_desti_pct": despres[f"{item}_favorable_pct"] if motiu is None else None,
                        "delta_favorable_pp": delta,
                    })
    return files
