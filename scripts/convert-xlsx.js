/**
 * Convert Data Gmaps tower seeding NS.xlsx → CSV siap import ke app
 * Kolom asli:  New XL ID | Tower Name | New Tower OA Date | Lat | Long | Cluster XLS | Qty SP Seeding | PM | SPV | Kabupaten
 * Kolom target: Tower ID | Tower Name | New Tower OA Date (NewTower Activated) | Lat | Long | Cluster | Qty SP Seeding per BTS | PM | SPV | Kabupaten
 */

const xlsx   = require('xlsx');
const { writeFileSync } = require('fs');
const { join } = require('path');

const INPUT  = join(__dirname, '..', 'Data Gmaps tower seeding NS.xlsx');
const OUTPUT = join(__dirname, '..', 'public', 'import-bts-ready.csv');

// Read Excel
const wb   = xlsx.readFile(INPUT);
const ws   = wb.Sheets[wb.SheetNames[0]];
const rows = xlsx.utils.sheet_to_json(ws, { header: 1, raw: false });

if (rows.length < 2) {
  console.error('File kosong atau hanya header');
  process.exit(1);
}

const header = rows[0];
console.log('Header asli:', header);
console.log('Total data rows:', rows.length - 1);

// Map kolom asli → target
const COL_MAP = {
  'New XL ID':                           'Tower ID',
  'Tower Name':                          'Tower Name',
  'New Tower OA Date (NewTower Activated)': 'New Tower OA Date (NewTower Activated)',
  'New Tower OA Date':                   'New Tower OA Date (NewTower Activated)',
  'Lat':                                 'Lat',
  'Long':                                'Long',
  'Cluster XLS':                         'Cluster',
  'Cluster':                             'Cluster',
  'Qty SP Seeding by Brand(s)':          'Qty SP Seeding per BTS',
  'Qty SP Seeding per BTS':              'Qty SP Seeding per BTS',
  'PM':                                  'PM',
  'SPV':                                 'SPV',
  'Kabupaten':                           'Kabupaten',
};

const TARGET_HEADERS = [
  'Tower ID',
  'Tower Name',
  'New Tower OA Date (NewTower Activated)',
  'Lat',
  'Long',
  'Cluster',
  'Qty SP Seeding per BTS',
  'PM',
  'SPV',
  'Kabupaten',
];

// Find source column index for each target header
const srcIdx = {};
header.forEach((h, i) => {
  const mapped = COL_MAP[h ? h.toString().trim() : ''];
  if (mapped) srcIdx[mapped] = i;
});

console.log('Column mapping:', srcIdx);

// Escape CSV field
function csvField(v) {
  if (v === null || v === undefined) return '';
  const s = v.toString().trim();
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

// Convert Excel serial date to yyyy-mm-dd
function excelDateToString(serial) {
  if (!serial || serial === '') return '';
  const num = Number(serial);
  // If it's already a string date like "4-May-26" or "2026-05-04", keep it
  if (isNaN(num)) {
    // Try to parse string dates
    const d = new Date(serial);
    if (!isNaN(d.getTime())) {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    }
    return serial.toString();
  }
  // Excel serial number → date
  // Excel epoch: Jan 1, 1900 = serial 1
  const date = new Date(Date.UTC(1899, 11, 30) + num * 86400000);
  const y    = date.getUTCFullYear();
  const mo   = String(date.getUTCMonth() + 1).padStart(2, '0');
  const dy   = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${mo}-${dy}`;
}

// Build CSV
const csvLines = [];
csvLines.push(TARGET_HEADERS.map(csvField).join(','));

let skipped = 0;
rows.slice(1).forEach((row, idx) => {
  // Get Tower ID (required)
  const towerId = (row[srcIdx['Tower ID']] || '').toString().trim();
  if (!towerId) { skipped++; return; }

  const cells = TARGET_HEADERS.map((h) => {
    const si = srcIdx[h];
    let val = si !== undefined ? (row[si] || '') : '';

    // Convert OA date from Excel serial
    if (h === 'New Tower OA Date (NewTower Activated)') {
      val = excelDateToString(val);
    }

    return csvField(val);
  });
  csvLines.push(cells.join(','));
});

const csv = '\uFEFF' + csvLines.join('\n'); // BOM for Excel compatibility
writeFileSync(OUTPUT, csv, 'utf8');

console.log(`\n✅ Berhasil!`);
console.log(`   Output : ${OUTPUT}`);
console.log(`   Records: ${csvLines.length - 1} baris`);
console.log(`   Skipped: ${skipped} baris (Tower ID kosong)`);
console.log(`\n📋 Cara import:`);
console.log(`   1. Buka https://hoca-ns.vercel.app/master`);
console.log(`   2. Login sebagai Admin`);
console.log(`   3. Tab BTS → klik tombol Import`);
console.log(`   4. Masukkan password import`);
console.log(`   5. Upload file: public/import-bts-ready.csv`);
console.log(`   6. Review preview → klik Import`);
