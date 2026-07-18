const markdownImage = /!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
const sensitiveQueryKey = /(?:token|signature|sig|secret|auth|key|expires|x-amz-)/i;

export function validateExternalImages(body: string, sourcePath: string) {
  const errors: string[] = [];
  for (const match of body.matchAll(markdownImage)) {
    const [syntax, alt, target] = match;
    if (!/^https?:\/\//i.test(target)) continue;
    if (!target.startsWith('https://')) errors.push(`${sourcePath}: external image must use HTTPS (${target})`);
    if (!alt.trim()) errors.push(`${sourcePath}: external image requires alt text (${target})`);
    try {
      const url = new URL(target);
      for (const key of url.searchParams.keys()) {
        if (sensitiveQueryKey.test(key)) errors.push(`${sourcePath}: external image URL contains a sensitive or temporary query parameter (${key})`);
      }
    } catch {
      errors.push(`${sourcePath}: invalid external image URL (${target})`);
    }
    const following = body.slice((match.index ?? 0) + syntax.length, (match.index ?? 0) + syntax.length + 400);
    if (!/图片来源：\s*\S+/.test(following) || !/授权：\s*\S+/.test(following)) {
      errors.push(`${sourcePath}: external image requires nearby 图片来源 and 授权 text (${target})`);
    }
  }
  return errors;
}
