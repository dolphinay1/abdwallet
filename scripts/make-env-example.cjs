// Generates .env.example from .env.local: keeps keys/comments, blanks out secret values.
// Public RPC endpoints are preserved because they are not secrets.
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const src = path.join(root, '.env.local');
const dst = path.join(root, '.env.example');

const lines = fs.readFileSync(src, 'utf8').split(/\r?\n/);
const out = lines.map(line => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return line;
  const eq = line.indexOf('=');
  if (eq === -1) return line;
  const key = line.slice(0, eq).trim();
  if (key.startsWith('NEXT_PUBLIC_RPC_')) return line;
  return `${key}=""`;
});

out.unshift(
  '# Copy this file to .env.local and fill in your own values.',
  '# Never commit .env.local — it is gitignored for a reason.',
  ''
);
fs.writeFileSync(dst, out.join('\n') + '\n', 'utf8');
console.log('Wrote .env.example with', out.length, 'lines');
