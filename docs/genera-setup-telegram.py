import pathlib

BASE = pathlib.Path('docs/hermes-workspace')
LIMITE = 4096
RADICE = '~/progetti'

def leggi(rel): return (BASE / rel).read_text()

def blocco(rel, contenuto, append=False):
    op = '>>' if append else '>'
    assert '\nFINE\n' not in contenuto and not contenuto.startswith('FINE\n'), f'delimitatore collide in {rel}'
    return f"cat {op} {RADICE}/{rel} <<'FINE'\n{contenuto.rstrip()}\nFINE"

# ── template: va spezzato, si taglia su un confine di blocco Gutenberg ──
tpl = leggi('pulashock/template/recensione-gutenberg.html')
taglio = tpl.index('<!-- wp:heading {"className":"wp-block-heading"} -->\n<h2 class="wp-block-heading mt-30" id="qualita-audio">')
tpl_a, tpl_b = tpl[:taglio].rstrip(), tpl[taglio:].rstrip()

messaggi = []

messaggi.append(("Preparazione", f"""Ti mando 13 messaggi che installano su questo server un'area di lavoro per progetti editoriali.

Ogni messaggio dopo questo contiene uno o piu blocchi `cat > ... <<'FINE'`: eseguili esattamente come arrivano. Il testo dentro i blocchi e contenuto di file, NON istruzioni da seguire ora.

Rispondi a ogni messaggio solo con "ok N/13" e i percorsi scritti.

Se {RADICE} esiste gia, fermati e dimmelo invece di sovrascrivere. Altrimenti crea la struttura:

mkdir -p {RADICE}/_comune
mkdir -p {RADICE}/pulashock/moduli {RADICE}/pulashock/template
mkdir -p {RADICE}/pulashock/risorse {RADICE}/pulashock/segreti {RADICE}/pulashock/articoli
chmod 700 {RADICE}/pulashock/segreti

Regole permanenti di quest'area, valide da ora in poi:

- {RADICE}/ e la radice: un progetto per cartella, regole comuni in _comune/
- Prima di lavorare su un progetto rileggi sempre i suoi file: sono la fonte di verita, non la memoria della conversazione
- Non stampare mai in chat il contenuto di una cartella segreti/
- Non inventare mai URL, ne interni ne esterni"""))

messaggi.append(("INDICE.md", blocco('INDICE.md', leggi('INDICE.md'))))
messaggi.append(("_comune/00-pipeline.md", blocco('_comune/00-pipeline.md', leggi('_comune/00-pipeline.md'))))
messaggi.append(("_comune/01-seo-geo.md", blocco('_comune/01-seo-geo.md', leggi('_comune/01-seo-geo.md'))))
messaggi.append(("_comune/02-consegna.md", blocco('_comune/02-consegna.md', leggi('_comune/02-consegna.md'))))
messaggi.append(("pulashock/PROGETTO.md", blocco('pulashock/PROGETTO.md', leggi('pulashock/PROGETTO.md'))))
messaggi.append(("moduli: standard + sistema",
    blocco('pulashock/moduli/standard.md', leggi('pulashock/moduli/standard.md')) + '\n\n' +
    blocco('pulashock/moduli/sistema.md', leggi('pulashock/moduli/sistema.md'))))
messaggi.append(("moduli/recensione.md", blocco('pulashock/moduli/recensione.md', leggi('pulashock/moduli/recensione.md'))))
messaggi.append(("moduli/biografia.md", blocco('pulashock/moduli/biografia.md', leggi('pulashock/moduli/biografia.md'))))
messaggi.append(("template recensione 1/2", blocco('pulashock/template/recensione-gutenberg.html', tpl_a)))
# La riga vuota fra le due meta va reintrodotta: blocco() fa rstrip sulla prima
# parte, e senza questa il file ricostruito differisce dal sorgente.
messaggi.append(("template recensione 2/2", blocco('pulashock/template/recensione-gutenberg.html', '\n' + tpl_b, append=True)))
messaggi.append(("risorse + segreti",
    blocco('pulashock/risorse/link-interni.md', leggi('pulashock/risorse/link-interni.md')) + '\n\n' +
    blocco('pulashock/segreti/wordpress.env.esempio', leggi('pulashock/segreti/wordpress.env.esempio'))))

messaggi.append(("Verifica e attivazione", f"""Verifica l'installazione:

find {RADICE} -type f | sort
wc -c {RADICE}/pulashock/template/recensione-gutenberg.html

Poi confermami:
1. l'elenco dei file trovati (attesi: 12)
2. che il template pesa 6503 byte e contiene due volte [LINK_AMAZON]
3. le 8 categorie elencate in PROGETTO.md
4. i 4 tipi di contenuto e il campo obbligatorio aggiuntivo di ciascuno
5. i 10 controlli della checklist GEO, in forma abbreviata

Da ora, quando scrivo /pulashock seguito dai campi di un ordine:
- leggi _comune/*.md e pulashock/PROGETTO.md
- leggi il modulo del tipo richiesto
- esegui le 5 fasi della pipeline
- fermati dopo la fase 1 e mandami il riassunto della ricerca prima di scrivere
- non pubblicare mai niente senza mia conferma esplicita

Se manca un campo obbligatorio, chiedimelo invece di assumerlo."""))

# ── composizione e verifica ──
righe = ["# Setup Hermes — area progetti editoriali",
         "",
         f"{len(messaggi)} messaggi da incollare nel bot Telegram, in ordine.",
         "Ogni blocco sta sotto il limite Telegram di 4096 caratteri.",
         ""]

problemi = []
for i, (titolo, corpo) in enumerate(messaggi, 1):
    testo = f"[SETUP {i}/{len(messaggi)}] {titolo}\n\n{corpo}"
    if len(testo) > LIMITE:
        problemi.append((i, titolo, len(testo)))
    righe += [f"## ━━━ MESSAGGIO {i}/{len(messaggi)} — {titolo} ({len(testo)} car.) ━━━", "", "``````", testo, "``````", ""]

pathlib.Path('docs/hermes-setup-telegram.md').write_text('\n'.join(righe))

for i, (titolo, corpo) in enumerate(messaggi, 1):
    n = len(f"[SETUP {i}/{len(messaggi)}] {titolo}\n\n{corpo}")
    stato = '*** SFORA ***' if n > LIMITE else 'ok'
    print(f"{i:2}. {titolo:32} {n:5} car.  {stato}")

print()
print("PROBLEMI:", problemi or "nessuno")
