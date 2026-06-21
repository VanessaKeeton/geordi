# Agent Handoff

**Last updated:** 2026-06-21  
**Last agent task:** #21 — Skip form controls in page read + follow-along highlighting

## Current state

- WXT extension with side panel reading UI
- Read page skips buttons/form inputs; keeps link text in articles
- Follow-along highlighting uses the [speechify-dry-run](https://github.com/VanessaKeeton/speechify-dry-run) pattern:
  - Content script wraps readable text in word/sentence spans
  - Side panel speaks **one full utterance** via `SpeechReader.speakText()`
  - `boundary` `charIndex` maps to spans in the same page DOM
- Pause/resume in continuous mode uses `speechSynthesis.pause()` / `resume()`
- 40 unit tests passing

## Completed this session

- [x] Skip buttons and form inputs during Read page extraction
- [x] `wrap-for-reading.ts` — DOM span wrapping + charIndex highlight walk
- [x] `prepare-reading.ts` — wrap page/selection before TTS
- [x] Messaging: `PAGE_READING.text`, `HIGHLIGHT_AT_CHAR`, `TEARDOWN_READING`
- [x] `SpeechReader.speakText()` single-utterance mode
- [x] Unit tests for wrap-for-reading and reader continuous mode

## Next up (priority order)

1. **Manual testing in Chrome** — reload extension, verify highlight tracks speech on a real page (#21)
2. Phase 2: Structured navigation (#17) — heading list, link list
3. Phase 3: AI features stub → BYOK (#18)

## Known blockers

- None — highlight alignment depends on browser `boundary` event support (Chrome)

## Do not touch

- `legacy/` — archived, reference only
- `LICENSE.md` — legal, needs human review to change
