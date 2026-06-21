# Geordi — Agent Guide

> Accessibility browser extension. Read this before making changes.

## Quick start

```bash
pnpm install
pnpm dev:ext
```

Load the extension from `apps/extension/.output/chrome-mv3-dev` in `chrome://extensions` (Developer mode → Load unpacked).

## Read next (in order)

1. [docs/agent/HANDOFF.md](docs/agent/HANDOFF.md) — what's happening right now
2. [docs/agent/CONTEXT.md](docs/agent/CONTEXT.md) — stable project reference
3. [docs/VISION.md](docs/VISION.md) — mission constraints (core a11y is always free)
4. [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — how the extension is structured

## Hard rules

- Core reading features must work without API keys or network
- All UI must be keyboard-navigable and screen-reader friendly
- Never gate accessibility behind a paywall
- Update `docs/agent/HANDOFF.md` before ending your session

## Workflow

One GitHub issue → one branch → one PR → review → merge.

**Version:** Bump `apps/extension/package.json` in every PR that ships user-visible extension changes. See [docs/CONVENTIONS.md](docs/CONVENTIONS.md#versioning).

Phase 1 epic: https://github.com/VanessaKeeton/geordi/issues/2
