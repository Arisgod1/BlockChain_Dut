# Update workflow

## Preflight

- Confirm the command runs inside the repository.
- Preserve unrelated user changes.
- Compare the current Git HEAD with `generated/manifest.json`.
- Use the deterministic CLI for all generated files.

## Review gates

After generation, verify the report, content diff, redirects, tombstones, generated asset sizes, empty states, and affected routes. Inspect at least one mobile and one desktop viewport. A content-only update must not change `site/src/components`, `site/src/layouts`, `site/src/pages`, or `site/src/styles`.

## Failure handling

Do not publish after any Schema, sensitive-information, link, image, deterministic generation, build, accessibility, or page-contract failure. The CLI generates in a temporary ignored directory and installs only a validated candidate. Re-run from the current repository state after fixing the source.

## Publish

`publish` requires a clean worktree, a Manifest whose processed commit equals HEAD, and a passing `pnpm validate`. It creates and pushes a `site/update-<date>-<sha>` branch and opens a draft PR. It never merges.
