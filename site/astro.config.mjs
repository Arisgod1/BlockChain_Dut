import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

const repository = process.env.GITHUB_REPOSITORY?.split('/')[1] ?? 'BlockChain_Dut';
const customSite = process.env.SITE_URL;
const base = customSite ? '/' : `/${repository}`;

export default defineConfig({
  site: customSite ?? `https://arisgod1.github.io/${repository}`,
  base,
  output: 'static',
  integrations: [sitemap()],
  build: { format: 'directory' },
  vite: { build: { cssMinify: true } },
});
