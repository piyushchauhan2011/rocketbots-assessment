# Quick start

## Prerequisites

- Node.js 22
- pnpm via Corepack

## Run locally

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm dev
```

Open [http://localhost:5173](http://localhost:5173). Vite proxies `/api/payload` to the read-only assessment payload, so the browser does not require direct S3 access.

## Build and preview

```bash
pnpm build
pnpm preview --host 127.0.0.1
```

The production preview is available at [http://127.0.0.1:4173](http://127.0.0.1:4173). The build enforces the size limits in `bundle-budgets.json`.

## Generate code documentation

```bash
pnpm docs:build
```

Open `docs/api/index.html` in a browser. TypeDoc includes the project guides alongside the generated API reference.

## Reset local data

The remote payload is read-only. Edits and canvas positions are stored in the browser. Run this in DevTools to restore the remote graph on the next load:

```js
localStorage.removeItem('rocketbots-flow:v1')
localStorage.removeItem('rocketbots-flow-positions:v2')
location.reload()
```

## Common startup issue

If the payload request fails, confirm the application is running through `pnpm dev` or `pnpm preview`. Opening the built HTML directly bypasses the server-side `/api/payload` proxy.
