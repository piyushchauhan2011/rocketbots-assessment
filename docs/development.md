# Development and quality

## Commands

| Command                                 | Purpose                                                      |
| --------------------------------------- | ------------------------------------------------------------ |
| `pnpm dev`                              | Start the Vite development server                            |
| `pnpm build`                            | Build production assets and enforce bundle budgets           |
| `pnpm preview --host 127.0.0.1`         | Preview the production build with the payload proxy          |
| `pnpm docs:build`                       | Generate TypeDoc guides and API reference in `docs/api/`     |
| `pnpm storybook`                        | Start the component workshop on port 6006                    |
| `pnpm storybook:build`                  | Build the static component workshop in `storybook-static/`   |
| `pnpm format`                           | Apply Oxfmt                                                  |
| `pnpm format:check`                     | Verify formatting without changes                            |
| `pnpm lint`                             | Run Oxlint with warnings denied                              |
| `pnpm typecheck`                        | Check JSDoc, JavaScript, Vue templates, and E2E support code |
| `pnpm test:unit`                        | Run Vitest unit and integration tests                        |
| `pnpm test:unit:coverage`               | Run Vitest with enforced coverage thresholds                 |
| `pnpm exec playwright install chromium` | Install the E2E browser                                      |
| `pnpm test:e2e`                         | Run Cucumber scenarios through Playwright                    |
| `pnpm report:e2e`                       | Generate a standalone Allure HTML report                     |
| `pnpm report:e2e:open`                  | Serve and open the generated Allure report                   |
| `pnpm bundle:check`                     | Recheck an existing `dist` bundle                            |
| `pnpm changeset`                        | Describe a release-worthy change and select its SemVer bump  |
| `pnpm changeset status`                 | Inspect pending release versions                             |
| `pnpm commitlint --edit`                | Validate the latest local commit message                     |

## Component workshop

Storybook documents reusable UI primitives and the main flow-editing surfaces in isolation. Run `pnpm storybook`, then open [http://localhost:6006](http://localhost:6006).

Stories live beside the components they describe. Prefer realistic assessment records and controlled wrappers for editable values. Every new reusable component or materially distinct state should add a story; transient implementation helpers do not need one. The accessibility addon runs checks from Storybook's **Accessibility** panel.

## Editing behavior

- The **+** control inserts a Send Message, Add Comment, or Business Hours step below the selected parent. Business Hours branches receive new steps through their Success or Failure connectors.
- Titles are required and limited to 80 characters. Descriptions are required and limited to 240 characters.
- Send Message requires non-empty text or an attachment.
- Attachments accept JPEG, PNG, WebP, and GIF. A message allows four files, 750 KiB each, and 3 MiB total encoded local data.
- Comments contain 1–1000 trimmed characters.
- Business Hours requires seven unique weekdays, valid `HH:mm` values, and a start before the end. Supported timezones are UTC, Asia/Kuala_Lumpur, and the current browser IANA timezone when distinct.
- Deleting a normal step reconnects its children to its parent. Deleting Business Hours also removes its Success and Failure connector records while leaving records below those paths in the flow.
- Existing node positions remain stable when records are added or removed.
- The grid button in the bottom-right canvas controls shows or hides the dot grid. It supports pointer and keyboard activation and exposes its state to assistive technology. Hiding the grid does not move nodes or disable 16-pixel snapping; the grid is visible again when the canvas is reloaded.

## Accessibility and history

Arrow keys move the visible selection through steps and branch connectors. Enter or Space opens details for editable steps. `Cmd/Ctrl+Z` undoes a move or saved edit. `Cmd/Ctrl+Shift+Z` and `Cmd/Ctrl+Y` redo it. Shortcuts are ignored in form controls and dialogs so native text editing remains available.

History holds at most 50 move and edit commands. Create and delete are intentionally outside that history.

## Tests

Vitest covers graph handling, malformed relationships and cycles, validation boundaries, repository persistence and error cases, history limits, and routed FlowView integration. Coverage thresholds are enforced for the domain, repository, and store modules.

Playwright intercepts the public payload with `tests/fixtures/payload.json`. Cucumber scenarios exercise editing, upload persistence, creation, Business Hours, deletion, history, keyboard navigation, and direct routes at desktop and mobile widths.

### E2E reports

`pnpm test:e2e` writes both `cucumber-report.html` and Allure results in `allure-results/`. Each run clears previous Allure results so scenarios from older runs are not included. Scenario steps, durations, assertion errors, and screenshots attached by the failure hook are captured by the [Allure Cucumber.js adapter](https://allurereport.org/docs/cucumberjs-configuration/).

Install Java 21 and ensure `java` is on `PATH` (or set `JAVA_HOME`) to generate reports. Java is not required to run the scenarios.

```sh
pnpm test:e2e
# Run this separately even if the tests failed:
pnpm report:e2e
pnpm report:e2e:open
```

The generator replaces `allure-report/` and produces a standalone `index.html`, which can also be opened directly without a server or Java. Both Allure directories are ignored by Git.

## Continuous integration

GitHub Actions uses Node.js 22 and a frozen pnpm install. The quality job gates formatting, linting, checked JavaScript and Vue templates, TypeDoc generation, coverage, production build budgets, and Chromium E2E workflows. Coverage and Cucumber reports are uploaded for diagnosis. Java 21 is provisioned for Allure generation; when scenario results exist, report generation and artifact uploads run even after browser-test failure. Test failures still fail the job.

To inspect an E2E run, open its **Actions → CI → Artifacts**, download **allure-report**, extract it, and open `index.html`. The **allure-results** artifact contains raw results and attachments for regeneration or external tooling. Reports are per-run artifacts, not a hosted dashboard or cross-run history.

A separate non-blocking duplication job scans `src` and publishes its measurements on pull requests.

The PR-title job checks Changesets using `pnpm changeset status --since origin/main`. It fetches full Git history so the detached PR checkout has a merge base with the remote default branch; a shallow checkout is insufficient. Only the same-repository `changeset-release/main` version PR skips the changeset-presence check because versioning consumes its changesets. Its title and quality checks still run; a fork using that branch name is not exempt.

## Dependency updates

`.github/dependabot.yml` schedules weekly checks on Mondays for the root pnpm dependencies (`npm` ecosystem) and GitHub Actions. Each ecosystem can have up to five open version-update PRs. Major updates are not excluded; review breaking changes before merging. PR titles use Conventional Commit prefixes: `chore(deps)` / `chore(deps-dev)` for packages and `ci(deps)` for actions.

Dependabot does not generate changesets. Before merging an update PR, check out its branch and add a versioned changeset for release-worthy dependency changes or an empty changeset for internal tooling/workflow maintenance, following the checklist below. The existing title, changeset, and quality checks remain required; updates are not automatically merged.

Version-update scheduling starts after this configuration is merged into the default branch. Dependabot security updates are a separate repository setting under **Settings → Advanced Security**; this file does not enable that setting.

## Contributions, versioning, and releases

### Developer checklist

1. Use a Conventional Commit PR title: `<type>(<optional scope>): <description>`. Examples: `feat(flow): add step duplication`, `fix(editor): preserve selection after deletion`, and `docs: clarify setup`. Supported types are `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, and `revert`. Use `!` for a breaking change, for example `feat(storage)!: change the saved-flow schema`; describe the break and migration in the PR and changeset.
2. For a release-worthy change, run `pnpm changeset`, select `rocketbots-flow-assessment`, choose a bump, and write a user-facing summary. Commit the generated `.changeset/*.md` with the implementation. The package is private but is intentionally included in versioning.
3. Run the usual quality checks and `pnpm changeset status`. CI validates the PR title and requires a changeset for changed packages; reviewers must check whether it needs a release bump and that the bump is correct. For a non-release change, run `pnpm changeset --empty` and commit the generated file.
4. Squash-merge the PR using its validated title as the squash commit subject. Local commits should use the same convention; `pnpm commitlint --edit` checks the latest commit, but no Git hooks are installed. PR-title validation is the CI enforcement point.

Changesets, **not commit types**, determine the version bump:

| Bump    | Use for                                                  | From `1.0.0` |
| ------- | -------------------------------------------------------- | ------------ |
| `patch` | Backward-compatible fixes and release-worthy maintenance | `1.0.1`      |
| `minor` | Backward-compatible functionality                        | `1.1.0`      |
| `major` | Breaking behavior or persisted-data contract changes     | `2.0.0`      |

Multiple pending changesets are combined into one release using the highest required bump, not one increment per PR. Documentation-only, test-only, and internal CI changes normally use an **empty changeset** (`pnpm changeset --empty`), which satisfies the PR check without a version bump or release notes. Use a versioned changeset if they should appear in release notes. Do not add a changeset to the generated version PR itself.

Example changeset:

```markdown
---
'rocketbots-flow-assessment': minor
---

Add step duplication to the editor. Duplicated steps retain message content and can be edited independently.
```

Release notes come from these summaries, not a raw commit log. Describe the behavior, impact, and any migration; avoid summaries such as “fix bug”. Do not manually bump `package.json` or edit generated `CHANGELOG.md` as part of ordinary feature PRs.

### Automated release lifecycle

1. After changes merge to `main`, the CI quality job must pass before release automation runs.
2. With pending changesets, the bot creates or updates **`chore(release): version application`** on `changeset-release/main`. It updates `package.json`, refreshes the pnpm lockfile, generates `CHANGELOG.md`, and consumes the included changesets.
3. Review the version and notes, wait for PR checks, then squash-merge that version PR. No local `pnpm version:release` or `pnpm release` command is needed.
4. Once quality checks on `main` pass, the bot creates a GitHub Release named/tagged `vX.Y.Z` at that workflow's commit, using only that version's changelog section as its release notes.

The package remains `private: true`: **nothing is published to npm**. This workflow does not deploy application assets or attach build artifacts. Changesets' built-in GitHub release creation is disabled because this private application's release script creates its own `vX.Y.Z` release and tag.

Release runs are serialized. Later runs skip an already-existing release. Before the first version PR generates a changelog, a run without changesets is a no-op. The initial tooling changeset requests a patch release from the current `1.0.0` baseline; it does not invent historical release notes.

### One-time maintainer setup

- In GitHub **Settings → Actions → General**, permit Actions to create pull requests. Ensure repository/organization policies allow the release bot to write contents and pull requests.
- Add an Actions repository secret named **`RELEASE_TOKEN`**: a fine-grained PAT limited to this repository with **Contents: read/write** and **Pull requests: read/write**. Use a bot account where possible; grant **Workflows: read/write** if a version PR includes workflow-file changes. Keep the token unexpired and approved by organization policy. It is used only in the release job on `main`, never passed to PR code.
- A dedicated token is required because PRs opened with the default `GITHUB_TOKEN` do not trigger the usual PR workflows. The token lets generated version PRs receive the same quality and title checks as developer PRs.
- Enable squash merging, set the default squash commit subject to the PR title, and disable merge/rebase merging to keep `main` conventional.
- Protect `main` against direct pushes and require the **quality** and **Conventional PR title** checks before merging. Do not give the bot a protection bypass; it opens a version PR for review like any developer.

If automation fails, inspect the **Version PR or GitHub Release** job, fix the secret/permissions or reported error, and rerun the failed job. The **CI** workflow also supports **Run workflow** on `main` for recovery. Existing releases are not duplicated. Never delete release tags just to retry a run.

References: [Changesets](https://github.com/changesets/changesets), [Changesets action v1](https://github.com/changesets/action/tree/maintenance/v1), and [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/).

## Bundle budgets

`pnpm build` creates Vite's manifest, then checks `bundle-budgets.json`. The initial-route measurement starts from configured `initialEntries` and follows static imports. Dynamic action-driven chunks count toward total JavaScript and the per-chunk ceiling, but not the initial-route budget. Raise a limit only when an accepted product change justifies the additional delivery cost.
