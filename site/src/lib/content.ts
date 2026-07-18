import { getCollection, type CollectionEntry } from 'astro:content';

export type KnowledgeEntry = CollectionEntry<'generated'>;

export async function publicEntries() {
  return (await getCollection('generated')).filter((entry) => entry.data.status !== 'draft').sort((a, b) => b.data.updatedAt.getTime() - a.data.updatedAt.getTime());
}

export const labels: Record<string, string> = {
  group: '小组', track: '技术指导', meeting: '例会', project: '项目成果', member: '成员', recruitment: '加入',
};

export const paths: Record<string, string> = {
  group: 'about', track: 'tracks', meeting: 'meetings', project: 'projects', member: 'members', recruitment: 'about',
};

export function withBase(path = '') {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  return `${base}/${path.replace(/^\//, '')}`;
}

export function entryPath(entry: KnowledgeEntry, base = import.meta.env.BASE_URL) {
  return `${base.replace(/\/$/, '')}/${paths[entry.data.type]}/${entry.data.id}/`;
}

export function dateText(date: Date) {
  return new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium', timeZone: 'Asia/Shanghai' }).format(date);
}
