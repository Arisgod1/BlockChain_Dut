import { z } from 'zod';

export const contentTypes = ['group', 'track', 'meeting', 'project', 'member', 'recruitment'] as const;
export const statuses = ['draft', 'published', 'archived'] as const;

export const mediaSchema = z.object({
  path: z.string().startsWith('/assets/'),
  alt: z.string(),
  caption: z.string().optional(),
  source: z.string().min(1),
  rights: z.enum(['owned', 'licensed', 'public-domain', 'permission-granted']),
  creator: z.string().optional(),
});

const common = z.object({
  schemaVersion: z.literal(1),
  id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  title: z.string().min(1).max(120),
  summary: z.string().min(1).max(240),
  type: z.enum(contentTypes),
  status: z.enum(statuses),
  authors: z.array(z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)).min(1),
  tags: z.array(z.string().min(1)).min(1).max(8),
  publishedAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  cover: z.string().startsWith('/assets/').nullable(),
  media: z.array(mediaSchema),
});

export const contentSchema = z.discriminatedUnion('type', [
  common.extend({ type: z.literal('meeting'), speakers: z.array(z.string()).min(1), heldAt: z.coerce.date() }),
  common.extend({ type: z.literal('group') }),
  common.extend({ type: z.literal('track') }),
  common.extend({ type: z.literal('project') }),
  common.extend({ type: z.literal('member') }),
  common.extend({ type: z.literal('recruitment') }),
]);

export type ContentFrontmatter = z.infer<typeof contentSchema>;
