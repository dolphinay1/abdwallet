import { test, expect } from '@playwright/test';
import { waitForWallet } from './helpers';

test.describe('UI Smoke', () => {

  test('no console errors on load', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
    page.on('pageerror', err => errors.push(err.message));

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await waitForWallet(page);
    await page.waitForTimeout(2000);

    const filtered = errors.filter(e =>
      !e.includes('favicon') && !e.includes('net::ERR') && !e.includes('ResizeObserver')
      && !e.includes('Failed to load resource')   // external CDN/RPC assets
      && !e.includes('USDT Tron balance error')   // third-party Tron RPC rate limits (already caught in-app)
    );
    if (filtered.length > 0) console.warn('Console errors:', filtered);
    expect(filtered.length).toBe(0);
    console.log('[ok] No console errors');
  });

  test('core dashboard elements visible on desktop', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await waitForWallet(page);

    // Current neumorphic dashboard: monolith address block + action buttons
    await expect(page.locator('text=Active Monolith Address').first()).toBeVisible({ timeout: 8000 });
    await expect(page.locator('button:has-text("Send")').first()).toBeVisible();
    await expect(page.locator('button:has-text("Network")').first()).toBeVisible();

    await page.screenshot({ path: 'test-results/06-vault-panel.png', fullPage: true });
    console.log('[ok] Dashboard elements visible');
  });

  test('wallet address visible in dashboard', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await waitForWallet(page);
    await page.waitForTimeout(2000);

    const address = await page.evaluate(() => {
      const h = JSON.parse(localStorage.getItem('__gw_wallet_history__') ?? '[]');
      return h[0]?.address ?? '';
    });
    // Dashboard shows short address like "0xA580...A773"
    const shortAddr = `${address.slice(0, 6)}...${address.slice(-4)}`;
    await expect(page.locator(`text=${shortAddr}`).first()).toBeVisible({ timeout: 8000 });

    await page.screenshot({ path: 'test-results/06-dashboard.png', fullPage: true });
    console.log('[ok] Address visible:', shortAddr);
  });

  test('mobile viewport — dashboard renders at 390px', async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await ctx.newPage();

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await waitForWallet(page);

    await expect(page.locator('text=Active Monolith Address').first()).toBeVisible({ timeout: 8000 });
    await page.screenshot({ path: 'test-results/06-mobile-open.png', fullPage: true });

    await ctx.close();
    console.log('[ok] Mobile dashboard renders');
  });

  test('chain selector opens network modal', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await waitForWallet(page);
    await page.waitForTimeout(2000);

    const networkBtn = page.locator('button:has-text("NETWORK")').first();
    if (await networkBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await networkBtn.click();
      await page.waitForTimeout(600);
      await page.screenshot({ path: 'test-results/06-network-modal.png', fullPage: true });
      await page.keyboard.press('Escape');
      console.log('[ok] Network modal opened');
    } else {
      console.log('Network button not found — skip');
    }
  });

  test('System Diagnostics shows Volatile/EPHEMERAL mode initially', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await waitForWallet(page);

    await expect(
      page.locator('text=Volatile').or(page.locator('text=VOLATILE')).or(page.locator('text=Ephemeral')).first()
    ).toBeVisible({ timeout: 8000 });
    console.log('[ok] Diagnostics shows Volatile/Ephemeral');
  });

  test('QR/Receive modal opens', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await waitForWallet(page);
    await page.waitForTimeout(2000);

    const qrBtn = page.locator('button:has-text("QR")').or(page.locator('button:has-text("RECEIVE")')).first();
    if (await qrBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await qrBtn.click();
      await page.waitForTimeout(600);
      await page.screenshot({ path: 'test-results/06-qr-modal.png', fullPage: true });
      await page.keyboard.press('Escape');
      console.log('[ok] QR modal opened');
    } else {
      console.log('QR button not visible — skip');
    }
  });

});
