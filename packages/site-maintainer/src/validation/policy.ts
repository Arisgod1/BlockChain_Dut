import { appendFileSync } from 'node:fs';

const generatedPaths = [
  'site/src/content/generated/',
  'site/public/generated/',
  'generated/manifest.json',
  'generated/redirects.json',
  'generated/tombstones.json',
  'generated/update-report.md',
  'generated/suggestions/',
];

const presentationPaths = ['site/src/components/', 'site/src/layouts/', 'site/src/pages/', 'site/src/styles/', 'site/astro.config.mjs'];
const siteImpactPaths = ['site/', 'packages/', 'tests/', 'scripts/', '.github/', 'package.json', 'pnpm-lock.yaml', 'pnpm-workspace.yaml', 'playwright.config.ts', 'lighthouserc.json'];

const matches = (path: string, patterns: string[]) => patterns.some((pattern) => pattern.endsWith('/') ? path.startsWith(pattern) : path === pattern);

export function classifyChanges(paths: string[], headRef: string) {
  const release = headRef.startsWith('release/');
  const content = headRef.startsWith('content/');
  const generated = paths.filter((path) => matches(path, generatedPaths));
  const presentation = paths.filter((path) => matches(path, presentationPaths));
  const violations: string[] = [];

  if (!release && generated.length) violations.push(`generated files are only allowed on release/* branches: ${generated.join(', ')}`);
  if (content) {
    const outsideKnowledge = paths.filter((path) => !path.startsWith('knowledge/'));
    if (outsideKnowledge.length) violations.push(`content/* branches may only change knowledge/: ${outsideKnowledge.join(', ')}`);
  }
  if (release) {
    const outsideRelease = paths.filter((path) => !path.startsWith('knowledge/') && !matches(path, generatedPaths));
    if (outsideRelease.length) violations.push(`release/* branches may only change knowledge and generated allowlist paths: ${outsideRelease.join(', ')}`);
    if (presentation.length) violations.push(`release/* branches cannot change presentation files: ${presentation.join(', ')}`);
  }

  return {
    release,
    fullValidation: release || paths.some((path) => matches(path, siteImpactPaths) && !matches(path, generatedPaths)),
    violations,
  };
}

export function writePolicyOutputs(result: ReturnType<typeof classifyChanges>) {
  const output = process.env.GITHUB_OUTPUT;
  if (!output) return;
  appendFileSync(output, `release=${result.release}\nfull_validation=${result.fullValidation}\n`);
}
