'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap } from 'lucide-react';
import { addContact, deleteContact } from '@/lib/address-book';
import { updateSnapshotChain, deleteSavedVault, removeFromHistory, getHistory } from '@/lib/wallet-history';
import { NON_EVM_META } from './dashboard/types';

import { DashboardModals } from './dashboard/DashboardModals';
import { DashboardHeader } from './dashboard/DashboardHeader';
import { DashboardActionGrid } from './dashboard/DashboardActionGrid';
import { StakingPanel } from '@/components/StakingPanel';
import { LightningTab } from './dashboard/tabs/LightningTab';
import { BalanceTab } from './dashboard/tabs/BalanceTab';
import { TransactionsTab } from './dashboard/tabs/TransactionsTab';
import { NFTsTab } from './dashboard/tabs/NFTsTab';
import { ApprovalsTab } from './dashboard/tabs/ApprovalsTab';
import { WalletHistorySection } from './dashboard/tabs/WalletHistorySection';

import { NetworkOfflineBanner } from './dashboard/ui/NetworkOfflineBanner';
import { useDashboardState } from '@/hooks/useDashboardState';

export function WalletDashboard() {
  const d = useDashboardState();

  if (!d.wallet.isUnlocked && !d.everUnlocked) {
    return (
      <section className="flex-1 pt-[64px] px-4 pb-6 md:p-16 flex flex-col overflow-y-auto overflow-x-hidden">
        <div className="max-w-3xl mx-auto w-full space-y-6 md:space-y-12 animate-pulse">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-3 flex-1">
              <div className="h-12 w-56 bg-[rgba(166,177,198,0.15)] rounded-xl" />
              <div className="h-3 w-36 bg-[rgba(166,177,198,0.15)] rounded-full" />
            </div>
            <div className="h-9 w-32 bg-[rgba(166,177,198,0.15)] rounded-full" />
          </div>
          <div className="space-y-6">
            <div className="h-28 w-64 bg-[rgba(166,177,198,0.15)] rounded-2xl" />
            <div className="h-24 bg-[rgba(166,177,198,0.15)] rounded-xl" />
          </div>
        </div>
      </section>
    );
  }

  const currentSnap = d.walletHistory.find((s) => s.id === d.currentHistoryId);
  const isCurrentSaved = currentSnap?.isSaved ?? (d.frozenMode === 'PERSISTENT');

  const handleQuickSave = async () => {
    if (isCurrentSaved) {
      d.setShowSavedVaults(true);
      return;
    }
    if (!currentSnap) return;
    d.setIsSavingVault(true);
    try {
      if (d.selectedNonEvm && NON_EVM_META[d.selectedNonEvm]) {
        const m = NON_EVM_META[d.selectedNonEvm];
        updateSnapshotChain(currentSnap.id, {
          chainName: m.name,
          chainColor: m.color,
          chainLogo: m.logoUrl,
          coinSymbol: m.symbol,
          isNonEvm: true,
          chainId: undefined,
        });
      } else {
        updateSnapshotChain(currentSnap.id, {
          chainId: d.selectedChain.id,
          chainName: d.selectedChain.name,
          chainColor: d.selectedChain.color,
          chainLogo: d.selectedChain.logoUrl,
          coinSymbol: d.selectedChain.symbol,
          isNonEvm: false,
        });
      }
      await d.wallet.persistCurrentWallet(currentSnap.id);
      d.setWalletHistory(getHistory());
    } catch {
      alert('Failed to save vault.');
    } finally {
      d.setIsSavingVault(false);
    }
  };

  return (
    <>
      <NetworkOfflineBanner onRetry={d.handleRefresh} />
      <DashboardModals
        tokens={d.tokens}
        prices={d.prices}
        showNetworks={d.showNetworks}
        setShowNetworks={d.setShowNetworks}
        showWC={d.showWC}
        setShowWC={d.setShowWC}
        showSend={d.showSend}
        setShowSend={d.setShowSend}
        showNonEvmSend={d.showNonEvmSend}
        setShowNonEvmSend={d.setShowNonEvmSend}
        showQR={d.showQR}
        setShowQR={d.setShowQR}
        showSwap={d.showSwap}
        setShowSwap={d.setShowSwap}
        showTransfer={d.showTransfer}
        setShowTransfer={d.setShowTransfer}
        showLedger={d.showLedger}
        setShowLedger={d.setShowLedger}
        showAddressBook={d.showAddressBook}
        setShowAddressBook={d.setShowAddressBook}
        showSavedVaults={d.showSavedVaults}
        setShowSavedVaults={d.setShowSavedVaults}
        showCustomChainModal={d.showCustomChainModal}
        setShowCustomChainModal={d.setShowCustomChainModal}
        showCustomTokenModal={d.showCustomTokenModal}
        setShowCustomTokenModal={d.setShowCustomTokenModal}
        showCustomAPIModal={d.showCustomAPIModal}
        setShowCustomAPIModal={d.setShowCustomAPIModal}
        showPassphraseModal={d.showPassphraseModal}
        setShowPassphraseModal={d.setShowPassphraseModal}
        showWipeWarning={d.showWipeWarning}
        setShowWipeWarning={d.setShowWipeWarning}
        showNewWalletWarning={d.showNewWalletWarning}
        setShowNewWalletWarning={d.setShowNewWalletWarning}
        selectedChain={d.selectedChain}
        setSelectedChain={d.setSelectedChain}
        setManualChain={d.setManualChain}
        selectedNonEvm={d.selectedNonEvm}
        setSelectedNonEvm={d.setSelectedNonEvm}
        liveNonEvm={d.selectedNonEvm ? NON_EVM_META[d.selectedNonEvm] ?? null : null}
        displayAddress={d.displayAddress}
        activeAddress={d.address}
        activeLedger={d.activeLedger}
        setActiveLedger={d.setActiveLedger}
        contacts={d.contacts}
        setContacts={d.setContacts}
        customChains={d.customChains}
        setCustomChains={d.setCustomChains}
        setCustomTokens={d.setCustomTokens}
        setCustomAPIs={d.setCustomAPIs}
        walletHistory={d.walletHistory}
        currentHistoryId={d.currentHistoryId}
        onSwitchSnapshot={async (snap) => {
          try {
            await d.switchToSnap(snap);
            d.setShowSavedVaults(false);
          } catch {
            alert('Vault data not found.');
          }
        }}
        onDeleteSavedVault={(id) => {
          deleteSavedVault(id);
          removeFromHistory(id);
          d.setWalletHistory(getHistory());
        }}
        onConfirmWipe={d.handleConfirmWipe}
        onConfirmNewWallet={d.handleConfirmNewWallet}
        onConfirmPassphrase={d.handleConfirmPassphrase}
        onAddContact={(c) => d.setContacts(addContact(c))}
        onDeleteContact={(id) => d.setContacts(deleteContact(id))}
        handleNonEvmSend={d.handleNonEvmSend}
      />

      <section className="flex-1 pt-[64px] px-3 pb-40 md:pt-8 md:px-16 md:pb-16 flex flex-col justify-between overflow-y-auto overflow-x-hidden">
        <div className="max-w-3xl mx-auto w-full space-y-4 md:space-y-10">
          <DashboardHeader
            frozenMode={d.frozenMode}
            selectedNonEvm={d.selectedNonEvm}
            manualChain={d.manualChain}
            mode={d.mode}
            setMode={d.setMode}
            setShowNetworks={d.setShowNetworks}
            isLoadingTotal={d.isLoadingTotal}
            tokens={d.tokens}
            prices={d.prices}
            selectedChain={d.selectedChain}
            isRefreshing={d.isRefreshing}
            displayAddress={d.displayAddress}
            shortAddr={d.shortAddr}
            onSaveVault={handleQuickSave}
            isSaved={isCurrentSaved}
            isSavingVault={d.isSavingVault}
          />

          <DashboardActionGrid
            walletUnlocked={d.wallet.isUnlocked}
            walletHistory={d.walletHistory}
            setShowSavedVaults={d.setShowSavedVaults}
            extPresent={d.extPresent}
            extAttached={d.extAttached}
            extError={d.extError}
            extAttaching={d.extAttaching}
            setShowPassphraseModal={d.setShowPassphraseModal}
            activeLedger={d.activeLedger}
            setActiveLedger={d.setActiveLedger}
            selectedNonEvm={d.selectedNonEvm}
            setShowWC={d.setShowWC}
            setShowSend={d.setShowSend}
            setShowNonEvmSend={d.setShowNonEvmSend}
            setShowQR={d.setShowQR}
            setShowNewWalletWarning={d.setShowNewWalletWarning}
            mode={d.mode}
            setShowSwap={d.setShowSwap}
            setShowAddressBook={d.setShowAddressBook}
            setShowLedger={d.setShowLedger}
            setShowCustomChainModal={d.setShowCustomChainModal}
            setShowCustomTokenModal={d.setShowCustomTokenModal}
            setShowCustomAPIModal={d.setShowCustomAPIModal}
            setShowTransfer={d.setShowTransfer}
            currentHistoryId={d.currentHistoryId}
            hasTokensOnChain={d.hasTokensOnChain}
          />

          {/* Tabs Navigation and Body */}
          <div className="pt-2 md:pt-8">
            <div className="flex gap-6 md:gap-12 mb-4 md:mb-8 border-b border-transparent overflow-x-auto">
              <button
                onClick={() => d.setActiveTab('balance')}
                className={`russo-one-regular uppercase tracking-[0.02em] text-xs pb-4 transition-colors whitespace-nowrap ${
                  d.activeTab === 'balance' ? 'text-[#23262b] border-b-2 border-[#2b2d33]' : 'text-[#8a8f98] hover:text-[#23262b]'
                }`}
              >
                Balance
              </button>
              <button
                onClick={() => d.setActiveTab('transactions')}
                className={`russo-one-regular uppercase tracking-[0.02em] text-xs pb-4 transition-colors whitespace-nowrap ${
                  d.activeTab === 'transactions' ? 'text-[#23262b] border-b-2 border-[#2b2d33]' : 'text-[#8a8f98] hover:text-[#23262b]'
                }`}
              >
                Transactions
              </button>
              <AnimatePresence>
                {d.mode === 'advanced' && (
                  <>
                    <motion.button
                      key="tab-nfts"
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -12 }}
                      onClick={() => d.setActiveTab('nfts')}
                      className={`russo-one-regular uppercase tracking-[0.02em] text-xs pb-4 transition-colors whitespace-nowrap ${
                        d.activeTab === 'nfts' ? 'text-[#23262b] border-b-2 border-[#2b2d33]' : 'text-[#8a8f98] hover:text-[#23262b]'
                      }`}
                    >
                      NFTs
                    </motion.button>
                    {!d.selectedNonEvm && (
                      <motion.button
                        key="tab-approvals"
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -12 }}
                        onClick={() => d.setActiveTab('approvals')}
                        className={`russo-one-regular uppercase tracking-[0.02em] text-xs pb-4 transition-colors whitespace-nowrap ${
                          d.activeTab === 'approvals' ? 'text-[#23262b] border-b-2 border-red-400' : 'text-[#8a8f98] hover:text-[#23262b]'
                        }`}
                      >
                        Approvals
                      </motion.button>
                    )}
                    {!d.selectedNonEvm && (
                      <motion.button
                        key="tab-staking"
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -12 }}
                        onClick={() => d.setActiveTab('staking')}
                        className={`russo-one-regular uppercase tracking-[0.02em] text-xs pb-4 transition-colors whitespace-nowrap ${
                          d.activeTab === 'staking' ? 'text-[#23262b] border-b-2 border-[#2b2d33]' : 'text-[#8a8f98] hover:text-[#23262b]'
                        }`}
                      >
                        Staking
                      </motion.button>
                    )}
                    <motion.button
                      key="tab-lightning"
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -12 }}
                      onClick={() => d.setActiveTab('lightning')}
                      className={`russo-one-regular uppercase tracking-[0.02em] text-xs pb-4 transition-colors whitespace-nowrap ${
                        d.activeTab === 'lightning' ? 'text-[#23262b] border-b-2 border-[#2b2d33]' : 'text-[#8a8f98] hover:text-[#23262b]'
                      }`}
                    >
                      Lightning
                    </motion.button>
                  </>
                )}
              </AnimatePresence>
              <button
                aria-label="Refresh balances"
                onClick={d.handleRefresh}
                className="ml-auto pb-4 text-[#8a8f98] hover:text-[#23262b] transition-colors flex-shrink-0"
              >
                <span className={`material-symbols-outlined text-base ${d.isRefreshing ? 'animate-spin' : ''}`}>refresh</span>
              </button>
            </div>

            {/* Render Active Tab */}
            {d.activeTab === 'balance' && (
              <BalanceTab
                selectedNonEvm={d.selectedNonEvm}
                nonEvmBal={d.nonEvmBal}
                nonEvmUsdPrice={d.nonEvmUsdPrice}
                nonEvmLoading={d.nonEvmLoading}
                manualChain={d.manualChain}
                allChainTokens={d.allChainTokens}
                tokens={d.tokens}
                prices={d.prices}
                changes24h={d.changes24h}
                isLoadingTotal={d.isLoadingTotal}
                selectedChain={d.selectedChain}
              />
            )}

            {d.activeTab === 'transactions' && (
              <TransactionsTab selectedChain={d.selectedChain} txs={d.txs} isLoadingTxs={d.isLoadingTxs} />
            )}

            {d.activeTab === 'nfts' && !d.selectedNonEvm && (
              <NFTsTab selectedChain={d.selectedChain} nfts={d.nfts} isLoadingNfts={d.isLoadingNfts} />
            )}

            {d.activeTab === 'approvals' && !d.selectedNonEvm && (
              <ApprovalsTab
                selectedChain={d.selectedChain}
                approvals={d.approvals}
                isLoadingApprovals={d.isLoadingApprovals}
                revokingApproval={d.revokingApproval}
                onRevoke={d.handleRevokeApproval}
              />
            )}

            {d.activeTab === 'staking' && !d.selectedNonEvm && (
              <StakingPanel activeLedger={d.activeLedger} ethPrice={d.prices['ethereum'] ?? 0} />
            )}

            {d.activeTab === 'lightning' && <LightningTab />}

            {/* Wallet History Section */}
            {d.activeTab === 'balance' && (
              <WalletHistorySection
                walletHistory={d.walletHistory}
                currentHistoryId={d.currentHistoryId}
                selectedNonEvm={d.selectedNonEvm}
                selectedChain={d.selectedChain}
                isSavingVault={d.isSavingVault}
                onSwitch={async (snap) => {
                  await d.switchToSnap(snap);
                }}
                onSave={async (snap, isCurrent) => {
                  d.setIsSavingVault(true);
                  try {
                    if (isCurrent) {
                      if (d.selectedNonEvm && NON_EVM_META[d.selectedNonEvm]) {
                        const m = NON_EVM_META[d.selectedNonEvm];
                        updateSnapshotChain(snap.id, {
                          chainName: m.name,
                          chainColor: m.color,
                          chainLogo: m.logoUrl,
                          coinSymbol: m.symbol,
                          isNonEvm: true,
                          chainId: undefined,
                        });
                      } else {
                        updateSnapshotChain(snap.id, {
                          chainId: d.selectedChain.id,
                          chainName: d.selectedChain.name,
                          chainColor: d.selectedChain.color,
                          chainLogo: d.selectedChain.logoUrl,
                          coinSymbol: d.selectedChain.symbol,
                          isNonEvm: false,
                        });
                      }
                    }
                    await d.wallet.persistCurrentWallet(snap.id);
                    d.setWalletHistory(getHistory());
                  } catch {
                    alert('Failed to save vault.');
                  } finally {
                    d.setIsSavingVault(false);
                  }
                }}
                onDelete={(id) => {
                  deleteSavedVault(id);
                  removeFromHistory(id);
                  d.setWalletHistory(getHistory());
                }}
                onOpenAdvanced={() => d.setMode('advanced')}
              />
            )}
          </div>
        </div>
      </section>
    </>
  );
}
