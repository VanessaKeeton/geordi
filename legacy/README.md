# Legacy CLI (archived)

This folder contains the original Geordi prototype: a Node.js CLI that captured webpage screenshots with Puppeteer and sent them to a vision-language model.

**Status:** Archived — not actively maintained.

The project pivoted to a browser extension approach. See `docs/adr/001-browser-extension-over-vision-cli.md`.

## What was here

- `scripts/capture.js` — Puppeteer screenshot + DOM serialization
- `scripts/sendToModel.js` — OpenAI vision model integration
- `helpers/` — Model prompt helpers
- `__tests__/` — CLI tests

## Running (reference only)

These scripts are no longer wired in the root `package.json`. To run manually:

```bash
cd legacy
node scripts/capture.js https://example.com
```

Requires `OPEN_AI_KEY` in environment for vision model scripts.
