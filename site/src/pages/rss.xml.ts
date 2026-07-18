import { getCollection } from 'astro:content';

export async function GET({ site }: { site: URL }) {
  const entries = (await getCollection('generated')).filter((entry) => entry.data.status !== 'draft').sort((a, b) => b.data.updatedAt.getTime() - a.data.updatedAt.getTime());
  const items = entries.map((entry) => `<item><title><![CDATA[${entry.data.title}]]></title><description><![CDATA[${entry.data.summary}]]></description><link>${new URL(`${entry.data.type}/${entry.data.id}/`, site)}</link><pubDate>${entry.data.updatedAt.toUTCString()}</pubDate><guid>${entry.data.id}</guid></item>`).join('');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>区块链组知识库</title><link>${site}</link><description>公开研究记录</description>${items}</channel></rss>`, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } });
}
