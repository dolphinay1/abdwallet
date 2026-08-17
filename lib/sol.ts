// Solana — isolated from EVM system.
// BIP44 m/44'/501'/0'/0' ed25519 derivation from BIP39 mnemonic.

import * as bip39 from 'bip39';
import { derivePath } from 'ed25519-hd-key';
import { Connection, PublicKey, Keypair, Transaction, SystemProgram, LAMPORTS_PER_SOL, sendAndConfirmTransaction } from '@solana/web3.js';
import { zeroFill } from './crypto';

const RPC = 'https://solana-rpc.publicnode.com';
const connection = new Connection(RPC, 'confirmed');

export interface SOLWallet {
  address: string;
  keypair: Keypair;
  secretKey: Uint8Array;
  wipe: () => void;
}

export interface SOLBalance {
  sol: number;
  lamports: number;
}

export interface SOLTransaction {
  txid: string;
  amount: number;
  timestamp: number;
  confirmations: number;
}

export function deriveSOLWallet(mnemonic: string): SOLWallet {
  const seed = bip39.mnemonicToSeedSync(mnemonic.trim());
  const { key } = derivePath("m/44'/501'/0'/0'", seed.toString('hex'));
  const keypair = Keypair.fromSeed(key);
  zeroFill(seed);
  zeroFill(key);
  return {
    address: keypair.publicKey.toBase58(),
    keypair,
    secretKey: keypair.secretKey,
    wipe: function() {
      if (this.secretKey) zeroFill(this.secretKey);
      if (this.keypair && this.keypair.secretKey) zeroFill(this.keypair.secretKey);
    }
  };
}

export async function getSOLBalance(address: string): Promise<SOLBalance> {
  const pubkey = new PublicKey(address);
  const lamports = await connection.getBalance(pubkey);
  return { sol: lamports / LAMPORTS_PER_SOL, lamports };
}

export async function sendSOL(from: SOLWallet, to: string, amountSOL: number): Promise<string> {
  try {
    const toPubkey = new PublicKey(to);
    const lamports = Math.round(amountSOL * LAMPORTS_PER_SOL);

    const tx = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: from.keypair.publicKey,
        toPubkey,
        lamports,
      })
    );

    const sig = await sendAndConfirmTransaction(connection, tx, [from.keypair]);
    return sig;
  } finally {
    if (from.wipe) from.wipe();
  }
}

export async function getSOLTransactions(address: string, limit = 20): Promise<SOLTransaction[]> {
  try {
    const pubkey = new PublicKey(address);
    const sigs = await connection.getSignaturesForAddress(pubkey, { limit });
    if (sigs.length === 0) return [];

    const batchSigs = sigs.slice(0, Math.min(sigs.length, 10)).map(s => s.signature);
    let parsedTxs: (import('@solana/web3.js').ParsedTransactionWithMeta | null)[] = [];
    try {
      parsedTxs = await connection.getParsedTransactions(batchSigs, { maxSupportedTransactionVersion: 0 });
    } catch {
      // Fallback if parsed transactions query fails
    }

    return sigs.map((s, idx) => {
      let amount = 0;
      const parsed = parsedTxs[idx];
      if (parsed && parsed.meta && parsed.meta.preBalances && parsed.meta.postBalances) {
        const accountKeys = parsed.transaction.message.accountKeys;
        const accIdx = accountKeys.findIndex((k: any) => {
          const keyStr = typeof k === 'string' ? k : (k.pubkey?.toBase58?.() || k.pubkey?.toString?.() || '');
          return keyStr === address;
        });
        if (accIdx !== -1) {
          const pre = parsed.meta.preBalances[accIdx] ?? 0;
          const post = parsed.meta.postBalances[accIdx] ?? 0;
          amount = Math.round(((post - pre) / LAMPORTS_PER_SOL) * 1e6) / 1e6;
        }
      }
      return {
        txid: s.signature,
        amount,
        timestamp: s.blockTime ?? 0,
        confirmations: s.confirmationStatus === 'finalized' ? 999 : 1,
      };
    });
  } catch {
    return [];
  }
}

export async function estimateSOLFee(): Promise<number> {
  // SOL fees are very low and fixed (~5000 lamports per signature)
  return 5000 / LAMPORTS_PER_SOL;
}
