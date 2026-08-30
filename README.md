# Portfolio

Personal portfolio website built with Astro 5, Notion CMS, and multi-theme system.

**Live:** [raihanachmad.web.id](https://raihanachmad.web.id)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Astro 5 + TypeScript (strict) |
| Styling | CSS custom properties + themes |
| CMS | Notion API v5 (primary) + Local JSON/MDX (fallback) |
| Validation | Zod |
| Deployment | Cloudflare Workers (SSR) |
| AI Assistant | Aruna — client-side RAG-like chatbot (no LLM) |

## Quick Start

```bash
npm install
npm run dev        # localhost:4321
npm run build      # production build
```

## Project Structure

```
src/
├── components/              # UI components
│   ├── aruna/               # Chatbot subsystem (client-side)
│   ├── Header.astro, Hero.astro, About.astro, etc.
│   └── README.md
├── content/                 # MDX content collections
│   ├── blog/
│   ├── projects/
│   └── experience/
├── lib/
│   ├── constants.ts         # Centralized config (SITE_CONFIG)
│   ├── utils.ts             # Utility functions
│   ├── config.ts            # Notion config resolver
│   ├── schemas.ts           # Zod validation schemas
│   ├── content/             # Content layer (per-type modules)
│   │   ├── projects.ts, blog.ts, profile.ts
│   │   ├── skills.ts, experience.ts, ticker.ts
│   │   └── cache.ts, helpers.ts
│   ├── aruna/               # Chatbot engine
│   │   ├── engine.ts        # Core orchestration
│   │   ├── intent.ts        # Intent detection
│   │   ├── responses.ts     # Response composition
│   │   ├── kb.ts, ranker.ts, lookup.ts, etc.
│   │   └── types.ts
│   └── notion/              # Notion adapter
│       ├── client.ts, queries.ts, types.ts
├── pages/                   # File-based routing
├── styles/                  # Global CSS + 4 themes
├── i18n/                    # EN/ID translations
└── data/                    # Static data (QA, CV)

scripts/
├── lib/                     # Shared Node.js utilities
├── commands/                # CLI subcommands
└── aruna-build.mjs          # KB build script
```

## Architecture

### Content Layer

```
Component → content/[type].ts → Notion API (or local fallback) → Zod → Type
```

Each content type has its own module with shared caching via `content/cache.ts`.

### Aruna Chatbot

```
User Input → Tokenizer → TF Scoring → Intent Detection → Critic → Template Response
```

- Client-side only, no LLM, no API calls
- Bilingual (EN/ID)
- Knowledge base built from portfolio content

### Themes

Four built-in themes: `gallery` (default), `terminal`, `editorial`, `swiss`.

Switch via URL: `/?theme=terminal` or theme buttons in header.

## Environment Variables

```env
# Notion CMS (server-only)
NOTION_TOKEN=ntn_xxx
NOTION_DB_PROFILE=xxx
NOTION_DB_PROJECTS=xxx
NOTION_DB_SKILLS=xxx
NOTION_DB_EXPERIENCE=xxx
NOTION_DB_BLOG=xxx
NOTION_DB_TICKER=xxx
NOTION_DB_SETTINGS=xxx
NOTION_PARENT_PAGE_ID=xxx

# Site (public)
PUBLIC_SITE_URL=https://your-domain.com
PUBLIC_DATA_SOURCE=notion    # "notion" or "local"
PUBLIC_DEBUG_MODE=false
```

## CLI Commands

| Command | Description |
|---------|-------------|
| `npm run notion:bootstrap` | Create Notion databases |
| `npm run notion:migrate` | Seed local data to Notion |
| `npm run notion:sync` | Pull Notion → local |
| `npm run notion:verify` | Check Notion connection |
| `npm run notion:clean` | Archive Notion pages |
| `npm run aruna:build` | Build chatbot knowledge base |
| `npm run i18n:verify` | Verify translation completeness |

## Adding Content

### Projects

Create `.mdx` in `src/content/projects/`:

```mdx
---
title: My Project
category: Backend API
year: 2026
description: Brief description
stack: TypeScript,Node.js,PostgreSQL
featured: true
---

Project content here...
```

### Skills / Experience

Edit `src/data/content.json` or add directly in Notion UI.

## License

MIT
