# Agent Handoff

**Last updated:** 2026-06-21  
**Last agent task:** #21 — Skip form controls in page read + follow-along highlighting  
**PR:** [#22](https://github.com/VanessaKeeton/geordi/pull/22) (branch `issue-21-reading-highlight`)

## Current state

- WXT extension with side panel reading UI
- Read page skips buttons/form inputs and nav/boilerplate; keeps link text in articles
- Follow-along highlighting uses the [speechify-dry-run](https://github.com/VanessaKeeton/speechify-dry-run) pattern:
  - Content script wraps readable text in word/sentence spans (`wrap-for-reading.ts`)
  - Side panel speaks **one full utterance** via `SpeechReader.speakText()`
  - `boundary` `charIndex` maps to spans in the same page DOM
- Open shadow DOM supported via `deep-dom.ts`; highlight messages pinned to reading tab in background
- Pause/resume in continuous mode uses `speechSynthesis.pause()` / `resume()`
- 43 unit tests passing; manual testing confirmed on article pages and Google News

## Completed this session

- [x] Skip buttons, form inputs, and nav/boilerplate during Read page
- [x] `wrap-for-reading.ts` + `prepare-reading.ts` — DOM span wrapping + charIndex highlight walk
- [x] Messaging: `PAGE_READING.text`, `HIGHLIGHT_AT_CHAR`, `CLEAR_HIGHLIGHT`, `TEARDOWN_READING`
- [x] `SpeechReader.speakText()` single-utterance mode
- [x] PR #22 opened; user-verified working on real pages

## Next up (priority order)

1. Merge PR #22 after review
2. **Adaptive highlight contrast** — fixed yellow/orange highlights are unreadable on dark pages (white-on-yellow); `contrast.ts` exists but is not wired into `wrap-for-reading.ts` yet
3. Phase 2: Structured navigation (#17) — heading list, link list
4. Phase 3: AI features stub → BYOK (#18)

## Known blockers

- Highlight contrast on dark-background pages (tracked as follow-up, not a #21 blocker)
- Highlight alignment depends on browser `boundary` event support (Chrome)

## Do not touch

- `legacy/` — archived, reference only
- `LICENSE.md` — legal, needs human review to change
