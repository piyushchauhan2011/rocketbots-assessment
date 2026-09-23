# Rocketbots Flow Builder Assessment

A Vue 3 single-page flow-chart editor for the supplied Rocketbots/respond.io payload. The browser fetches the canonical seven-node graph once, then persists edits locally.

The project is authored in JavaScript/ES6. TypeScript tooling is retained only to check JSDoc contracts and Vue templates; no application or test source is authored in TypeScript.

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
pnpm typecheck                 # Check JSDoc contracts and Vue templates
pnpm typecheck:e2e             # Strict-check Cucumber, World, and Page Object JSDoc
pnpm test:unit                 # Vitest unit and integration tests
pnpm test:unit:coverage        # Vitest with enforced coverage thresholds
pnpm exec playwright install chromium
pnpm test:e2e                  # Cucumber desktop/mobile scenarios using Playwright
pnpm build                     # Production bundle
pnpm preview --host 127.0.0.1 # Local production preview
```

## Architecture

- `src/features/flow`: graph conversion, deterministic layout, Vue Flow canvas, positions, history, and shortcuts.
- `src/features/nodes`: local repository boundary, TanStack Query hooks, node creation, and validation.
- `src/features/node-details`: URL-driven details Sheet and type-specific editors.
- `src/stores/flowUi.js`: Pinia UI-only state: positions, focus, and bounded undo/redo commands.
- `src/router`: `/` and `/nodes/:nodeId` history routes.
- `tests`: pure-domain unit tests, FlowView integration tests, Cucumber features and step definitions, a Playwright Page Object, and fixtures.

TanStack Vue Query exclusively owns node records. Every mutation performs an optimistic cache update, writes the complete snapshot through `nodeRepository`, rolls back on error, and invalidates on settle. Pinia does not mirror records; it owns only UI state.

The initial route ships only the application shell, query/store logic, and loading UI. The Vue Flow canvas is fetched after its viewport intersects and the browser becomes idle. Node details, the create dialog, and each type-specific editor are separate action-driven chunks, so message uploads, business-hours controls, and validation code are not downloaded until needed.

## Persistence and reset

Node records are stored under `rocketbots-flow:v1`. Canvas positions use `rocketbots-flow-positions:v2`. To reset the assessment:

```js
localStorage.removeItem('rocketbots-flow:v1')
localStorage.removeItem('rocketbots-flow-positions:v2')
location.reload()
```

The remote endpoint is read-only. Vite handles the backend proxy during development and preview;
Vercel performs the equivalent server-side rewrite in production. The browser never contacts S3
directly, avoiding its missing CORS headers. There is no fake-data fallback: proxy, malformed JSON,
duplicate ID, and storage quota failures are surfaced in the UI and optimistic mutations roll back.

## Editing rules

- The **+** on a step opens a dialog for title, description, and type, then inserts that step on the edge below it. Business Hours has no **+**; add the next steps from Success or Failure.
- Titles are required and limited to 80 characters; descriptions are required and limited to 240.
- Send Message must contain non-empty text or an attachment before save.
- Images: JPEG/PNG/WebP/GIF, maximum four files, 750 KiB each, and 3 MiB total encoded local data. Images persist as data URLs because no upload API is supplied.
- Comments are 1–1000 trimmed characters.
- Business Hours require seven unique weekdays, `HH:mm` values, and start before end. Supported timezones are UTC, Asia/Kuala_Lumpur, and the current browser IANA timezone when distinct.
- Delete removes only the selected step and reconnects the nodes below it to the step above. Deleting Business Hours also removes its Success and Failure connectors, and the nodes on those paths stay in the flow. Trigger, Success, and Failure can be dragged; they do not open the details drawer.
- Adding or deleting a step keeps every existing node where you placed it. The new step is positioned from its parent.

## Accessibility and history

Arrow keys move a visible selection through the flow, including Trigger and the Success and Failure connectors. Enter or Space opens the details drawer for a message, comment, or business-hours step. `Cmd/Ctrl+Z` undoes a move or a saved edit; `Cmd/Ctrl+Shift+Z` and `Cmd/Ctrl+Y` redo it, and the undone node is brought back into view. Shortcuts are ignored in form controls and dialogs so native text undo remains available. History stores up to 50 move and edit commands. Create and delete are not part of that history.

## Testing and CI

Vitest covers graph handling (including malformed relationships and cycles), validation boundaries, repository persistence/errors, history limits, and FlowView routing integration. Playwright intercepts the public payload with `tests/fixtures/payload.json` and runs the edit/upload/persistence, creation/business-hours, history/deletion, keyboard, and direct-route workflows at desktop and mobile widths.

GitHub Actions uses Node 22 and a single frozen pnpm install, then gates formatting, linting, checked JSDoc/Vue templates, coverage, production build, and Chromium E2E. Coverage and Playwright reports are uploaded for diagnosis.

## Vercel

Import the repository in Vercel, keep the detected Vite build (`pnpm build`, output `dist`), and deploy without secrets. `vercel.json` rewrites history routes to `index.html`, so direct requests such as `/nodes/b0653a` resolve to the SPA. After deployment, open that URL directly to verify the platform rewrite.
