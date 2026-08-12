"use client";

import dynamic from "next/dynamic";

import { useWallet } from "@/context/WalletContext";
import { AuthScreen } from "@/components/AuthScreen";

/**
 * ABD Wallet main page — renders the full wallet dashboard with all features:
 * multi-chain support, transfer history, QR connect, WalletConnect v2, swap,
 * staking, steganography vault, WebAuthn session lock, and security scanning.
 */
const WalletDashboard = dynamic(
  () => import("@/components/WalletDashboard").then(mod => mod.WalletDashboard as any),
  { ssr: false }
);

export default function Home() {
  const wallet = useWallet();

  // If wallet context is missing (SSR) or not unlocked, show auth screen
  if (!wallet || !wallet.isUnlocked) {
    return <AuthScreen />;
  }

  return <WalletDashboard />;
}
