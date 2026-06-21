# Open Questions

Unresolved decisions. Add new questions here; remove when decided (and document in `docs/adr/`).

## Active

| Question | Notes |
|---|---|
| Adaptive highlight contrast on dark pages | `contrast.ts` exists; wiring into `wrap-for-reading.ts` deferred post-#21. Fixed yellow/orange unreadable on white text. |

## Resolved

| Question | Decision | ADR |
|---|---|---|
| CLI vs browser extension? | Browser extension | [001](adr/001-browser-extension-over-vision-cli.md) |
| WXT vs Plasmo vs raw manifest? | WXT | [002](adr/002-wxt-for-cross-browser-scaffold.md) |
| Side panel vs popup vs overlay? | Side panel | [003](adr/003-side-panel-over-popup.md) |
