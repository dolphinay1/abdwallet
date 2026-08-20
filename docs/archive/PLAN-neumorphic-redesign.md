# Neumorphic Redesign — Light + Monokrom (Fazlı)

## Goal
Tüm projeyi referans görsellerdeki açık gri **light neumorphism** stile geçirmek; mevcut yerleşimi (ortalanmış kolon + FloatingDock) koruyup yalnızca görsel katmanı yenilemek, HeroUI bileşenlerini koruyup neumorphic temalamak. Kullanıcı kararları: **Light** tema, **mevcut yerleşim**, **tam monokrom** (yeşil/mor yok), **fazlı** kapsam.

## Tasarım Token'ları (tüm görevlerin ortak paleti)
- Zemin/kart: `#e4e6ee` (kart = zeminle aynı renk)
- Dış gölge (extruded): `9px 9px 18px rgba(166,177,198,.55), -9px -9px 18px rgba(255,255,255,.9)`
- İç gölge (inset — input/basılı): `inset 4px 4px 8px rgba(166,177,198,.5), inset -4px -4px 8px rgba(255,255,255,.9)`
- Metin: `#23262b` (ana), `#8a8f98` (muted)
- Birincil buton: antrasit `#2b2d33` dolgu + beyaz metin (referans 2. görsel)
- Radius: kart 28-32px, buton/pill 9999px, ikon rozeti tam daire
- Tek istisna: semantik danger (güvenlik uyarısı/yıkıcı aksiyon) için sönük kırmızı `#b91c1c`; brand yeşili/mor **hiç** kullanılmaz

## Faz 1 — Altyapı + Ana Ekranlar
- [x] T1: `src/app/globals.css` yeniden yazımı — `:root` light token'lar; `.glass-*`/`.glow-*` yerine `.neu-card`, `.neu-inset`, `.neu-btn`, `.neu-icon` utility'leri; light scrollbar, light skeleton, light `.popup-backdrop` → Verify: `npm run dev` 200, body arka planı `#e4e6ee`, konsol hatasız
- [x] T2: `tailwind.config.js` + `src/app/layout.tsx` + `components/AuroraBackground.tsx` — `abd` paleti gri/antrasit'e, glow shadow'lar neu shadow'lara, `heroui()` primary `#2b2d33`/`#f5f6fa` (light tema); `<html>`'den `dark` sınıfını kaldır → Verify: HeroUI `Button color="primary"` antrasit render olur
- [x] T3: `components/AuthScreen.tsx` — neu kart, inset şifre Input'ı, antrasit CTA → Verify: tarayıcıda cüzdan oluşturma akışı çalışır + ekran görüntüsü
- [x] T4: `components/WalletDashboard.tsx` — bakiye kartı, varlık satırları, geçmiş listesi neu kart/pill; `#52ffac`/`#10b981`/`#8b5cf6` kullanımları gri tonlara → Verify: `grep -E "#52ffac|10b981|8b5cf6" components/WalletDashboard.tsx` → 0 eşleşme
- [x] T5: `FloatingDock.tsx` + `WarningBanner.tsx` + `ChainMarquee.tsx` + `ABDCapsule/ABDLink/CountUp` — neu skin (dock = yüzen neu bar, banner = gri neu pill) → Verify: ekran görüntüsünde dock neu bar olarak görünür
- [x] T6: Faz 1 doğrulama — `npx vitest run` 11/11 + tarayıcı walkthrough (Auth → Dashboard) → Verify: testler yeşil, konsol hatasız

## Faz 2 — Modallar + Paneller
- [x] T7: `TransferModal.tsx` + `SwapModal.tsx` — inset input'lar, neu token picker, antrasit CTA, monokrom risk chip'leri → Verify: iki modal tarayıcıda açılır + ekran görüntüsü
- [x] T8: `WalletConnectModal.tsx` — neu modal kabuğu, dApp logoları neu-inset dairelerde (orijinal logolar korunur), monokrom oturum satırları → Verify: Pair + pending ekranları ekran görüntüsü
- [x] T9: `ChainPanel` + `StakingPanel` + `LitecoinPanel` + `AdvancedDashboard` + `CustomChain/CustomToken/CustomAPI/LedgerConnect` modalları — aynı token setiyle skin → Verify: her panel tarayıcıda açılır + ekran görüntüsü
- [x] T10: Final doğrulama — vitest + Playwright `06-ui-smoke` + masaüstü/mobil (390px) ekran görüntüleri + renk denetimi → Verify: aşağıdaki "Done When" listesi tamamen yeşil

## Done When
- [x] Tüm ekranlar/modallar light neumorphic + monokrom (ekran görüntüsü seti referanslarla uyumlu)
- [x] Renk denetimi temiz: `components/` + `src/` içinde `#52ffac`, `#10b981`, `#8b5cf6`, `#050505` eşleşmesi yok (danger `#b91c1c` hariç)
- [x] `npx vitest run` 11/11 ve Playwright smoke geçer
- [x] Yerleşim değişmedi: ortalanmış kolon + FloatingDock aynen korundu
- [x] `lang="en"`, `upperEn()`, Space Grotesk korunuyor

## Notes
- Snapshot alındı: `_rollback-20260813-neumorphic-plan` (geri dönüş noktası)
- HeroUI sürümü sabit: `@heroui/react@2.8.10` + `@heroui/theme@2.4.5` (React 18/Tailwind 3 uyumu); yalnızca tema + classNames ile çalışılır
- `lib/` iş mantığına dokunulmaz; değişiklik yalnızca görsel katman
- Faz 2'ye Faz 1 doğrulaması yeşil olmadan başlanmaz
- Danger istisnası (`#b91c1c`) yalnızca güvenlik uyarısı ve yıkıcı aksiyonlarda; onaylanmazsa tamamen griye çekilir
