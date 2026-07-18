import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
export const generatorVersion = '1.0.0';

export function sha256(value: string | Buffer) {
  return createHash('sha256').update(value).digest('hex');
}

export function git(...args: string[]) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
}

export function head() {
  return git('rev-parse', 'HEAD');
}

export function sourceCommit() {
  try {
    return git('log', '-1', '--format=%H', '--', 'knowledge') || head();
  } catch {
    return head();
  }
}

export function blobSha(path: string) {
  try { return git('hash-object', path); } catch { return sha256(readFileSync(resolve(root, path))); }
}

export function run(command: string, args: string[], cwd = root) {
  const result = spawnSync(command, args, { cwd, stdio: 'inherit', env: { ...process.env, TZ: 'UTC' } });
  if (result.status !== 0) throw new Error(`${command} ${args.join(' ')} failed`);
}

export function ensureRepository() {
  if (!existsSync(resolve(root, '.git'))) throw new Error('site-maintainer must run from this repository');
}
