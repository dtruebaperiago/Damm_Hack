"""Genera els fitxers reproduïbles per a la demo d’Escolta activa."""

import argparse
import csv
import json
from pathlib import Path

from calcula_kpi import compara_onades, resumeix_campanyes
from genera_calibracio import exporta_calibracio, gen_calibracio
from genera_campanyes import POBLACIO_TORNS, PUBLIC_ID, genera_campanyes


LLAVOR_DEMO = 20261107
SORTIDA = Path(__file__).resolve().parent / 'output'


def escriu_csv(cami, files):
    with cami.open('w', encoding='utf-8-sig', newline='') as fitxer:
        escriptor = csv.DictWriter(fitxer, fieldnames=list(files[0]))
        escriptor.writeheader()
        escriptor.writerows(files)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--llavor', type=int, default=LLAVOR_DEMO)
    parser.add_argument('--sortida', type=Path, default=SORTIDA)
    parser.add_argument('--sense-grafics', action='store_true')
    args = parser.parse_args()

    if args.sense_grafics and any(args.sortida.glob('*.png')):
        parser.error('Indica amb --sortida una carpeta sense gràfics previs per mantenir coherents les dades i els PNG.')

    if not args.sense_grafics:
        try:
            from grafics import grafic_calibracio, grafic_seguiment
        except ModuleNotFoundError as error:
            if error.name != 'matplotlib':
                raise
            parser.error('Instal·la Matplotlib o executa amb --sense-grafics.')

    args.sortida.mkdir(parents=True, exist_ok=True)
    onades, respostes = [], []
    for escenari in ('millora', 'estable'):
        noves_onades, noves_respostes = genera_campanyes(args.llavor, escenari)
        onades.extend(noves_onades)
        respostes.extend(noves_respostes)

    kpis = resumeix_campanyes(onades, respostes, POBLACIO_TORNS)
    comparacions = compara_onades(onades, kpis)
    escriu_csv(args.sortida / 'prova_onades.csv', onades)
    escriu_csv(args.sortida / 'prova_trameses.csv', respostes)
    escriu_csv(args.sortida / 'kpi_onades.csv', kpis)
    escriu_csv(args.sortida / 'comparacions_kpi.csv', comparacions)
    (args.sortida / 'demo_web.json').write_text(json.dumps({
        'onades': onades, 'kpis': kpis, 'comparacions': comparacions,
    }, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    exporta_calibracio(args.sortida, args.llavor, PUBLIC_ID)

    if not args.sense_grafics:
        grafic_calibracio(args.sortida, gen_calibracio(args.llavor, PUBLIC_ID)['resum'])
        grafic_seguiment(args.sortida, kpis)

    print(f'Llavor {args.llavor} · {len(onades)} onades · {len(respostes)} trameses · {args.sortida}')


if __name__ == '__main__':
    main()
