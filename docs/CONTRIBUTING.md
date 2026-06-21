# Contributing

## Workflow

1. Pick an issue from [GitHub Issues](https://github.com/VanessaKeeton/geordi/issues)
2. Create a branch: `issue-N-short-description`
3. Implement with tests where applicable
4. Open a PR referencing the issue
5. Ensure accessibility checklist passes for any UI changes

## PR checklist

- [ ] Issue referenced in PR description
- [ ] Tests pass (`pnpm test:run`)
- [ ] Extension builds (`pnpm build:ext`)
- [ ] UI changes are keyboard-navigable
- [ ] No API keys or network required for core reading features
- [ ] `docs/agent/HANDOFF.md` updated if ending an agent session

## Accessibility review gate

Any PR touching `entrypoints/sidepanel/` or UI components must verify:

- Semantic HTML (no div-only buttons)
- Visible focus indicators
- ARIA live regions for status updates
- WCAG 2.2 AA contrast

## AI agents

If you're an AI agent, start with [AGENTS.md](../AGENTS.md) and update [docs/agent/HANDOFF.md](agent/HANDOFF.md) before ending your session.
