import { test, expect } from '@playwright/test';
import { waitForWallet, getHistory, getVaultBlobKeys, attachConsoleLogger, saveWalletViaIcon } from './helpers';

test.describe('Persist & Access (Saved Vaults)', () => {

  test('save icon creates vault blob, survives refresh', async ({ page }) => {
    attachConsoleLogger(page, '[02]');
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await waitForWallet(page);

    await saveWalletViaIcon(page);

    const blobKeys = await getVaultBlobKeys(page);
    expect(blobKeys.length).toBeGreaterThanOrEqual(1);

    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    const history = await getHistory(page);
    const saved = history.filter((h: any) => h.isSaved);
    expect(saved.length).toBeGreaterThanOrEqual(1);
    console.log('[ok] Saved vault survives refresh');
  });

  test('two wallets get distinct blobs', async ({ page }) => {
    attachConsoleLogger(page, '[02]');
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await waitForWallet(page);
    await saveWalletViaIcon(page);

    const blob1 = await getVaultBlobKeys(page);

    await page.locator('button').filter({ hasText: /Create New Wallet/i }).first().click();
    await page.waitForTimeout(500);
    await page.locator('button').filter({ hasText: /Create New/i }).first().click();
    await page.waitForTimeout(800);

    const createBtn = page.locator('button').filter({ hasText: /Create Wallet With This Phrase/i });
    if (await createBtn.count() > 0) {
      await createBtn.first().click();
      await page.waitForTimeout(1500);
    }
    await waitForWallet(page);
    await saveWalletViaIcon(page);

    const blob2 = await getVaultBlobKeys(page);
    expect(blob2.length).toBeGreaterThan(blob1.length);
    console.log('[ok] Two distinct blobs confirmed');
  });

  test('unsaved wallet has no blob', async ({ page }) => {
    attachConsoleLogger(page, '[02]');
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await waitForWallet(page);

    const blobKeys = await getVaultBlobKeys(page);
    expect(blobKeys).toHaveLength(0);
    console.log('[ok] Unsaved wallet has no blob (ephemeral)');
  });

});
