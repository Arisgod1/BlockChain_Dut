# Update workflow

## Preflight

- Confirm the command runs inside the repository.
- Preserve unrelated user changes.
- Compare `generated/manifest.json`'s `processedSourceCommit` with the latest commit that changed `knowledge/`; code-only commits may make HEAD newer without making the Manifest stale.
- Use the deterministic CLI for all generated files.

## Review gates

After generation, verify the report, content diff, redirects, tombstones, generated asset sizes, empty states, and affected routes. Inspect at least one mobile and one desktop viewport. A content-only update must not change `site/src/components`, `site/src/layouts`, `site/src/pages`, or `site/src/styles`.

## Failure handling

Do not publish after any Schema, sensitive-information, link, image, deterministic generation, build, accessibility, or page-contract failure. The CLI generates in a temporary ignored directory and installs only a validated candidate. Re-run from the current repository state after fixing the source.

## Publish

Content PRs only update `knowledge/`; merging them into `main` never deploys. Pull the reviewed `main`, generate and preview on a release branch, then commit the generated allowlist.

`publish` requires a branch containing the latest `origin/main`, a clean worktree, a Manifest whose processed source commit equals the latest knowledge commit, and passing validation plus browser tests. If `origin/main` advanced, update the release branch and regenerate before publishing. The command creates or pushes a `release/<date>-<source-sha>` branch and opens a draft PR targeting `main`. It never merges, deploys, or moves `production`.

After the release PR passes deterministic rebuild, browser, budget, and Lighthouse checks and is merged into `main`, deployment still requires the maintainer to run the Deploy Production workflow with that release commit SHA. Only a successful deployment may advance `production`.
