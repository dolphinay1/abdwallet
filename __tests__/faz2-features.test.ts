import { describe, it, expect } from 'vitest';
import { buildStakeTx, STAKING_PROTOCOLS } from '../lib/staking';
import { deriveTronWallet, sendTRX, sendTetherOnTron } from '../lib/tron';
import { estimateSOLFee } from '../lib/sol';
import { riskColor, riskBg } from '../lib/security-scan';
import { buildMaskedTransaction } from '../lib/transaction';

describe('Faz 2 Feature Implementations', () => {
  it('Staking: buildStakeTx formats Lido and Rocket Pool calldata correctly', () => {
    expect(STAKING_PROTOCOLS).toHaveLength(2);
    
    // Lido stake
    const lidoTx = buildStakeTx('lido', 1000000000000000000n);
    expect(lidoTx.to.toLowerCase()).toBe('0xae7ab96520de3a18e5e111b5eaab095312d7fe84');
    expect(lidoTx.data.startsWith('0xa1903eab')).toBe(true);
    expect(lidoTx.value).toBe(1000000000000000000n);

    // Rocket Pool stake
    const rpTx = buildStakeTx('rocketpool', 500000000000000000n);
    expect(rpTx.to.toLowerCase()).toBe('0xdd3f50f8a6cafbe9b31a427582963f465e745af8');
    expect(rpTx.data).toBe('0xd0e30db0');
    expect(rpTx.value).toBe(500000000000000000n);
  });

  it('TRON: derives wallet and exposes sendTRX & sendTetherOnTron functions', () => {
    const mnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
    const wallet = deriveTronWallet(mnemonic);
    expect(wallet.address).toBeDefined();
    expect(wallet.privateKey).toBeDefined();
    expect(typeof sendTRX).toBe('function');
    expect(typeof sendTetherOnTron).toBe('function');
  });

  it('Security Scan: risk badges return expected styling', () => {
    expect(riskColor('danger')).toBe('#b91c1c');
    expect(riskColor('safe')).toBe('#23262b');
    expect(riskBg('danger')).toContain('185,28,28');
  });

  it('Solana: estimateSOLFee returns accurate standard fee', async () => {
    const fee = await estimateSOLFee();
    expect(fee).toBe(0.000005);
  });

  it('Transaction: buildMaskedTransaction constructs valid transaction request', async () => {
    const tx = await buildMaskedTransaction(
      '0x0000000000000000000000000000000000000001',
      '0.05',
      '0x0000000000000000000000000000000000000002',
      1
    );
    expect(tx.to).toBe('0x0000000000000000000000000000000000000001');
    expect(tx.gasLimit).toBeDefined();
    expect(tx.type).toBe(2);
  }, 15000);
});
