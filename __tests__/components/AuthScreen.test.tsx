import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthScreen } from '../../components/AuthScreen';

const mockCreateABDWallet = vi.fn();
const mockImportABDWallet = vi.fn();

vi.mock('@/context/WalletContext', () => ({
  useWallet: () => ({
    createABDWallet: mockCreateABDWallet,
    importABDWallet: mockImportABDWallet,
  }),
}));

describe('AuthScreen Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders primary create and import action buttons', () => {
    render(<AuthScreen />);
    
    expect(screen.getByRole('button', { name: /Create New Wallet/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /Import Existing Wallet/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /Generate 12-Word Recovery Phrase/i })).toBeDefined();
  });

  it('triggers createABDWallet on create button click', async () => {
    render(<AuthScreen />);
    
    const createBtn = screen.getByRole('button', { name: /Create New Wallet/i });
    fireEvent.click(createBtn);
    
    expect(mockCreateABDWallet).toHaveBeenCalled();
  });

  it('switches to seed import form on import button click', () => {
    render(<AuthScreen />);
    
    const importBtn = screen.getByRole('button', { name: /Import Existing Wallet/i });
    fireEvent.click(importBtn);
    
    expect(screen.getByText(/Enter Seed Phrase/i)).toBeDefined();
    expect(screen.getByPlaceholderText(/quantum matrix/i)).toBeDefined();
  });
});
