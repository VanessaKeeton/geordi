# Testing

## Running tests

```bash
pnpm test        # watch mode
pnpm test:run    # single run
```

## What to test

| Area | Location | Approach |
|---|---|---|
| Content extraction | `lib/content/extract.test.ts` | jsdom with HTML fixtures |
| DOM wrapping / highlights | `lib/content/wrap-for-reading.test.ts` | jsdom, shadow DOM fixtures |
| Range mapping | `lib/content/range-map.test.ts` | jsdom Text nodes + Range |
| Contrast / highlight color | `lib/content/contrast.test.ts` | Fixed color pairs |
| Speech reader | `lib/speech/reader.test.ts` | Mock `speechSynthesis` and `chrome.storage` |
| Legacy CLI | `legacy/__tests__/` | Node (archived, optional) |

## Writing tests

- Colocate tests as `*.test.ts` next to source files
- Use jsdom for DOM-dependent code; pass `document` explicitly to extraction functions
- Mock browser APIs (`speechSynthesis`, `chrome.storage`) — do not require a real browser for unit tests

## Coverage expectations

Phase 1 focuses on unit tests for extraction and speech modules. E2E browser tests are a future addition.

## Manual testing checklist

After loading the extension in Chrome:

- [ ] Side panel opens via toolbar icon
- [ ] Side panel opens via `Alt+Shift+G`
- [ ] "Read page" reads article content on a news/blog page
- [ ] "Read page" skips button labels, form inputs, and nav but keeps article link text
- [ ] Word + sentence highlight follows TTS and auto-scrolls on long pages
- [ ] Highlight works on pages with open shadow DOM (e.g. Google News)
- [ ] Highlight contrast readable on light pages (dark-page contrast is a known follow-up)
- [ ] "Read selection" reads highlighted text with follow-along highlight
- [ ] Play / pause / stop work; highlight clears on pause/stop
- [ ] Voice and speed persist after reload
- [ ] All controls reachable by keyboard only
