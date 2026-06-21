# Geordi

> An accessibility browser extension — read, navigate, and understand the web.

Geordi helps bridge the gap where traditional accessibility tools fall short, starting with reliable page reading via the Web Speech API. Core reading features are free and work offline — no API keys required.

## Quick start

```bash
pnpm install
pnpm dev:ext
```

Then in Chrome:

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select `apps/extension/.output/chrome-mv3-dev`

Click the Geordi icon or press `Alt+Shift+G` to open the side panel.

## Development

| Command | Description |
|---|---|
| `pnpm dev:ext` | Extension dev server with hot reload |
| `pnpm build:ext` | Production build |
| `pnpm test` | Run tests (watch) |
| `pnpm test:run` | Single test run |

## Project structure

```
apps/extension/   ← WXT browser extension (primary product)
packages/shared/  ← Shared constants
legacy/           ← Archived CLI prototype (reference only)
docs/             ← Vision, architecture, ADRs, agent handoff
```

## Contributing

See [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md). AI agents start with [AGENTS.md](AGENTS.md).

Track work via [GitHub Issues](https://github.com/VanessaKeeton/geordi/issues).

## Legal

The Geordi project is open-source under the [Prosperity Public License 3.0.0](LICENSE.md).  
Free for personal, educational, and accessibility-focused use.  
Commercial use requires permission or a paid license.
