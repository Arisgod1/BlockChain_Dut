#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Command } from 'commander';
import { checkAll } from './validation/check.js';
import { describeChanges, generateCandidate, installCandidate, normalizedCandidateHash, readManifest } from './generator/generate.js';
import { ensureRepository, git, head, root, run, sourceCommit } from './lib.js';

const program = new Command().name('site-maintainer').description('Deterministic knowledge-site maintenance CLI').version('1.0.0');
const tempRoot = resolve(root, '.site-maintainer-tmp');

async function update(sourcePr: number | null = null) {
  ensureRepository();
  await checkAll();
  const candidateA = resolve(tempRoot, 'candidate-a');
  const candidateB = resolve(tempRoot, 'candidate-b');
  const manifest = await generateCandidate(candidateA, sourcePr);
  await generateCandidate(candidateB, sourcePr);
  if (normalizedCandidateHash(candidateA) !== normalizedCandidateHash(candidateB)) throw new Error('generation is not deterministic');
  const changes = describeChanges(manifest);
  const backup = resolve(tempRoot, 'backup');
  const backupPairs = [
    ['site/src/content/generated', 'content'], ['site/public/generated', 'public'],
    ['generated/manifest.json', 'manifest.json'], ['generated/redirects.json', 'redirects.json'], ['generated/tombstones.json', 'tombstones.json'],
  ] as const;
  mkdirSync(backup, { recursive: true });
  for (const [source, destination] of backupPairs) if (existsSync(resolve(root, source))) cpSync(resolve(root, source), resolve(backup, destination), { recursive: true });
  try {
    installCandidate(candidateA);
    run('pnpm', ['--filter', '@blockchain-dut/site', 'build']);
  } catch (error) {
    for (const [destination] of backupPairs) rmSync(resolve(root, destination), { recursive: true, force: true });
    for (const [destination, source] of backupPairs) if (existsSync(resolve(backup, source))) cpSync(resolve(backup, source), resolve(root, destination), { recursive: true });
    throw error;
  }
  mkdirSync(resolve(root, 'generated'), { recursive: true });
  writeFileSync(resolve(root, 'generated/update-report.md'), [
    '# Site update report', '', `Source commit: \`${manifest.processedSourceCommit}\``,
    `Generator: \`${manifest.generatorVersion}\``, '',
    `- Added: ${changes.added.map((item) => item.id).join(', ') || 'none'}`,
    `- Changed: ${changes.changed.map((item) => item.id).join(', ') || 'none'}`,
    `- Deleted: ${changes.deleted.map((item) => item.id).join(', ') || 'none'}`, '',
    'Run `pnpm site-maintainer preview` and inspect all affected routes before publishing.', '',
  ].join('\n'));
  rmSync(tempRoot, { recursive: true, force: true });
  console.log(`Generated ${manifest.entries.length} public entries at ${head()}`);
}

program.command('check').action(async () => {
  const result = await checkAll();
  console.log(`OK: ${result.documents} documents, ${result.assets} assets`);
});

program.command('suggest').argument('[paths...]').action(async (paths: string[]) => {
  mkdirSync(resolve(root, 'generated/suggestions'), { recursive: true });
  const target = resolve(root, 'generated/suggestions/content-suggestions.md');
  writeFileSync(target, ['# Content suggestions', '', 'This file is never published automatically.', '', `Targets: ${paths.length ? paths.join(', ') : 'all changed knowledge documents'}`, '', 'Ask Codex to propose summaries, relationships, or navigation copy here. Review every fact and manually apply accepted text to `knowledge/`.', ''].join('\n'));
  console.log(`Created ${target}`);
});

program.command('update').action(() => update());
program.command('rebuild').option('--all').option('--pr <number>').action(async (options) => {
  let pr: number | null = null;
  if (options.pr) {
    pr = Number(options.pr);
    const details = JSON.parse(execFileSync('gh', ['pr', 'view', String(pr), '--json', 'files,mergeCommit'], { cwd: root, encoding: 'utf8' }));
    const mergeOid = details.mergeCommit?.oid;
    if (!mergeOid) throw new Error(`PR ${pr} is not merged`);
    git('merge-base', '--is-ancestor', mergeOid, 'HEAD');
    for (const file of details.files.filter((item: { path: string }) => item.path.startsWith('knowledge/'))) {
      let atMerge = ''; let atHead = '';
      try { atMerge = git('rev-parse', `${mergeOid}:${file.path}`); } catch {}
      try { atHead = git('rev-parse', `HEAD:${file.path}`); } catch {}
      if (atMerge !== atHead) throw new Error(`${file.path} changed after PR ${pr}; rebuild the latest source instead`);
    }
  }
  await update(pr);
});

program.command('preview').action(() => run('pnpm', ['--filter', '@blockchain-dut/site', 'dev']));

program.command('publish').action(async () => {
  await checkAll();
  const manifest = readManifest();
  if (manifest.processedSourceCommit !== sourceCommit()) throw new Error('manifest is stale; run update again');
  if (git('status', '--porcelain', '--', 'knowledge')) throw new Error('commit knowledge changes before publish');
  if (git('status', '--porcelain')) throw new Error('commit the generated update before publish');
  run('pnpm', ['validate']);
  const branch = `site/update-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${head().slice(0, 7)}`;
  git('switch', '-c', branch);
  run('git', ['push', '-u', 'origin', branch]);
  run('gh', ['pr', 'create', '--draft', '--title', `site: update ${head().slice(0, 7)}`, '--body-file', 'generated/update-report.md']);
});

program.parseAsync().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
