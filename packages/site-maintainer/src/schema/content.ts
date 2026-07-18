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

export const referenceKinds = ['article', 'project', 'meeting', 'guide', 'document', 'video', 'website', 'dataset', 'other'] as const;
export const referenceSchema = z.object({
  kind: z.enum(referenceKinds),
  title: z.string().min(1).max(160),
  url: z.string().refine((value) => value.startsWith('/') || /^https?:\/\//.test(value), 'must be an internal path or HTTP(S) URL'),
  source: z.string().min(1).max(120),
}).strict();

const common = z.object({
  schemaVersion: z.literal(1),
  id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  title: z.string().min(1).max(120),
  summary: z.string().min(1).max(240),
  type: z.enum(contentTypes),
  status: z.enum(statuses),
  authors: z.array(z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)).min(1),
  tags: z.array(z.string().min(1)).min(1).max(8),
  updatedAt: z.coerce.date(),
  cover: z.string().startsWith('/assets/').nullable(),
  media: z.array(mediaSchema),
  references: z.array(referenceSchema).max(24),
}).strict();

const publishable = common.extend({ publishedAt: z.coerce.date() });

export const contactSchema = z.object({
  label: z.string().min(1).max(24),
  value: z.string().min(1).max(120),
  url: z.string().url().optional(),
}).strict();

export const contentSchema = z.discriminatedUnion('type', [
  common.extend({ type: z.literal('meeting'), speakers: z.array(z.string()).min(1), heldAt: z.coerce.date() }),
  publishable.extend({ type: z.literal('group') }),
  publishable.extend({ type: z.literal('track') }),
  publishable.extend({ type: z.literal('project') }),
  publishable.extend({ type: z.literal('member'), grade: z.string().regex(/^\d{2}$/), contacts: z.array(contactSchema).max(6) }),
  publishable.extend({ type: z.literal('recruitment'), contactEmail: z.string().email(), qqGroupNumber: z.string().regex(/^\d{5,14}$/) }),
]);

export type ContentFrontmatter = z.infer<typeof contentSchema>;
