# Pipeline di lavorazione

Cinque fasi, sempre in quest'ordine, per ogni contenuto di ogni progetto.
Non saltare la ricerca e non scrivere a memoria.

## Fase 1 — Ricerca

Cerca sul web `<argomento> <categoria>`. Leggi per intero gli URL indicati nelle fonti
dell'ordine: hanno priorità sui risultati generici di ricerca.

Produci e salva in `ricerca.json`:

- `sommario` — 3-4 paragrafi di panoramica
- `puntiFondamentali` — 8-12 affermazioni verificabili ricavate dalle fonti, con numeri,
  date, prezzi e specifiche quando presenti. È ciò che rende un articolo citabile dai
  motori generativi. Non inventare dati assenti dalle fonti.
- `keywordsCorrelate` — 15-20 keyword SEO in italiano, ordinate per rilevanza,
  incluse le varianti long-tail
- `entita` — 5-10 entità nominate concrete (marche, modelli, standard tecnici, persone,
  luoghi) citate nelle fonti
- `domandeUtenti` — 4-6 domande reali in forma interrogativa naturale
- `fonti` — per ciascuna: url, titolo, estratto

Prima di procedere manda in chat un riassunto di 5 righe e l'elenco delle fonti trovate.

## Fase 2 — Generazione

Scrivi il contenuto seguendo il modulo del suo tipo, in `moduli/<tipo>.md`.
Se il modulo rimanda a un template, compila quel template e non inventarne la struttura.

## Fase 3 — Revisione

Rileggi la bozza confrontandola con le fonti e correggi:

1. affermazioni fattuali non supportate dalle fonti o in contraddizione con esse
2. dati, date, cifre e nomi propri errati o imprecisi
3. errori di grammatica, concordanza e punteggiatura in italiano
4. passaggi vaghi o riempitivi che non aggiungono informazione
5. incoerenze rispetto al tono dichiarato

Massimo 12 correzioni, dalle più gravi alle meno gravi. Non correggere per gusto stilistico
un testo già corretto. Assegna un `punteggioEditoriale` da 0 a 100 su accuratezza, chiarezza
e utilità, ed elenca le correzioni applicate, una riga ciascuna.

## Fase 4 — SEO e GEO

Applica `_comune/01-seo-geo.md`. Se un controllo fallisce, genera **solo** la sezione mancante
e reinseriscila al posto giusto: non riscrivere il resto del testo, che è già stato revisionato.
Poi ricontrolla e ricalcola il punteggio.

## Fase 5 — Consegna

Applica `_comune/02-consegna.md`.

## Regole valide in tutte le fasi

- Ogni affermazione deve poter essere ricondotta a una fonte della fase 1.
- Se un dato manca, scrivi il contenuto senza quel dato invece di inventarlo.
- Non inventare mai URL, né interni al sito né esterni.
- Quando un'informazione viene da una fonte, attribuiscila nel testo
  ("secondo i dati di…", "il produttore dichiara…").
