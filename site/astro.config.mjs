import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

const repository = process.env.GITHUB_REPOSITORY?.split('/')[1] ?? 'BlockChain_Dut';
const customSite = process.env.SITE_URL;
const base = customSite ? '/' : `/${repository}`;

function prefixProjectBase() {
  return (tree) => {
    const visit = (node) => {
      if (node?.type === 'element') {
        for (const attribute of ['href', 'src']) {
          const value = node.properties?.[attribute];
          if (typeof value === 'string' && value.startsWith('/') && !value.startsWith('//')) {
            node.properties[attribute] = `${base.replace(/\/$/, '')}${value}`;
          }
        }
      }
      node?.children?.forEach(visit);
    };
    visit(tree);
  };
}

export default defineConfig({
  site: customSite ?? `https://arisgod1.github.io/${repository}`,
  base,
  output: 'static',
  integrations: [sitemap()],
  markdown: { rehypePlugins: [prefixProjectBase] },
  build: { format: 'directory' },
  vite: { build: { cssMinify: true } },
});
