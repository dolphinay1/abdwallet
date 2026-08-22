'use client';

/** Tiny disclosure: ABD never takes a cut. Network/route fees stay with the chain or aggregator. */
export function ZeroFeeNote({ compact = false }: { compact?: boolean }) {
  return (
    <p
      className="sf-bold"
      style={{
        margin: compact ? '4px 0 0' : 0,
        fontSize: 8.5,
        fontWeight: 700,
        color: '#5b616b',
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        textAlign: 'center',
        lineHeight: 1.45,
      }}
    >
      ABD takes 0% · network fee goes to the chain
    </p>
  );
}
