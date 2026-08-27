# Portfolio v2.0

Personal portfolio built with Astro 5, Notion CMS, and multi-theme system.

> **v2.0** — Full rewrite from [raihanachmad.web.id](https://github.com/raihanachmad8/raihanachmad.web.id) (v1.0, Dec 2024). New architecture: Notion CMS, MDX content collections, multi-theme, unified CLI.

## Tech Stack

- **Framework:** Astro 5 + TypeScript
- **Styling:** Tailwind CSS
- **CMS:** Notion API v5 (primary) + Local JSON/MDX (fallback)
- **Validation:** Zod
- **Deployment:** Cloudflare Workers
- **Markdown:** Marked + Mermaid

## Quick Start

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build
```

## Project Structure

```
src/
├── components/          # Astro components (About, Blog, Hero, etc.)
├── content/
│   ├── config.ts        # Content collection schemas
│   ├── projects/        # MDX project files
│   └── blog/            # MDX blog posts
├── layouts/
│   └── PageHead.astro   # Root layout with theme + scripts
├── lib/
│   ├── notion/          # Notion adapter (client, queries, types)
│   ├── config.ts        # App configuration
│   ├── content.ts       # Content orchestration layer
│   ├── notion-options.ts # Shared option constants
│   ├── schemas.ts       # Zod validation schemas
│   └── utils.ts         # Shared utilities
├── pages/               # Astro page routes
└── styles/              # Global CSS + theme CSS

scripts/
├── notion.mjs           # Unified Notion CLI
├── notion-utils.mjs     # Shared script utilities
├── notion-options.mjs   # Seed option constants
├── md-to-notion.mjs     # Generic MD → Notion blocks converter
└── commands/            # CLI subcommands (bootstrap, migrate, sync, etc.)

public/
└── data/content.json    # Local fallback data
```

## Notion CMS

Data is stored in Notion databases and fetched at runtime.

### Environment Variables

```env
# Notion (server-only)
NOTION_TOKEN=ntn_xxx
NOTION_DB_PROFILE=xxx
NOTION_DB_PROJECTS=xxx
NOTION_DB_SKILLS=xxx
NOTION_DB_EXPERIENCE=xxx
NOTION_PARENT_PAGE_ID=xxx

# Site (public)
PUBLIC_SITE_URL=https://your-domain.com
PUBLIC_DATA_SOURCE=notion          # "notion" or "local"
NOTION_FALLBACK_LOCAL=true         # fallback to local on Notion failure
PUBLIC_DEBUG_MODE=false
```

### CLI Commands

```bash
# Bootstrap — create Notion databases
npm run notion:bootstrap

# Migrate — seed local data to Notion
npm run notion:migrate             # all
node scripts/notion.mjs migrate -t profile
node scripts/notion.mjs migrate -t skills
node scripts/notion.mjs migrate -t experience
node scripts/notion.mjs migrate -t projects

# Sync — Notion → JSON (local fallback)
npm run notion:sync

# Verify — check Notion block content
npm run notion:verify

# Clean — archive Notion pages
npm run notion:clean
node scripts/notion.mjs clean -t projects
```

### Data Flow

```
Notion (primary)
    ↓ fetch at runtime
content.ts (orchestration)
    ↓ Zod validation
schemas.ts (types)
    ↓
components (render)

Local JSON/MDX (fallback)
    ↓ when PUBLIC_DATA_SOURCE=local
content.ts
    ↓
components
```

## Themes

Four built-in themes: `gallery` (default), `terminal`, `editorial`, `swiss`.

Switch via URL: `/?theme=terminal` or localStorage.

## Adding Content

### Projects (MDX)

Create `.mdx` files in `src/content/projects/`:

```mdx
---
title: My Project
category: Backend API
year: 2026
description: A brief description
stack: TypeScript,Node.js,PostgreSQL
featured: true
card_color: dark
---

## Overview

Project content here...
```

Then seed to Notion: `node scripts/notion.mjs migrate -t projects`

### Skills / Experience

Edit `public/data/content.json` or add directly in Notion UI.

## License

MIT
