import type { Metadata } from "next";
import { Roboto } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import { WalletProvider } from "@/context/WalletContext";
import { HeroUIProvider } from "@heroui/react";
import { ErrorBoundary } from "@/components/ErrorBoundary";

const roboto = Roboto({
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
  display: "swap",
  variable: "--font-roboto",
});

const satoshi = localFont({
  src: [
    { path: "./fonts/satoshi-400.woff2", weight: "400", style: "normal" },
    { path: "./fonts/satoshi-500.woff2", weight: "500", style: "normal" },
    { path: "./fonts/satoshi-700.woff2", weight: "700", style: "normal" },
    { path: "./fonts/satoshi-900.woff2", weight: "900", style: "normal" },
  ],
  display: "swap",
  variable: "--font-satoshi",
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
      <body className={`${roboto.variable} ${satoshi.variable} font-sans bg-abd-black text-abd-white min-h-screen`}>
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
