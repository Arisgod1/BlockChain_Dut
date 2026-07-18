import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('home page contract and accessibility', async ({ page, isMobile }) => {
  await page.goto('./');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('正在发生的研究');
  if (isMobile) {
    await page.getByRole('button', { name: '菜单' }).click();
  }
  await expect(page.getByRole('navigation', { name: '主要导航' })).toBeVisible();
  await expect(page.getByText('最近更新', { exact: true })).toBeVisible();
  await expect(page.getByText('技术地图', { exact: true })).toBeVisible();
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
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
