import { describe, expect, it } from 'vitest';
import { validateExternalImages } from '../src/validation/external-images.js';

describe('external Markdown images', () => {
  it('accepts a documented HTTPS image', () => {
    const body = '![公开架构图](https://example.org/image.png)\n\n> 图片来源：示例组织；授权：permission-granted。';
    expect(validateExternalImages(body, 'knowledge/tracks/example.md')).toEqual([]);
  });
  it('rejects HTTP, empty alt, sensitive queries, and missing attribution', () => {
    const errors = validateExternalImages('![](http://example.org/image.png?token=secret)', 'knowledge/tracks/example.md');
    expect(errors.join('\n')).toMatch(/HTTPS/);
    expect(errors.join('\n')).toMatch(/alt text/);
    expect(errors.join('\n')).toMatch(/query parameter/);
    expect(errors.join('\n')).toMatch(/图片来源/);
  });
});
