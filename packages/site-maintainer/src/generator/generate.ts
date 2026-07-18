import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { basename, dirname, relative, resolve } from 'node:path';
import fg from 'fast-glob';
import matter from 'gray-matter';
import sharp from 'sharp';
import { contentSchema, type ContentFrontmatter } from '../schema/content.js';
import { blobSha, generatorVersion, root, sha256, sourceCommit } from '../lib.js';
import { manifestSchema, type Manifest, type ManifestEntry } from '../manifest/types.js';

const typeDir: Record<string, string> = {
  group: 'group', track: 'tracks', meeting: 'meetings', project: 'projects', member: 'members', recruitment: 'recruitment',
};

export type ParsedContent = { sourcePath: string; body: string; data: ContentFrontmatter; raw: string };

export async function readKnowledge(): Promise<ParsedContent[]> {
  const paths = await fg('knowledge/{group,tracks,meetings,projects,members,recruitment}/**/*.md', { cwd: root });
  const seen = new Set<string>();
  return paths.sort().map((sourcePath) => {
    const raw = readFileSync(resolve(root, sourcePath), 'utf8');
    const parsed = matter(raw);
    const data = contentSchema.parse(parsed.data);
    if (typeDir[data.type] !== sourcePath.split('/')[1]) throw new Error(`${sourcePath}: type does not match directory`);
    if (seen.has(data.id)) throw new Error(`${sourcePath}: duplicate id ${data.id}`);
    seen.add(data.id);
    return { sourcePath, body: parsed.content, data, raw };
  });
}

export function readManifest(): Manifest {
  const path = resolve(root, 'generated/manifest.json');
  if (!existsSync(path)) return { schemaVersion: 1, generatorVersion, processedSourceCommit: '', siteBuildContractVersion: 1, entries: [], redirects: {}, tombstones: {} };
  return manifestSchema.parse(JSON.parse(readFileSync(path, 'utf8')));
}

function publicUrl(item: ParsedContent) {
  return `/${typeDir[item.data.type]}/${item.data.id}/`;
}

function assetHash(path: string) {
  return sha256(readFileSync(resolve(root, 'knowledge', path.replace(/^\//, ''))));
}

async function removeConnectedWhite(source: string) {
  const { data, info } = await sharp(source).rotate().ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const seen = new Uint8Array(width * height);
  const queue = new Int32Array(width * height);
  let head = 0;
  let tail = 0;
  const isWhite = (index: number) => {
    const offset = index * channels;
    return data[offset] >= 245 && data[offset + 1] >= 245 && data[offset + 2] >= 245 && data[offset + 3] > 0;
  };
  const enqueue = (index: number) => {
    if (seen[index] || !isWhite(index)) return;
    seen[index] = 1;
    queue[tail++] = index;
  };
  for (let x = 0; x < width; x += 1) { enqueue(x); enqueue((height - 1) * width + x); }
  for (let y = 0; y < height; y += 1) { enqueue(y * width); enqueue(y * width + width - 1); }
  while (head < tail) {
    const index = queue[head++];
    const x = index % width;
    const y = Math.floor(index / width);
    data[index * channels + 3] = 0;
    if (x > 0) enqueue(index - 1);
    if (x + 1 < width) enqueue(index + 1);
    if (y > 0) enqueue(index - width);
    if (y + 1 < height) enqueue(index + width);
  }
  return sharp(data, { raw: { width, height, channels } });
}

async function processAssets(items: ParsedContent[], outputRoot: string) {
  const paths = new Set<string>();
  for (const item of items) {
    if (item.data.cover) paths.add(item.data.cover);
    for (const media of item.data.media) paths.add(media.path);
  }
  const siteAssets = ['recruitment-mark.png'];
  mkdirSync(resolve(outputRoot, 'assets/site'), { recursive: true });
  for (const filename of siteAssets) {
    const source = resolve(root, 'knowledge/assets/site/brand', filename);
    if (existsSync(source)) await sharp(source).rotate().trim().resize(1000, 1000, { fit: 'inside', withoutEnlargement: true }).png({ compressionLevel: 9 }).toFile(resolve(outputRoot, 'assets/site', filename));
  }
  const sign = resolve(root, 'knowledge/assets/site/brand/blockchain-group-sign.png');
  if (existsSync(sign)) await (await removeConnectedWhite(sign)).trim().resize(1000, 1000, { fit: 'inside', withoutEnlargement: true }).png({ compressionLevel: 9 }).toFile(resolve(outputRoot, 'assets/site/blockchain-group-sign.png'));
  const photo = resolve(root, 'knowledge/assets/site/photos/group-photo-original.jpg');
  if (existsSync(photo)) {
    await sharp(photo).rotate().resize(1600, 1067, { fit: 'cover' }).webp({ quality: 78 }).toFile(resolve(outputRoot, 'assets/site/group-photo-1600.webp'));
    await sharp(photo).rotate().resize(800, 533, { fit: 'cover' }).webp({ quality: 78 }).toFile(resolve(outputRoot, 'assets/site/group-photo-800.webp'));
  }
  for (const path of paths) {
    const source = resolve(root, 'knowledge', path.replace(/^\//, ''));
    if (!existsSync(source)) throw new Error(`missing image ${path}`);
    const destination = resolve(outputRoot, path.replace(/^\//, ''));
    mkdirSync(dirname(destination), { recursive: true });
    cpSync(source, destination);
  }
}

export async function generateCandidate(candidateRoot: string, sourcePr: number | null = null) {
  const items = await readKnowledge();
  const previous = readManifest();
  const commit = sourceCommit();
  const contentRoot = resolve(candidateRoot, 'content');
  const publicRoot = resolve(candidateRoot, 'public');
  rmSync(candidateRoot, { recursive: true, force: true });
  mkdirSync(contentRoot, { recursive: true });
  mkdirSync(publicRoot, { recursive: true });

  const entries: ManifestEntry[] = [];
  for (const item of items) {
    if (item.data.status === 'draft') continue;
    const filename = `${item.data.id}.md`;
    const generatedPath = `site/src/content/generated/${filename}`;
    writeFileSync(resolve(contentRoot, filename), item.raw);
    const contentHash = sha256(item.raw);
    const old = previous.entries.find((entry) => entry.id === item.data.id && !entry.deleted);
    entries.push({
      id: item.data.id, type: item.data.type, status: item.data.status, sourcePath: item.sourcePath,
      sourceBlobSha: blobSha(item.sourcePath), sourceCommit: commit, sourcePr: old?.contentHash === contentHash ? old.sourcePr : sourcePr,
      generatedPath, publicUrl: publicUrl(item), contentHash,
      assetHashes: [...(item.data.cover ? [item.data.cover] : []), ...item.data.media.map((m) => m.path)].sort().map(assetHash), deleted: false,
    });
  }
  if (entries.length === 0) {
    writeFileSync(resolve(contentRoot, '_empty.md'), `---\nschemaVersion: 1\nid: collection-empty\ntitle: 空集合占位\nsummary: 仅用于保持内容集合可初始化，不会生成公开页面。\ntype: group\nstatus: draft\nauthors:\n  - system\ntags:\n  - system\npublishedAt: 1970-01-01\nupdatedAt: 1970-01-01\ncover: null\nmedia: []\nreferences: []\n---\n`);
  }

  const activeIds = new Set(entries.map((entry) => entry.id));
  const tombstones = { ...previous.tombstones };
  const redirects = { ...previous.redirects };
  const deletedEntries: ManifestEntry[] = [];
  for (const old of previous.entries.filter((entry) => !entry.deleted && !activeIds.has(entry.id))) {
    const inbound = items.filter((item) => item.raw.includes(old.publicUrl));
    if (inbound.length) throw new Error(`cannot delete ${old.id}; referenced by ${inbound.map((item) => item.sourcePath).join(', ')}`);
    tombstones[old.publicUrl] = { id: old.id, deletedAtCommit: commit, previousUrl: old.publicUrl };
    deletedEntries.push({ ...old, sourceCommit: commit, deleted: true });
  }
  for (const entry of entries) {
    const old = previous.entries.find((candidate) => candidate.id === entry.id);
    if (old && old.publicUrl !== entry.publicUrl) redirects[old.publicUrl] = entry.publicUrl;
  }

  await processAssets(items.filter((item) => item.data.status !== 'draft'), publicRoot);
  const manifest: Manifest = {
    schemaVersion: 1, generatorVersion, processedSourceCommit: commit, siteBuildContractVersion: 1,
    entries: [...entries, ...previous.entries.filter((entry) => entry.deleted), ...deletedEntries].sort((a, b) => a.id.localeCompare(b.id)),
    redirects: Object.fromEntries(Object.entries(redirects).sort()),
    tombstones: Object.fromEntries(Object.entries(tombstones).sort()),
  };
  writeFileSync(resolve(candidateRoot, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  writeFileSync(resolve(candidateRoot, 'redirects.json'), `${JSON.stringify(manifest.redirects, null, 2)}\n`);
  writeFileSync(resolve(candidateRoot, 'tombstones.json'), `${JSON.stringify(manifest.tombstones, null, 2)}\n`);
  return manifest;
}

export function normalizedCandidateHash(candidateRoot: string) {
  const paths = fg.sync('**/*', { cwd: candidateRoot, onlyFiles: true }).sort();
  return sha256(paths.map((path) => `${path}\0${sha256(readFileSync(resolve(candidateRoot, path)))}`).join('\n'));
}

export function installCandidate(candidateRoot: string) {
  const targets = [
    [resolve(candidateRoot, 'content'), resolve(root, 'site/src/content/generated')],
    [resolve(candidateRoot, 'public'), resolve(root, 'site/public/generated')],
  ] as const;
  for (const [, destination] of targets) rmSync(destination, { recursive: true, force: true });
  for (const [source, destination] of targets) cpSync(source, destination, { recursive: true });
  mkdirSync(resolve(root, 'generated'), { recursive: true });
  for (const file of ['manifest.json', 'redirects.json', 'tombstones.json']) cpSync(resolve(candidateRoot, file), resolve(root, 'generated', file));
}

export function describeChanges(manifest: Manifest) {
  const old = readManifest();
  const oldById = new Map(old.entries.map((entry) => [entry.id, entry]));
  const added = manifest.entries.filter((entry) => !entry.deleted && !oldById.has(entry.id));
  const changed = manifest.entries.filter((entry) => !entry.deleted && oldById.has(entry.id) && oldById.get(entry.id)?.contentHash !== entry.contentHash);
  const deleted = manifest.entries.filter((entry) => entry.deleted && oldById.get(entry.id)?.deleted !== true);
  return { added, changed, deleted };
}
