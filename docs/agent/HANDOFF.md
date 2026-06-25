# Agent Handoff

**Last updated:** 2026-06-24  
**Last agent task:** Issue #26 — Page content extraction contract  
**Branch:** `codex/issue-26-content-extraction`

## Current state

- WXT extension with TNG Operations / Engineering branded side panel
- Structured `PageContent` extraction for summaries and future AI providers
- Read-aloud path unchanged (`preparePageReading` / `GET_PAGE_READING`)
- New content-script messages: `GET_PAGE_CONTENT`, `GET_SELECTION_CONTENT`
- Dev-mode `console.debug` for summary input inspection (`[geordi] PageContent`)
- Extension version **0.2.6** (no bump — internal API only, no user-visible UI change)
- 72 unit tests passing

## Completed this session

- [x] Added `PageContent` contract in `lib/content/page-content.ts` (metadata, structure, guardrails, `toSummaryInput`)
- [x] Added `extractPageContent()` / `extractSelectionContent()` in `lib/content/extract.ts`
- [x] Extended DOM walk to collect headings and links (capped at 50 / 100)
- [x] Guardrails for empty, truncated (100k chars), and failed extraction
- [x] Wired `GET_PAGE_CONTENT` / `GET_SELECTION_CONTENT` through background → content script
- [x] Re-exported `PageContent` from `lib/ai/types.ts` for provider adapters (#25)
- [x] 11 new tests in `page-content.test.ts` and `extract.test.ts`
- [x] Verified `pnpm test:run` (72 tests) and `pnpm build:ext` pass

## Next up (priority order)

1. **#25** — Chrome summarizer provider (`ChromeSummarizationProvider.summarize()` using `PageContent` / `toSummaryInput`)
2. **#27** — Rich image description pipeline
3. **#29** — Read-aloud UX (premium voices)
4. **#28** — BYOK cloud provider
5. **#30** — Availability/privacy UX
6. Phase 2: Structured navigation (#17)

## Known blockers

- Highlight alignment depends on browser `boundary` event support (Chrome)
- Chrome Built-in AI requires user flags / on-device model download in supported Chrome versions
- Plain `pnpm --filter @geordi/extension exec tsc --noEmit` still fails on pre-existing project-wide typing gaps (Chrome/jsdom/test globals and older strictness issues); WXT production build passes

## Do not touch

- `legacy/` — archived, reference only
- `LICENSE.md` — legal, needs human review to change
