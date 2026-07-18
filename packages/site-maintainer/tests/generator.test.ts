import { describe, expect, it } from 'vitest';
import { resolve } from 'node:path';
import { readKnowledge } from '../src/generator/generate.js';
import { root } from '../src/lib.js';

describe('knowledge source', () => {
  it('excludes templates and examples from publication input', async () => expect(await readKnowledge()).toEqual([]));
  it('keeps source and generated layers separate', () => expect(resolve(root, 'knowledge')).not.toBe(resolve(root, 'site/src/content/generated')));
});
