# Architecture

## Overview

Geordi is a Manifest V3 browser extension built with WXT. It runs three isolated contexts that communicate via `chrome.runtime.sendMessage`.

```mermaid
flowchart LR
  SidePanel[Side Panel UI]
  Background[Background SW]
  Content[Content Script]
  Page[Web Page DOM]

  SidePanel -->|"GET_PAGE_READING"| Background
  Background -->|"forward"| Content
  Content -->|"extractPageReading"| Page
  Content -->|"PAGE_READING"| Background
  Background -->|"PAGE_READING"| SidePanel
  SidePanel -->|"SpeechReader"| TTS[Web Speech API]
  SidePanel -->|"HIGHLIGHT_SENTENCE"| Background
  Background -->|"forward"| Content
  Content -->|"highlightRange"| Page
```

## Extension contexts

| Context | Entrypoint | Role |
|---|---|---|
| Background | `entrypoints/background.ts` | Side panel registration, keyboard shortcut, message relay |
| Content | `entrypoints/content.ts` | DOM extraction, sentence highlighting |
| Side panel | `entrypoints/sidepanel/` | User controls, TTS playback, settings |

## Modules

| Module | Path | Purpose |
|---|---|---|
| Content extraction | `lib/content/extract.ts` | DOM → sentences + Range mapping for TTS |
| Range mapping | `lib/content/range-map.ts` | Stream offsets → live DOM Ranges |
| Highlight | `lib/content/highlight.ts` | CSS Highlight API, adaptive color, auto-scroll |
| Contrast | `lib/content/contrast.ts` | WCAG contrast helpers for highlight palette |
| Speech reader | `lib/speech/reader.ts` | Web Speech API queue, pause/resume, settings |
| Messages | `lib/messages.ts` | Typed message contracts between contexts |
| AI provider | `lib/ai/provider.ts` | Stub for Phase 3 BYOK/paid features |

## Message flow: Read page

1. User clicks "Read page" in side panel
2. Side panel sends `{ type: "GET_PAGE_READING" }` to background
3. Background forwards to content script in active tab
4. Content script runs `extractPageReading()` — skips buttons/form inputs, returns `{ type: "PAGE_READING", sentences, title }` and stores `Range[]` in session
5. Side panel passes sentences to `SpeechReader.speakSentences()`
6. On each sentence event, side panel sends `{ type: "HIGHLIGHT_SENTENCE", index }`; content script highlights and scrolls
7. On pause/stop/end, side panel sends `{ type: "CLEAR_HIGHLIGHT" }`

## Storage

User preferences (voice, speed) stored in `chrome.storage.local` under key `geordi:speech-settings`.

## Free vs paid boundary

Core reading path uses only DOM APIs and Web Speech API — no network. AI module (`lib/ai/`) is stubbed until Phase 3.
