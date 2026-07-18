import { existsSync, readFileSync } from 'node:fs';
import { extname, resolve } from 'node:path';
import fg from 'fast-glob';
import sharp from 'sharp';
import { readKnowledge, readManifest } from '../generator/generate.js';
import { root } from '../lib.js';

const sensitivePatterns = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /(?:api[_-]?key|secret|token)\s*[:=]\s*["']?[A-Za-z0-9_\-]{16,}/i,
  /https?:\/\/(?:localhost|127\.0\.0\.1|10\.|192\.168\.)/,
];

export async function checkAll() {
  const items = await readKnowledge();
  const errors: string[] = [];
  const imageNames = new Set<string>();
  for (const item of items) {
    for (const pattern of sensitivePatterns) if (pattern.test(item.raw)) errors.push(`${item.sourcePath}: possible sensitive information`);
    if (item.data.updatedAt < item.data.publishedAt) errors.push(`${item.sourcePath}: updatedAt precedes publishedAt`);
    for (const media of item.data.media) {
      if (!media.alt.trim()) errors.push(`${item.sourcePath}: non-decorative media requires alt text (${media.path})`);
      if (imageNames.has(media.path)) continue;
      imageNames.add(media.path);
      const path = resolve(root, 'knowledge', media.path.replace(/^\//, ''));
      if (!existsSync(path)) errors.push(`${item.sourcePath}: missing ${media.path}`);
    }
  }
  const assetPaths = await fg('knowledge/assets/**/*.{jpg,jpeg,png,webp,avif}', { cwd: root });
  const basenames = new Set<string>();
  for (const relativePath of assetPaths.sort()) {
    const name = relativePath.split('/').at(-1) ?? '';
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*\.(?:jpg|jpeg|png|webp|avif)$/.test(name)) errors.push(`${relativePath}: invalid filename`);
    if (basenames.has(name)) errors.push(`${relativePath}: duplicate filename ${name}`);
    basenames.add(name);
    const metadata = await sharp(resolve(root, relativePath)).metadata();
    if (!relativePath.startsWith('knowledge/assets/site/') && metadata.exif) errors.push(`${relativePath}: EXIF must be removed`);
  }
  const manifestPath = resolve(root, 'generated/manifest.json');
  if (existsSync(manifestPath)) readManifest();
  if (errors.length) throw new Error(errors.join('\n'));
  return { documents: items.length, assets: assetPaths.length };
}
