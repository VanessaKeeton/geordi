# ADR 003: Side Panel Over Popup

**Status:** Accepted  
**Date:** 2026-06-21

## Context

Geordi needs a persistent UI for reading controls, voice settings, and (future) navigation aids. Options:

1. **Toolbar popup** — compact but closes when focus leaves; poor for long reading sessions
2. **On-page overlay** — persistent but can conflict with site styles and z-index; may break site layouts
3. **Chrome Side Panel** — persistent alongside the page; dedicated space; native browser chrome

## Decision

Use the Chrome Side Panel API as the primary UI surface.

## Consequences

- **Positive:** Persistent during reading sessions — no focus traps from modal popups
- **Positive:** Full keyboard navigation without competing with page focus
- **Positive:** Native browser UI — doesn't inject into page DOM
- **Negative:** Side Panel API is Chrome-specific; Firefox uses sidebar action (Phase 4)
- **Negative:** Requires `sidePanel` permission

## Accessibility rationale

Side panels allow users to operate Geordi controls while keeping the page visible and navigable. Popups close on blur, which is disruptive for screen reader users managing reading sessions.
