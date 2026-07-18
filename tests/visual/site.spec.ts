import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('home page contract and accessibility', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('BlockChain_DUT核心知识库');
  const menu = page.getByRole('button', { name: '菜单' });
  if (await menu.isVisible()) {
    await menu.click();
  }
  const navigation = page.getByRole('navigation', { name: '主要导航' });
  await expect(navigation).toBeVisible();
  await expect(navigation.getByRole('link', { name: '项目', exact: true })).toBeVisible();
  await expect(navigation.getByRole('link', { name: '组内动态', exact: true })).toBeVisible();
  await expect(page.getByText('最近更新', { exact: true })).toBeVisible();
  await expect(page.getByText('内容', { exact: true })).toBeVisible();
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

test('content filters and meeting speakers are linked', async ({ page }) => {
  await page.goto('./tracks/');
  const tag = page.getByRole('button', { name: 'Go', exact: true });
  await tag.click();
  await expect(tag).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-filter-count]')).toContainText('1 项');

  await page.goto('./meetings/');
  await expect(page.getByRole('combobox', { name: '例会时间' })).toBeVisible();
  await expect(page.getByRole('link', { name: '唐明迪', exact: true })).toHaveAttribute('href', /members\/tang-mingdi/);
});

test('member cards expose grade and detail affordance', async ({ page }) => {
  await page.goto('./members/');
  await expect(page.getByRole('combobox', { name: '入学时间' })).toBeVisible();
  const card = page.getByRole('link', { name: '查看唐明迪的成员资料' });
  await expect(card).toBeVisible();
  await expect(card).toContainText('23 级');
  await expect(card).toContainText('GitHub · Arisgod1');
});

test('related references expose type and source', async ({ page }) => {
  await page.goto('./meetings/git-version-control-meeting/');
  const references = page.locator('.reference-section');
  await expect(references.getByRole('heading', { name: '相关资料' })).toBeVisible();
  await expect(references).toContainText('文档');
  await expect(references).toContainText('来源：原区块链组网站');
});

test('published tracks and navigation remain usable', async ({ page, isMobile }) => {
  await page.goto('./tracks/');
  await expect(page.getByRole('heading', { level: 1, name: '技术指导' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Go 入门' })).toBeVisible();
  await expect(page.getByText('尚无已发布的技术方向')).toHaveCount(0);
  if (isMobile) {
    await page.getByRole('button', { name: '菜单' }).click();
    await expect(page.getByRole('link', { name: '例会', exact: true })).toBeVisible();
  }
});

test('search has an accessible loading state', async ({ page }) => {
  await page.goto('./search/');
  await page.getByRole('button', { name: '搜索' }).click();
  await expect(page.locator('#search-status')).toContainText('请输入');
});

test('public contact details and QR code are available', async ({ page }) => {
  await page.goto('./about/');
  await expect(page.getByText('QQ群：1103782491')).toBeVisible();
  await expect(page.getByRole('link', { name: 'arisone@foxmail.com' })).toHaveAttribute('href', 'mailto:arisone@foxmail.com');
  const qr = page.getByRole('img', { name: 'QQ群 1103782491 的加入二维码' });
  await expect(qr).toBeVisible();
  expect(await qr.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
});

test('collapsed menu exposes animated state without hiding navigation semantics', async ({ page }) => {
  await page.goto('./');
  const menu = page.getByRole('button', { name: '菜单' });
  test.skip(!(await menu.isVisible()));
  await menu.click();
  await expect(menu).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByRole('navigation', { name: '主要导航' })).toHaveClass(/is-open/);
});

test('404 contract', async ({ page }) => {
  await page.goto('./404.html');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('不在当前知识库');
});
