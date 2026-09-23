# Rocketbots Flow Builder

A Vue 3 flow-chart editor organized as a pnpm/Turborepo workspace. Source remains JavaScript/ES6 with JSDoc checking; TypeScript emits declarations only for reusable library boundaries.

## Requirements

- Node.js 22
- pnpm 12.4.2 via Corepack

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm dev
```

Open `http://localhost:5173`. Vite proxies `/api/payload` to the supplied respond.io payload endpoint during development and preview.

## Workspace ownership

- `apps/web`: Vue application, routing, state, repository adapter, Vue Flow adapter, and web integration tests.
- `apps/e2e`: Cucumber features, Playwright World/page object, browser fixtures, and production-preview lifecycle.
- `apps/storybook`: standalone Storybook catalogue for reusable UI primitives.
- `packages/core`: framework-independent graph and node domain behavior. Its checked JavaScript emits declarations into `.types` and is a real project-reference target.
- `packages/ui`: reusable Vue primitives and shared design tokens. Its checked JavaScript/Vue sources emit declarations into `.types` and form the UI project-reference boundary.

Repository policy and shared checking tools remain at the root. No application depends on another application; E2E consumes the web build through Turbo task dependencies.

## Commands

```bash
pnpm dev                       # web development server
pnpm preview -- --host 127.0.0.1 --port 4173
pnpm storybook                 # standalone catalogue at http://localhost:6006
pnpm build                     # all workspace builds and web bundle budgets
pnpm build:storybook           # Storybook static build only
pnpm typecheck                 # declarations, JSDoc, Vue templates, stories, and E2E
pnpm test:unit                 # core and web tests
pnpm test:unit:coverage        # independent core/web coverage gates
pnpm --filter @rocketbots/e2e exec playwright install chromium
pnpm test:e2e                  # builds web, previews on port 4174, runs eight examples
pnpm format
pnpm format:check
pnpm lint
```

Turbo uses its interactive TUI for local commands. CI passes `--ui=stream` for ordinary logs.

## Build and reports

The web build writes `apps/web/dist`, its manifest, and `apps/web/bundle-budget-report.md`. Budget entry keys remain `index.html` and `src/views/FlowView.vue`; limits cover initial-route JavaScript, total JavaScript, largest JavaScript chunk, and total CSS in raw and gzip bytes.

Coverage reports are package-local at `packages/core/coverage` and `apps/web/coverage`; each independently enforces 85% statements, lines, and functions plus 80% branches. Storybook writes `apps/storybook/storybook-static`. Cucumber writes `apps/e2e/cucumber-report.html`.

## Architecture and behavior

TanStack Vue Query exclusively owns node records. The web repository returns typed `neverthrow` results for payload, network, parsing, and storage failures. Pinia owns UI-only positions, focus, and bounded undo/redo history. Core owns deterministic graph operations, summaries, node creation, and validation; UI has no core dependency.

The initial route preserves lazy Vue Flow loading. Node details, creation, and type-specific editors remain action-driven chunks. Records persist under `rocketbots-flow:v1`; positions use `rocketbots-flow-positions:v2`.

The E2E workspace intercepts `/api/payload` with its own fixture and starts `@rocketbots/web` through `vite preview` at `http://127.0.0.1:4174`. It retains desktop and Pixel 7 runs, failure screenshots, storage reset, and process-group shutdown.

## Vercel

`vercel.json` runs `pnpm turbo run build --filter=@rocketbots/web --ui=stream` and serves `apps/web/dist`. The `/api/payload` proxy and SPA fallback rewrites remain platform-owned, so direct routes such as `/nodes/b0653a` resolve to `index.html`.
