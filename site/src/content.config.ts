import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { contentSchema } from '../../packages/site-maintainer/src/schema/content';

const generated = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/generated' }),
  schema: contentSchema,
});

export const collections = { generated };
