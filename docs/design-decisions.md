# Design decisions

Architectural tradeoffs behind the assessment implementation.

## Checked JavaScript instead of application TypeScript

Application and test source are authored in modern ES6 JavaScript. JSDoc type contracts are checked with TypeScript 6 (`jsconfig.native.json`), templates are verified with `vue-tsc`, and TypeDoc builds API documentation directly from JSDoc.

This satisfies the requirement for JavaScript while providing static type safety, autocomplete, and CI validation without a compile-to-JS build step.

## Single owner for flow records (Vue Query over Pinia)

TanStack Vue Query exclusively owns node records, query caching, and mutation lifecycles. Pinia manages only UI state: canvas coordinates, active node focus, and undo/redo stacks.

Mirroring server records in Pinia would require custom synchronization and rollback logic. Keeping records in Vue Query guarantees that all components observe identical optimistic snapshots during mutations.

## Whole-snapshot local persistence and size quotas

Because the remote payload is read-only and there is no mutation API, the application persists the full validated graph to `localStorage` under `rocketbots-flow:v1`, and canvas positions under `rocketbots-flow-positions:v2`.

To prevent exceeding the ~5 MB browser storage quota, image uploads are stored as data URLs with strict limits: 750 KiB per image, up to 4 images per message, and 3 MiB maximum total encoded payload per node.

## Dedicated step description on canvas cards

Canvas cards display a concise title and a two-line clamped description (`data.description`) rather than raw message bodies or comments.

When creating a message or comment, the description initialises the initial content. Subsequent edits to message or comment text do not overwrite the summary card description. Payload nodes missing a description fall back to their message, comment, or schedule summary until saved.

## Parent-linked records as the canonical domain model

Vue Flow operates on `{ nodes, edges }` collections, but the canonical data model retains the payload's `parentId` structure (`-1` for root).

Pure graph functions in `src/features/flow/lib/graph.js` derive edges, positions, insertion splices, and deletion rewiring on demand. This keeps domain data 1:1 compatible with the remote payload and allows graph logic to be tested without mounting Vue components.

## Reflow only the edited branch

Running full layout on every mutation shifts nodes that the user intentionally positioned. Freezing all positions causes newly inserted steps to overlap existing children.

The editor stores positions independently:

- **Insert:** The new node takes the child's position, and the displaced subtree slides down by 1 row (or 2 rows for business hours).
- **Delete:** The reconnected subtree slides up by the freed rows.
- **Unrelated branches:** Node positions outside the edited path remain untouched.

A 280ms cubic ease-out animation visually clarifies the branch motion before positions settle into storage.

## Bounded 50-command history in memory

Pinia maintains an in-memory stack of up to 50 undo/redo commands:

- **Moves:** Store previous and next coordinates.
- **Edits:** Store prior and updated node records.
- **Creates and deletes:** Store full record snapshots and position maps before and after the mutation.

History is kept in memory rather than `localStorage` to avoid storage churn. Native browser undo within form inputs operates independently and is preserved.

## URL-driven node details

The node detail drawer is bound to the route (`/nodes/:nodeId`) rather than internal component state. Selecting a node updates the browser URL, enabling direct links, bookmarking, and natural back/forward navigation.
