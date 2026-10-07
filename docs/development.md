# Development and quality

## Commands

| Command                         | Description                                                           |
| ------------------------------- | --------------------------------------------------------------------- |
| `pnpm dev`                      | Start the Vite development server on port 5173                        |
| `pnpm build`                    | Build production assets and check bundle budgets                      |
| `pnpm preview --host 127.0.0.1` | Run production preview with local payload proxy on port 4173          |
| `pnpm docs:build`               | Build TypeDoc API documentation in `docs/api/`                        |
| `pnpm storybook`                | Start Storybook component workshop on port 6006                       |
| `pnpm storybook:build`          | Build static Storybook site in `storybook-static/`                    |
| `pnpm format` / `format:check`  | Run or check code formatting with Oxfmt                               |
| `pnpm lint`                     | Run Oxlint with zero allowed warnings                                 |
| `pnpm typecheck`                | Validate JSDoc, JavaScript, Vue templates, and E2E support code       |
| `pnpm test:unit`                | Run Vitest unit and integration tests                                 |
| `pnpm test:unit:coverage`       | Run Vitest with coverage thresholds enforced                          |
| `pnpm test:e2e`                 | Run Cucumber scenarios in Playwright Chromium                         |
| `pnpm report:e2e`               | Build standalone Allure report in `allure-report/` (requires Java 21) |
| `pnpm report:e2e:open`          | Serve and open the generated Allure report                            |
| `pnpm bundle:check`             | Verify bundle size limits against an existing `dist` build            |
| `pnpm changeset`                | Create a versioned changeset for release-worthy changes               |
| `pnpm commitlint --edit`        | Validate local commit message format                                  |

## Component workshop

Storybook provides isolated testing for UI primitives and flow nodes:

```bash
pnpm storybook
```

Stories live alongside the components they cover (e.g., `BaseFlowNode.stories.js`, `NodeEditors.stories.js`). The accessibility addon checks WCAG compliance in the Storybook **Accessibility** panel.

## Editing behavior and rules

- **Adding steps:** The **+** button below any step opens the creation dialog. A page-level **Create New Node** button targets the focused node or the flow's leaf step. Business hours steps receive child nodes via their Success or Failure connectors.
- **Title and description:** Title is required (1–80 characters). Description is required (1–240 characters) and displays clamped to 2 lines on canvas cards.
- **Send Message:** Requires text or at least one image attachment.
- **Attachments:** Accepts JPEG, PNG, WebP, and GIF. Capped at 4 attachments, 750 KiB per image, and 3 MiB total base64 payload per step.
- **Add Comment:** Requires 1–1000 characters.
- **Business Hours:** Requires exactly seven days, valid `HH:mm` format, and start time earlier than end time. Supported timezones include UTC, Asia/Kuala_Lumpur, and the browser's local IANA timezone.
- **Deletion:** Deleting a regular step reconnects its children to its parent. Deleting a business hours step removes its Success and Failure connector records while keeping subsequent steps in the flow.
- **Branch reflow:** Adding or removing a step shifts only that subtree down or up (animated over 280ms). Unrelated branches remain at their exact coordinates.
- **Canvas grid:** The grid toggle button in canvas controls toggles the dot background without affecting coordinates or the 16px snapping grid.

## Keyboard navigation and history

- **Navigation:** Arrow keys move focus across nodes and connectors. Enter or Space opens the details drawer for editable steps.
- **History shortcuts:** `Cmd/Ctrl+Z` to undo; `Cmd/Ctrl+Shift+Z` or `Cmd/Ctrl+Y` to redo.
- **History bounds:** Pinia retains an in-memory stack of up to 50 commands covering moves, edits, node creations, and node deletions. Native browser undo in form inputs is preserved.

## Tests and E2E reports

- **Vitest:** Covers graph algorithms, validation schemas, repository persistence, store state, and routed integration views. Minimum coverage thresholds are enforced in CI.
- **Playwright & Cucumber:** Scenarios in `tests/e2e/features/flow.feature` test editing, validation, image uploads, business hours, deletion, keyboard navigation, and responsive layouts across desktop and mobile viewports.
- **Allure reports:** `pnpm test:e2e` writes test outcomes to `allure-results/`. Generate and view the report:

```bash
pnpm report:e2e
pnpm report:e2e:open
```

Generating the report requires Java 21 (`java` on `PATH` or `JAVA_HOME` set). Java is not required to run the tests themselves.

## Continuous integration

GitHub Actions runs the following checks on every pull request:

- **Conventional PR title:** Checks squash commit titles against Conventional Commits and verifies changeset presence via `pnpm changeset status --since origin/main`. Version PRs and Dependabot PRs skip the changeset check.
- **Quality job:** Runs format check, Oxlint, typecheck (`vue-tsc`), TypeDoc build, Storybook build, unit tests with coverage, bundle budgets check (`pnpm build`), and Playwright browser tests.
- **Duplication scan:** Runs `jscpd` on `src/` as a non-blocking informational comment.

## Dependency updates

Dependabot (`.github/dependabot.yml`) runs weekly checks on Mondays for npm dependencies and GitHub Actions (up to 5 PRs each).

PR titles use `chore(deps):` or `ci(deps):`. Dependabot does not generate changesets, so those PRs skip the changeset check and can merge without a release. Push a changeset onto the Dependabot branch only when the bump should appear in the changelog.

## Contributions, versioning, and releases

### Developer workflow

1. Use Conventional Commit PR titles: `<type>(<optional scope>): <description>`. Supported types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`.
2. For release-worthy changes, run `pnpm changeset`, select `rocketbots-flow-assessment`, choose a bump (`patch`, `minor`, `major`), and write a user-facing summary. Commit the generated `.changeset/*.md`.
3. For docs, tests, or internal tooling changes, run `pnpm changeset --empty`.
4. Squash-merge the PR using its validated title as the commit message.

| Bump    | Usage                                         | Example from `1.0.0` |
| ------- | --------------------------------------------- | -------------------- |
| `patch` | Backward-compatible bug fixes and maintenance | `1.0.1`              |
| `minor` | Backward-compatible new features              | `1.1.0`              |
| `major` | Breaking behavioral or data contract changes  | `2.0.0`              |

### Automated release lifecycle

1. When changes merge to `main` and the quality job passes, the release action triggers.
2. If changesets are pending, the bot opens or updates a version PR titled **`chore(release): version application`** on branch `changeset-release/main`. It updates `package.json`, refreshes the lockfile, updates `CHANGELOG.md`, and removes consumed changesets.
3. Review and squash-merge the version PR.
4. On `main`, the bot detects no pending changesets and executes `scripts/release.js`, tagging `vX.Y.Z` and publishing a GitHub Release with release notes extracted from `CHANGELOG.md`.
5. The package has `"private": true` and is never published to npm.

### Maintainer setup

- **Secret:** Configure `RELEASE_TOKEN` as an Actions repository secret with a fine-grained Personal Access Token granted **Contents: read/write** and **Pull requests: read/write**.
- **Actions permissions:** In repository **Settings → Actions → General**, enable **Allow GitHub Actions to create and approve pull requests**.
- **Branch rules:** Protect `main` to require the **quality** and **Conventional PR title** checks before merging, and enable squash-merging with the PR title as default commit subject.

## Bundle budgets

`pnpm build` verifies sizes against `bundle-budgets.json`. Budgets enforce limits for initial route entry points, total JavaScript, maximum chunk size, and compiled CSS.
