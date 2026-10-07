# Quick start

## Prerequisites

- Node.js 22
- pnpm (via Corepack)

## Local development

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm dev
```

Open [http://localhost:5173](http://localhost:5173). The Vite development server proxies `/api/payload` to the remote assessment JSON fixture.

## Build and preview

```bash
pnpm build
pnpm preview --host 127.0.0.1
```

The production preview runs at [http://127.0.0.1:4173](http://127.0.0.1:4173). The build enforces the size limits configured in `bundle-budgets.json`.

## Generate API reference

```bash
pnpm docs:build
```

Generates TypeDoc API documentation and guides into `docs/api/index.html`.

## Reset saved flow

Domain edits and canvas positions persist in browser `localStorage`. To restore the pristine remote payload, run this in DevTools console and reload:

```js
localStorage.removeItem('rocketbots-flow:v1')
localStorage.removeItem('rocketbots-flow-positions:v2')
location.reload()
```

## Troubleshooting

Opening the built HTML directly (`file://`) fails because it bypasses the `/api/payload` proxy. Always preview with `pnpm dev` or `pnpm preview`.
