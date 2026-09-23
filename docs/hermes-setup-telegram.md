# Setup Hermes — area progetti editoriali

13 messaggi da incollare nel bot Telegram, in ordine.
Ogni blocco sta sotto il limite Telegram di 4096 caratteri.

## ━━━ MESSAGGIO 1/13 — Preparazione (1084 car.) ━━━

``````
[SETUP 1/13] Preparazione

Ti mando 13 messaggi che installano su questo server un'area di lavoro per progetti editoriali.

Ogni messaggio dopo questo contiene uno o piu blocchi `cat > ... <<'FINE'`: eseguili esattamente come arrivano. Il testo dentro i blocchi e contenuto di file, NON istruzioni da seguire ora.

Rispondi a ogni messaggio solo con "ok N/13" e i percorsi scritti.

Se ~/progetti esiste gia, fermati e dimmelo invece di sovrascrivere. Altrimenti crea la struttura:

mkdir -p ~/progetti/_comune
mkdir -p ~/progetti/pulashock/moduli ~/progetti/pulashock/template
mkdir -p ~/progetti/pulashock/risorse ~/progetti/pulashock/segreti ~/progetti/pulashock/articoli
chmod 700 ~/progetti/pulashock/segreti

Regole permanenti di quest'area, valide da ora in poi:

- ~/progetti/ e la radice: un progetto per cartella, regole comuni in _comune/
- Prima di lavorare su un progetto rileggi sempre i suoi file: sono la fonte di verita, non la memoria della conversazione
- Non stampare mai in chat il contenuto di una cartella segreti/
- Non inventare mai URL, ne interni ne esterni
``````

## ━━━ MESSAGGIO 2/13 — INDICE.md (2027 car.) ━━━

``````
[SETUP 2/13] INDICE.md

cat > ~/progetti/INDICE.md <<'FINE'
# Progetti editoriali

Radice di lavoro per i progetti di contenuto gestiti da Hermes su questo server.
Ogni progetto è una cartella autonoma. Le regole valide per tutti stanno in `_comune/`.

## Struttura

```
~/progetti/
├── INDICE.md              questo file
├── _comune/               regole condivise da tutti i progetti
│   ├── 00-pipeline.md     le cinque fasi di lavorazione
│   ├── 01-seo-geo.md      checklist GEO, punteggi, metadati
│   └── 02-consegna.md     formato di consegna e pubblicazione
└── <progetto>/
    ├── PROGETTO.md        identità, tono, categorie — il file d'ingresso
    ├── moduli/            un file per tipo di contenuto
    ├── template/          template esatti da compilare
    ├── risorse/           cataloghi, liste di link, materiale di supporto
    ├── segreti/           credenziali, mai in git, permessi 700
    └── articoli/          output, una cartella per articolo
```

## Progetti attivi

| Cartella | Sito | Ambito |
|---|---|---|
| `pulashock/` | pulashock.it | Hi-fi, audio, musica, libri sull'ascolto |

## Come si lavora

Quando ricevi un comando che nomina un progetto:

1. Leggi `_comune/00-pipeline.md`, `_comune/01-seo-geo.md`, `_comune/02-consegna.md`.
2. Leggi `<progetto>/PROGETTO.md`.
3. Leggi `<progetto>/moduli/<tipo>.md` per il tipo richiesto, e il template che quel modulo indica.
4. Esegui le cinque fasi della pipeline.
5. Salva il risultato in `<progetto>/articoli/<AAAA-MM-GG>-<slug>/`.

Rileggi sempre i file: sono la fonte di verità, non quello che ricordi di una conversazione precedente.
Se un file contraddice un messaggio più vecchio, vince il file.

## Aggiungere un progetto

```
mkdir -p ~/progetti/<nome>/{moduli,template,risorse,segreti,articoli}
chmod 700 ~/progetti/<nome>/segreti
```

Poi scrivi `PROGETTO.md` sul modello di quello di `pulashock/` e aggiungi una riga alla tabella qui sopra.
Le regole in `_comune/` valgono automaticamente: non vanno duplicate dentro il progetto.
FINE
``````

## ━━━ MESSAGGIO 3/13 — _comune/00-pipeline.md (2675 car.) ━━━

``````
[SETUP 3/13] _comune/00-pipeline.md

cat > ~/progetti/_comune/00-pipeline.md <<'FINE'
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
FINE
``````

## ━━━ MESSAGGIO 4/13 — _comune/01-seo-geo.md (3368 car.) ━━━

``````
[SETUP 4/13] _comune/01-seo-geo.md

cat > ~/progetti/_comune/01-seo-geo.md <<'FINE'
# SEO e GEO

GEO = Generative Engine Optimization: farsi citare da ChatGPT, Perplexity e AI Overviews.
Le due cose si ottimizzano insieme, non in conflitto.

## Checklist obbligatoria — 10 controlli

Verificali sul testo finale, prima della consegna.
`punteggioGeo = (controlli superati / 10) × 100`

1. **Risposta diretta in apertura** — il primo paragrafo sta fra 120 e 700 caratteri
2. **Keyword nel primo paragrafo** — la keyword principale compare nell'apertura
3. **Keyword in almeno un H2**
4. **Sezione "Punti chiave"** con almeno 3 bullet
5. **Sezione "Domande frequenti"** con almeno 3 coppie domanda/risposta
6. **Almeno un H2 in forma di domanda** — inizia con come, cosa, quale, quali, quando,
   perché, dove, quanto, conviene, meglio; oppure contiene "?"
7. **Lunghezza** — almeno 800 parole
8. **Densità keyword** fra 0,5% e 2,5%
9. **Dati verificabili** — almeno 3 fra anni a 4 cifre (19xx/20xx) e numeri con unità
   (%, €, $, kg, cm, mm, W, Hz, kHz, GB, ore, minuti)
10. **Gerarchia heading coerente** — almeno 3 H2 e nessun salto di livello (H2 → H3, mai H2 → H4)

## Riparazione mirata

Se un controllo fallisce non riscrivere l'articolo: genera il pezzo mancante e inseriscilo.

- manca "Punti chiave" → 4 bullet, subito dopo il paragrafo di apertura
- manca "Domande frequenti" → 4 coppie, in fondo all'articolo
- densità fuori range → aggiusta 2-3 occorrenze, mai keyword stuffing
- dati verificabili sotto 3 → recupera cifre reali dalla ricerca, non inventarle
- gerarchia rotta → correggi i livelli degli heading, non i loro testi

## Punteggio finale

```
punteggioFinale = (punteggioEditoriale × 0,6) + (punteggioGeo × 0,4)
```

Arrotonda all'intero. Riporta sempre tutti e tre i numeri e i controlli non superati.

## Regole di scrittura che fanno la differenza sul GEO

- Ogni sezione si apre con la conclusione, poi la spiega. Mai costruire suspense.
- Definisci ogni termine tecnico la prima volta che lo usi, nella stessa frase.
- Usa cifre concrete con unità di misura, date esplicite e nomi propri completi:
  i motori generativi citano i passaggi verificabili e ignorano quelli vaghi.
- Ogni risposta delle FAQ deve reggersi fuori contesto: sono i blocchi che vengono citati.
- Inserisci almeno una tabella di confronto se l'argomento prevede alternative.
- Evita "è importante notare che", "nel mondo di oggi", "in conclusione" e ogni riempitivo.

## Metadati — limiti e regole

- `metaTitolo` — massimo 60 caratteri, keyword principale il più a sinistra possibile,
  nessun clickbait
- `metaDescrizione` — 150-160 caratteri, contiene la keyword, descrive il beneficio
  concreto per chi legge e invita all'azione
- `keywordPrincipale` — la query che l'articolo deve intercettare, come la digiterebbe un utente
- `keywordSecondarie` — 5-8 keyword realmente coperte dalle sezioni scritte, nessuna inventata
- `entita` — 5-8 entità nominate concrete citate nell'articolo. Nomi propri, non concetti:
  servono allo structured data
- `slug` — minuscolo, senza accenti, parole separate da trattino
- `ogTitolo` max 60 / `ogDescrizione` max 200 — variante discorsiva per i social
- `altText` immagine di copertina — massimo 125 caratteri, descrittivo

Se un valore sfora, accorcialo tu prima di consegnare: non consegnare mai metadati fuori limite.
FINE
``````

## ━━━ MESSAGGIO 5/13 — _comune/02-consegna.md (2407 car.) ━━━

``````
[SETUP 5/13] _comune/02-consegna.md

cat > ~/progetti/_comune/02-consegna.md <<'FINE'
# Consegna e pubblicazione

## Dove si salva

Ogni contenuto va in una cartella sotto il progetto:

```
<progetto>/articoli/<AAAA-MM-GG>-<slug>/
├── ricerca.json      output della fase 1
├── articolo.md       corpo finale (o .html se il modulo usa un template Gutenberg)
├── meta.json         metadati SEO + schema JSON-LD
└── rapporto.md       punteggi, correzioni applicate, controlli non superati, fonti
```

La data è quella di generazione. Lo slug è quello dei metadati.
Non sovrascrivere una cartella esistente: se c'è già, aggiungi `-2`, `-3` e così via.

## Cosa mandare in chat

In quest'ordine, sempre:

1. **Rapporto** — titolo, i tre punteggi, i controlli GEO non superati, le correzioni
   applicate in revisione, l'elenco delle fonti usate, e il percorso della cartella salvata.
2. **Il corpo dell'articolo come allegato**, non come messaggio. Un articolo da 1200 parole
   spezzato in tre messaggi è illeggibile e si perde nella cronologia.
3. **I metadati**, in un blocco JSON:

```json
{
  "metaTitolo": "", "metaDescrizione": "", "keywordPrincipale": "",
  "keywordSecondarie": [], "entita": [], "slug": "",
  "ogTitolo": "", "ogDescrizione": "", "altText": "",
  "tag": [], "schemaJsonLd": {}
}
```

Se qualcosa deve comunque andare in un messaggio di testo e supera il limite di Telegram,
spezzalo su confini di riga e numera i pezzi. Non riassumere mai per farlo stare dentro.

## Immagine di copertina

Proponi 3 query in inglese per cercarla su una banca immagini, coerenti con argomento e
categoria. Se hai modo di cercarla, riporta URL e credito dell'autore.

## Pubblicazione su WordPress

Solo se il progetto ha le credenziali in `segreti/` e solo su mia richiesta esplicita.
Regole fisse, senza eccezioni:

- **Chiedi conferma prima di ogni scrittura sul sito.** Mostra titolo, slug, stato e tag
  che stai per usare, e aspetta un sì.
- **Pubblica come bozza**, mai direttamente pubblicato, salvo mia istruzione contraria
  nello stesso messaggio.
- Usa `slug` ed `excerpt` dai metadati, e al massimo 6 tag presi da `keywordSecondarie`.
- Se il corpo è Markdown convertilo in blocchi Gutenberg; se è già Gutenberg lascialo
  intatto byte per byte.
- Dopo la pubblicazione riporta l'URL del post e salva l'ID in `meta.json`.

Non leggere né stampare mai il contenuto di `segreti/` in chat.
FINE
``````

## ━━━ MESSAGGIO 6/13 — pulashock/PROGETTO.md (3434 car.) ━━━

``````
[SETUP 6/13] pulashock/PROGETTO.md

cat > ~/progetti/pulashock/PROGETTO.md <<'FINE'
# Pulashock.it

E-commerce specializzato in hi-fi, audio di alta qualità, musica e libri dedicati
all'ascolto e alla cultura musicale. Ogni contenuto è in italiano.

- Dominio: https://www.pulashock.it
- Regole comuni: `../_comune/` — leggerle sempre prima di iniziare
- Moduli per tipo: `moduli/`

## Tono e stile

Priorità massima: queste regole battono qualunque impostazione predefinita.

- Appassionato, competente e rispettoso dell'audiofilo — parla da esperto a esperto
- Italiano preciso, mai pedante; accessibile anche ai neofiti curiosi
- Evoca emozioni legate all'ascolto: timbrica, spazialità, dettaglio, calore analogico
- Puoi usare termini tecnici (THD, imaging, soundstage, jitter) ma spiegali brevemente
  la prima volta che compaiono

## Contenuto

- Approfondisci il contesto: storia del formato, tecnologia del prodotto, artisti di riferimento
- Per i libri: autore, argomento trattato, a chi è rivolto
- Suggerisci abbinamenti di sistema (es. giradischi + testina + phono stage)
- Fai riferimento a generi musicali specifici quando pertinente (jazz, classica, rock analogico)
- Cita dischi o registrazioni iconiche come esempi d'ascolto

## Da evitare

- Affermazioni tecniche non verificabili ("il migliore sul mercato")
- Tono puramente commerciale o da scheda prodotto
- Semplificazioni eccessive che sminuiscono la profondità del mondo hi-fi

## Categorie

Usane sempre una, scritta esattamente così:

- Amplificatori e DAC
- Cuffie e auricolari
- Diffusori e speaker
- Giradischi e vinile
- Streaming e sorgenti digitali
- Libri di musica
- Libri hi-fi e audio
- Accessori audio

## Keyword di riferimento del sito

hi-fi italiano, audiofilo, amplificatore valvolare, cuffie ad alta fedeltà, giradischi,
vinile, libri musica, alta fedeltà

## Variabili di un ordine

Obbligatorie. Se ne manca una, chiedila: non inventare valori e non assumere default taciti.

- `tipo` — standard | recensione | sistema | biografia → determina quale file di `moduli/` usare
- `categoria` — una delle otto qui sopra
- `argomento` — minimo 3 caratteri. Per una recensione è il prodotto (marca + modello),
  per una biografia è il nome dell'artista

Opzionali:

- `fonti` — URL e/o note testuali da usare come materiale prioritario. Gli URL vanno letti
  per intero e contano più dei risultati di ricerca generici
- `link` — coppie `testo anchor -> url` da inserire nel corpo. L'anchor va usato
  esattamente come fornito, in Markdown `[testo](url)`, dentro il flusso del discorso.
  Mai "clicca qui" o "leggi di più". Vedi anche `risorse/link-interni.md`
- `amazon` — URL affiliato. **Obbligatorio** per `tipo: recensione`
- `componenti` — elenco dei pezzi da trattare. **Obbligatorio** per `tipo: sistema`
- `versioni` — 1 o 2, default 1. Con 2 produci due varianti dello stesso contenuto, stessa
  ricerca, toni diversi: "autorevole e professionale" e "colloquiale e coinvolgente".
  Il tono scelto resta coerente dall'inizio alla fine

## Formato degli ordini

```
/pulashock
tipo: recensione
categoria: Amplificatori e DAC
argomento: FiiO K11 R2R
amazon: https://www.amazon.it/dp/XXXX
fonti:
- https://esempio.com/misure
- il prezzo di listino italiano è 219 euro
link:
- "cuffie planari" -> https://www.pulashock.it/cuffie-planari
versioni: 1
```

Se `tipo` manca, assumi `standard` e dichiaralo. Se un campo non compare, è assente.
FINE
``````

## ━━━ MESSAGGIO 7/13 — moduli: standard + sistema (2839 car.) ━━━

``````
[SETUP 7/13] moduli: standard + sistema

cat > ~/progetti/pulashock/moduli/standard.md <<'FINE'
# Modulo: articolo standard

Output in Markdown. È anche la struttura di riferimento per gli altri moduli,
salvo dove questi dicono diversamente.

## Struttura obbligatoria, in quest'ordine

1. **Paragrafo di apertura** (40-70 parole) che risponde in modo completo e autonomo alla
   domanda implicita del titolo. Deve reggersi da solo se estratto e citato fuori contesto.
   La keyword principale va nella prima frase.

2. **`## Punti chiave`** — 4-5 bullet, uno per riga, ciascuno un'affermazione autoconclusiva
   con un dato concreto (numero, misura, prezzo, data). Massimo 25 parole per bullet.
   Nessuna anticipazione vaga tipo "scopriremo che…".

3. **4-6 sezioni `## ...`** di contenuto. Almeno due titoli in forma di domanda
   ("Come si sceglie…", "Quanto conta…", "Meglio X o Y?").

4. **`## Domande frequenti`** — 4 coppie in questo formato:

   ```
   ### Domanda in forma interrogativa?
   Risposta di 40-80 parole che inizia rispondendo, senza premesse.
   ```

   Privilegia le `domandeUtenti` emerse dalla ricerca.

## Regole SEO

- 1000-1400 parole complessive
- Keyword principale nel primo paragrafo e in almeno un H2. Densità 1-2%, distribuita, mai forzata
- Gerarchia heading senza salti di livello
- Link interni nel flusso del discorso, con esattamente il testo anchor indicato nell'ordine
- Non scrivere il titolo H1 nel corpo: sta nei metadati

## Note

L'articolo è informativo, non promozionale.
Valgono le regole GEO e la checklist di `../_comune/01-seo-geo.md`.
FINE

cat > ~/progetti/pulashock/moduli/sistema.md <<'FINE'
# Modulo: guida impianto

Richiede il campo `componenti`. Output in Markdown.

Articolo-guida che monta un impianto scegliendo prodotti **reali** dal catalogo del sito.

## Procedimento

1. Recupera i prodotti disponibili. Usa `../risorse/link-interni.md` se è popolato,
   altrimenti l'API REST di WordPress del sito. Se non hai né l'uno né l'altra,
   **chiedi l'elenco dei prodotti candidati e aspetta**: non inventare prodotti né URL.
2. Per ogni componente richiesto scegli il prodotto più adatto. Uno solo per componente.
3. Scrivi 1000-1400 parole, struttura H1 → H2 → H2 → …
4. Ogni prodotto scelto va citato con link Markdown `[titolo del prodotto](url)`,
   esattamente il titolo e l'URL del catalogo.
5. Tono autorevole ma accessibile, da appassionato hi-fi.
6. Includi una sezione `## Componenti del sistema` che elenca i prodotti scelti con una
   riga descrittiva ciascuno.
7. Includi una sezione `## Punti chiave`.
8. Proponi 4-6 tag pertinenti per il post WordPress.
9. Spiega sempre il **perché** di ogni abbinamento: sinergia di impedenza, sensibilità,
   formato, budget. Non limitarti a elencare.

Valgono la checklist e le regole GEO di `../_comune/01-seo-geo.md`.
FINE
``````

## ━━━ MESSAGGIO 8/13 — moduli/recensione.md (2273 car.) ━━━

``````
[SETUP 8/13] moduli/recensione.md

cat > ~/progetti/pulashock/moduli/recensione.md <<'FINE'
# Modulo: recensione prodotto

Richiede il campo `amazon`. Output in **blocchi Gutenberg**, non Markdown.

Il template sta in `../template/recensione-gutenberg.html`. Va compilato esattamente
com'è: è codice WordPress, non una traccia.

## Regole di compilazione

1. Sostituisci tutti i segnaposto fra parentesi quadre in MAIUSCOLO con contenuto reale
   basato sulla ricerca.
2. Sostituisci **entrambe** le occorrenze di `[LINK_AMAZON]` con l'URL dell'ordine.
3. Non modificare mai gli attributi dei blocchi: `className`, `style`, `contentJustification`,
   `borderRadius`, gli `id` degli heading e gli href interni dell'indice.
4. Non aggiungere blocchi non presenti nel template e non toglierne.
5. Ogni link esterno nel testo deve avere `target="_blank" rel="noreferrer noopener"`.
6. La keyword principale deve comparire entro le prime 100 parole dell'introduzione.
7. `[VOTO]` — da 1 a 5, coerente con quello che scrivi nel verdetto finale.
8. Pro: minimo 4, massimo 5. Contro: minimo 2, massimo 3. Ogni voce con una breve
   spiegazione, non una parola secca.
9. Specifiche tecniche: se un dato non è disponibile scrivi `N/D`. Non stimarlo.
10. `[AMAZON_RATING]` e `[AMAZON_SINTESI]` — usa le recensioni reali trovate in ricerca.
    Se non ne hai, dichiaralo e lascia il blocco fuori invece di inventare una media.

## Deroghe alla struttura standard

Non si applicano "Punti chiave", "Domande frequenti" né il conteggio parole:
la struttura editoriale è quella del template. Restano validi il tono del progetto,
le regole GEO sui dati verificabili e il divieto di affermazioni non supportate.

## Schema JSON-LD da produrre in `meta.json`

```json
{"@context":"https://schema.org","@graph":[
{"@type":"Product","name":"[nome prodotto]","brand":{"@type":"Brand","name":"[brand]"},
 "offers":{"@type":"Offer","url":"[LINK_AMAZON]","priceCurrency":"EUR",
 "availability":"https://schema.org/InStock"}},
{"@type":"Review","itemReviewed":{"@type":"Product","name":"[nome prodotto]"},
 "reviewRating":{"@type":"Rating","ratingValue":"[voto]","bestRating":"5"},
 "author":{"@type":"Organization","name":"Pulashock.it"},
 "reviewBody":"[2-3 frasi dal verdetto finale]"}]}
```
FINE
``````

## ━━━ MESSAGGIO 9/13 — moduli/biografia.md (2686 car.) ━━━

``````
[SETUP 9/13] moduli/biografia.md

cat > ~/progetti/pulashock/moduli/biografia.md <<'FINE'
# Modulo: biografia artista

Output in Markdown, 800-1200 parole, tono informativo e autorevole, mai promozionale.

## Dieci sezioni obbligatorie, in quest'ordine

1. **Apertura** (150-200 parole). Inizia con nome artista, genere musicale, città di
   provenienza e periodo di attività. Keyword principale entro le prime 20 parole.
   Rispondi subito: chi è e perché è rilevante.

2. `## Identità artistica e stile di [ARTISTA]` — genere, sottogenere, caratteristiche
   distintive, influenze dichiarate. Nomi propri chiari, niente aggettivi vaghi.

3. `## Origini di [ARTISTA]: città, scena e primi passi` — città natale, scena locale,
   venue e club degli esordi, etichette o collettivi del territorio. Nomi verificabili.

4. `## Carriera di [ARTISTA]: dal debutto ai momenti chiave` — ordine cronologico: esordi,
   svolta, collaborazioni, riconoscimenti. Date precise, ogni affermazione attribuibile.

5. `## Discografia selezionata` — lista Markdown, formato:
   `- *Titolo* (Anno) — Etichetta`
   Se hai l'URL di una recensione del disco sul sito, linka il titolo: `[Titolo](URL)`.
   Altrimenti: `*Titolo* (Anno) — Etichetta [verificare se presente recensione]`.
   **Non inventare mai URL.**

6. `## Collaborazioni e featuring` — artisti, produttori, label, collettivi, nomi esatti.

7. `## Video e ascolti` — indica dove inserire un video YouTube rappresentativo e un embed
   Spotify, con segnaposto `[VIDEO_YOUTUBE: alt text]` e `[EMBED_SPOTIFY: alt text]`.
   Alt text nel formato `[ARTISTA] – [titolo] – [genere]`.

8. `## Citazioni e fonti` — almeno una citazione diretta dell'artista da un'intervista,
   con fonte. Formato: `> "Citazione" — Fonte, Anno`

9. `## Domande frequenti su [ARTISTA]` — 3-5 FAQ nella forma in cui un utente le cercherebbe
   su Google o con la voce. Ogni risposta 40-60 parole, diretta. Formato:
   `**Domanda reale?**` seguito dalla risposta.

10. `## Artisti correlati a [ARTISTA]` — 3-5 artisti per genere, città o etichetta, una riga
    ciascuno, con link interno `[Nome Artista](/biografia/slug-artista)` usando lo slug
    derivato dal nome.

## Regole

- Ogni H2 contiene la keyword secondaria più pertinente
- Frasi dirette, niente iperboli non supportate da fatti
- Cita sempre città, venue, etichette e collaboratori con nomi propri
- Affermazioni verificabili e datate

## Schema JSON-LD da produrre in `meta.json`

```json
{"@context":"https://schema.org","@type":"Person","name":"[nome artista]",
 "description":"[breve descrizione]","genre":["[genere1]","[genere2]"],
 "birthPlace":{"@type":"Place","name":"[città]"},"sameAs":[]}
```
FINE
``````

## ━━━ MESSAGGIO 10/13 — template recensione 1/2 (2913 car.) ━━━

``````
[SETUP 10/13] template recensione 1/2

cat > ~/progetti/pulashock/template/recensione-gutenberg.html <<'FINE'
<!-- wp:group {"className":"review-summary-box"} -->
<div class="wp-block-group review-summary-box">

<!-- wp:paragraph -->
<p><strong>Voto:</strong> [VOTO]/5</p>
<!-- /wp:paragraph -->

<!-- wp:paragraph -->
<p><strong>Target ideale:</strong> [TARGET_IDEALE]</p>
<!-- /wp:paragraph -->

</div>
<!-- /wp:group -->

<!-- wp:paragraph -->
<p>[INTRO_P1 — contesto prodotto con keyword principale entro le prime 100 parole]</p>
<!-- /wp:paragraph -->

<!-- wp:paragraph -->
<p>[INTRO_P2 — perché vale la pena leggere questa recensione]</p>
<!-- /wp:paragraph -->

<!-- wp:paragraph -->
<p>[INTRO_P3 — cosa troverà il lettore]</p>
<!-- /wp:paragraph -->

<!-- wp:buttons {"contentJustification":"left","className":"amazon-buttons"} -->
<div class="wp-block-buttons is-content-justification-left amazon-buttons"><!-- wp:button {"borderRadius":2,"style":{"color":{"background":"#dd3333","text":"#fffffa"}}} -->
<div class="wp-block-button"><a class="wp-block-button__link has-text-color has-background" href="[LINK_AMAZON]" style="border-radius:2px;background-color:#dd3333;color:#fffffa" target="_blank" rel="noreferrer noopener">Vedi il prezzo su Amazon</a></div>
<!-- /wp:button --></div>
<!-- /wp:buttons -->

<!-- wp:spacer {"height":20} -->
<div style="height:20px" aria-hidden="true" class="wp-block-spacer"></div>
<!-- /wp:spacer -->

<!-- wp:heading {"className":"wp-block-heading"} -->
<h2 class="wp-block-heading mt-30" id="indice">Indice</h2>
<!-- /wp:heading -->

<!-- wp:list -->
<ul class="wp-block-list">
  <li><a href="#caratteristiche-tecniche">Caratteristiche tecniche</a></li>
  <li><a href="#qualita-audio">Qualità audio e performance</a></li>
  <li><a href="#valutazioni-amazon">Valutazioni Amazon</a></li>
  <li><a href="#pro-e-contro">Pro e contro</a></li>
  <li><a href="#per-chi-e-consigliato">Per chi è consigliato</a></li>
  <li><a href="#verdetto-finale">Verdetto finale</a></li>
</ul>
<!-- /wp:list -->

<!-- wp:heading {"className":"wp-block-heading"} -->
<h2 class="wp-block-heading mt-30" id="caratteristiche-tecniche">Caratteristiche tecniche</h2>
<!-- /wp:heading -->

<!-- wp:table {"hasFixedLayout":true,"className":"table-review"} -->
<figure class="wp-block-table table-review"><table class="has-fixed-layout"><thead><tr><th>Specifica</th><th>Valore</th></tr></thead><tbody>
<tr><td>Potenza</td><td>[SPEC_POTENZA]</td></tr>
<tr><td>Ingressi</td><td>[SPEC_INGRESSI]</td></tr>
<tr><td>Uscite</td><td>[SPEC_USCITE]</td></tr>
<tr><td>DAC</td><td>[SPEC_DAC]</td></tr>
<tr><td>Dimensioni</td><td>[SPEC_DIMENSIONI]</td></tr>
<tr><td>Peso</td><td>[SPEC_PESO]</td></tr>
</tbody></table></figure>
<!-- /wp:table -->

<!-- wp:paragraph -->
<p>[CARATTERISTICHE_TESTO — 2-3 paragrafi che commentano le specifiche tecniche e il loro significato pratico]</p>
<!-- /wp:paragraph -->
FINE
``````

## ━━━ MESSAGGIO 11/13 — template recensione 2/2 (3780 car.) ━━━

``````
[SETUP 11/13] template recensione 2/2

cat >> ~/progetti/pulashock/template/recensione-gutenberg.html <<'FINE'

<!-- wp:heading {"className":"wp-block-heading"} -->
<h2 class="wp-block-heading mt-30" id="qualita-audio">Qualità audio e performance</h2>
<!-- /wp:heading -->

<!-- wp:paragraph -->
<p>[QUALITA_P1 — descrizione della qualità sonora: timbrica, dettaglio, soundstage]</p>
<!-- /wp:paragraph -->

<!-- wp:paragraph -->
<p>[QUALITA_P2 — punti di forza nell'ascolto con esempi di generi musicali]</p>
<!-- /wp:paragraph -->

<!-- wp:paragraph -->
<p>[QUALITA_P3 — confronto con la fascia di prezzo e conclusioni sull'audio]</p>
<!-- /wp:paragraph -->

<!-- wp:heading {"className":"wp-block-heading"} -->
<h2 class="wp-block-heading mt-30" id="valutazioni-amazon">Cosa dicono gli utenti: Valutazioni Amazon</h2>
<!-- /wp:heading -->

<!-- wp:group {"style":{"border":{"radius":"8px","width":"1px"},"spacing":{"padding":{"top":"20px","bottom":"20px","left":"20px","right":"20px"}}},"className":"amazon-ratings-box has-border-color has-cyan-bluish-gray-border-color"} -->
<div class="wp-block-group amazon-ratings-box has-border-color has-cyan-bluish-gray-border-color" style="border-radius:8px;padding-top:20px;padding-right:20px;padding-bottom:20px;padding-left:20px"><div class="wp-block-group__inner-container">
<!-- wp:paragraph -->
<p><strong>Media recensioni:</strong> ⭐ [AMAZON_RATING] su 5</p>
<!-- /wp:paragraph -->

<!-- wp:paragraph -->
<p>[AMAZON_SINTESI — sintesi di 2-3 righe basata sulle recensioni reali: cosa apprezzano di più gli utenti e quali sono le lamentele comuni]</p>
<!-- /wp:paragraph --></div></div>
<!-- /wp:group -->

<!-- wp:heading {"className":"wp-block-heading"} -->
<h2 class="wp-block-heading mt-30" id="pro-e-contro">Pro e contro</h2>
<!-- /wp:heading -->

<!-- wp:table {"hasFixedLayout":true,"className":"table-review"} -->
<figure class="wp-block-table table-review"><table class="has-fixed-layout"><thead><tr><th>Pro ✅</th><th>Contro ❌</th></tr></thead><tbody>
<tr><td>[PRO_1]</td><td>[CONTRO_1]</td></tr>
<tr><td>[PRO_2]</td><td>[CONTRO_2]</td></tr>
<tr><td>[PRO_3]</td><td>[CONTRO_3_O_VUOTO]</td></tr>
<tr><td>[PRO_4]</td><td></td></tr>
<tr><td>[PRO_5_O_VUOTO]</td><td></td></tr>
</tbody></table></figure>
<!-- /wp:table -->

<!-- wp:heading {"className":"wp-block-heading"} -->
<h2 class="wp-block-heading mt-30" id="per-chi-e-consigliato">Per chi è consigliato</h2>
<!-- /wp:heading -->

<!-- wp:paragraph -->
<p>[PER_CHI_P1 — profilo dell'acquirente ideale: esperienza, budget, esigenze d'ascolto]</p>
<!-- /wp:paragraph -->

<!-- wp:paragraph -->
<p>[PER_CHI_P2 — scenari d'uso specifici e abbinamenti consigliati con altri componenti]</p>
<!-- /wp:paragraph -->

<!-- wp:heading {"className":"wp-block-heading"} -->
<h2 class="wp-block-heading mt-30" id="verdetto-finale">Verdetto finale</h2>
<!-- /wp:heading -->

<!-- wp:paragraph -->
<p>[VERDETTO_P1 — sintesi complessiva del prodotto]</p>
<!-- /wp:paragraph -->

<!-- wp:paragraph -->
<p>[VERDETTO_P2 — rapporto qualità/prezzo e raccomandazione finale]</p>
<!-- /wp:paragraph -->

<!-- wp:buttons {"contentJustification":"left","className":"amazon-buttons"} -->
<div class="wp-block-buttons is-content-justification-left amazon-buttons"><!-- wp:button {"borderRadius":2,"style":{"color":{"background":"#dd3333","text":"#fffffa"}}} -->
<div class="wp-block-button"><a class="wp-block-button__link has-text-color has-background" href="[LINK_AMAZON]" style="border-radius:2px;background-color:#dd3333;color:#fffffa" target="_blank" rel="noreferrer noopener">Vedi il prezzo su Amazon</a></div>
<!-- /wp:button --></div>
<!-- /wp:buttons -->

<!-- wp:spacer {"height":20} -->
<div style="height:20px" aria-hidden="true" class="wp-block-spacer"></div>
<!-- /wp:spacer -->
FINE
``````

## ━━━ MESSAGGIO 12/13 — risorse + segreti (1813 car.) ━━━

``````
[SETUP 12/13] risorse + segreti

cat > ~/progetti/pulashock/risorse/link-interni.md <<'FINE'
# Catalogo link interni

Elenco degli URL del sito da usare per i link interni e, nel modulo `sistema`,
come catalogo prodotti fra cui scegliere.

Formato di una riga: `titolo esatto | url | categoria | breve descrizione`

Finché questo file è vuoto:

- nel modulo `standard` e `biografia`, usa solo i link passati nell'ordine
- nel modulo `sistema`, chiedi l'elenco dei prodotti prima di scrivere

**Non inventare mai URL di pulashock.it.** Un link inventato è un 404 pubblicato.

## Come popolarlo

Dall'API REST pubblica del sito:

```
curl -s 'https://www.pulashock.it/wp-json/wp/v2/posts?per_page=100&_fields=title,link' \
  | jq -r '.[] | "\(.title.rendered) | \(.link)"'
```

Ripeti aumentando `page` finché la risposta non è vuota, e per gli altri post type
(`recensioni`, `biografie`, …) se esistono.

---

<!-- righe del catalogo da qui in giù -->
FINE

cat > ~/progetti/pulashock/segreti/wordpress.env.esempio <<'FINE'
# Copia questo file in wordpress.env e riempilo.
# wordpress.env non va mai letto in chat, né messo in git, né stampato nei log.
#
#   cp wordpress.env.esempio wordpress.env
#   chmod 600 wordpress.env
#
# La password applicativa si genera in WordPress:
# Utenti → Profilo → Password per applicazioni.
#
# LE VIRGOLETTE SERVONO. WordPress mostra la password in sei gruppi separati da
# spazi. Senza virgolette, `source wordpress.env` interpreta il secondo gruppo
# come un comando da eseguire e lascia la variabile vuota, con un errore facile
# da non notare.
#
# In alternativa scrivila tutta attaccata, senza spazi: WordPress li ignora
# quando autentica, e un valore senza spazi non ha bisogno di virgolette.

WP_SITE_URL="https://www.pulashock.it"
WP_USERNAME=""
WP_APP_PASSWORD=""
FINE
``````

## ━━━ MESSAGGIO 13/13 — Verifica e attivazione (842 car.) ━━━

``````
[SETUP 13/13] Verifica e attivazione

Verifica l'installazione:

find ~/progetti -type f | sort
wc -c ~/progetti/pulashock/template/recensione-gutenberg.html

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

Se manca un campo obbligatorio, chiedimelo invece di assumerlo.
``````
