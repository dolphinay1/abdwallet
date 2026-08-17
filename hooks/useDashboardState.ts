'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { ethers } from 'ethers';
import { useWallet } from '@/context/WalletContext';
import { CHAINS, type Chain } from '@/lib/chains';
import { getGasPrices, type GasPrices } from '@/lib/gas';
import { fetchNFTs, type NFTItem } from '@/lib/nfts';
import { fetchApprovals, type TokenApproval } from '@/lib/approvals';
import { fetchTxHistory, type TxRecord } from '@/lib/tokens';
import { loadContacts, addContact, deleteContact, type Contact } from '@/lib/address-book';
import {
  getHistory,
  addToHistory,
  makeSnapshot,
  removeFromHistory,
  deleteSavedVault,
  updateSnapshotChain,
  storeVaultBlob,
  type WalletSnapshot,
} from '@/lib/wallet-history';
import { loadCustomChains, type CustomChain } from '@/lib/custom-chains';
import { loadCustomTokens, type CustomToken } from '@/lib/custom-tokens';
import { loadCustomAPIs, type CustomAPI } from '@/lib/custom-apis';
import { ephemeralSign } from '@/lib/signer';
import { ledgerSign, type LedgerEntry } from '@/lib/ledger';
import { getProvider } from '@/lib/provider';
import { clearShadow } from '@/lib/session-lock';

import { NON_EVM_META, type Tab } from '@/components/dashboard/types';
import { useExtensionBridge } from '@/hooks/useExtensionBridge';
import { useNonEvmWallet } from '@/hooks/useNonEvmWallet';
import { useWalletBalances } from '@/hooks/useWalletBalances';
import { usePageVisibility } from '@/hooks/usePageVisibility';

export function useDashboardState() {
  const wallet = useWallet();
  const [mode, setMode] = useState<'simple' | 'advanced'>('simple');
  const [activeTab, setActiveTab] = useState<Tab>('balance');
  const [selectedChain, setSelectedChain] = useState<Chain>(CHAINS[0]);
  const [manualChain, setManualChain] = useState<Chain | null>(null);

  const {
    tokens,
    setTokens,
    prices,
    setPrices,
    changes24h,
    isLoadingTotal,
    allChainTokens,
    loadTokens,
    refreshAllBalances,
  } = useWalletBalances();

  const {
    selectedNonEvm,
    setSelectedNonEvm,
    nonEvmAddr,
    nonEvmBal,
    nonEvmUsdPrice,
    nonEvmLoading,
    loadNonEvmData,
    handleNonEvmSend,
  } = useNonEvmWallet();

  const { extPresent, extAttached, extAttaching, extError, attachExtension } = useExtensionBridge();

  const [txs, setTxs] = useState<TxRecord[]>([]);
  const [isLoadingTxs, setIsLoadingTxs] = useState(false);
  const [nfts, setNfts] = useState<NFTItem[]>([]);
  const [isLoadingNfts, setIsLoadingNfts] = useState(false);
  const [, setGasPrices] = useState<GasPrices | null>(null);
  const [approvals, setApprovals] = useState<TokenApproval[]>([]);
  const [isLoadingApprovals, setIsLoadingApprovals] = useState(false);
  const [revokingApproval, setRevokingApproval] = useState<string | null>(null);

  // Modals state
  const [showSend, setShowSend] = useState(false);
  const [showNetworks, setShowNetworks] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [showWC, setShowWC] = useState(false);
  const [showNonEvmSend, setShowNonEvmSend] = useState(false);
  const [showSwap, setShowSwap] = useState(false);
  const [showLedger, setShowLedger] = useState(false);
  const [activeLedger, setActiveLedger] = useState<LedgerEntry | null>(null);
  const [showTransfer, setShowTransfer] = useState(false);
  const [showAddressBook, setShowAddressBook] = useState(false);
  const [showSavedVaults, setShowSavedVaults] = useState(false);
  const [showPassphraseModal, setShowPassphraseModal] = useState(false);
  const [showWipeWarning, setShowWipeWarning] = useState(false);
  const [showNewWalletWarning, setShowNewWalletWarning] = useState(false);
  const [showCustomChainModal, setShowCustomChainModal] = useState(false);
  const [showCustomTokenModal, setShowCustomTokenModal] = useState(false);
  const [showCustomAPIModal, setShowCustomAPIModal] = useState(false);
  const [isSavingVault, setIsSavingVault] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [customChains, setCustomChains] = useState<CustomChain[]>([]);
  const [, setCustomTokens] = useState<CustomToken[]>([]);
  const [, setCustomAPIs] = useState<CustomAPI[]>([]);

  const [walletHistory, setWalletHistory] = useState<WalletSnapshot[]>([]);
  const [currentHistoryId, setCurrentHistoryId] = useState<string | null>(null);
  const isSwitchingRef = useRef(false);
  const [everUnlocked, setEverUnlocked] = useState(false);
  const [frozenAddress, setFrozenAddress] = useState<string | null>(null);
  const [frozenMode, setFrozenMode] = useState(wallet.mode);
  const txCacheRef = useRef<Map<string, { data: TxRecord[]; fetchedAt: number }>>(new Map());

  useEffect(() => {
    if (wallet.isUnlocked) setEverUnlocked(true);
  }, [wallet.isUnlocked]);

  useEffect(() => {
    setContacts(loadContacts());
    setCustomChains(loadCustomChains());
    setCustomTokens(loadCustomTokens());
    setCustomAPIs(loadCustomAPIs());
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = mode === 'advanced' ? 'advanced' : '';
  }, [mode]);

  useEffect(() => {
    if (mode === 'simple' && ['nfts', 'approvals', 'staking', 'lightning'].includes(activeTab)) {
      setActiveTab('balance');
    }
  }, [mode, activeTab]);

  useEffect(() => {
    if (wallet.isUnlocked && wallet.activeAddress) {
      setFrozenAddress(wallet.activeAddress);
    }
  }, [wallet.isUnlocked, wallet.activeAddress]);

  useEffect(() => {
    if (wallet.mode === 'PERSISTENT') setFrozenMode('PERSISTENT');
    else if (wallet.isUnlocked) setFrozenMode('EPHEMERAL');
  }, [wallet.mode, wallet.isUnlocked]);

  const address = wallet.activeAddress ?? frozenAddress;
  const displayAddress = selectedNonEvm && nonEvmAddr ? nonEvmAddr : address;
  const shortAddr = displayAddress ? `${displayAddress.slice(0, 6)}...${displayAddress.slice(-4)}` : '—';

  // History tracking
  useEffect(() => {
    if (!wallet.isUnlocked || !wallet.activeAddress) return;
    const history = getHistory();
    const existing = history.find((s) => s.address === wallet.activeAddress);
    const chainInfo = {
      chainId: selectedChain.id,
      chainName: selectedChain.name,
      chainColor: selectedChain.color,
      chainLogo: selectedChain.logoUrl,
      coinSymbol: selectedChain.symbol,
      isNonEvm: false,
    };
    if (existing) {
      setCurrentHistoryId(existing.id);
      setWalletHistory(history);
      wallet.getMnemonicForExport().then((m) => {
        if (m) storeVaultBlob(existing.id, m);
      }).catch(() => {});
    } else {
      const snap = makeSnapshot(wallet.activeAddress, wallet.mode as 'EPHEMERAL' | 'PERSISTENT', chainInfo);
      addToHistory(snap);
      setCurrentHistoryId(snap.id);
      setWalletHistory(getHistory());
      wallet.getMnemonicForExport().then((m) => {
        if (m) storeVaultBlob(snap.id, m);
      }).catch(() => {});
    }
  }, [wallet.isUnlocked, wallet.activeAddress, selectedChain, wallet]);

  useEffect(() => {
    const handler = () => setWalletHistory(getHistory());
    window.addEventListener('cw:history:updated', handler);
    return () => window.removeEventListener('cw:history:updated', handler);
  }, []);

  useEffect(() => {
    if (!currentHistoryId || isSwitchingRef.current) return;
    if (selectedNonEvm) {
      const m = NON_EVM_META[selectedNonEvm];
      if (m) {
        updateSnapshotChain(currentHistoryId, {
          chainName: m.name,
          chainColor: m.color,
          chainLogo: m.logoUrl,
          coinSymbol: m.symbol,
          isNonEvm: true,
          chainId: undefined,
        });
      }
    } else {
      updateSnapshotChain(currentHistoryId, {
        chainId: selectedChain.id,
        chainName: selectedChain.name,
        chainColor: selectedChain.color,
        chainLogo: selectedChain.logoUrl,
        coinSymbol: selectedChain.symbol,
        isNonEvm: false,
      });
    }
    setWalletHistory(getHistory());
  }, [currentHistoryId, selectedChain, selectedNonEvm]);

  const switchToSnap = useCallback(
    async (snap: WalletSnapshot) => {
      isSwitchingRef.current = true;
      try {
        await wallet.switchToSavedWallet(snap.id);
        if (snap.isNonEvm && snap.coinSymbol && NON_EVM_META[snap.coinSymbol]) {
          const m = NON_EVM_META[snap.coinSymbol];
          updateSnapshotChain(snap.id, {
            chainName: m.name,
            chainColor: m.color,
            chainLogo: m.logoUrl,
            coinSymbol: m.symbol,
            isNonEvm: true,
            chainId: undefined,
          });
          setSelectedNonEvm(snap.coinSymbol);
          setManualChain(null);
        } else {
          const found = snap.chainId ? CHAINS.find((c) => c.id === snap.chainId) : null;
          const chain = found ?? CHAINS[0];
          updateSnapshotChain(snap.id, {
            chainId: chain.id,
            chainName: chain.name,
            chainColor: chain.color,
            chainLogo: chain.logoUrl,
            coinSymbol: chain.symbol,
            isNonEvm: false,
          });
          setSelectedNonEvm(null);
          setSelectedChain(chain);
          setManualChain(chain);
        }
        setWalletHistory(getHistory());
      } finally {
        setTimeout(() => {
          isSwitchingRef.current = false;
        }, 100);
      }
    },
    [wallet, setSelectedNonEvm]
  );

  useEffect(() => {
    if (!wallet.isUnlocked || !address) return;
    loadTokens(address, selectedChain);
  }, [wallet.isUnlocked, address, selectedChain, loadTokens]);

  const loadTxs = useCallback(async () => {
    if (!address) return;
    const cacheKey = `${address}:${selectedChain.id}`;
    const cached = txCacheRef.current.get(cacheKey);
    if (cached && Date.now() - cached.fetchedAt < 90_000) {
      setTxs(cached.data);
      return;
    }
    setIsLoadingTxs(true);
    try {
      const history = await fetchTxHistory(address, selectedChain.id);
      setTxs(history);
      txCacheRef.current.set(cacheKey, { data: history, fetchedAt: Date.now() });
    } finally {
      setIsLoadingTxs(false);
    }
  }, [address, selectedChain.id]);

  useEffect(() => {
    if (activeTab === 'transactions' && wallet.isUnlocked && address) loadTxs();
  }, [activeTab, wallet.isUnlocked, address, selectedChain.id, loadTxs]);

  const loadNfts = useCallback(async () => {
    if (!address || selectedNonEvm) return;
    setIsLoadingNfts(true);
    try {
      const items = await fetchNFTs(address, selectedChain.id);
      setNfts(items);
    } finally {
      setIsLoadingNfts(false);
    }
  }, [address, selectedChain.id, selectedNonEvm]);

  useEffect(() => {
    if (activeTab === 'nfts' && wallet.isUnlocked && address) loadNfts();
  }, [activeTab, wallet.isUnlocked, address, selectedChain.id, loadNfts]);

  const loadApprovals = useCallback(async () => {
    if (!address || selectedNonEvm || !selectedChain.isAlchemy) return;
    setIsLoadingApprovals(true);
    try {
      const items = await fetchApprovals(address, selectedChain.id);
      setApprovals(items);
    } finally {
      setIsLoadingApprovals(false);
    }
  }, [address, selectedChain.id, selectedNonEvm]);

  useEffect(() => {
    if (activeTab === 'approvals' && wallet.isUnlocked && address) loadApprovals();
  }, [activeTab, wallet.isUnlocked, address, selectedChain.id, loadApprovals]);

  const isPageVisible = usePageVisibility(() => {
    if (wallet.isUnlocked && !selectedNonEvm) {
      getGasPrices(selectedChain.id).then(setGasPrices).catch(() => {});
    }
  });

  useEffect(() => {
    if (!wallet.isUnlocked || selectedNonEvm) {
      setGasPrices(null);
      return;
    }
    if (!isPageVisible) return;

    getGasPrices(selectedChain.id).then(setGasPrices).catch(() => {});
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        getGasPrices(selectedChain.id).then(setGasPrices).catch(() => {});
      }
    }, 15_000);
    return () => clearInterval(interval);
  }, [wallet.isUnlocked, selectedChain.id, selectedNonEvm, isPageVisible]);

  const autoSelectedRef = useRef(false);
  useEffect(() => {
    if (!wallet.isUnlocked || !address) return;
    const doAutoSelect = !autoSelectedRef.current;
    autoSelectedRef.current = true;

    refreshAllBalances(
      address,
      () => wallet.getMnemonicForExport(),
      doAutoSelect
        ? (bestChain, bestToks, bestPrices) => {
            setSelectedChain(bestChain);
            setTokens(bestToks);
            setPrices(bestPrices);
          }
        : undefined
    );
  }, [wallet.isUnlocked, address, refreshAllBalances, setTokens, setPrices, wallet]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    if (activeTab === 'transactions' && address) {
      txCacheRef.current.delete(`${address}:${selectedChain.id}`);
    }
    await Promise.all([
      activeTab === 'balance' && address ? loadTokens(address, selectedChain) : Promise.resolve(),
      activeTab === 'transactions' ? loadTxs() : Promise.resolve(),
      activeTab === 'nfts' ? loadNfts() : Promise.resolve(),
      activeTab === 'approvals' ? loadApprovals() : Promise.resolve(),
      selectedNonEvm ? loadNonEvmData(selectedNonEvm) : Promise.resolve(),
    ]);
    setIsRefreshing(false);
  };

  const handleRevokeApproval = async (approval: TokenApproval) => {
    if (!address || (!wallet.scatteredKeyStore && !activeLedger)) return;
    const key = `${approval.token}-${approval.spender}`;
    setRevokingApproval(key);
    try {
      const provider = getProvider(selectedChain.id);
      const iface = new ethers.Interface(['function approve(address spender, uint256 amount) returns (bool)']);
      const data = iface.encodeFunctionData('approve', [approval.spender, 0n]);
      const nonce = await provider.getTransactionCount(address, 'latest');
      const feeData = await provider.getFeeData();
      const tx: ethers.TransactionRequest = {
        to: approval.token,
        from: address,
        data,
        nonce,
        chainId: selectedChain.id,
        gasLimit: 60000n,
        maxFeePerGas: feeData.maxFeePerGas ?? undefined,
        maxPriorityFeePerGas: feeData.maxPriorityFeePerGas ?? undefined,
      };
      const signed = activeLedger
        ? await ledgerSign(activeLedger.derivationPath, tx)
        : await ephemeralSign(wallet.scatteredKeyStore!, tx);
      await provider.broadcastTransaction(signed);
      setApprovals((prev) => prev.filter((a) => !(a.token === approval.token && a.spender === approval.spender)));
    } catch (e: unknown) {
      alert(`Revoke failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setRevokingApproval(null);
    }
  };

  const handleConfirmWipe = () => {
    setShowWipeWarning(false);
    wallet.disableSessionLock();
    wallet.wipeABDWallet();
    clearShadow();
  };

  const handleConfirmNewWallet = () => {
    setShowNewWalletWarning(false);
    wallet.disableSessionLock();
    wallet.wipeABDWallet();
    clearShadow();
    setTimeout(() => wallet.createABDWallet(), 80);
  };

  const handleConfirmPassphrase = async (passphrase: string) => {
    setShowPassphraseModal(false);
    const mnemonic = await wallet.getMnemonicForExport();
    if (mnemonic) attachExtension(mnemonic, passphrase);
  };

  const hasTokensOnChain = (allChainTokens.find((x) => x.chain.id === selectedChain.id)?.toks ?? tokens).some(
    (t) => parseFloat(t.balance || '0') > 0
  );

  return {
    wallet,
    mode, setMode,
    activeTab, setActiveTab,
    selectedChain, setSelectedChain,
    manualChain, setManualChain,
    tokens, prices, changes24h, isLoadingTotal, allChainTokens,
    selectedNonEvm, setSelectedNonEvm,
    nonEvmAddr, nonEvmBal, nonEvmUsdPrice, nonEvmLoading,
    handleNonEvmSend,
    extPresent, extAttached, extAttaching, extError,
    txs, isLoadingTxs,
    nfts, isLoadingNfts,
    approvals, isLoadingApprovals, revokingApproval, handleRevokeApproval,
    showSend, setShowSend,
    showNetworks, setShowNetworks,
    showQR, setShowQR,
    showWC, setShowWC,
    showNonEvmSend, setShowNonEvmSend,
    showSwap, setShowSwap,
    showLedger, setShowLedger,
    activeLedger, setActiveLedger,
    showTransfer, setShowTransfer,
    showAddressBook, setShowAddressBook,
    showSavedVaults, setShowSavedVaults,
    showPassphraseModal, setShowPassphraseModal,
    showWipeWarning, setShowWipeWarning,
    showNewWalletWarning, setShowNewWalletWarning,
    showCustomChainModal, setShowCustomChainModal,
    showCustomTokenModal, setShowCustomTokenModal,
    showCustomAPIModal, setShowCustomAPIModal,
    isSavingVault, setIsSavingVault,
    isRefreshing, handleRefresh,
    contacts, setContacts,
    customChains, setCustomChains,
    setCustomTokens, setCustomAPIs,
    walletHistory, setWalletHistory,
    currentHistoryId,
    everUnlocked,
    frozenMode,
    address, displayAddress, shortAddr,
    switchToSnap,
    handleConfirmWipe,
    handleConfirmNewWallet,
    handleConfirmPassphrase,
    hasTokensOnChain,
  };
}
