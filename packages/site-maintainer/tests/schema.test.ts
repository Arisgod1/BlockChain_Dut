import { describe, expect, it } from 'vitest';
import { contentSchema } from '../src/schema/content.js';

const base = { schemaVersion: 1, id: 'example-track', title: '示例', summary: '只用于验证结构的中性示例。', type: 'track', status: 'draft', authors: ['member-example'], tags: ['示例'], publishedAt: '2026-07-17', updatedAt: '2026-07-17', cover: null, media: [] };

describe('content schema', () => {
  it('accepts a versioned draft', () => expect(contentSchema.parse(base).schemaVersion).toBe(1));
  it('rejects unknown schema versions', () => expect(() => contentSchema.parse({ ...base, schemaVersion: 2 })).toThrow());
  it('requires meeting speakers and heldAt', () => expect(() => contentSchema.parse({ ...base, type: 'meeting' })).toThrow());
});
