"""Gràfics agregats per al relat de demo."""

from matplotlib.figure import Figure
from matplotlib.ticker import PercentFormatter


FONS = '#f7f6f2'
TINTA = '#1e292d'
SECUNDARI = '#4a5b62'
QUADRICULA = '#dadfdd'
VERD = '#007868'
COURE = '#a14b25'


def pct(valor):
    return '—' if valor is None else f'{valor:.1f}%'.replace('.', ',')


def base(valor):
    return '—' if valor is None else f'n={valor}'


def capcalera(fig, etiqueta, titol, subtitol):
    fig.text(.075, .935, etiqueta, fontsize=11, color=VERD, fontweight='bold')
    fig.text(.075, .858, titol, fontsize=29, color=TINTA, fontweight='bold')
    fig.text(.075, .807, subtitol, fontsize=12, color=SECUNDARI)


def estil_eixos(ax, limit):
    ax.set_facecolor(FONS)
    ax.set_ylim(0, limit)
    ax.yaxis.set_major_formatter(PercentFormatter(xmax=100, decimals=0))
    ax.set_axisbelow(True)
    ax.grid(axis='y', color=QUADRICULA, linewidth=.8)
    ax.spines[:].set_visible(False)
    ax.tick_params(length=0, pad=7, colors=SECUNDARI, labelsize=10)


def grafic_calibracio(sortida, resum):
    fig = Figure(figsize=(12, 7), facecolor=FONS)
    capcalera(fig, 'ESCOLTA ACTIVA / CALIBRACIÓ DE SETEMBRE / DADES SINTÈTIQUES',
              'Qui respon canvia la distribució', f'«{resum["pregunta"]}» · Fàbrica fictícia, 600 persones elegibles')
    ax = fig.add_axes((.115, .265, .81, .44))
    estil_eixos(ax, 55)
    ax.set_yticks(range(0, 51, 10))

    for clau, nom, desplacament, color in (
        ('referencia', 'Referència completa', -.19, VERD),
        ('voluntaria', 'Voluntària per QR', .19, COURE),
    ):
        dades = resum['distribucions'][clau]
        percentatges = dades['pct_1_a_5']
        barres = ax.bar([i + desplacament for i in range(1, 6)], percentatges,
                        width=.34, color=color, label=f'{nom} ({base(dades["base"])})')
        ax.bar_label(barres, labels=[pct(p) for p in percentatges], padding=5,
                     color=TINTA, fontsize=10)

    ax.set_xticks(range(1, 6))
    ax.legend(loc='lower left', bbox_to_anchor=(-.015, 1.02), frameon=False, ncol=2,
              labelcolor=TINTA, fontsize=11)
    ax.set_xlabel('Puntuació', color=SECUNDARI, labelpad=9)
    referencia = pct(resum['distribucions']['referencia']['pct_extrems'])
    voluntaria = pct(resum['distribucions']['voluntaria']['pct_extrems'])
    diferencia = f'{resum["diferencia_extrems_pp"]:.1f}'.replace('.', ',')
    taxa = pct(resum['taxa_aparent_voluntaria_pct'])
    fig.text(.075, .128, f'Extrems (1 i 5)  {referencia} → {voluntaria}  (+{diferencia} pp)',
             fontsize=16, fontweight='bold', color=TINTA)
    fig.text(.075, .077, f'QR compartit · {taxa} de participació aparent. El recompte és de trameses vàlides.',
             fontsize=10.5, color=SECUNDARI)
    fig.savefig(sortida / 'calibracio-setembre.png', dpi=160, facecolor=FONS)


def grafic_seguiment(sortida, kpis):
    millora = [fila for fila in kpis if fila['escenari'] == 'millora']
    estable = [fila for fila in kpis if fila['escenari'] == 'estable']
    fig = Figure(figsize=(12, 7), facecolor=FONS)
    capcalera(fig, 'ESCOLTA ACTIVA / SEGUIMENT / DADES SINTÈTIQUES',
              'Entendre els torns i saber on demanar ajuda',
              'Fàbrica fictícia · 600 persones elegibles · QR voluntari · Mostres per onada')

    for esquerra, (item, titol) in zip((.105, .57), (('comprensio', 'Comprensió'), ('suport', 'Canal de suport'))):
        ax = fig.add_axes((esquerra, .315, .36, .37))
        estil_eixos(ax, 100)
        ax.set_yticks(range(0, 101, 20))
        ax.set_title(titol, loc='left', color=TINTA, fontsize=14, fontweight='bold', pad=11)
        ax.set_xlim(.72, 3.28)
        ax.set_xticks([1, 2, 3], ['Inicial', 'Seguiment 1', 'Seguiment 2'])
        ax.axvline(1.5, linestyle=':', color='#829198', linewidth=1)
        for files, color, estil, marca in ((estable, COURE, '--', 'D'), (millora, VERD, '-', 'o')):
            punts = [(fila['onada'], fila[f'{item}_favorable_pct']) for fila in files]
            ax.plot(*zip(*punts), color=color, linestyle=estil, marker=marca, linewidth=2, markersize=6)

        for fila in millora:
            resultat = fila[f'{item}_favorable_pct']
            if resultat is not None:
                mostra = base(fila[f'{item}_base_escala'])
                ax.annotate(f'{pct(resultat)}\n{mostra}', (fila['onada'], resultat),
                            xytext=(0, 9), textcoords='offset points', ha='center', va='bottom',
                            color=VERD, fontsize=9, fontweight='bold')

    fig.text(.105, .748, '●  Escenari amb millora simulada', color=VERD, fontsize=11, fontweight='bold')
    fig.text(.535, .748, '◆  Escenari sense efecte simulat', color=COURE, fontsize=11, fontweight='bold')
    fig.text(.075, .223, 'Acció després de la consulta inicial · Resum a l’inici de torn i instruccions en un sol lloc.',
             fontsize=11, color=TINTA, fontweight='bold')
    taxes = '  /  '.join(pct(fila['participacio_aparent_pct']) for fila in millora)
    fig.text(.075, .175, f'Participació aparent a l’escenari de millora  {taxes}  ·  Trameses vàlides / 600.',
             fontsize=10.5, color=SECUNDARI)
    fig.text(.075, .109, 'Favorable = 4–5 entre respostes d’escala vàlides. Les bases etiquetades són les de la sèrie amb millora.',
             fontsize=10, color=SECUNDARI)
    fig.text(.075, .072, 'El QR compartit deixa la unicitat sense verificar. L’autoselecció pot fer variar els resultats de cada onada.',
             fontsize=10, color=SECUNDARI)
    if any(fila[f'{item}_favorable_pct'] is None for fila in kpis for item in ('comprensio', 'suport')):
        fig.text(.075, .035, 'Els buits corresponen a resultats protegits pel llindar de privacitat.',
                 fontsize=10, color=SECUNDARI)
    fig.savefig(sortida / 'seguiment-kpi.png', dpi=160, facecolor=FONS)
