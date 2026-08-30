const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const src = path.join(__dirname, '..', 'public', 'icon-original.png');
const pub = path.join(__dirname, '..', 'public');

// Guardar el original primero
const original = path.join(pub, 'icon-192.png');
if (!fs.existsSync(src)) {
  fs.copyFileSync(original, src);
}

async function resize() {
  await sharp(src).resize(192, 192, { fit: 'cover' }).png({ quality: 80 }).toFile(path.join(pub, 'icon-192.png'));
  await sharp(src).resize(512, 512, { fit: 'cover' }).png({ quality: 80 }).toFile(path.join(pub, 'icon-512.png'));
  await sharp(src).resize(180, 180, { fit: 'cover' }).png({ quality: 80 }).toFile(path.join(pub, 'apple-touch-icon.png'));
  await sharp(src).resize(32, 32, { fit: 'cover' }).png().toFile(path.join(pub, 'favicon.png'));
  console.log('Done! Sizes:');
  for (const f of ['icon-192.png', 'icon-512.png', 'apple-touch-icon.png', 'favicon.png']) {
    const s = fs.statSync(path.join(pub, f));
    console.log(`  ${f}: ${(s.size / 1024).toFixed(0)}KB`);
  }
}

resize().catch(console.error);
