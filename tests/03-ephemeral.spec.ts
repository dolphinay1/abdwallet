import { test, expect } from '@playwright/test';
import { waitForWallet, getHistory, getVaultBlobKeys, attachConsoleLogger, SEL } from './helpers';

test.describe('Ephemeral Behavior', () => {

  test('create wallet: no session key, no vault blob', async ({ page }) => {
    attachConsoleLogger(page, '[03]');
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await waitForWallet(page);

    const sessionKey = await page.evaluate(() => localStorage.getItem('__gwvs__'));
    expect(sessionKey).toBeNull();

    const blobKeys = await getVaultBlobKeys(page);
    expect(blobKeys).toHaveLength(0);

    const history = await getHistory(page);
    expect(history.length).toBeGreaterThanOrEqual(1);
    console.log('[ok] Ephemeral: no session, no blob, history metadata only');
  });

  test('refresh after create returns to AuthScreen', async ({ page }) => {
    attachConsoleLogger(page, '[03]');
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await waitForWallet(page);

    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    const createBtn = page.locator(SEL.createBtn);
    const authVisible = await createBtn.count() > 0;
    expect(authVisible).toBe(true);
    console.log('[ok] Refresh returns to AuthScreen (ephemeral promise)');
  });

  test('history metadata preserved after refresh (no blob)', async ({ page }) => {
    attachConsoleLogger(page, '[03]');
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await waitForWallet(page);

    const historyBefore = await getHistory(page);

    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);

    const historyAfter = await getHistory(page);
    expect(historyAfter.length).toBe(historyBefore.length);
    expect(historyAfter[0].address).toBe(historyBefore[0].address);
    console.log('[ok] History metadata preserved across refresh');
  });

});
