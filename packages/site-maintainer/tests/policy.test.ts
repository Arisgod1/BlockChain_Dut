import { describe, expect, it } from 'vitest';
import { classifyChanges } from '../src/validation/policy.js';

describe('PR change policy', () => {
  it('keeps content branches lightweight and knowledge-only', () => {
    expect(classifyChanges(['knowledge/tracks/example.md'], 'content/example')).toMatchObject({ fullValidation: false, violations: [] });
    expect(classifyChanges(['knowledge/tracks/example.md', 'README.md'], 'content/example').violations).not.toHaveLength(0);
  });
  it('rejects generated files outside release branches', () => {
    expect(classifyChanges(['site/src/content/generated/example.md'], 'feature/example').violations).not.toHaveLength(0);
  });
  it('allows only source corrections and generated files on release branches', () => {
    expect(classifyChanges(['knowledge/tracks/example.md', 'generated/manifest.json'], 'release/20260718-example')).toMatchObject({ release: true, fullValidation: true, violations: [] });
    expect(classifyChanges(['site/src/styles/global.css'], 'release/20260718-example').violations).not.toHaveLength(0);
  });
  it('requests full validation for website and generator changes', () => {
    expect(classifyChanges(['packages/site-maintainer/src/cli.ts'], 'feature/cli').fullValidation).toBe(true);
  });
});
