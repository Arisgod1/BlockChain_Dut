import { readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join } from 'node:path';
import { gzipSync } from 'node:zlib';

const root = new URL('../site/dist/', import.meta.url).pathname;
function walk(directory) {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}
const files = walk(root);
const compressed = (extension) => files.filter((file) => extname(file) === extension).reduce((sum, file) => sum + gzipSync(readFileSync(file)).byteLength, 0);
const js = compressed('.js');
const css = compressed('.css');
if (js > 50 * 1024) throw new Error(`compressed JS budget exceeded: ${js} bytes`);
if (css > 35 * 1024) throw new Error(`compressed CSS budget exceeded: ${css} bytes`);
console.log(`Budgets OK: JS ${js} bytes, CSS ${css} bytes`);
