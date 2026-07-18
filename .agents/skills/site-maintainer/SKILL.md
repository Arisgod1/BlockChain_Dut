---
name: site-maintainer
description: Safely validate, suggest, generate, preview, rebuild, and publish updates for the BlockChain_Dut Astro knowledge base. Use when adding, changing, renaming, archiving, or deleting knowledge Markdown or images; checking site integrity; generating the deterministic site layer; previewing affected pages; or preparing a reviewed website update pull request.
---

# Site Maintainer

Maintain the knowledge site without allowing content updates to rewrite its presentation layer.

## Safety boundary

Treat `knowledge/` as the only human-authored fact source. Never infer titles, authors, dates, links, contact details, or publication status. Never write blockchain subject-matter examples.

Allow the workflow to modify only:

- `site/src/content/generated/`
- `site/public/generated/`
- `generated/manifest.json`
- `generated/redirects.json`
- `generated/tombstones.json`
- `generated/update-report.md`
- `generated/suggestions/`

Do not modify components, layouts, pages, styles, or Astro configuration during a content update.

## Choose a command

- Validate without changes: `pnpm site-maintainer check`
- Draft non-publishing copy suggestions: `pnpm site-maintainer suggest [paths...]`
- Generate the current repository increment: `pnpm site-maintainer update`
- Rebuild everything: `pnpm site-maintainer rebuild --all`
- Rebuild a merged PR after verifying it is current: `pnpm site-maintainer rebuild --pr <number>`
- Inspect locally: `pnpm site-maintainer preview`
- Publish an already reviewed, committed update: `pnpm site-maintainer publish`

Read [references/workflow.md](references/workflow.md) before update, rebuild, or publish. Read [references/content-contract.md](references/content-contract.md) before editing knowledge files or images.

## Required workflow

1. Run `check` before generating.
2. For model-written summaries or relationships, create a suggestion file and show its patch to the user. Apply only explicitly accepted text to `knowledge/`.
3. Run `update`; stop on any validation or determinism failure.
4. Read `generated/update-report.md` and inspect the Git diff. Any change outside the write allowlist is a blocker.
5. Run `preview` and inspect affected desktop and mobile routes.
6. Run `publish` only after the user has reviewed and committed the generated update. It creates a draft PR and never merges it.

Do not bypass a failed check, advance the Manifest manually, reuse an old URL, or delete content that still has inbound references.
