import { promises as fs } from 'fs';
import path from 'path';
import sharp from 'sharp';
import pngToIco from 'png-to-ico';

const rootDir = path.resolve(process.cwd());
const publicDir = path.join(rootDir, 'public');
const svgPath = path.join(publicDir, 'favicon.svg');

const outputs = [
  { filename: 'favicon-16x16.png', size: 16 },
  { filename: 'favicon-32x32.png', size: 32 },
  { filename: 'apple-touch-icon.png', size: 180 },
  { filename: 'pwa-192x192.png', size: 192 },
  { filename: 'pwa-512x512.png', size: 512 },
];

async function main() {
  const svg = await fs.readFile(svgPath);

  const buffersBySize = new Map();
  for (const { filename, size } of outputs) {
    const buffer = await sharp(svg)
      .resize(size, size, { fit: 'contain' })
      .png({ compressionLevel: 9 })
      .toBuffer();
    await fs.writeFile(path.join(publicDir, filename), buffer);
    buffersBySize.set(size, buffer);
  }

  const icoBuffer = await pngToIco([
    buffersBySize.get(16),
    buffersBySize.get(32),
  ]);
  await fs.writeFile(path.join(publicDir, 'favicon.ico'), icoBuffer);

  console.log('Favicons generated from public/favicon.svg');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
