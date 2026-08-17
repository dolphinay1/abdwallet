import { TronWeb } from 'tronweb';
import { HDNodeWallet } from 'ethers';
import { zeroFill } from './crypto';

const fullNode = 'https://api.trongrid.io';
const solidityNode = 'https://api.trongrid.io';
const eventServer = 'https://api.trongrid.io';

export const tronWeb = new TronWeb({
  fullNode,
  solidityNode,
  eventServer,
});

import BIP32Factory from 'bip32';
import * as ecc from 'tiny-secp256k1';
import * as bip39 from 'bip39';

const bip32 = BIP32Factory(ecc);

/**
 * @warning Bu fonksiyon string tabanlı privateKey döndürmektedir. 
 * JavaScript'te string'ler immutable olduğu için doğrudan temizlenemez (zero-fill yapılamaz).
 * Kullanım sonrası referansı null'a çekmeniz önerilir.
 */
export function deriveTronWallet(mnemonic: string) {
  const seed = bip39.mnemonicToSeedSync(mnemonic.trim());
  const root = bip32.fromSeed(Uint8Array.from(seed));
  const child = root.derivePath("m/44'/195'/0'/0/0");
  zeroFill(seed);
  if (!child.privateKey) throw new Error('TRON derivation failed');

  const privateKey = Buffer.from(child.privateKey).toString('hex');
  let address = '';
  if (tronWeb.address && tronWeb.address.fromPrivateKey) {
    address = tronWeb.address.fromPrivateKey(privateKey) || '';
  }
  
  return { address: address || '', privateKey };
}

export async function getTronBalance(address: string) {
  try {
    const sun = await tronWeb.trx.getBalance(address);
    const trx = sun / 1e6;
    return { sun, trx };
  } catch {
    return { sun: 0, trx: 0 };
  }
}

export async function getTetherBalanceOnTron(address: string) {
  try {
    // USDT TRC20 Contract Address: TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t
    const trc20ContractAddress = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';
    const contract = await tronWeb.contract().at(trc20ContractAddress);
    const balance = await contract.balanceOf(address).call();
    return { raw: balance.toString(), usdt: parseInt(balance.toString()) / 1e6 };
  } catch {
    return { raw: '0', usdt: 0 };
  }
}

export async function sendTRX(fromPrivateKey: string, to: string, amountTRX: number): Promise<string> {
  const sun = Math.round(amountTRX * 1e6);
  const client = new TronWeb({
    fullNode,
    solidityNode,
    eventServer,
    privateKey: fromPrivateKey,
  });

  const tx = await client.trx.sendTransaction(to, sun);
  if (tx && tx.result) {
    return (tx.txid || (tx as any).transaction?.txID || '') as string;
  }
  throw new Error((tx as any)?.message || 'TRX transaction broadcast failed');
}

export async function sendTetherOnTron(fromPrivateKey: string, to: string, amountUSDT: number): Promise<string> {
  const trc20ContractAddress = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';
  const client = new TronWeb({
    fullNode,
    solidityNode,
    eventServer,
    privateKey: fromPrivateKey,
  });
  const contract = await client.contract().at(trc20ContractAddress);
  const rawAmount = Math.round(amountUSDT * 1e6);
  const txid = await contract.transfer(to, rawAmount).send();
  return txid;
}

