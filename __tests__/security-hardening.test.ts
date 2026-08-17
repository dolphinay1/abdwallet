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
});
