import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('home page contract and accessibility', async ({ page, isMobile }) => {
  await page.goto('./');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('BlockChain_DUT核心知识库');
  if (isMobile) {
    await page.getByRole('button', { name: '菜单' }).click();
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
  const tag = page.getByRole('button', { name: '部署演练', exact: true });
  await tag.click();
  await expect(tag).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-filter-count]')).toContainText('1 项');

  await page.goto('./meetings/');
  await expect(page.getByRole('combobox', { name: '例会时间' })).toBeVisible();
  await expect(page.getByRole('link', { name: '演练维护者', exact: true })).toHaveAttribute('href', /members\/demo-maintainer/);
});

test('member cards expose grade and detail affordance', async ({ page }) => {
  await page.goto('./members/');
  await expect(page.getByRole('combobox', { name: '入学时间' })).toBeVisible();
  const card = page.getByRole('link', { name: '查看演练维护者的成员资料' });
  await expect(card).toBeVisible();
  await expect(card).toContainText('23 级');
  await expect(card).toContainText('联系方式暂未公开');
});

test('related references expose type and source', async ({ page }) => {
  await page.goto('./meetings/site-publishing-drill/');
  const references = page.locator('.reference-section');
  await expect(references.getByRole('heading', { name: '相关资料' })).toBeVisible();
  await expect(references).toContainText('技术指导');
  await expect(references).toContainText('项目');
  await expect(references).toContainText('来源：区块链组知识库（部署演练）');
});

test('published tracks and navigation remain usable', async ({ page, isMobile }) => {
  await page.goto('./tracks/');
  await expect(page.getByRole('heading', { level: 1, name: '技术指导' })).toBeVisible();
  await expect(page.getByRole('link', { name: '研究记录方法' })).toBeVisible();
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

test('404 contract', async ({ page }) => {
  await page.goto('./404.html');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('不在当前知识库');
});
