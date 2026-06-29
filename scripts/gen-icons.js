/**
 * Generate PWA icons (192x192 and 512x512) as valid PNG files
 * Uses only Node.js built-in modules — no canvas or sharp needed
 */
const { deflateSync } = require('zlib');
const { writeFileSync, mkdirSync } = require('fs');
const { join } = require('path');

const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = (c & 1) ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    t[i] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) c = (c >>> 8) ^ crcTable[(c ^ buf[i]) & 0xFF];
  return (c ^ 0xFFFFFFFF) >>> 0;
}

function chunk(type, data) {
  const t = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const combined = Buffer.concat([t, data]);
  const cv = Buffer.alloc(4);
  cv.writeUInt32BE(crc32(combined), 0);
  return Buffer.concat([len, t, data, cv]);
}

function buildPNG(size) {
  // IHDR
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(size, 0);
  ihdrData.writeUInt32BE(size, 4);
  ihdrData[8] = 8;  // bit depth
  ihdrData[9] = 6;  // RGBA

  const radius = Math.floor(size * 0.22);
  const rows = [];

  for (let y = 0; y < size; y++) {
    // filter byte + RGBA per pixel
    const row = Buffer.alloc(1 + size * 4);
    row[0] = 0; // None filter
    for (let x = 0; x < size; x++) {
      const cx = x - size / 2 + 0.5;
      const cy = y - size / 2 + 0.5;
      const ax = Math.abs(cx);
      const ay = Math.abs(cy);
      const half = size / 2;

      // Rounded corner check
      const inCorner = ax > half - radius && ay > half - radius;
      const dist = inCorner
        ? Math.sqrt(Math.pow(ax - (half - radius), 2) + Math.pow(ay - (half - radius), 2))
        : 0;
      const outside = inCorner && dist > radius;

      const off = 1 + x * 4;
      if (outside) {
        // Transparent
        row[off] = 0; row[off+1] = 0; row[off+2] = 0; row[off+3] = 0;
      } else {
        // Blue gradient: #3b82f6 → #1d4ed8
        const t = (x + y) / (size * 2);
        row[off]   = Math.round(59  + (29  - 59)  * t); // R
        row[off+1] = Math.round(130 + (78  - 130) * t); // G
        row[off+2] = Math.round(246 + (216 - 246) * t); // B
        row[off+3] = 255;                                 // A

        // Draw radio tower icon in white (center area)
        const relX = (x - size * 0.5) / (size * 0.35);
        const relY = (y - size * 0.5) / (size * 0.35);

        // Vertical mast
        if (Math.abs(relX) < 0.06 && relY > -0.1 && relY < 0.8) {
          row[off] = 255; row[off+1] = 255; row[off+2] = 255;
        }
        // Arc waves (3 arcs)
        const arcR = [0.35, 0.6, 0.85];
        arcR.forEach((r) => {
          const d = Math.sqrt(relX * relX + relY * relY);
          if (Math.abs(d - r) < 0.055 && relX < -0.02 && relY < 0.05) {
            row[off] = 255; row[off+1] = 255; row[off+2] = 255;
          }
          if (Math.abs(d - r) < 0.055 && relX > 0.02 && relY < 0.05) {
            row[off] = 255; row[off+1] = 255; row[off+2] = 255;
          }
        });
      }
    }
    rows.push(row);
  }

  const raw = Buffer.concat(rows);
  const compressed = deflateSync(raw);
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // Update IHDR for RGBA (color type 6)
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdrData),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const publicDir = join(__dirname, '..', 'public');
try { mkdirSync(publicDir, { recursive: true }); } catch (_) {}

writeFileSync(join(publicDir, 'icon-192.png'), buildPNG(192));
writeFileSync(join(publicDir, 'icon-512.png'), buildPNG(512));
console.log('✅ Generated public/icon-192.png and public/icon-512.png');
