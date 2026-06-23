# Agent Handoff

**Last updated:** 2026-06-23  
**Last agent task:** Issue #39 — preserve reading position when changing voice  
**Branch:** `issue-39-preserve-voice-position`

## Current state

- WXT extension with side panel reading UI
- Reader stops and resets when the reading tab refreshes or navigates away
- Play now prepares page/selection reading through the same content-script wrapping path as Read page/Read selection before starting speech
- Changing voice during reading resumes from the current speech boundary instead of restarting from the beginning
- Read page skips buttons/form inputs and nav/boilerplate; keeps link text in articles
- Follow-along highlighting uses the [speechify-dry-run](https://github.com/VanessaKeeton/speechify-dry-run) pattern
- Cross-browser AI provider foundation in `lib/ai/` + `lib/browser/`
- Extension version **0.2.5** (`apps/extension/package.json`)
- 61 unit tests passing

## Completed this session

- [x] Created GitHub issue #39 before starting the fix
- [x] Track continuous speech boundary offset for voice/rate restarts
- [x] Voice changes rebuild the utterance from the current boundary instead of the beginning
- [x] Added regression coverage for continuous-mode voice change position
- [x] Version bump `0.2.4` → `0.2.5` (bug fix)
- [x] Verified `pnpm test:run` and `pnpm build:ext` pass

## Next up (priority order)

1. **#25** — Chrome summarizer provider (`ChromeSummarizationProvider.summarize()`)
2. **#26** — Content extraction changes for AI features
3. **#27** — Rich image description pipeline
4. **#29** — Read-aloud UX (premium voices)
5. **#28** — BYOK cloud provider
6. **#30** — Availability/privacy UX
7. Phase 2: Structured navigation (#17)

## Known blockers

- Highlight alignment depends on browser `boundary` event support (Chrome)
- Chrome Built-in AI requires user flags / on-device model download in supported Chrome versions
- Plain `pnpm --filter @geordi/extension exec tsc --noEmit` still fails on pre-existing project-wide typing gaps (Chrome/jsdom/test globals and older strictness issues); WXT production build passes

## Do not touch

- `legacy/` — archived, reference only
- `LICENSE.md` — legal, needs human review to change
