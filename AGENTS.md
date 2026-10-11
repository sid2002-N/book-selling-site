# KRM.lib — agent instructions

The single source of agent rules is [`docs/AGENTS.md`](docs/AGENTS.md). Read it before any significant work.

- Visual references: `UIUX/` (33 mockup sheets, ~330 screens)
- Original prompts: `prompt-doc/`
- Project docs: `docs/` (start with `SOURCES_CONFLICTS_GAPS.md`, then `PRD.md`, `DESIGN_SYSTEM.md`, `ARCHITECTURE.md`, `DATABASE.md`, `API.md`, `SECURITY.md`)
- Decisions: `docs/DECISIONS.md`

Hard rules in short: never trust the client for prices, roles, ownership, payment status or download rights; no fake functionality or fabricated data; design tokens only; data-driven library; templates with states instead of duplicate pages.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
