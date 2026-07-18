import { existsSync, readFileSync, statSync } from 'node:fs';
import { extname, resolve } from 'node:path';
import fg from 'fast-glob';
import sharp from 'sharp';
import { readKnowledge, readManifest } from '../generator/generate.js';
import { root } from '../lib.js';
import { validateExternalImages } from './external-images.js';

const sensitivePatterns = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /(?:api[_-]?key|secret|token)\s*[:=]\s*["']?[A-Za-z0-9_\-]{16,}/i,
  /https?:\/\/(?:localhost|127\.0\.0\.1|10\.|192\.168\.)/,
];

export async function checkAll() {
  const items = await readKnowledge();
  const errors: string[] = [];
  const routeByType: Record<string, string> = { group: 'about', track: 'tracks', meeting: 'meetings', project: 'projects', member: 'members', recruitment: 'about' };
  const assetDirByType: Record<string, string> = { group: 'group', track: 'tracks', meeting: 'meetings', project: 'projects', member: 'members', recruitment: 'recruitment' };
  const publicUrls = new Set(['/', '/tracks/', '/meetings/', '/projects/', '/members/', '/about/', '/search/', ...items.filter((item) => item.data.status !== 'draft').map((item) => `/${routeByType[item.data.type]}/${item.data.id}/`)]);
  const imageNames = new Set<string>();
  for (const item of items) {
    errors.push(...validateExternalImages(item.body, item.sourcePath));
    for (const pattern of sensitivePatterns) if (pattern.test(item.raw)) errors.push(`${item.sourcePath}: possible sensitive information`);
    const publicDate = item.data.type === 'meeting' ? item.data.heldAt : item.data.type === 'project' ? item.data.createdAt : item.data.publishedAt;
    if (item.data.updatedAt.toISOString().slice(0, 10) < publicDate.toISOString().slice(0, 10)) errors.push(`${item.sourcePath}: updatedAt precedes public date`);
    for (const reference of item.data.references) {
      if (reference.url.startsWith('/') && !publicUrls.has(reference.url)) errors.push(`${item.sourcePath}: reference target does not exist (${reference.url})`);
    }
    if (item.data.cover && !new RegExp(`^/assets/covers/${assetDirByType[item.data.type]}/${item.data.id}/cover\\.(?:jpg|jpeg|png|webp|avif)$`).test(item.data.cover)) errors.push(`${item.sourcePath}: cover must use its type and entry-id directory`);
    for (const media of item.data.media) {
      const ownedInline = new RegExp(`^/assets/inline/${assetDirByType[item.data.type]}/${item.data.id}/\\d{2}-[a-z0-9]+(?:-[a-z0-9]+)*\\.(?:jpg|jpeg|png|webp|avif)$`).test(media.path);
      const sharedEvent = /^\/assets\/events\/\d{4}\/[a-z0-9]+(?:-[a-z0-9]+)*\/\d{2}-[a-z0-9]+(?:-[a-z0-9]+)*\.(?:jpg|jpeg|png|webp|avif)$/.test(media.path);
      const recruitmentContact = item.data.type === 'recruitment' && /^\/assets\/site\/contact\/[a-z0-9]+(?:-[a-z0-9]+)*\.(?:jpg|jpeg|png|webp|avif)$/.test(media.path);
      if (!ownedInline && !sharedEvent && !recruitmentContact) errors.push(`${item.sourcePath}: media path must belong to the entry, a recruitment contact asset, or a shared event`);
      if (!media.alt.trim()) errors.push(`${item.sourcePath}: non-decorative media requires alt text (${media.path})`);
      if (imageNames.has(media.path)) continue;
      imageNames.add(media.path);
      const path = resolve(root, 'knowledge', media.path.replace(/^\//, ''));
      if (!existsSync(path)) errors.push(`${item.sourcePath}: missing ${media.path}`);
    }
  }
  const assetPaths = await fg('knowledge/assets/**/*.{jpg,jpeg,png,webp,avif}', { cwd: root });
  const assetPattern = /^knowledge\/assets\/(?:site\/(?:brand|photos|contact)\/[a-z0-9]+(?:-[a-z0-9]+)*|covers\/(?:group|tracks|meetings|projects|members|recruitment)\/[a-z0-9]+(?:-[a-z0-9]+)*\/cover|inline\/(?:group|tracks|meetings|projects|members|recruitment)\/[a-z0-9]+(?:-[a-z0-9]+)*\/\d{2}-[a-z0-9]+(?:-[a-z0-9]+)*|events\/\d{4}\/[a-z0-9]+(?:-[a-z0-9]+)*\/\d{2}-[a-z0-9]+(?:-[a-z0-9]+)*)\.(?:jpg|jpeg|png|webp|avif)$/;
  for (const relativePath of assetPaths.sort()) {
    const name = relativePath.split('/').at(-1) ?? '';
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*\.(?:jpg|jpeg|png|webp|avif)$/.test(name)) errors.push(`${relativePath}: invalid filename`);
    if (!assetPattern.test(relativePath)) errors.push(`${relativePath}: invalid asset directory structure`);
    if (statSync(resolve(root, relativePath)).size > 8 * 1024 * 1024) errors.push(`${relativePath}: source image exceeds 8MB`);
    const metadata = await sharp(resolve(root, relativePath)).metadata();
    if (!relativePath.startsWith('knowledge/assets/site/') && metadata.exif) errors.push(`${relativePath}: EXIF must be removed`);
  }
  const manifestPath = resolve(root, 'generated/manifest.json');
  if (existsSync(manifestPath)) readManifest();
  if (errors.length) throw new Error(errors.join('\n'));
  return { documents: items.length, assets: assetPaths.length };
}
