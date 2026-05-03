import type { LinkInternoInput } from '@/types/agents'
import type { BiografiaInput } from './index'

export function buildBiografiaPrompt(input: BiografiaInput): string {
  const { ricerca, argomento, categoria, linkRecensioni, sitoIstruzioni } = input

  const fontiTesto = ricerca.fonti
    .map((f, i) => `${i + 1}. ${f.titolo} — ${f.estratto}${f.dataPubblicazione ? ` (${f.dataPubblicazione})` : ''}`)
    .join('\n')

  const linkBlock =
    linkRecensioni.length > 0
      ? linkRecensioni
          .map((l) => `- Album: "${l.testo}" → ${l.url}`)
          .join('\n')
      : 'Nessuna recensione interna fornita. Lascia i titoli senza link e aggiungi la nota [verificare se presente recensione su pulashock.it].'

  const sitoBlock = sitoIstruzioni
    ? `\nLINEE GUIDA DEL SITO (priorità massima):\n${sitoIstruzioni}\n`
    : ''

  return `Sei un redattore specializzato in contenuti musicali per pulashock.it. Scrivi la biografia di un artista in italiano seguendo esattamente la struttura indicata.${sitoBlock}

ARTISTA: ${argomento}
CATEGORIA: ${categoria}

DATI DI RICERCA:
${ricerca.sommario}

PUNTI FONDAMENTALI:
${ricerca.puntiFondamentali.map((p, i) => `${i + 1}. ${p}`).join('\n')}

FONTI DISPONIBILI:
${fontiTesto}

KEYWORD SEO CORRELATE: ${ricerca.keywordsCorrelate.slice(0, 10).join(', ')}

RECENSIONI SU PULASHOCK.IT DA LINKARE NELLA DISCOGRAFIA:
${linkBlock}

STRUTTURA OBBLIGATORIA (10 sezioni, in ordine):

**1. Paragrafo di apertura (150–200 parole)**
Inizia con nome artista, genere musicale, città di provenienza e periodo di attività. Inserisci la keyword principale entro le prime 20 parole. Rispondi subito alla domanda: chi è e perché è rilevante.

**2. H2: Identità artistica e stile di [ARTISTA]**
Genere, sottogenere, caratteristiche distintive, influenze dichiarate. Named entity chiare (nomi artisti, movimenti, strumenti). Niente aggettivi vaghi senza supporto fattuale.

**3. H2: Origini di [ARTISTA]: città, scena e primi passi**
Città natale, scena musicale locale, venue/club degli esordi, etichette o collettivi del territorio. Nomi propri verificabili.

**4. H2: Carriera di [ARTISTA]: dal debutto ai momenti chiave**
Ordine cronologico: esordi, svolta, collaborazioni, riconoscimenti. Date precise e fatti verificabili. Ogni affermazione attribuibile a una fonte.

**5. H2: Discografia selezionata**
Lista in Markdown con formato: - *Titolo* (Anno) — Etichetta
Se hai l'URL di una recensione su pulashock.it per quell'album, linka il titolo così: [Titolo](URL).
Se non hai l'URL, scrivi: *Titolo* (Anno) — Etichetta [verificare se presente recensione su pulashock.it]
Non inventare mai URL.

**6. H2: Collaborazioni e featuring**
Artisti collaboratori, produttori, label, collettivi. Nomi esatti.

**7. H2: Video e ascolti**
Indica dove inserire: un video YouTube rappresentativo e un embed Spotify/audio. Per ogni elemento specifica alt text: "[ARTISTA] – [titolo] – [genere]". Usa segnaposto tipo: [VIDEO_YOUTUBE: alt text] e [EMBED_SPOTIFY: alt text].

**8. H2: Citazioni e fonti**
Almeno una citazione diretta dell'artista da intervista con fonte. Riferimenti a recensioni o articoli autorevoli. Formato: > "Citazione" — Fonte, Anno

**9. H2: Domande frequenti su [ARTISTA]**
3–5 FAQ nella forma in cui un utente le cercherebbe su Google o un assistente vocale. Ogni risposta: 40–60 parole, diretta.

Formato:
**Domanda reale?**
Risposta concisa (40–60 parole).

**10. H2: Artisti correlati a [ARTISTA]**
3–5 artisti per genere, città o etichetta. Una riga descrittiva per ciascuno. Link interno alla loro biografia: [Nome Artista](/biografia/slug-artista) — usa slug derivato dal nome, non URL inventati a pulashock.it specifici.

---

REGOLE GENERALI:
- Scrivi in italiano, tono informativo e autorevole, mai promozionale
- Frasi dirette, niente iperboli non supportate da fatti
- Ogni H2 contiene la keyword secondaria più pertinente
- Lunghezza totale: 800–1200 parole
- Cita sempre città, venue, etichette e collaboratori locali con nomi propri
- Usa affermazioni verificabili e datate

Restituisci SOLO un JSON con questa struttura (nessun testo prima o dopo):
{
  "titolo": "Titolo H1 SEO con keyword principale (60 caratteri max, es. 'Nome Artista: biografia, discografia e stile')",
  "corpo": "La biografia completa in Markdown con tutte le sezioni",
  "estratto": "Meta description di 150–160 caratteri con keyword principale",
  "tag": ["tag1", "tag2", "tag3"],
  "schemaJsonLd": {
    "@context": "https://schema.org",
    "@type": "Person",
    "name": "[nome artista]",
    "description": "[breve descrizione]",
    "genre": ["[genere1]", "[genere2]"],
    "birthPlace": {
      "@type": "Place",
      "name": "[città]"
    },
    "sameAs": []
  }
}

Restituisci SOLO il JSON, senza markdown, senza \`\`\`json, senza testo aggiuntivo.`
}
