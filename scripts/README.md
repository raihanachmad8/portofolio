# Scripts Documentation

## Root Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run aruna:build` | Build knowledge base payload |
| `npm run aruna:smoke` | Smoke test KB retrieval |
| `npm run i18n:verify` | Verify translation completeness |

## Notion Commands

| Script | Purpose |
|--------|---------|
| `npm run notion:bootstrap` | Create Notion databases |
| `npm run notion:migrate` | Seed local data to Notion |
| `npm run notion:sync` | Pull Notion → local JSON/MDX |
| `npm run notion:verify` | Check Notion connection |
| `npm run notion:clean` | Archive Notion pages |

## Script Architecture

```
scripts/
├── lib/                    # Shared utilities
│   ├── notion-client.mjs   # Notion API client
│   ├── notion-data.mjs     # Data transformation
│   ├── notion-to-md.mjs    # Notion blocks → Markdown
│   ├── frontmatter.mjs     # YAML frontmatter parser
│   ├── content-loader.mjs  # MDX file loading
│   ├── kb-builder.mjs      # KB construction
│   ├── esbuild-helper.mjs  # TS → CJS bundling
│   ├── fs.mjs              # File I/O helpers
│   └── paths.mjs           # Path constants
├── commands/                # CLI subcommands
│   ├── bootstrap.mjs
│   ├── migrate.mjs
│   ├── sync.mjs
│   ├── verify.mjs
│   └── clean.mjs
└── lib/                             # Shared utilities
    ├── notion-client.mjs
    ├── notion-data.mjs
    ├── notion-to-md.mjs
    ├── frontmatter.mjs
    ├── content-loader.mjs
    ├── fs.mjs
    └── paths.mjs
```

## Configuration

Uses `.env` for Notion credentials:

```env
NOTION_TOKEN=ntn_...
NOTION_PARENT_PAGE_ID=...
NOTION_DB_PROFILE=...
NOTION_DB_PROJECTS=...
PUBLIC_DATA_SOURCE=local  # or "notion"
```
