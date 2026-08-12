import { TronWeb } from 'tronweb';
import { HDNodeWallet } from 'ethers';

const fullNode = 'https://api.trongrid.io';
const solidityNode = 'https://api.trongrid.io';
const eventServer = 'https://api.trongrid.io';

export const tronWeb = new TronWeb({
  fullNode,
  solidityNode,
  eventServer,
});

export function deriveTronWallet(mnemonic: string) {
  // Tron uses the same derivation path as Ethereum (m/44'/60'/0'/0/0) but some tools use m/44'/195'/0'/0/0.
  // Standard Tron derivation is m/44'/195'/0'/0/0.
  // Ethers HDNodeWallet supports arbitrary paths.
  const node = HDNodeWallet.fromPhrase(mnemonic, undefined, "m/44'/195'/0'/0/0");
  
  // node.privateKey is the hex private key (with '0x' prefix).
  const privateKey = node.privateKey.replace('0x', '');
  
  // TronWeb can generate the address from a private key.
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
  } catch (err) {
    console.error('Tron balance error:', err);
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
  } catch (err) {
    console.error('USDT Tron balance error:', err);
    return { raw: '0', usdt: 0 };
  }
}
