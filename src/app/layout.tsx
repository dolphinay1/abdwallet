import type { Metadata } from "next";
import { Space_Grotesk } from "next/font/google";
import "./globals.css";
import { WalletProvider } from "@/context/WalletContext";
import { HeroUIProvider } from "@heroui/react";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
});

export const metadata: Metadata = {
  title: "ABD Wallet - Güvenli ve Gizli Kripto Cüzdanı",
  description: "ABD Wallet — ücretsiz, non-custodial, çok zincirli kripto cüzdanı. Komisyon yok, ücret yok, takip yok. Özel anahtarlarınız asla tarayıcınızdan çıkmaz.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
        />
      </head>
      <body className={`${spaceGrotesk.variable} font-sans bg-abd-black text-abd-white min-h-screen`}>
        <HeroUIProvider>
          <WalletProvider>
            {children}
          </WalletProvider>
        </HeroUIProvider>
      </body>
    </html>
  );
}
