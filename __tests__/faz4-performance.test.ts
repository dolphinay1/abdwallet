import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getPrice, getPrices, formatUSD } from '@/lib/prices';
import { getProvider, ABDProvider } from '@/lib/provider';

describe('Faz 4: Performance & UX Unit Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('Prices Caching & Deduplication', () => {
    it('formats USD prices cleanly with proper currency symbols', () => {
      expect(formatUSD(0)).toBe('$0.00');
      expect(formatUSD(0.0001)).toBe('<$0.01');
      expect(formatUSD(1234.56)).toBe('$1,234.56');
    });

    it('deduplicates simultaneous in-flight price queries', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          ethereum: { usd: 3450.5, usd_24h_change: 2.4 },
          bitcoin: { usd: 67000, usd_24h_change: -1.2 },
        }),
      });
      global.fetch = mockFetch;

      // Query both in parallel
      const [ethPrice, pricesMap] = await Promise.all([
        getPrice('ethereum'),
        getPrices(['ethereum', 'bitcoin']),
      ]);

      expect(ethPrice).toBe(3450.5);
      expect(pricesMap['bitcoin']).toBe(67000);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('RPC Provider Resilience', () => {
    it('instantiates and caches ABDProvider instances per chainId', () => {
      const p1 = getProvider(1);
      const p2 = getProvider(1);
      const p137 = getProvider(137);

      expect(p1).toBeInstanceOf(ABDProvider);
      expect(p1).toBe(p2);
      expect(p1).not.toBe(p137);
    });
  });
});
