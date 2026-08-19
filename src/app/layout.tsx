import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { WalletProvider } from "@/context/WalletContext";
import { HeroUIProvider } from "@heroui/react";
import { ErrorBoundary } from "@/components/ErrorBoundary";

const sfMono = localFont({
  src: [{ path: "./fonts/sf-mono-bold.otf", weight: "700", style: "normal" }],
  display: "swap",
  variable: "--font-sf-mono",
});

const sfCompact = localFont({
  src: [{ path: "./fonts/sf-compact-text-regular.otf", weight: "400", style: "normal" }],
  display: "swap",
  variable: "--font-sf-compact",
});

const sfProRounded = localFont({
  src: [{ path: "./fonts/sf-pro-rounded-regular.otf", weight: "400", style: "normal" }],
  display: "swap",
  variable: "--font-sf-rounded",
});

export const metadata: Metadata = {
  title: "ABD Wallet — Free Anonymous EVM Wallet",
  description: "Free anonymous temp wallet for all EVM chains. No signup, no KYC, no tracking. Your keys never leave your browser.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=block"
        />
      </head>
      <body className={`${sfMono.variable} ${sfCompact.variable} ${sfProRounded.variable} font-sans bg-abd-black text-abd-white min-h-screen`}>
        <HeroUIProvider>
          <WalletProvider>
            <ErrorBoundary>
              {children}
            </ErrorBoundary>
          </WalletProvider>
        </HeroUIProvider>
      </body>
    </html>
  );
}
