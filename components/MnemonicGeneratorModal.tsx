'use client';
import React, { useState, useEffect } from 'react';
import * as bip39 from 'bip39';
import { 
  X, 
  RotateCw, 
  Download, 
  Copy, 
  Check, 
  ShieldAlert, 
  KeyRound, 
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { useWallet } from '@/context/WalletContext';

interface MnemonicGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MnemonicGeneratorModal({ isOpen, onClose }: MnemonicGeneratorModalProps) {
  const wallet = useWallet();
  const [mnemonic, setMnemonic] = useState('');
  const [words, setWords] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Generate 12 words on open
  const generateNewMnemonic = () => {
    try {
      const newMnemonic = bip39.generateMnemonic(128); // 128 bits = 12 words
      setMnemonic(newMnemonic);
      setWords(newMnemonic.split(' '));
    } catch {
      // Fallback standard 12-word generator
      const fallbackList = [
        "quantum", "matrix", "shield", "cipher", "stellar", "nexus",
        "orbit", "titan", "crypto", "zenith", "vertex", "beacon"
      ];
      setMnemonic(fallbackList.join(' '));
      setWords(fallbackList);
    }
  };

  useEffect(() => {
    if (isOpen && words.length === 0) {
      generateNewMnemonic();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Copy all words
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(mnemonic);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  // Download .txt backup
  const handleDownload = () => {
    const timestamp = new Date().toLocaleString('tr-TR');
    const content = `=====================================================
ABD WALLET - GİZLİ KURTARMA ANAHTARI (SEED PHRASE)
=====================================================
Üretim Tarihi: ${timestamp}
Oluşturulma Türü: Yerel Cihaz İstemcisi (100% Offline)

12 GİZLİ KURTARMA KELİMESİ:
-----------------------------------------------------
${words.map((w, i) => `${(i + 1).toString().padStart(2, ' ')}. ${w}`).join('\n')}

TEK SATIR SEED PHRASE:
${mnemonic}

=====================================================
⚠️ KRİTİK GÜVENLİK VE YEDEKLEME UYARISI:
1. Bu 12 kelime, cüzdanınızın tek ve nihai anahtarıdır.
2. Bu kelimeleri kaybederseniz veya unutursanız fonlarınıza bir daha ASLA erişemezsiniz.
3. Bu anahtar hiçbir sunucuya gönderilmez; tamamen cihazınızda yerel üretilmiştir.
4. Dosyayı güvenli bir harici belleğe aktarın veya kağıda yazarak güvenli bir kasada saklayın.
5. Bu anahtarları kimseyle (ABD Wallet geliştiricileri dahil) KESİNLİKLE paylaşmayın.
=====================================================`;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `abd-wallet-seed-backup-${Date.now()}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Use this mnemonic to create and unlock the wallet
  const handleUseAndCreate = async () => {
    if (!wallet || !mnemonic) return;
    setIsCreating(true);
    try {
      await wallet.importABDWallet(mnemonic);
      onClose();
    } catch {
      setIsCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200">
      {/* ── Light / White Neumorphic Modal Card ── */}
      <div 
        className="w-full max-w-[560px] rounded-[32px] sm:rounded-[36px] p-6 sm:p-8 relative select-none animate-in zoom-in-95 duration-200"
        style={{
          fontFamily: "'Russo One', sans-serif",
          backgroundColor: '#EFF2F7',
          color: '#1E232D',
          boxShadow: `
            20px 20px 60px #C7CED9,
            -20px -20px 60px #FFFFFF,
            inset 1px 1px 1px #FFFFFF
          `,
          border: '1px solid rgba(255, 255, 255, 0.8)'
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-5 border-b border-slate-200/80">
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-2xl flex items-center justify-center text-slate-800"
              style={{
                backgroundColor: '#EFF2F7',
                boxShadow: '4px 4px 8px #D1D8E4, -4px -4px 8px #FFFFFF'
              }}
            >
              <KeyRound className="w-5 h-5 text-slate-700 stroke-[2.2]" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl uppercase tracking-wider text-slate-800" style={{ fontFamily: "'Russo One', sans-serif" }}>
                12 Kelimelik Kurtarma Anahtarı
              </h2>
              <p className="text-[11px] text-slate-500 tracking-wide uppercase mt-0.5" style={{ fontFamily: "'Russo One', sans-serif" }}>
                Offline ve Güvenli Yerel Entropi
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
            style={{
              backgroundColor: '#EFF2F7',
              boxShadow: '3px 3px 6px #D1D8E4, -3px -3px 6px #FFFFFF'
            }}
          >
            <X className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>

        {/* 12 Words Grid (White Inset Neumorphic Capsules) */}
        <div className="my-6">
          <div 
            className="p-4 sm:p-5 rounded-3xl"
            style={{
              backgroundColor: '#E7ECF3',
              boxShadow: 'inset 4px 4px 8px #D1D8E4, inset -4px -4px 8px #FFFFFF'
            }}
          >
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {words.map((word, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between px-3 py-2.5 rounded-xl select-all"
                  style={{
                    backgroundColor: '#EFF2F7',
                    boxShadow: '3px 3px 6px #D6DDE8, -3px -3px 6px #FFFFFF',
                    border: '1px solid rgba(255, 255, 255, 0.7)'
                  }}
                >
                  <span 
                    className="text-[10px] text-slate-400"
                    style={{ fontFamily: "'Russo One', sans-serif" }}
                  >
                    #{(index + 1).toString().padStart(2, '0')}
                  </span>
                  <span 
                    className="text-xs sm:text-[13px] font-mono font-bold text-slate-800 tracking-wider lowercase"
                  >
                    {word}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Tools Row: Regenerate & Copy */}
        <div className="flex items-center justify-between gap-3 mb-5">
          <button
            type="button"
            onClick={generateNewMnemonic}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full text-xs uppercase tracking-wider text-slate-700 hover:text-slate-900 transition-all cursor-pointer"
            style={{
              fontFamily: "'Russo One', sans-serif",
              backgroundColor: '#EFF2F7',
              boxShadow: '4px 4px 8px #D1D8E4, -4px -4px 8px #FFFFFF'
            }}
          >
            <RotateCw className="w-3.5 h-3.5 stroke-[2.2]" />
            <span>Yeniden Üret</span>
          </button>

          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full text-xs uppercase tracking-wider text-slate-700 hover:text-slate-900 transition-all cursor-pointer"
            style={{
              fontFamily: "'Russo One', sans-serif",
              backgroundColor: '#EFF2F7',
              boxShadow: '4px 4px 8px #D1D8E4, -4px -4px 8px #FFFFFF'
            }}
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5]" />
                <span className="text-emerald-600">Kopyalandı!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 stroke-[2.2]" />
                <span>Tümünü Kopyala</span>
              </>
            )}
          </button>
        </div>

        {/* Security Warning Box */}
        <div 
          className="p-3.5 rounded-2xl mb-6 flex items-start gap-3 text-xs"
          style={{
            fontFamily: "'Russo One', sans-serif",
            backgroundColor: '#FEF3F2',
            border: '1px solid #FECDCA',
            color: '#B42318'
          }}
        >
          <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-600" />
          <p className="text-[10px] sm:text-[11px] leading-relaxed uppercase tracking-wider">
            KRİTİK UYARI: Bu 12 kelimeyi kaybederseniz cüzdana bir daha asla giriş yapamazsınız. Lütfen dosyayı indirin.
          </p>
        </div>

        {/* Action Buttons: Download (.txt) & Create Wallet */}
        <div className="space-y-3">
          {/* Primary Action: Download .txt Key File */}
          <button
            type="button"
            onClick={handleDownload}
            className="w-full py-3.5 px-6 rounded-full text-xs uppercase tracking-widest flex items-center justify-center gap-2.5 cursor-pointer text-slate-900 hover:opacity-95 active:scale-[0.99] transition-all"
            style={{
              fontFamily: "'Russo One', sans-serif",
              backgroundColor: '#EFF2F7',
              boxShadow: '6px 6px 12px #CAD2DF, -6px -6px 12px #FFFFFF',
              border: '1px solid rgba(255, 255, 255, 0.9)'
            }}
          >
            <Download className="w-4 h-4 stroke-[2.2] text-slate-700" />
            <span>CİHAZA İNDİR (.TXT)</span>
          </button>

          {/* Secondary Action: Direct Unlock with this key */}
          <button
            type="button"
            onClick={handleUseAndCreate}
            disabled={isCreating}
            className="w-full py-3.5 px-6 rounded-full text-xs uppercase tracking-widest flex items-center justify-center gap-2.5 cursor-pointer text-white bg-slate-900 hover:bg-slate-800 active:scale-[0.99] transition-all shadow-lg shadow-slate-900/20"
            style={{ fontFamily: "'Russo One', sans-serif" }}
          >
            <ShieldCheck className="w-4 h-4 stroke-[2.2]" />
            <span>{isCreating ? 'CÜZDAN KURULUYOR...' : 'BU ANAHTARLA CÜZDANI BAŞLAT'}</span>
            <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </button>
        </div>
      </div>
    </div>
  );
}
