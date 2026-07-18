import { z } from 'zod';

export const manifestEntrySchema = z.object({
  id: z.string(),
  type: z.string(),
  status: z.string(),
  sourcePath: z.string(),
  sourceBlobSha: z.string(),
  sourceCommit: z.string(),
  sourcePr: z.number().int().positive().nullable(),
  generatedPath: z.string(),
  publicUrl: z.string(),
  contentHash: z.string(),
  assetHashes: z.array(z.string()),
  deleted: z.boolean(),
});

export const manifestSchema = z.object({
  schemaVersion: z.literal(1),
  generatorVersion: z.string(),
  processedSourceCommit: z.string(),
  siteBuildContractVersion: z.literal(1),
  entries: z.array(manifestEntrySchema),
  redirects: z.record(z.string()),
  tombstones: z.record(z.object({ id: z.string(), deletedAtCommit: z.string(), previousUrl: z.string() })),
});

export type Manifest = z.infer<typeof manifestSchema>;
export type ManifestEntry = z.infer<typeof manifestEntrySchema>;
