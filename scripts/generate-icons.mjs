/**
 * Generate PWA icons using pure Node.js (no canvas dependency)
 * Creates minimal valid PNG files with gradient background
 */

import { writeFileSync } from 'fs';

// Minimal valid PNG generator
function createPNG(width, height) {
  // PNG signature
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  function ihdr(w, h) {
    const data = Buffer.alloc(13);
    data.writeUInt32BE(w, 0);
    data.writeUInt32BE(h, 4);
    data[8] = 8;  // bit depth
    data[9] = 2;  // color type: RGB
    data[10] = 0; // compression
    data[11] = 0; // filter
    data[12] = 0; // interlace
    return makeChunk('IHDR', data);
  }

  // CRC32
  function crc32(buf) {
    let crc = 0xFFFFFFFF;
    const table = makeCRCTable();
    for (let i = 0; i < buf.length; i++) {
      crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xFF];
    }
    return (crc ^ 0xFFFFFFFF) >>> 0;
  }

  function makeCRCTable() {
    const t = [];
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) {
        c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      }
      t[n] = c;
    }
    return t;
  }

  function makeChunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeB = Buffer.from(type);
    const crcBuf = Buffer.concat([typeB, data]);
    const crcVal = Buffer.alloc(4);
    crcVal.writeUInt32BE(crc32(crcBuf), 0);
    return Buffer.concat([len, typeB, data, crcVal]);
  }

  // Generate pixel data
  const rows = [];
  for (let y = 0; y < height; y++) {
    // filter byte + RGB pixels
    const row = Buffer.alloc(1 + width * 3);
    row[0] = 0; // no filter
    for (let x = 0; x < width; x++) {
      const t = x / width;
      const s = y / height;
      // gradient: blue #3b82f6 to #2563eb, with rounded corners mask
      const cx = x - width / 2, cy = y - height / 2;
      const r = Math.min(width, height) * 0.2;
      const inCorner = (
        Math.abs(cx) > width/2 - r && Math.abs(cy) > height/2 - r &&
        Math.sqrt(Math.pow(Math.abs(cx) - (width/2 - r), 2) + Math.pow(Math.abs(cy) - (height/2 - r), 2)) > r
      );
      if (inCorner) {
        row[1 + x * 3] = 240;
        row[2 + x * 3] = 242;
        row[3 + x * 3] = 247;
      } else {
        row[1 + x * 3] = Math.round(59 + (37 - 59) * t);   // R: 3b → 25
        row[2 + x * 3] = Math.round(130 + (99 - 130) * t); // G: 82 → 63
        row[3 + x * 3] = Math.round(246 + (235 - 246) * t);// B: f6 → eb
      }
    }
    rows.push(row);
  }

  // Deflate (zlib) compression - use Node's built-in zlib
  import('zlib').then(() => {}); // just ensure available

  const rawData = Buffer.concat(rows);

  // Simple IDAT using zlib deflate
  const { deflateSync } = await import('zlib');
  const compressed = deflateSync(rawData);

  return Buffer.concat([
    sig,
    ihdr(width, height),
    makeChunk('IDAT', compressed),
    makeChunk('IEND', Buffer.alloc(0)),
  ]);
}

// Use a simpler approach - create the PNG via canvas-like hex data
// Since we can't easily generate real PNG without canvas,
// we'll write the generation differently using zlib

import { deflateSync } from 'zlib';

function buildPNG(size) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  
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
    for (const b of buf) c = (c >>> 8) ^ crcTable[(c ^ b) & 0xFF];
    return (c ^ 0xFFFFFFFF) >>> 0;
  }

  function chunk(type, data) {
    const t = Buffer.from(type);
    const l = Buffer.alloc(4); l.writeUInt32BE(data.length, 0);
    const combined = Buffer.concat([t, data]);
    const cv = Buffer.alloc(4); cv.writeUInt32BE(crc32(combined), 0);
    return Buffer.concat([l, t, data, cv]);
  }

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(size, 0);
  ihdrData.writeUInt32BE(size, 4);
  ihdrData[8] = 8; ihdrData[9] = 2;

  const rows = [];
  const radius = size * 0.22;

  for (let y = 0; y < size; y++) {
    const row = Buffer.alloc(1 + size * 3);
    row[0] = 0;
    for (let x = 0; x < size; x++) {
      const cx = x - size/2 + 0.5;
      const cy = y - size/2 + 0.5;
      const ax = Math.abs(cx), ay = Math.abs(cy);
      const half = size/2;
      const inCorner = ax > half - radius && ay > half - radius;
      const dist = inCorner ? Math.sqrt(Math.pow(ax - (half - radius), 2) + Math.pow(ay - (half - radius), 2)) : 0;
      const outside = inCorner && dist > radius;

      const off = 1 + x * 3;
      if (outside) {
        // transparent-ish / white bg
        row[off] = 255; row[off+1] = 255; row[off+2] = 255;
      } else {
        // gradient from #3b82f6 (top-left) to #1d4ed8 (bottom-right)
        const t = (x + y) / (size * 2);
        row[off]   = Math.round(59 + (29 - 59) * t);
        row[off+1] = Math.round(130 + (78 - 130) * t);
        row[off+2] = Math.round(246 + (216 - 246) * t);
      }
    }
    rows.push(row);
  }

  const rawData = Buffer.concat(rows);
  const compressed = deflateSync(rawData);

  return Buffer.concat([sig, chunk('IHDR', ihdrData), chunk('IDAT', compressed), chunk('IEND', Buffer.alloc(0))]);
}

writeFileSync('public/icon-192.png', buildPNG(192));
writeFileSync('public/icon-512.png', buildPNG(512));
console.log('Icons generated: public/icon-192.png, public/icon-512.png');
