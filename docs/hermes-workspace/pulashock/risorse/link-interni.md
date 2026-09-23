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
