# AI Coding Agent Instructions — KRM.lib

*(Mirror this file into the root `AGENTS.md`, and into `CLAUDE.md` / `.cursorrules` / tool-specific rule files if your tool requires one. Keep this document as the single source.)*

## 1. Project Context
**Project:** KRM.lib — *Knowledge · Resource · Management*.
**Purpose:** Premium digital publishing & knowledge-commerce platform: public storefront, customer library/reader, admin back-office, reserved creator system. It must feel like **a curated digital library that happens to have an exceptional ecommerce system underneath** — not a generic ecommerce template.
**Primary users:** Readers (India + global), guest buyers, admin operators; creators later.

## 2. Source of Truth (read before significant work)
Priority order:
1. Existing working functionality in the repo (don't break it — integrate new UI into it)
2. UI/UX reference images in `UIUX/` (33 sheets)
3. Page architecture (if provided) → else `ARCHITECTURE.md` §6
4. These docs
5. Your own judgment — only for undefined details, and record it

Read: `SOURCES_CONFLICTS_GAPS.md` → `PRD.md` → `UX_FLOWS.md` → `DESIGN_SYSTEM.md` → `ARCHITECTURE.md` → `DATABASE.md` → `API.md` → `SECURITY.md` → `CODE_STYLE.md` → `TESTING.md`.
Original prompts live in `prompt-doc/` (Master Implementation Prompt; UI/UX Design System Prompt).

**Do not contradict these documents without first identifying the conflict and asking.**

## 3. Hard Rules (never violate)

**Security & correctness**
1. **Never trust the client** for prices, roles, ownership, payment success, or download permission.
2. Pricing/discount logic is **server-authoritative**, in the `pricing` module only.
3. **No fake payments, fake downloads, fake publish, fake checkout.** Real provider flows (Razorpay + Stripe) with signature verification and webhooks.
4. Paid files are **never** reachable by raw/guessable URL. All delivery through entitlement-checked signed/protected routes.
5. Never expose secrets to the client; never log secrets/PII.
6. Every admin mutation is permission-checked server-side **and** audit-logged.
7. Money is integer minor units + currency; **never hardcode ₹/$ or tax rates**.

**Product & design**
8. Preserve the KRM.lib identity (warm editorial library). **No generic SaaS/Shopify/Gumroad look. No blue/indigo/neon palettes.**
9. Use the design tokens and component inventory. **No arbitrary values, no one-off styles.**
10. Library is **data-driven** — never hardcode books. A published product must appear automatically.
11. Build **templates with states**, not hundreds of duplicate pages ("FEWER, BETTER, REUSABLE SYSTEMS").
12. If a page isn't in the references: find the closest KRM pattern, reuse and extend — don't invent a new visual language.
13. **Do not place the screenshots in the UI.** Recreate the interface.
14. Glass only on floating/overlay surfaces. Respect reduced motion/transparency.
15. **No fabricated data:** no lorem ipsum, fake testimonials, fake stats, fake "limited offer" countdowns. Demo data must be labeled as demo seed.
16. Quantity is always 1 for digital products (C2).

**Process**
17. Don't invent business requirements, database fields, APIs, components or patterns that are already defined — and don't guess where undefined: **ask or log an assumption**.
18. Don't rewrite working systems unnecessarily. Don't change unrelated files.
19. Avoid new dependencies unless justified (record in `DECISIONS.md`).

## 4. First Task Protocol (before large code changes) — master §82
1. Inspect the entire existing project (structure, routes, components, DB, APIs, auth, payments, storage, env vars).
2. Inspect all reference images (`UIUX/`).
3. Read these docs end to end, especially the Conflicts & Gaps register.
4. Map the existing codebase against the required architecture.
5. Produce a **concise implementation plan** listing: existing functionality · components · routes · DB · APIs · auth · payments · storage · **missing functionality** · UI areas requiring redesign · architecture/security/performance risks · assumptions · questions.
6. **Stop and wait for approval.** Do not start rewriting everything.

## 5. Planning (non-trivial tasks)
1. Inspect relevant docs → relevant code
2. Identify affected files, modules, routes, components
3. Identify DB/API changes and migrations
4. Identify security implications
5. Identify tests needed (unit/integration/e2e/a11y)
6. Identify states needed (loading/empty/error/success/offline)
7. Write a short plan; **wait for approval** when the change is large, touches payments/auth/entitlements/schema, or conflicts with docs

## 6. Implementation Order (master §74)
Phase 1 Foundation → 2 Data → 3 Storefront → 4 Commerce → 5 Customer → 6 Admin → 7 Polish. Don't skip ahead; each phase leaves the app working and tested.

During implementation: smallest correct change · reuse patterns · preserve behavior · server components by default · lazy-load heavy parts · typed, validated boundaries · accessible by default · mobile recomposed intentionally.

## 7. Validation (after every task)
1. Run tests · 2. Lint · 3. Type check · 4. Build · 5. Review the full diff for unintended changes · 6. Look for regressions & security issues · 7. Verify loading/empty/error states, keyboard, mobile viewport · 8. For UI work, compare against the relevant reference image and note deliberate deviations.
Report: what changed · files · tests run + results · remaining issues · docs needing updates.

## 8. Documentation Upkeep

| If you change… | Update |
|---|---|
| Product behavior | `PRD.md`, `UX_FLOWS.md` |
| Visual tokens/components | `DESIGN_SYSTEM.md` |
| Structure/boundaries/routes | `ARCHITECTURE.md` |
| Schema | `DATABASE.md` (+ migration) |
| Endpoints/errors | `API.md` |
| Auth/payments/files/permissions | `SECURITY.md` |
| Conventions/tooling | `CODE_STYLE.md` |
| Test strategy/commands | `TESTING.md` |
| Env vars | `ENVIRONMENT.md` + `.env.example` |
| Technical decision | `DECISIONS.md` |
| Priorities | `ROADMAP.md` · Releases → `CHANGELOG.md` |

## 9. Conflict Handling
If requirements conflict (including between the two original prompts and the mockups): **do not guess.** Check `SOURCES_CONFLICTS_GAPS.md` for an existing proposed resolution; if absent, state the conflict, propose options with trade-offs, and ask. Log the outcome in `DECISIONS.md`.

## 10. Completion Criteria
A task is complete only when: requirements satisfied · tests pass · build/lint/types pass · states handled · a11y/mobile checked · security rules respected · no unintended changes · docs updated.

## 11. Communication Style
Be concise and specific. Surface risks early. Never claim something works without having run it. Distinguish **verified** from **assumed**. When something is a stub or unavailable, label it in the UI and in your report.
