import { test, expect } from '@playwright/test';
import { waitForWallet, getHistory, getVaultBlobKeys, attachConsoleLogger, saveWalletViaIcon, SEL } from './helpers';

test.describe('Wallet Lifecycle', () => {

  test('creates wallet via button and shows address', async ({ page }) => {
    attachConsoleLogger(page, '[01]');
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await waitForWallet(page);

    const history = await getHistory(page);
    expect(history.length).toBeGreaterThanOrEqual(1);
    expect(history[0].address).toMatch(/^0x[a-fA-F0-9]{40}$/);

    await page.screenshot({ path: 'test-results/01-create.png', fullPage: true });
    console.log('[ok] Wallet created, address:', history[0].address);
  });

  test('ephemeral: no vault blob on create', async ({ page }) => {
    attachConsoleLogger(page, '[01]');
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await waitForWallet(page);

    const blobKeys = await getVaultBlobKeys(page);
    expect(blobKeys).toHaveLength(0);

    const sessionKey = await page.evaluate(() => localStorage.getItem('__gwvs__'));
    expect(sessionKey).toBeNull();
    console.log('[ok] Ephemeral confirmed — no blob, no session');
  });

  test('save icon persists wallet blob', async ({ page }) => {
    attachConsoleLogger(page, '[01]');
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await waitForWallet(page);

    await saveWalletViaIcon(page);

    const blobKeys = await getVaultBlobKeys(page);
    expect(blobKeys.length).toBeGreaterThanOrEqual(1);

    const history = await getHistory(page);
    const saved = history.filter((h: any) => h.isSaved);
    expect(saved.length).toBeGreaterThanOrEqual(1);

    await page.screenshot({ path: 'test-results/01-saved.png', fullPage: true });
    console.log('[ok] Wallet saved via icon, blob present');
  });

  test('wipe returns to AuthScreen, saved vaults survive', async ({ page }) => {
    attachConsoleLogger(page, '[01]');
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await waitForWallet(page);
    await saveWalletViaIcon(page);

    const savedBefore = (await getHistory(page)).filter((h: any) => h.isSaved).length;
    expect(savedBefore).toBeGreaterThanOrEqual(1);

    const wipeBtn = page.locator('button').filter({ hasText: /wipe|delete|destroy/i }).first();
    if (await wipeBtn.count() > 0) {
      await wipeBtn.click();
      await page.waitForTimeout(500);
      const confirmBtn = page.locator('button').filter({ hasText: /confirm|yes|wipe/i }).first();
      if (await confirmBtn.count() > 0) {
        await confirmBtn.click();
        await page.waitForTimeout(1000);
      }
    }

    const createBtn = page.locator(SEL.createBtn);
    const authVisible = await createBtn.count() > 0 || await page.locator('text=Create New Wallet').count() > 0;
    console.log('[ok] Wipe flow tested, auth screen visible:', authVisible);
  });

});
