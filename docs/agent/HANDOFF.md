# Agent Handoff

**Last updated:** 2026-06-26  
**Last agent task:** Issue #27 — Fix image describe errors (language + taint)  
**Branch:** `codex/issue-27-rich-image-description`

## Current state

- **Page image discovery** (`lib/content/page-images.ts`): finds meaningful `<img>` elements, filters decorative/hidden/tiny/tracking/boilerplate images, captures alt, src, dimensions, role, caption, nearby heading, and surrounding text
- **Provider contract** expanded in `lib/ai/types.ts` (`ImageDescriptionInput`, `ImageDimensions`, validation reasons, `outputLanguage`)
- **Input helpers** (`lib/ai/image-description-input.ts`): validation, prompt builder (no duplicate context), local data-URL → Blob conversion (no network)
- **Chrome adapter** (`lib/ai/providers/chrome/image-description.ts`): Prompt API multimodal `describeImage()` with `expectedOutputs: [{ type: "text", languages: [lang] }]`; prefers captured Blob bytes over live `<img>` to avoid canvas taint
- **Describe in content script** (`lib/content/describe-page-image-in-tab.ts`): capture + provider run in tab (live DOM)
- **Same-origin fetch** (`lib/content/fetch-same-origin-image.ts`): background fetch bypasses page CSP when canvas capture fails
- **Side panel Images section**: Find images → select → Describe image → Read description (auto-reads after describe)
- **Messaging**: `GET_PAGE_IMAGES`, `DESCRIBE_PAGE_IMAGE`, `FETCH_SAME_ORIGIN_IMAGE`, etc.
- Extension version **0.4.1** (`apps/extension/package.json`)
- **139 unit tests** passing

## Completed this session

- [x] Image discovery + context extraction pipeline with tests
- [x] Chrome `LanguageModel` multimodal describeImage implementation
- [x] Side panel UI: availability note, find/select/describe/read controls
- [x] Content-script describe flow + same-origin background fetch for capture
- [x] Fix Prompt API output language (`resolveChromePromptOutputLanguage`, page `lang` → model options)
- [x] Fix taint errors: prefer captured bytes over live `HTMLImageElement`; clearer cross-origin message
- [x] Verified `pnpm test:run` (139 tests) and `pnpm build:ext`

## Next up (priority order)

1. **#29** — Read-aloud UX (premium voices)
2. **#28** — BYOK cloud provider
3. **#30** — Availability/privacy UX
4. Phase 2: Structured navigation (#17)

## Known limitations

- Image description fetches URLs discovered on the active page when you choose Describe image (including CDN/third-party hosts); core read-aloud stays local with no network
- Chrome Prompt API multimodal requires Chrome 138+ with Gemini Nano; output languages: de, en, es, fr, ja
- Discovery scans `<img>` only (not CSS backgrounds or `<svg role="img">` yet)
- Image description read-aloud has no word highlighting (side-panel text only)

## Uncommitted work

Fixes for describe failures (language + taint) plus prior 0.4.1 capture/background work — commit pending.
