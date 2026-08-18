import type { Metadata } from "next";
import { Space_Grotesk } from "next/font/google";
import "./globals.css";
import { WalletProvider } from "@/context/WalletContext";
import { HeroUIProvider } from "@heroui/react";
import { ErrorBoundary } from "@/components/ErrorBoundary";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
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
          href="https://fonts.googleapis.com/css2?family=Russo+One&display=swap"
          rel="stylesheet"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
        />
      </head>
      <body className={`${spaceGrotesk.variable} font-sans bg-abd-black text-abd-white min-h-screen`}>
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
