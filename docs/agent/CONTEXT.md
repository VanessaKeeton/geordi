# Geordi — Agent Context

Stable reference for agents. Update when stack or structure changes.

## Stack

- **Extension framework:** [WXT](https://wxt.dev) (Manifest V3, Vite)
- **Language:** TypeScript
- **Package manager:** pnpm (workspace monorepo)
- **Tests:** Vitest + jsdom (for DOM extraction tests)

## Commands

| Command | Description |
|---|---|
| `pnpm install` | Install all workspace dependencies |
| `pnpm dev:ext` | Start extension dev server with hot reload |
| `pnpm build:ext` | Production build |
| `pnpm test` | Run tests in watch mode |
| `pnpm test:run` | Single test run |

## Folder map

```
geordi/
├── AGENTS.md                 # Start here
├── apps/extension/           # WXT browser extension (primary product)
│   └── src/
│       ├── entrypoints/      # background, content, sidepanel
│       └── lib/              # speech, content, ai, messages
├── packages/shared/          # Shared constants (minimal)
├── legacy/                   # Archived CLI — do not extend
└── docs/                     # Vision, architecture, ADRs, agent handoff
```

## Key files

| File | Purpose |
|---|---|
| `apps/extension/wxt.config.ts` | WXT + manifest config |
| `apps/extension/src/entrypoints/background.ts` | Service worker, side panel, messaging |
| `apps/extension/src/entrypoints/content.ts` | DOM wrapping, charIndex highlighting |
| `apps/extension/src/entrypoints/sidepanel/` | Side panel UI |
| `apps/extension/src/lib/content/extract.ts` | Page text extraction, skip rules |
| `apps/extension/src/lib/content/prepare-reading.ts` | Wrap page/selection before TTS |
| `apps/extension/src/lib/content/wrap-for-reading.ts` | Word spans + highlight walk |
| `apps/extension/src/lib/speech/reader.ts` | Web Speech API wrapper (`speakText`) |

## Environment variables

None required for core reading features. AI features (Phase 3) will use BYOK stored in `chrome.storage.local`.

## Browser target

Chrome first. Firefox/Edge in Phase 4.
