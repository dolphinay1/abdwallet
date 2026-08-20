import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const extDir = path.join(rootDir, 'extension');
const ethersDist = path.join(rootDir, 'node_modules', 'ethers', 'dist');

console.log('[Extension Builder] Preparing extension assets...');

// Ensure extension directory exists
if (!fs.existsSync(extDir)) {
  fs.mkdirSync(extDir, { recursive: true });
}

// Copy ethers distributions from node_modules if present
const esmSrc = path.join(ethersDist, 'ethers.js');
const esmDst = path.join(extDir, 'ethers.esm.js');
const umdSrc = path.join(ethersDist, 'ethers.umd.min.js');
const umdDst = path.join(extDir, 'ethers.umd.min.js');

if (fs.existsSync(esmSrc)) {
  fs.copyFileSync(esmSrc, esmDst);
  console.log('✓ Copied ethers.esm.js from node_modules/ethers/dist/ethers.js');
}

if (fs.existsSync(umdSrc)) {
  fs.copyFileSync(umdSrc, umdDst);
  console.log('✓ Copied ethers.umd.min.js from node_modules/ethers/dist/ethers.umd.min.js');
}

// Compute SRI SHA-384 hash for all JS scripts in extension/
const integrityMap = {};
const extFiles = fs.readdirSync(extDir);

for (const file of extFiles) {
  if (file.endsWith('.js') || file.endsWith('.html') || file.endsWith('.json')) {
    if (file === 'integrity.json') continue;
    const filePath = path.join(extDir, file);
    const content = fs.readFileSync(filePath);
    const hash = crypto.createHash('sha384').update(content).digest('base64');
    integrityMap[file] = `sha384-${hash}`;
  }
}

const integrityPath = path.join(extDir, 'integrity.json');
fs.writeFileSync(integrityPath, JSON.stringify(integrityMap, null, 2) + '\n', 'utf8');
console.log(`✓ Generated extension/integrity.json (${Object.keys(integrityMap).length} files hashed)`);
console.log('[Extension Builder] Build complete!');
