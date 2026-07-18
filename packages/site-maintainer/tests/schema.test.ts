import { describe, expect, it } from 'vitest';
import { contentSchema } from '../src/schema/content.js';

const base = { schemaVersion: 1, id: 'example-track', title: '示例', summary: '只用于验证结构的中性示例。', type: 'track', status: 'draft', authors: ['member-example'], tags: ['示例'], publishedAt: '2026-07-17', updatedAt: '2026-07-17', cover: null, media: [], references: [] };

describe('content schema', () => {
  it('accepts a versioned draft', () => expect(contentSchema.parse(base).schemaVersion).toBe(1));
  it('rejects unknown schema versions', () => expect(() => contentSchema.parse({ ...base, schemaVersion: 2 })).toThrow());
  it('requires meeting speakers and heldAt', () => expect(() => contentSchema.parse({ ...base, type: 'meeting' })).toThrow());
  it('accepts heldAt as the meeting public date', () => {
    const { publishedAt: _oldField, ...meetingBase } = base;
    expect(contentSchema.parse({ ...meetingBase, type: 'meeting', speakers: ['member-example'], heldAt: '2026-07-17' }).type).toBe('meeting');
  });
  it('rejects the removed meeting publishedAt field', () => expect(() => contentSchema.parse({ ...base, type: 'meeting', speakers: ['member-example'], heldAt: '2026-07-17' })).toThrow());
  it('requires project createdAt and rejects project publishedAt', () => {
    expect(() => contentSchema.parse({ ...base, type: 'project' })).toThrow();
    const { publishedAt: _oldField, ...projectBase } = base;
    expect(contentSchema.parse({ ...projectBase, type: 'project', createdAt: '2026-07-17T21:00:29+08:00' }).type).toBe('project');
  });
  it('requires member grade and contacts', () => expect(() => contentSchema.parse({ ...base, type: 'member' })).toThrow());
  it('accepts a GitHub-backed member avatar', () => expect(contentSchema.safeParse({ ...base, type: 'member', grade: '23', avatarUrl: 'https://avatars.githubusercontent.com/public-account?size=192', contacts: [] }).success).toBe(true));
  it('requires a type and source for every reference', () => expect(() => contentSchema.parse({ ...base, references: [{ title: '资料', url: '/example/' }] })).toThrow());
});
