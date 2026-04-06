# Content Hub

Dashboard per la creazione, revisione e pubblicazione di articoli SEO/GEO per e-commerce, basata su agenti AI Claude.

## Setup rapido

### 1. Variabili d'ambiente

```bash
cp .env.example .env.local
# Compila le variabili in .env.local
```

Variabili richieste:

| Variabile | Descrizione |
|---|---|
| `TAVILY_API_KEY` | Chiave API Tavily (ricerca) |
| `PEXELS_API_KEY` | Chiave API Pexels (immagini) |
| `DATABASE_URL` | URL PostgreSQL (es. `postgresql://postgres:password@localhost:5432/content_hub`) |
| `REDIS_URL` | URL Redis (es. `redis://localhost:6379`) |
| `WORDPRESS_SITE_URL` | URL del sito WordPress |
| `WORDPRESS_USERNAME` | Username WordPress |
| `WORDPRESS_APP_PASSWORD` | Application Password WordPress |

### 2. Avvia PostgreSQL e Redis

```bash
docker compose up -d
```

### 3. Genera il client Prisma e migra il database

```bash
npx prisma generate
npx prisma migrate dev --name init
```

### 4. Avvia il server di sviluppo

```bash
npm run dev
```

Apri [http://localhost:3000](http://localhost:3000).

---

## WordPress MCP

Il sistema pubblica articoli su WordPress tramite [Model Context Protocol](https://modelcontextprotocol.io/).

Il server MCP utilizzato è `@automattic/wordpress-mcp`. Al primo utilizzo viene scaricato automaticamente via `npx`.

Per configurare l'autenticazione WordPress:
1. Vai su **WordPress Admin → Utenti → Profilo**
2. Genera un **Application Password** in fondo alla pagina
3. Inserisci username e password nelle variabili d'ambiente

---

## Architettura

```
Browser
  │
  ├─ Wizard (3 step) ──→ POST /api/wizard ──→ Prisma + Redis (BullMQ)
  │
  ├─ /wizard/progresso ←── SSE /api/jobs/[id]/stream ←── Worker
  │                                                           │
  │                                               runPipeline()
  │                                        ┌──────────┼──────────────┐
  │                                   ResearchAgent  Gen  Review  Seo  Image
  │
  ├─ Dashboard ──→ GET /api/articles ──→ Prisma
  │
  └─ Dettaglio articolo ──→ POST /api/articles/[id]/publish
                                  │
                            PublisherAgent ──→ WordPress MCP ──→ WP REST API
```

## Agenti AI

Gli agenti usano `claude --print` (Claude Code CLI) — **nessuna API key Anthropic richiesta**, funziona con il tuo account Pro/Max.

| Agente | Scopo |
|---|---|
| ResearchAgent | Ricerca web (Tavily) + sintesi |
| GenerationAgent | 2 versioni con toni diversi + link interni |
| ReviewAgent | Verifica fattuale + grammaticale |
| SeoAgent | Metadata SEO + ottimizzazione GEO |
| ImageAgent | Ricerca Pexels + alt text |
| PublisherAgent | Pubblicazione su WordPress MCP |
