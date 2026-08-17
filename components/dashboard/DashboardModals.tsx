'use client';

import React from 'react';
import { AnimatePresence } from 'framer-motion';
import type { Chain } from '@/lib/chains';
import type { Contact } from '@/lib/address-book';
import type { CustomChain } from '@/lib/custom-chains';
import type { CustomToken } from '@/lib/custom-tokens';
import type { CustomAPI } from '@/lib/custom-apis';
import type { LedgerEntry } from '@/lib/ledger';
import type { WalletSnapshot } from '@/lib/wallet-history';
import type { TokenBalance, NonEvmMeta } from './types';

import { WarningBanner } from '@/components/WarningBanner';
import { TransferModal } from '@/components/TransferModal';
import { SwapModal } from '@/components/SwapModal';
import { WalletConnectModal } from '@/components/WalletConnectModal';
import { LedgerConnectModal } from '@/components/LedgerConnectModal';
import { CustomChainModal } from '@/components/CustomChainModal';
import { CustomTokenModal } from '@/components/CustomTokenModal';
import { CustomAPIModal } from '@/components/CustomAPIModal';

import { AllNetworksModal } from './modals/AllNetworksModal';
import { SendModal } from './modals/SendModal';
import { NonEvmSendModal } from './modals/NonEvmSendModal';
import { QRModal } from './modals/QRModal';
import { AddressBookModal } from './modals/AddressBookModal';
import { SavedVaultsModal } from './modals/SavedVaultsModal';
import { PassphraseModal } from './modals/PassphraseModal';

export interface DashboardModalsProps {
  showSend: boolean;
  setShowSend: (v: boolean) => void;
  showSwap: boolean;
  setShowSwap: (v: boolean) => void;
  showLedger: boolean;
  setShowLedger: (v: boolean) => void;
  showNetworks: boolean;
  setShowNetworks: (v: boolean) => void;
  showQR: boolean;
  setShowQR: (v: boolean) => void;
  showWC: boolean;
  setShowWC: (v: boolean) => void;
  showNonEvmSend: boolean;
  setShowNonEvmSend: (v: boolean) => void;
  showTransfer: boolean;
  setShowTransfer: (v: boolean) => void;
  showAddressBook: boolean;
  setShowAddressBook: (v: boolean) => void;
  showSavedVaults: boolean;
  setShowSavedVaults: (v: boolean) => void;
  showPassphraseModal: boolean;
  setShowPassphraseModal: (v: boolean) => void;
  showCustomChainModal: boolean;
  setShowCustomChainModal: (v: boolean) => void;
  showCustomTokenModal: boolean;
  setShowCustomTokenModal: (v: boolean) => void;
  showCustomAPIModal: boolean;
  setShowCustomAPIModal: (v: boolean) => void;
  showWipeWarning: boolean;
  setShowWipeWarning: (v: boolean) => void;
  showNewWalletWarning: boolean;
  setShowNewWalletWarning: (v: boolean) => void;

  tokens: TokenBalance[];
  prices: Record<string, number>;
  selectedChain: Chain;
  setSelectedChain: (c: Chain) => void;
  setManualChain: (c: Chain | null) => void;
  selectedNonEvm: string | null;
  setSelectedNonEvm: (coin: string | null) => void;
  liveNonEvm: NonEvmMeta | null;
  displayAddress: string | null;
  activeAddress: string | null;
  activeLedger: LedgerEntry | null;
  setActiveLedger: (entry: LedgerEntry | null) => void;
  contacts: Contact[];
  setContacts: React.Dispatch<React.SetStateAction<Contact[]>>;
  customChains: CustomChain[];
  setCustomChains: React.Dispatch<React.SetStateAction<CustomChain[]>>;
  setCustomTokens: React.Dispatch<React.SetStateAction<CustomToken[]>>;
  setCustomAPIs: React.Dispatch<React.SetStateAction<CustomAPI[]>>;
  walletHistory: WalletSnapshot[];
  currentHistoryId: string | null;
  onSwitchSnapshot: (snap: WalletSnapshot) => Promise<void>;
  onDeleteSavedVault: (id: string) => void;
  onConfirmWipe: () => void;
  onConfirmNewWallet: () => void;
  onConfirmPassphrase: (passphrase: string) => void;
  onAddContact: (c: Omit<Contact, 'id' | 'addedAt'>) => void;
  onDeleteContact: (id: string) => void;
  handleNonEvmSend: (to: string, amount: number, feeSpeed: 'slow' | 'medium' | 'fast') => Promise<string>;
}

export function DashboardModals(props: DashboardModalsProps) {
  const {
    showSend, setShowSend, showSwap, setShowSwap, showLedger, setShowLedger,
    showNetworks, setShowNetworks, showQR, setShowQR, showWC, setShowWC,
    showNonEvmSend, setShowNonEvmSend, showTransfer, setShowTransfer,
    showAddressBook, setShowAddressBook, showSavedVaults, setShowSavedVaults,
    showPassphraseModal, setShowPassphraseModal, showCustomChainModal, setShowCustomChainModal,
    showCustomTokenModal, setShowCustomTokenModal, showCustomAPIModal, setShowCustomAPIModal,
    showWipeWarning, setShowWipeWarning, showNewWalletWarning, setShowNewWalletWarning,
    tokens, prices, selectedChain, setSelectedChain, setManualChain,
    selectedNonEvm, setSelectedNonEvm, liveNonEvm, displayAddress, activeAddress,
    activeLedger, setActiveLedger, contacts, customChains, setCustomChains,
    setCustomTokens, setCustomAPIs, walletHistory, currentHistoryId,
    onSwitchSnapshot, onDeleteSavedVault, onConfirmWipe, onConfirmNewWallet,
    onConfirmPassphrase, onAddContact, onDeleteContact, handleNonEvmSend,
  } = props;

  return (
    <>
      {showSend && (
        <SendModal
          tokens={tokens}
          prices={prices}
          defaultChain={selectedChain}
          onClose={() => setShowSend(false)}
          activeLedger={activeLedger}
        />
      )}
      {showSwap && !selectedNonEvm && <SwapModal onClose={() => setShowSwap(false)} activeLedger={activeLedger} />}
      {showLedger && (
        <LedgerConnectModal
          onConnect={(entry) => {
            setActiveLedger(entry);
            setShowLedger(false);
          }}
          onClose={() => setShowLedger(false)}
        />
      )}
      {showNetworks && (
        <AllNetworksModal
          selected={selectedChain}
          onSelect={(c) => {
            setSelectedChain(c);
            setManualChain(c);
            setSelectedNonEvm(null);
          }}
          selectedNonEvm={selectedNonEvm}
          onSelectNonEvm={(coin) => {
            setSelectedNonEvm(coin);
          }}
          onClose={() => setShowNetworks(false)}
        />
      )}
      {showQR && displayAddress && <QRModal address={displayAddress} onClose={() => setShowQR(false)} />}
      {showWC && !selectedNonEvm && <WalletConnectModal onClose={() => setShowWC(false)} />}
      {showNonEvmSend && selectedNonEvm && displayAddress && (
        <NonEvmSendModal
          coin={selectedNonEvm}
          fromAddress={displayAddress}
          onSend={handleNonEvmSend}
          onClose={() => setShowNonEvmSend(false)}
        />
      )}
      {showTransfer && activeAddress && (
        <TransferModal onClose={() => setShowTransfer(false)} currentAddress={activeAddress} currentHistoryId={currentHistoryId} />
      )}
      {showAddressBook && (
        <AddressBookModal
          contacts={contacts}
          onAdd={onAddContact}
          onDelete={onDeleteContact}
          onClose={() => setShowAddressBook(false)}
        />
      )}
      {showCustomChainModal && (
        <CustomChainModal
          onClose={() => setShowCustomChainModal(false)}
          onSaved={() => {
            const { loadCustomChains } = require('@/lib/custom-chains');
            setCustomChains(loadCustomChains());
          }}
        />
      )}
      {showCustomTokenModal && (
        <CustomTokenModal
          customChains={customChains}
          activeAddress={activeAddress}
          onClose={() => setShowCustomTokenModal(false)}
          onSaved={() => {
            const { loadCustomTokens } = require('@/lib/custom-tokens');
            setCustomTokens(loadCustomTokens());
          }}
        />
      )}
      {showCustomAPIModal && (
        <CustomAPIModal
          activeAddress={activeAddress}
          onClose={() => setShowCustomAPIModal(false)}
          onSaved={() => {
            const { loadCustomAPIs } = require('@/lib/custom-apis');
            setCustomAPIs(loadCustomAPIs());
          }}
        />
      )}
      {showSavedVaults && (
        <SavedVaultsModal
          vaults={walletHistory}
          currentId={currentHistoryId}
          liveNonEvm={liveNonEvm}
          liveChain={selectedChain}
          onSwitch={onSwitchSnapshot}
          onDelete={onDeleteSavedVault}
          onClose={() => setShowSavedVaults(false)}
        />
      )}
      <PassphraseModal
        isOpen={showPassphraseModal}
        title="Connect Extension"
        description="Set a PIN / passphrase for your ABD Wallet browser extension (min 6 characters)."
        confirmText="Connect Extension"
        onConfirm={onConfirmPassphrase}
        onClose={() => setShowPassphraseModal(false)}
      />

      <AnimatePresence>
        {showWipeWarning && (
          <WarningBanner
            type="wipe"
            onConfirm={onConfirmWipe}
            onCancel={() => setShowWipeWarning(false)}
          />
        )}
        {showNewWalletWarning && (
          <WarningBanner
            type="new-wallet"
            onConfirm={onConfirmNewWallet}
            onCancel={() => setShowNewWalletWarning(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
