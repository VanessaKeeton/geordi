# Agent Handoff

**Last updated:** 2026-06-26  
**Last agent task:** Issue #27 — Rich image description + page highlight cleanup  
**Branch:** `codex/issue-27-rich-image-description`

## Current state

- **Page image discovery** (`lib/content/page-images.ts`): finds meaningful `<img>` elements, filters decorative/hidden/tiny/tracking/boilerplate images, captures alt, src, dimensions, role, caption, nearby heading, and surrounding text
- **Provider contract** expanded in `lib/ai/types.ts` (`ImageDescriptionInput`, `ImageDimensions`, validation reasons, `outputLanguage`)
- **Input helpers** (`lib/ai/image-description-input.ts`): validation, prompt builder (no duplicate context), local data-URL → Blob conversion (no network)
- **Chrome adapter** (`lib/ai/providers/chrome/image-description.ts`): Prompt API multimodal `describeImage()` with `expectedOutputs: [{ type: "text", languages: [lang] }]`; prefers captured Blob bytes over live `<img>` to avoid canvas taint
- **Describe in content script** (`lib/content/describe-page-image-in-tab.ts`): capture + provider run in tab (live DOM)
- **Background image fetch** (`lib/content/fetch-page-image.ts`): fetches page-discovered http(s)/data URLs when canvas and same-origin fetch fail (bypasses page CSP)
- **Page image highlight** (`lib/content/highlight-page-image.ts`): fixed-position overlay + inline styles; background routes highlights to `pageImagesTabId`
- **Side panel Images section**: Find images → select (highlights on page) → Describe image → Read description (auto-reads after describe)
- **Messaging**: `GET_PAGE_IMAGES`, `DESCRIBE_PAGE_IMAGE`, `FETCH_PAGE_IMAGE`, `HIGHLIGHT_PAGE_IMAGE`, etc.
- Extension version **0.4.2** (`apps/extension/package.json`)
- **148 unit tests** passing

## Completed this session

- [x] Image discovery + context extraction pipeline with tests
- [x] Chrome `LanguageModel` multimodal describeImage implementation
- [x] Side panel UI: availability note, find/select/describe/read controls
- [x] Content-script describe flow + background fetch for CDN/cross-origin capture
- [x] Fix Prompt API output language and canvas taint errors
- [x] Page image highlight (overlay + correct tab routing)
- [x] Image description read-aloud with word highlighting in side panel
- [x] Code cleanup: rename background fetch API, remove unused `GET_IMAGE_DESCRIPTION_INPUT` path

## Next up (priority order)

1. **#29** — Read-aloud UX (premium voices)
2. **#28** — BYOK cloud provider
3. **#30** — Availability/privacy UX
4. Phase 2: Structured navigation (#17)

## Known limitations

- Image description fetches URLs discovered on the active page when you choose Describe image (including CDN/third-party hosts); core read-aloud stays local with no network
- Chrome Prompt API multimodal requires Chrome 138+ with Gemini Nano; output languages: de, en, es, fr, ja
- Discovery scans `<img>` only (not CSS backgrounds, `<svg role="img">`, or cross-origin iframe images yet)
- Selecting an image in the picker outlines it on the page and scrolls it into view
