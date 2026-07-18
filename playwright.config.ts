import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/visual',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: { baseURL: 'http://127.0.0.1:4321/BlockChain_Dut/', channel: process.env.CI ? undefined : 'chrome', locale: 'zh-CN', timezoneId: 'Asia/Shanghai', reducedMotion: 'reduce', trace: 'on-first-retry' },
  webServer: { command: 'pnpm --filter @blockchain-dut/site dev --host 127.0.0.1', url: 'http://127.0.0.1:4321/BlockChain_Dut/', reuseExistingServer: !process.env.CI },
  projects: [
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
    { name: 'tablet', use: { viewport: { width: 768, height: 1024 } } },
    { name: 'desktop', use: { viewport: { width: 1440, height: 1000 } } },
  ],
});
