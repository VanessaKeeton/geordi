# Agent Handoff

**Last updated:** 2026-06-21  
**Last agent task:** #24 — Cross-browser AI provider foundation  
**PR:** (pending) — branch `issue-24-ai-provider-foundation`

## Current state

- WXT extension with side panel reading UI
- Read page skips buttons/form inputs and nav/boilerplate; keeps link text in articles
- Follow-along highlighting uses the [speechify-dry-run](https://github.com/VanessaKeeton/speechify-dry-run) pattern
- Cross-browser AI provider foundation in `lib/ai/` + `lib/browser/`:
  - `ProviderRegistry` with summarization, image description, and read-aloud slots
  - Structured `ProviderAvailability` states (available, downloadable, downloading, unsupported, requires_configuration)
  - Chrome Built-in AI adapters isolated under `lib/ai/providers/chrome/` (availability probing only; #25/#27 implement operations)
  - Web Speech read-aloud baseline provider in `lib/speech/read-aloud-provider.ts`
  - BYOK cloud summarization placeholder returns `requires_configuration` (#28)
- Extension version **0.2.1** (`apps/extension/package.json`)
- 56 unit tests passing

## Completed this session

- [x] WebExtension runtime shim (`lib/browser/runtime.ts`)
- [x] Provider contracts, availability helpers, and registry
- [x] Chrome-specific detection/adapters (no feature-level Chrome API imports)
- [x] Unsupported + BYOK placeholder providers
- [x] Unit tests for registry, availability, browser shim, read-aloud provider
- [x] Version bump `0.2.0` → `0.2.1` (internal foundation)

## Next up (priority order)

1. **#25** — Chrome summarizer provider (`ChromeSummarizationProvider.summarize()`)
2. **#26** — Content extraction changes for AI features
3. **#27** — Rich image description pipeline
4. **#29** — Read-aloud UX (premium voices)
5. **#28** — BYOK cloud provider
6. **#30** — Availability/privacy UX
7. Adaptive highlight contrast (post-#21 follow-up)
8. Phase 2: Structured navigation (#17)

## Known blockers

- Highlight contrast on dark-background pages
- Highlight alignment depends on browser `boundary` event support (Chrome)
- Chrome Built-in AI requires user flags / on-device model download in supported Chrome versions

## Do not touch

- `legacy/` — archived, reference only
- `LICENSE.md` — legal, needs human review to change
