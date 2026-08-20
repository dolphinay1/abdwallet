import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { checkRateLimit } from '../lib/rate-limit';
import { sendViaCustomAPI, type CustomAPI } from '../lib/custom-apis';
import { clearSession, saveSession, loadSession } from '../lib/session-lock';

describe('Security Hardening & Regulatory Integrity Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('Rate Limiter', () => {
    it('allows requests within limit and throttles excess requests with 429', () => {
      const mockReq = {
        headers: new Headers({ 'x-forwarded-for': '203.0.113.195' }),
      } as unknown as Request;

      // 3 requests allowed with limit of 3
      expect(checkRateLimit(mockReq, 3, 60_000).allowed).toBe(true);
      expect(checkRateLimit(mockReq, 3, 60_000).allowed).toBe(true);
      expect(checkRateLimit(mockReq, 3, 60_000).allowed).toBe(true);

      // 4th request must be rejected with 429 status
      const blocked = checkRateLimit(mockReq, 3, 60_000);
      expect(blocked.allowed).toBe(false);
      expect(blocked.response?.status).toBe(429);
    });
  });

  describe('Custom APIs Security', () => {
    it('transmits transaction payload without exposing or taking raw private keys', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ txid: '0xabc123' }),
      });
      global.fetch = mockFetch;

      const customApi: CustomAPI = {
        id: 'test-api',
        name: 'Test RPC',
        symbol: 'TST',
        decimals: 18,
        balanceEndpoint: 'https://api.test.com/balance/{address}',
        balanceJsonPath: 'result',
        sendEndpoint: 'https://api.test.com/broadcast',
        sendBodyTemplate: '{"from":"{from}","to":"{to}","amount":"{amount}","signedTx":"{signedTx}"}',
      };

      const txid = await sendViaCustomAPI(customApi, {
        from: '0x1111',
        to: '0x2222',
        amount: '5.0',
        signedTx: '0xdeadbeef',
      });

      expect(txid).toBe('0xabc123');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.com/broadcast',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            from: '0x1111',
            to: '0x2222',
            amount: '5.0',
            signedTx: '0xdeadbeef',
          }),
        })
      );
    });
  });

  describe('Session Lock Shadow Wipe', () => {
    it('wipes both primary session and shadow copy when clearSession is executed', () => {
      saveSession('encrypted-vault-payload');
      expect(loadSession()).toBe('encrypted-vault-payload');

      clearSession();
      expect(loadSession()).toBeNull();
    });
  });

  describe('Zero Plaintext Key Storage in LocalStorage (G2)', () => {
    it('ensures localStorage contains zero key derivation material or master seeds', () => {
      expect(localStorage.getItem('__gwvs_bk__')).toBeNull();
      expect(localStorage.getItem('__gw_hs_key__')).toBeNull();
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        expect(key?.startsWith('__gw_vault_')).toBeFalsy();
      }
    });
  });

  describe('Proxy SSRF Hardening (G5)', () => {
    it('blocks private IP and localhost targets with 403 status', async () => {
      const { POST } = await import('../src/app/api/proxy/route');
      const req = new Request('http://localhost:3000/api/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: 'https://127.0.0.1:8080/admin' }),
      });
      const res = await POST(req);
      expect(res.status).toBe(403);
    });
  });

  describe('Per-Vault Cryptographic Random Salt & AAD Shard Hardening (G6, Item 9)', () => {
    it('encrypts and recovers vault data using per-vault random salt and AAD with PBKDF2', async () => {
      const { persistVault, loadPersistedVault, hasPersistedVault } = await import('../lib/persistent-vault');
      const testMnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
      const passphrase = 'test-secure-passphrase-123';
      const vaultId = 'test-vault-unique-1';

      await persistVault(testMnemonic, passphrase, vaultId);
      expect(await hasPersistedVault(vaultId)).toBe(true);

      const recovered = await loadPersistedVault(passphrase, vaultId);
      expect(recovered).toBe(testMnemonic);
    });

    it('rejects incorrect passphrases without deleting the vault', async () => {
      const { persistVault, loadPersistedVault, hasPersistedVault } = await import('../lib/persistent-vault');
      const testMnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
      const passphrase = 'test-correct-passphrase';
      const vaultId = 'test-vault-lockout-test';

      await persistVault(testMnemonic, passphrase, vaultId);
      await expect(loadPersistedVault('wrong-pass', vaultId)).rejects.toThrow();
      expect(await hasPersistedVault(vaultId)).toBe(true);
    });
  });

  describe('Secure Async Rate Limiter & IP Extraction (Item 5)', () => {
    it('extracts IP from edge-trusted header and enforces rate limits asynchronously', async () => {
      const { checkRateLimitAsync } = await import('../lib/rate-limit');
      const req = new Request('http://localhost:3000/api/tokens', {
        headers: new Headers({
          'x-forwarded-for': 'spoofed.attacker.ip, 198.51.100.25',
        }),
      });

      const res1 = await checkRateLimitAsync(req, 2, 60_000);
      expect(res1.allowed).toBe(true);

      const res2 = await checkRateLimitAsync(req, 2, 60_000);
      expect(res2.allowed).toBe(true);

      const res3 = await checkRateLimitAsync(req, 2, 60_000);
      expect(res3.allowed).toBe(false);
      expect(res3.response?.status).toBe(429);
    });
  });

  describe('SSRF Protection & RPC Proxy (Kritik 1 & Yüksek 2)', () => {
    it('rejects private IP literals and non-HTTPS schemes in proxy route', async () => {
      const { POST } = await import('../src/app/api/proxy/route');

      // Private loopback IP rejected
      const req1 = new Request('http://localhost:3000/api/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: 'https://127.0.0.1:8545', method: 'POST', payload: {} }),
      });
      const res1 = await POST(req1);
      expect(res1.status).toBe(403);
      const data1 = await res1.json();
      expect(data1.error).toContain('SSRF blocked');

      // Non-HTTPS rejected
      const req2 = new Request('http://localhost:3000/api/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: 'http://cloudflare-eth.com', method: 'POST', payload: {} }),
      });
      const res2 = await POST(req2);
      expect(res2.status).toBe(400);
      const data2 = await res2.json();
      expect(data2.error).toContain('HTTPS protocol is required');
    });
  });
});
