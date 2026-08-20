import { Page, expect } from '@playwright/test';

export const PASSPHRASE = 'TestPass999!';

export const SEL = {
  createBtn: '#create-new-wallet-btn',
  importBtn: '#import-existing-wallet-btn',
  saveBtn: 'button:has-text("Save Wallet"), button:has(span.material-symbols-outlined:text("bookmark_add"))',
  advancedBtn: 'button:has-text("Advanced")',
  simpleBtn: 'button:has-text("Simple")',
  hintLink: "button:has-text(\"Didn't find\")",
  addChainBtn: 'button:has-text("Custom Chain")',
  saveChainBtn: 'button:has-text("Save Chain")',
  networkBtn: 'button:has-text("Network")',
  walletHistory: 'text=Wallet History',
};

export async function waitForWallet(page: Page, timeout = 25000) {
  const deadline = Date.now() + timeout;
  for (;;) {
    const ready = await page.evaluate(() => {
      const raw = localStorage.getItem('__gw_wallet_history__');
      const h = raw ? JSON.parse(raw) : [];
      return h.length > 0 && !!h[0].address;
    }).catch(() => false);
    if (ready) return;
    if (Date.now() > deadline) break;
    const btn = page.locator(SEL.createBtn);
    if (await btn.count() > 0) {
      await btn.click({ force: true }).catch(() => {});
      await page.waitForTimeout(800);
    } else {
      await page.waitForTimeout(500);
    }
  }
  throw new Error('waitForWallet timed out');
}

export async function getHistory(page: Page): Promise<any[]> {
  return page.evaluate(() => {
    const raw = localStorage.getItem('__gw_wallet_history__');
    return raw ? JSON.parse(raw) : [];
  });
}

export async function getVaultBlobKeys(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    return Object.keys(localStorage).filter(k => k.startsWith('__gw_vault_'));
  });
}

export async function saveWalletViaIcon(page: Page) {
  const saveIcon = page.locator(SEL.saveBtn).first();
  await expect(saveIcon).toBeVisible({ timeout: 10000 });
  await saveIcon.click();
  await page.waitForTimeout(1000);
}

export async function enableAdvancedMode(page: Page) {
  const advBtn = page.getByRole('button', { name: /settings.*Advanced/i }).first();
  await expect(advBtn).toBeVisible({ timeout: 10000 });
  await advBtn.click();
  await page.waitForTimeout(600);
}

export function attachConsoleLogger(page: Page, prefix: string) {
  page.on('console', msg => {
    if (msg.type() === 'error') console.log(`${prefix} [console.error] ${msg.text()}`);
  });
  page.on('pageerror', err => {
    console.log(`${prefix} [pageerror] ${err.message}`);
  });
}
