import { test, expect } from '@playwright/test';
import { waitForWallet, getHistory, getVaultBlobKeys, attachConsoleLogger, saveWalletViaIcon, SEL } from './helpers';

test.describe('Saved Vaults', () => {

  test('save icon marks wallet as saved', async ({ page }) => {
    attachConsoleLogger(page, '[sv]');
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await waitForWallet(page);

    await saveWalletViaIcon(page);

    const history = await getHistory(page);
    const saved = history.filter((h: any) => h.isSaved);
    expect(saved.length).toBe(1);
    console.log('[ok] Wallet marked as saved');
  });

  test('saved vault blob exists in localStorage', async ({ page }) => {
    attachConsoleLogger(page, '[sv]');
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await waitForWallet(page);
    await saveWalletViaIcon(page);

    const blobKeys = await getVaultBlobKeys(page);
    expect(blobKeys.length).toBeGreaterThanOrEqual(1);
    console.log('[ok] Vault blob present:', blobKeys.length);
  });

});
