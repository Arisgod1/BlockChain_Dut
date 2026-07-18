import { describe, expect, it } from 'vitest';
import { resolve } from 'node:path';
import { readKnowledge } from '../src/generator/generate.js';
import { root } from '../src/lib.js';

describe('knowledge source', () => {
  it('excludes templates and examples from publication input', async () => {
    const items = await readKnowledge();
    expect(items.every((item) => /^knowledge\/(group|tracks|meetings|projects|members|recruitment)\//.test(item.sourcePath))).toBe(true);
    expect(items.some((item) => item.sourcePath.includes('/_templates/') || item.sourcePath.includes('/examples/'))).toBe(false);
  });
  it('keeps source and generated layers separate', () => expect(resolve(root, 'knowledge')).not.toBe(resolve(root, 'site/src/content/generated')));
});
