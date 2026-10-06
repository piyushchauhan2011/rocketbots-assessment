# Design decisions

These are concise architecture decision records for choices that materially shape the assessment.

## Checked JavaScript instead of application TypeScript

**Context:** The assessment is authored in JavaScript/ES6 but still benefits from static contracts.

**Decision:** Keep application and test source in JavaScript. Use JSDoc contracts, TypeScript 6 checking, `vue-tsc` for templates, and TypeDoc for API documentation.

**Consequences:** Runtime source stays JavaScript while editor tooling catches cross-module and template mistakes. Complex contracts require disciplined JSDoc, and generated API quality depends on those comments.

## One owner for server-shaped records

**Context:** Mirroring records between a query cache and a global store creates synchronization and rollback paths.

**Decision:** TanStack Vue Query exclusively owns node records. Pinia owns only interaction state that is not part of the payload.

**Consequences:** All record consumers observe the same optimistic snapshot. Query code carries persistence coordination, while the store remains independent of network state.

## Explicit result values at the repository boundary

**Context:** Payload, network, parse, response, and storage failures need distinct handling without unobserved promise rejections.

**Decision:** The repository returns typed `neverthrow` results and never substitutes fake payload data.

**Consequences:** Callers must handle failure as data. The UI can present real errors, and optimistic mutations can reliably restore their previous cache snapshot.

## Whole-snapshot local persistence

**Context:** The supplied endpoint is read-only and the assessment has no backend mutation contract.

**Decision:** Persist the validated record array under `rocketbots-flow:v1`. Persist canvas positions separately under `rocketbots-flow-positions:v2`.

**Consequences:** Reloads preserve edits without inventing a server API. Writes are simple and atomic at the application level. Images stay as data URLs because the payload endpoint cannot accept uploads. Each image is limited to 750 KiB, a message to four images, and the encoded total to 3 MiB, which keeps the snapshot inside the browser storage quota.

## One body of text per step

**Context:** A separate description copied from the message or comment drifts from the text the editor actually sends.

**Decision:** The create dialog's description becomes the message text or the comment. Canvas cards read that same field. Business hours keep a description because that step has no other body.

**Consequences:** Editing the message or comment updates the card. Payload nodes that never had a description do not gain a second copy when they are opened.

## Parent-linked records as the domain model

**Context:** Vue Flow uses node and edge collections, while the supplied payload expresses parent relationships.

**Decision:** Keep parent-linked records as the canonical model and derive render nodes and edges with pure graph functions.

**Consequences:** Persistence remains compatible with the supplied shape. Rendering, navigation, insertion, deletion, and layout can be tested without mounting Vue.

## Reflow only the edited branch

**Context:** Re-running full layout after every mutation would move nodes the user intentionally arranged. Keeping every existing coordinate frozen when a node is inserted stacks the new step on top of its child.

**Decision:** Store positions independently. On insert, place the new step where the displaced child sat and slide that subtree down by the rows the insertion needs. On delete, slide the reconnected subtree back up. Leave every other node where it is, and animate the move.

**Consequences:** Manual arrangement of unrelated branches survives an edit. The edited branch stays in a vertical sequence instead of colliding or jumping sideways. Position cleanup must accompany deletion, and storage uses a versioned key so incompatible position formats can be replaced safely.

## URL-driven node details

**Context:** A selected node should support browser history and direct links.

**Decision:** Represent the detail sheet as `/nodes/:nodeId` rather than component-only selection state.

**Consequences:** Back/forward navigation and direct routes work naturally. Vercel must rewrite arbitrary history routes to the SPA entry point.

## Bounded command history

**Context:** Move and edit undo/redo improves usability, but unbounded snapshots consume memory and browser storage semantics differ from domain mutations.

**Decision:** Keep up to 50 move or update commands in Pinia. Do not include create and delete operations.

**Consequences:** Common corrections are reversible with predictable memory use. The UI must communicate the narrower history scope, and native text undo must remain untouched inside form controls.

## Lazy action-driven features

**Context:** The full canvas and editors are unnecessary before the graph becomes visible or an editing action occurs.

**Decision:** Defer the canvas until viewport intersection and idle time; split details, creation, and editor modules by user action.

**Consequences:** The initial route is smaller. Loading boundaries become architectural behavior and bundle budgets guard against regressions.

## Layered verification

**Context:** Graph rules are cheap to verify in isolation, while routing, persistence, uploads, and keyboard workflows require a browser.

**Decision:** Use Vitest for domain and integration behavior, Cucumber with Playwright for user workflows, checked JSDoc for contracts, and bundle budgets for delivery constraints.

**Consequences:** Failures are usually localized to the cheapest useful layer. CI is longer than a unit-only pipeline but exercises the application surface reviewers use.
