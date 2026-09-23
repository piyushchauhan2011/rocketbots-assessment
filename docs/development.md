# Development and quality

## Commands

| Command                                 | Purpose                                                      |
| --------------------------------------- | ------------------------------------------------------------ |
| `pnpm dev`                              | Start the Vite development server                            |
| `pnpm build`                            | Build production assets and enforce bundle budgets           |
| `pnpm preview --host 127.0.0.1`         | Preview the production build with the payload proxy          |
| `pnpm docs:build`                       | Generate TypeDoc guides and API reference in `docs/api/`     |
| `pnpm format`                           | Apply Oxfmt                                                  |
| `pnpm format:check`                     | Verify formatting without changes                            |
| `pnpm lint`                             | Run Oxlint with warnings denied                              |
| `pnpm typecheck`                        | Check JSDoc, JavaScript, Vue templates, and E2E support code |
| `pnpm test:unit`                        | Run Vitest unit and integration tests                        |
| `pnpm test:unit:coverage`               | Run Vitest with enforced coverage thresholds                 |
| `pnpm exec playwright install chromium` | Install the E2E browser                                      |
| `pnpm test:e2e`                         | Run Cucumber scenarios through Playwright                    |
| `pnpm bundle:check`                     | Recheck an existing `dist` bundle                            |

## Editing behavior

- The **+** control inserts a Send Message, Add Comment, or Business Hours step below the selected parent. Business Hours branches receive new steps through their Success or Failure connectors.
- Titles are required and limited to 80 characters. Descriptions are required and limited to 240 characters.
- Send Message requires non-empty text or an attachment.
- Attachments accept JPEG, PNG, WebP, and GIF. A message allows four files, 750 KiB each, and 3 MiB total encoded local data.
- Comments contain 1–1000 trimmed characters.
- Business Hours requires seven unique weekdays, valid `HH:mm` values, and a start before the end. Supported timezones are UTC, Asia/Kuala_Lumpur, and the current browser IANA timezone when distinct.
- Deleting a normal step reconnects its children to its parent. Deleting Business Hours also removes its Success and Failure connector records while leaving records below those paths in the flow.
- Existing node positions remain stable when records are added or removed.

## Accessibility and history

Arrow keys move the visible selection through steps and branch connectors. Enter or Space opens details for editable steps. `Cmd/Ctrl+Z` undoes a move or saved edit. `Cmd/Ctrl+Shift+Z` and `Cmd/Ctrl+Y` redo it. Shortcuts are ignored in form controls and dialogs so native text editing remains available.

History holds at most 50 move and edit commands. Create and delete are intentionally outside that history.

## Tests

Vitest covers graph handling, malformed relationships and cycles, validation boundaries, repository persistence and error cases, history limits, and routed FlowView integration. Coverage thresholds are enforced for the domain, repository, and store modules.

Playwright intercepts the public payload with `tests/fixtures/payload.json`. Cucumber scenarios exercise editing, upload persistence, creation, Business Hours, deletion, history, keyboard navigation, and direct routes at desktop and mobile widths.

## Continuous integration

GitHub Actions uses Node.js 22 and a frozen pnpm install. The quality job gates formatting, linting, checked JavaScript and Vue templates, TypeDoc generation, coverage, production build budgets, and Chromium E2E workflows. Coverage and Cucumber reports are uploaded for diagnosis.

A separate non-blocking duplication job scans `src` and publishes its measurements on pull requests.

## Bundle budgets

`pnpm build` creates Vite's manifest, then checks `bundle-budgets.json`. The initial-route measurement starts from configured `initialEntries` and follows static imports. Dynamic action-driven chunks count toward total JavaScript and the per-chunk ceiling, but not the initial-route budget. Raise a limit only when an accepted product change justifies the additional delivery cost.
