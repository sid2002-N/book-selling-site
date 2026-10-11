# Appendix B — Copy-Paste Prompts for the Agent

## B.1 Bootstrap prompt (use first)

```text
You are working on KRM.lib. Do NOT write application code yet.

Read everything in /docs (start with SOURCES_CONFLICTS_GAPS.md, then PRD, UX_FLOWS,
DESIGN_SYSTEM, ARCHITECTURE, DATABASE, API, SECURITY, CODE_STYLE, TESTING, AGENTS),
the two original prompts in /prompt-doc, and all reference images in
/UIUX.

Then:
1. Inspect the existing repository completely (structure, routes, components, DB,
   APIs, auth, payments, storage, env vars). If it is empty, say so.
2. Summarize your understanding of the product in under 300 words.
3. List conflicts, gaps and missing information you found beyond the register.
4. Map the existing code against the required architecture.
5. Produce a concise implementation plan: existing vs missing functionality, UI areas
   needing work, architecture/security/performance risks, assumptions, and the exact
   questions you need answered.
6. Propose the Phase 1 scope and the file/folder structure you will create.

Do not modify anything. Wait for my approval.
```

## B.2 Phase kickoff prompt

```text
Begin PHASE [N — NAME] from ROADMAP.md.

Before changing code:
1. Re-read the relevant docs and reference images for this phase.
2. Inspect the current code that this phase touches.
3. List affected files/modules/routes/components, DB and API changes, security
   considerations, tests required, and states (loading/empty/error) needed.
4. Present a short plan and wait for approval.

After approval: implement the smallest correct change per step, reuse components
and tokens, follow the design system, keep server logic authoritative, and add tests.

When done: run tests, lint, typecheck, build; review the diff; verify mobile/keyboard;
report what changed, tests run, results, remaining issues, and docs to update.
```

## B.3 Feature prompt

```text
I want to add this feature: [FEATURE]

Before changing code:
1. Read the relevant docs; say which documents are affected.
2. Inspect the existing implementation and explain the current architecture for it.
3. Identify frontend files, backend/API files, DB changes, security considerations,
   tests required, and which reference image/pattern it should inherit from.
4. Create an implementation plan. Do not modify unrelated parts.

After approval, implement, then run tests/lint/typecheck/build, review the diff,
and update docs.
```

## B.4 UI screen prompt (design-consistency)

```text
Implement the screen: [SCREEN NAME] at route [ROUTE].

1. Identify the matching reference image and the closest existing KRM component/pattern.
2. Reuse tokens, components, spacing, typography, radius, shadows, interaction patterns.
3. Build it as a template/state, not a one-off page.
4. Provide loading, empty, error, and (if relevant) success/offline states.
5. Recompose for mobile (not a shrunken desktop): bottom sheets, sticky CTAs, rails.
6. Use real data from the service layer — no hardcoded content, no fake numbers.
7. Verify keyboard, focus, contrast, reduced-motion.
Do not embed the screenshot. Report deliberate deviations from the reference.
```

## B.5 Payment work prompt

```text
Implement/modify the payment flow for [Razorpay | Stripe].

Requirements: server computes amounts; idempotency keys; create provider order/intent
on the server; verify signature AND provider status; webhook with raw-body signature
verification and unique-event idempotency; handle success/failed/cancelled/pending/
retry/refund/dispute/reconciliation; never mark paid from client callback alone;
amount+currency match check; redacted logs; tests for each state and replay.

First show the plan and the state-transition table. Do not use mocked success.
```

## B.6 Code review prompt

```text
Review the changes you just made as a senior engineer. Do not modify anything yet.

Check: requirement mismatches, architecture/layer violations, duplicate logic,
unnecessary abstractions, security (authz/IDOR, price/role trust, file exposure,
secrets, logging), database issues, API inconsistencies, accessibility, responsive
issues, missing loading/empty/error states, missing tests, regressions, unnecessary
dependencies, unintended file changes, deviations from the reference images.

Compare against /docs. Output: 1) Findings 2) Severity 3) Recommended fixes
4) Docs to update.
```

## B.7 Docs-update prompt

```text
Review whether your last implementation changed any documented requirements,
architecture, schema, API contracts, security rules, conventions, env vars, or
decisions. If yes, update the matching /docs files (and .env.example, CHANGELOG),
and list exactly what you changed.
```
