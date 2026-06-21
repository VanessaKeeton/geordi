# ADR 002: WXT for Cross-Browser Scaffold

**Status:** Accepted  
**Date:** 2026-06-21

## Context

Geordi needs a browser extension that starts on Chrome but will eventually support Firefox, Edge, and Safari. Options considered:

1. **Raw manifest + Vite** — maximum control, more boilerplate
2. **Plasmo** — React-focused, opinionated
3. **WXT** — Vite-based, file-system routing for entrypoints, first-class multi-browser builds

## Decision

Use [WXT](https://wxt.dev) with Vite. Start with Chrome target; enable other browsers in Phase 4.

## Consequences

- **Positive:** Entrypoint conventions (`entrypoints/background.ts`, `entrypoints/sidepanel/`) reduce manifest boilerplate
- **Positive:** Hot reload during development
- **Positive:** Built-in multi-browser build targets for future phases
- **Negative:** Team must learn WXT conventions
- **Negative:** WXT is a dependency we don't control
