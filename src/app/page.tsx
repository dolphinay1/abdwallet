"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";

import { useWallet } from "@/context/WalletContext";
import { AuthScreen } from "@/components/AuthScreen";

/**
 * ABD Wallet main page — renders the full wallet dashboard with all features:
 * multi-chain support, transfer history, QR connect, WalletConnect v2, swap,
 * staking, saved vaults, and security scanning.
 */
const WalletDashboard = dynamic(
  () => import("@/components/WalletDashboard").then(mod => mod.WalletDashboard as any),
  { ssr: false }
);

export default function Home() {
  const [isMounted, setIsMounted] = useState(false);
  const wallet = useWallet();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // SSR fallback — show minimal skeleton until client hydration completes
  if (!isMounted) {
    return (
      <main className="min-h-screen w-full bg-[#E2E6EE] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-slate-400 border-t-slate-700 animate-spin" />
      </main>
    );
  }

  if (!wallet || !wallet.isUnlocked) {
    return <AuthScreen />;
  }

  return <WalletDashboard />;
}
