# Conventions

## Language and style

- TypeScript for all extension code
- ES modules (`import`/`export`)
- Prefer named exports over default exports (except WXT entrypoints which require `export default defineBackground` etc.)

## File organization

- Extension code lives in `apps/extension/src/`
- One module per file; colocate tests as `*.test.ts` next to source
- Shared types in `lib/messages.ts` until `packages/shared` grows

## Naming

- Files: `kebab-case.ts` for utilities, WXT entrypoint names match their role (`background.ts`, `content.ts`)
- Functions: `camelCase`, verbs for actions (`extractPageText`, `createSpeechReader`)
- Types/interfaces: `PascalCase`
- Storage keys: `geordi:` prefix (`geordi:speech-settings`)

## Imports

- Use relative imports within the extension
- No deep barrel files yet — import from concrete paths

## Commits and branches

- Branch: `issue-N-short-description` (e.g. `issue-3-wxt-scaffold`)
- One issue per PR
- Commit messages: imperative mood, reference issue number

## Accessibility

- Semantic HTML in all UI (`button`, `fieldset`, `legend`, `label`)
- ARIA live regions for dynamic status
- WCAG 2.2 AA contrast minimum
- See `.cursor/rules/accessibility.mdc` for full requirements
