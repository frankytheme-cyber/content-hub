import type { RecensioneInput } from './index'

export const TEMPLATE_RECENSIONE_HIFI = `<!-- wp:group {"className":"review-summary-box"} -->
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
<!-- /wp:spacer -->`

export function buildRecensionePrompt(input: RecensioneInput): string {
  const { ricerca, linkAmazon, argomento, categoria, sitoIstruzioni } = input

  const fontiTesto = ricerca.fonti
    .map((f, i) => `${i + 1}. ${f.titolo} — ${f.estratto}`)
    .join('\n')

  return `Sei un redattore esperto di hi-fi e audio per il sito Pulashock.it. Devi scrivere una recensione SEO completa in italiano per WordPress utilizzando ESATTAMENTE il template Gutenberg fornito.

PRODOTTO: ${argomento}
CATEGORIA: ${categoria}
LINK AMAZON: ${linkAmazon}

${sitoIstruzioni ? `LINEE GUIDA DEL SITO:\n${sitoIstruzioni}\n` : ''}

DATI DI RICERCA RACCOLTI:
${ricerca.sommario}

PUNTI FONDAMENTALI:
${ricerca.puntiFondamentali.map((p, i) => `${i + 1}. ${p}`).join('\n')}

FONTI:
${fontiTesto}

KEYWORD SEO: ${ricerca.keywordsCorrelate.slice(0, 8).join(', ')}

TEMPLATE DA COMPILARE:
${TEMPLATE_RECENSIONE_HIFI}

ISTRUZIONI IMPORTANTI:
1. Sostituisci TUTTI i segnaposto [MAIUSCOLO] con contenuto reale basato sulla ricerca
2. Sostituisci ENTRAMBE le occorrenze di [LINK_AMAZON] con: ${linkAmazon}
3. Non modificare MAI gli attributi dei blocchi (className, style, contentJustification, borderRadius)
4. Non aggiungere blocchi non presenti nel template
5. Ogni link esterno nel testo deve avere target="_blank" rel="noreferrer noopener"
6. La keyword principale deve apparire entro le prime 100 parole dell'intro
7. Voto: da 1 a 5 basato sull'analisi complessiva
8. Pro: minimo 4, massimo 5. Contro: minimo 2, massimo 3. Ogni voce con breve spiegazione
9. Per le specifiche tecniche: se un dato non è disponibile scrivi "N/D"

Restituisci SOLO un JSON con questa struttura (nessun testo prima o dopo):
{
  "titolo": "Titolo SEO ottimizzato con keyword principale (60 caratteri max)",
  "corpo": "Il template completo con tutti i segnaposto sostituiti",
  "estratto": "Descrizione meta di 150-160 caratteri per i motori di ricerca",
  "tag": ["tag1", "tag2", "tag3"],
  "schemaJsonLd": {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Product",
        "name": "[nome prodotto]",
        "brand": { "@type": "Brand", "name": "[brand]" },
        "offers": {
          "@type": "Offer",
          "url": "${linkAmazon}",
          "priceCurrency": "EUR",
          "availability": "https://schema.org/InStock"
        }
      },
      {
        "@type": "Review",
        "itemReviewed": { "@type": "Product", "name": "[nome prodotto]" },
        "reviewRating": { "@type": "Rating", "ratingValue": "[voto]", "bestRating": "5" },
        "author": { "@type": "Organization", "name": "Pulashock.it" },
        "reviewBody": "[2-3 frasi dal verdetto finale]"
      }
    ]
  }
}

Restituisci SOLO il JSON, senza markdown, senza \`\`\`json, senza testo aggiuntivo.`
}
