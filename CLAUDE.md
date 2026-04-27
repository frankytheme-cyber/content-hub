# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
# Dev server
npm run dev

# Build
npm run build

# Infrastructure (PostgreSQL + Redis)
docker compose up -d

# Prisma — always run generate before migrate
npx prisma generate
npx prisma migrate dev --name <nome>

# Seed
npx tsx prisma/seed.ts
```

There is no `test` script in `package.json`; vitest is available but not yet wired up.

## Architecture

**Stack**: Next.js 16.2.2 (App Router) · TypeScript · Tailwind CSS v4 · shadcn/ui (`@base-ui/react`, NOT Radix) · Prisma 7 + PostgreSQL · BullMQ + Redis · Zustand · TanStack Query v5.

### Agent pipeline

Agents live in `agents/` and do NOT use the Anthropic API. They call `claude --print` as a subprocess via `lib/claude-cli.ts` (`callClaude` / `callClaudeJson`). No Anthropic API key is needed — it uses the authenticated Claude Code CLI of the current user.

Pipeline flow (orchestrated in `agents/index.ts:runPipeline`):

```
ResearchAgent (Tavily) → GenerationAgent (2 tones or RecensioneAgent) →
ReviewAgent (parallel) → SeoAgent (parallel) → ImageAgent (Pexels) → DB save
```

For `tipoArticolo === 'recensione'`, `RecensioneAgent` replaces Generation+SEO with a single Gutenberg-block template pass.

The pipeline supports **checkpoint/resume**: each phase saves progress to the DB (`Job.fase`, `Session.ricercaJson`, `Versione` rows). On restart the pipeline skips already-completed phases.

### Job queue & SSE

`POST /api/wizard` creates a `Session` + `Job` in Postgres, then calls `startWorker()` (idempotent, in-process BullMQ worker, concurrency 2) and `enqueueJob()`.

Progress events are published to Redis pub/sub (`job:<jobId>` channel) via `lib/events.ts`. The SSE route `GET /api/jobs/[jobId]/stream` creates a Redis subscriber and streams `text/event-stream` to the browser. On reconnect it sends a catch-up event from the current DB state before subscribing.

### WordPress publishing

`PublisherAgent` uses `@automattic/wordpress-mcp` downloaded via `npx` + `StdioClientTransport` from `@modelcontextprotocol/sdk`. Per-site WordPress credentials are stored on the `Sito` model (`wpSiteUrl`, `wpUsername`, `wpAppPassword`); global fallback is `.env.local`.

## Critical library notes

### Prisma 7
The `datasource` block in `prisma/schema.prisma` has **no `url` field**. The DB connection is passed at runtime via the `@prisma/adapter-pg` adapter in `lib/prisma.ts`. Migration URLs come from `prisma.config.ts` which reads `DIRECT_URL` (or `DATABASE_URL` as fallback). Run `npx prisma generate` after any schema change.

### shadcn/ui with base-ui
Components use `@base-ui/react`, not Radix. Key differences:
- **No `asChild` prop** on `<Button>` or other primitives — use a plain `<Link>` with CSS classes for link-buttons.
- `Select.onValueChange` signature: `(value: string | null, eventDetails) => void`.
