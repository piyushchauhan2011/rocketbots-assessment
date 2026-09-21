# Rocketbots Flow Builder Assessment

A Vue 3 single-page flow-chart editor for the supplied Rocketbots/respond.io payload. The browser fetches the canonical seven-node graph once, then persists edits locally.

## Requirements

- Node.js 22
- pnpm (Corepack is recommended)

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm dev
```

Open `http://localhost:5173`. The browser requests the initial payload from the same-origin
`/api/payload` endpoint. Vite proxies that request server-side to:

`https://respond-io-fe-bucket.s3.ap-southeast-1.amazonaws.com/candidate-assessments/payload.json`

## Commands

```bash
pnpm dev                       # Vite development server
pnpm format                    # Apply Oxfmt
pnpm format:check              # Verify formatting
pnpm lint                      # Oxlint quality gate
pnpm test:unit                 # Vitest unit and integration tests
pnpm test:unit:coverage        # Vitest with enforced coverage thresholds
pnpm exec playwright install chromium
pnpm test:e2e                  # Desktop and mobile Chromium workflows
pnpm build                     # Production bundle
pnpm preview --host 127.0.0.1 # Local production preview
```

## Architecture

- `src/features/flow`: graph conversion, deterministic layout, Vue Flow canvas, positions, history, and shortcuts.
- `src/features/nodes`: local repository boundary, TanStack Query hooks, node creation, and validation.
- `src/features/node-details`: URL-driven details Sheet and type-specific editors.
- `src/stores/flowUi.js`: Pinia UI-only state: positions, focus, and bounded undo/redo commands.
- `src/router`: `/` and `/nodes/:nodeId` history routes.
- `tests`: pure-domain unit tests, FlowView integration tests, deterministic Playwright workflows, and fixtures.

TanStack Vue Query exclusively owns node records. Every mutation performs an optimistic cache update, writes the complete snapshot through `nodeRepository`, rolls back on error, and invalidates on settle. Pinia does not mirror records; it owns only UI state.

## Persistence and reset

Node records are stored under `rocketbots-flow:v1`. Canvas positions use `rocketbots-flow-positions:v1`. To reset the assessment:

```js
localStorage.removeItem('rocketbots-flow:v1')
localStorage.removeItem('rocketbots-flow-positions:v1')
location.reload()
```

The remote endpoint is read-only. Vite handles the backend proxy during development and preview;
Vercel performs the equivalent server-side rewrite in production. The browser never contacts S3
directly, avoiding its missing CORS headers. There is no fake-data fallback: proxy, malformed JSON,
duplicate ID, and storage quota failures are surfaced in the UI and optimistic mutations roll back.

## Editing rules

- Creation supports Send Message, Add Comment, and Business Hours roots.
- Titles are required and limited to 80 characters; descriptions are required and limited to 240.
- Send Message must contain non-empty text or an attachment before save.
- Images: JPEG/PNG/WebP/GIF, maximum four files, 750 KiB each, and 3 MiB total encoded local data. Images persist as data URLs because no upload API is supplied.
- Comments are 1–1000 trimmed characters.
- Business Hours require seven unique weekdays, `HH:mm` values, and start before end. Supported timezones are UTC, Asia/Kuala_Lumpur, and the current browser IANA timezone when distinct.
- Delete removes the selected node and every descendant atomically. Trigger and connector records are display-only.

## Accessibility and history

Editable cards are keyboard-focusable buttons with visible focus rings. Enter or Space opens details. `Cmd/Ctrl+Z` undoes; `Cmd/Ctrl+Shift+Z` and `Ctrl+Y` redo. Shortcuts are ignored in form controls and dialogs so native text undo remains available. History stores up to 50 move/update commands; create/delete are intentionally excluded because subtree and attachment restoration would require snapshot history.

## Testing and CI

Vitest covers graph handling (including malformed relationships and cycles), validation boundaries, repository persistence/errors, history limits, and FlowView routing integration. Playwright intercepts the public payload with `tests/fixtures/payload.json` and runs the edit/upload/persistence, creation/business-hours, history/deletion, keyboard, and direct-route workflows at desktop and mobile widths.

GitHub Actions uses Node 22 and a single frozen pnpm install, then gates formatting, linting, coverage, production build, and Chromium E2E. Coverage and Playwright reports are uploaded for diagnosis.

## Vercel

Import the repository in Vercel, keep the detected Vite build (`pnpm build`, output `dist`), and deploy without secrets. `vercel.json` rewrites history routes to `index.html`, so direct requests such as `/nodes/b0653a` resolve to the SPA. After deployment, open that URL directly to verify the platform rewrite.
