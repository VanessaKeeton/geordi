# ADR 001: Browser Extension Over Vision CLI

**Status:** Accepted  
**Date:** 2026-06-21

## Context

The original Geordi prototype used Puppeteer to capture screenshots and sent them to a vision-language model (GPT) to interpret page content. This approach was:

- Expensive (API costs per page view)
- Slow (network round-trip + model inference)
- Redundant (the browser already has structured DOM access)
- Not usable in real-time browsing (CLI-only workflow)

## Decision

Pivot to a browser extension that reads page content directly from the DOM and uses the Web Speech API for text-to-speech.

## Consequences

- **Positive:** Free core reading with no network dependency; real-time use while browsing; faster and more reliable
- **Positive:** DOM access is more accurate than vision for text extraction
- **Negative:** Cannot interpret purely visual/canvas content without additional work
- **Negative:** Requires users to install an extension

Legacy CLI code archived in `legacy/` for reference.
