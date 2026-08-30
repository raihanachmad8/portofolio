# Components Structure

## Organization

```
src/components/
├── Header.astro          — Navigation & theme toggle
├── Hero.astro            — Landing section
├── About.astro           — Profile info
├── Works.astro           — Featured projects
├── Skills.astro          — Skills grid
├── Experience.astro      — Timeline
├── Blog.astro            — Blog listing
├── ContactFooter.astro   — Contact & social
├── NewsTicker.astro      — Animated ticker
├── SEO.astro             — Head metadata
├── SectionHead.astro     — Reusable section header
│
└── aruna/                — AI chatbot subsystem
    ├── ArunaChat.astro   — Server shell + data loading
    ├── ArunaChatClient.ts — Client orchestrator
    ├── chat-render.ts    — Message rendering
    ├── chat-thinking.ts  — Thinking animation
    ├── chat-cmds.ts      — Command palette
    └── aruna.css         — All chat styles
```

## Pattern: Smart Components (Data Fetching)

All page components fetch data in the frontmatter:

```astro
---
import { getAllProjects } from '@lib/content';
import { getRuntimeEnv } from '@lib/utils';

const env = getRuntimeEnv(Astro);
const projects = await getAllProjects(env);
---
```

## Adding New Components

1. **Small, single-purpose** → Root level (e.g., `Navbar.astro`)
2. **Data fetching** → Follows smart component pattern
3. **Complex interactive** → Subdirectory with `.astro` + `.ts` (like `aruna/`)
