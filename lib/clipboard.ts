// Self-Destructing Clipboard — Block 13

export function abdCopy(
  text: string,
  onTick: (secondsLeft: number) => void,
  onExpired: () => void,
  ttlSeconds = 10
): void {
  navigator.clipboard.writeText(text).catch(() => {});

  let remaining = ttlSeconds;
  const tick = setInterval(() => {
    remaining--;
    onTick(remaining);
    if (remaining <= 0) {
      clearInterval(tick);
      // Wipe clipboard
      navigator.clipboard.writeText('[ABD Wallet: Session Expired]').catch(() => {});
      onExpired();
    }
  }, 1000);
}
