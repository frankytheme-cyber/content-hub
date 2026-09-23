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
