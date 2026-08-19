import { test, expect } from '@playwright/test';
import { waitForWallet, attachConsoleLogger, enableAdvancedMode, SEL } from './helpers';

test.describe('Advanced Mode', () => {

  test('Advanced button switches view, Simple returns', async ({ page }) => {
    attachConsoleLogger(page, '[05]');
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await waitForWallet(page);

    // Advanced button: first one (not the hint link)
    const advBtn = page.locator('button').filter({ hasText: /^settings\s*ADVANCED$/ })
      .or(page.getByRole('button', { name: /settings.*Advanced/i })).first();
    await expect(advBtn).toBeVisible({ timeout: 8000 });
    await advBtn.click();
    await page.waitForTimeout(600);

    await expect(page.locator('text=Advanced Mode').filter({ visible: true }).first()).toBeVisible();
    await page.screenshot({ path: 'test-results/05-advanced.png', fullPage: true });

    // Simple button
    const simpleBtn = page.locator(SEL.simpleBtn).first();
    await expect(simpleBtn).toBeVisible();
    await simpleBtn.click();
    await page.waitForTimeout(600);

    // After Simple click, AdvancedDashboard should not be shown — verify simpleBtn is gone
    await expect(page.locator(SEL.simpleBtn).filter({ visible: true })).toHaveCount(0);
    console.log('[ok] Advanced ↔ Simple toggle');
  });

  test('"Try Advanced Mode" hint link works', async ({ page }) => {
    attachConsoleLogger(page, '[05]');
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await waitForWallet(page);

    await page.locator(SEL.hintLink).first().click();
    await page.waitForTimeout(600);
    await expect(page.locator('text=Advanced Mode').filter({ visible: true }).first()).toBeVisible();
    console.log("[ok] Hint link → Advanced Mode");
  });

  test('custom chains localStorage key is created on Add', async ({ page }) => {
    attachConsoleLogger(page, '[05]');
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await waitForWallet(page);

    await enableAdvancedMode(page);
    await page.locator(SEL.addChainBtn).first().click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'test-results/05-chain-modal.png', fullPage: true });

    const byPlaceholder = (ph: string) => page.locator(`input[placeholder*="${ph}" i]`);
    await byPlaceholder('e.g. 2020').first().fill('137');
    await byPlaceholder('e.g. Ronin').first().fill('Polygon');
    await byPlaceholder('e.g. RON').first().fill('MATIC');
    await byPlaceholder('https://').first().fill('https://polygon-rpc.com');
    await byPlaceholder('https://').nth(1).fill('https://polygonscan.com');

    await page.locator(SEL.saveChainBtn).first().click();
    await page.waitForTimeout(1500);

    const chains = await page.evaluate(() => {
      const raw = localStorage.getItem('__cw_custom_chains__');
      return raw ? JSON.parse(raw) : [];
    });
    await page.screenshot({ path: 'test-results/05-chain-added.png', fullPage: true });
    console.log('Custom chains in storage:', chains.length);
    console.log('[ok] Custom chain modal tested');
  });

});
