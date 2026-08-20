import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SendModal } from '../../components/dashboard/modals/SendModal';
import { CHAINS } from '../../lib/chains';

// Mock useSendForm hook
vi.mock('../../components/dashboard/modals/send/useSendForm', () => ({
  useSendForm: () => ({
    status: 'idle',
    amount: '',
    setAmount: vi.fn(),
    recipient: '',
    setRecipient: vi.fn(),
    sendTx: vi.fn(),
    error: '',
    selectedToken: { symbol: 'ETH', balance: '1.0', decimals: 18, name: 'Ethereum', address: '0x0' },
    setSelectedToken: vi.fn(),
    selectedBal: 1.0,
    tokenSymbol: 'ETH',
    chain: CHAINS[0],
    selectedChain: CHAINS[0],
    setSelectedChain: vi.fn(),
    setChain: vi.fn(),
    chainTokens: [{ symbol: 'ETH', balance: '1.0', decimals: 18, name: 'Ethereum', address: '0x0' }],
    contacts: [],
    tokenOpen: false,
    setTokenOpen: vi.fn(),
    networkOpen: false,
    setNetworkOpen: vi.fn(),
    contactOpen: false,
    setContactOpen: vi.fn(),
    to: '',
    setTo: vi.fn(),
  }),
}));

describe('SendModal Component', () => {
  const mockOnClose = vi.fn();
  const mockTokens = [
    { symbol: 'ETH', balance: '1.0', balanceRaw: '1000000000000000000', decimals: 18, name: 'Ethereum', address: '0x0', contractAddress: '0x0' },
  ];

  it('renders send header and close button with aria-label', () => {
    render(
      <SendModal
        tokens={mockTokens}
        prices={{ ETH: 3000 }}
        defaultChain={CHAINS[0]}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('Send')).toBeDefined();
    const closeBtn = screen.getByRole('button', { name: /Close send modal/i });
    expect(closeBtn).toBeDefined();
    
    fireEvent.click(closeBtn);
    expect(mockOnClose).toHaveBeenCalled();
  });
});
