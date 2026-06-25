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

## GitHub labels

| Label | Use for |
|---|---|
| `idea` | Exploratory side quests, spikes, and “what if we tried…” work |
| `design` | Branding, visual design, and UI polish |
| `enhancement` | Shipped improvements and planned features |
| `bug` | Something broken |
| `chore` | Tooling, refactors, repo setup |

## Versioning

The extension version lives in `apps/extension/package.json`. WXT copies it to `manifest.version` on build.

**Bump the version in every PR** that changes what users install. Use [semver](https://semver.org/) while pre-1.0:

| Segment | When to bump | Example |
|---|---|---|
| **PATCH** (`0.1.0` → `0.1.1`) | Bug fixes, refactors, docs-only, no user-visible behavior change | Fix pause/resume edge case |
| **MINOR** (`0.1.0` → `0.2.0`) | New features or meaningful UX improvements | Follow-along highlighting, skip nav on read |
| **MAJOR** (`0.x` → `1.0.0`) | Breaking changes, permission manifest changes requiring re-consent, settings migrations | 1.0 public launch |

Do not bump the root `package.json` version unless the monorepo release process changes; the extension package is the product version Chrome displays.

## Accessibility

- Semantic HTML in all UI (`button`, `fieldset`, `legend`, `label`)
- ARIA live regions for dynamic status
- WCAG 2.2 AA contrast minimum
- See `.cursor/rules/accessibility.mdc` for full requirements
