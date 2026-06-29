/**
 * Generate template CSV untuk SPV dan Promotor
 * + Extract SPV & PM unik dari Data BTS xlsx
 */
const xlsx = require('xlsx');
const { writeFileSync, readFileSync } = require('fs');
const { join } = require('path');

const XLSX_FILE = join(__dirname, '..', 'Data Gmaps tower seeding NS.xlsx');
const PUBLIC    = join(__dirname, '..', 'public');

function writeCsv(filename, rows) {
  const csv = '\uFEFF' + rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  writeFileSync(join(PUBLIC, filename), csv, 'utf8');
  console.log('✅ ' + filename + ' (' + (rows.length - 1) + ' baris)');
}

// ── Template kosong SPV ──────────────────────────────────────────────────
const spvTemplate = [
  ['Nama SPV', 'Area'],
  ['Ahmad Fauzi', 'Jakarta Selatan'],
  ['Budi Hartono', 'Jawa Barat'],
];
writeCsv('template-spv.csv', spvTemplate);

// ── Template kosong Promotor ─────────────────────────────────────────────
const promotorTemplate = [
  ['Nama Promotor Outstore', 'SPV', 'Area', 'Status'],
  ['Budi Santoso', 'Ahmad Fauzi', 'Jakarta Selatan', 'Active'],
  ['Siti Rahayu', 'Budi Hartono', 'Jawa Barat', 'Active'],
];
writeCsv('template-promotor.csv', promotorTemplate);

// ── Extract data dari Excel jika ada ────────────────────────────────────
try {
  const wb   = xlsx.readFile(XLSX_FILE);
  const ws   = wb.Sheets[wb.SheetNames[0]];
  const data = xlsx.utils.sheet_to_json(ws, { header: 1, raw: false });
  const hdr  = data[0];

  const spvIdx  = hdr.indexOf('SPV');
  const pmIdx   = hdr.indexOf('PM');
  const kabIdx  = hdr.indexOf('Kabupaten');
  const cluIdx  = hdr.findIndex(h => h && h.toString().toLowerCase().includes('cluster'));

  if (spvIdx >= 0) {
    // Extract unique SPV → area (derived from Cluster/Kabupaten)
    const spvMap = {};
    data.slice(1).forEach(row => {
      const spv = String(row[spvIdx] || '').trim();
      const kab = String(row[kabIdx >= 0 ? kabIdx : 0] || '').trim();
      if (spv && !spvMap[spv]) spvMap[spv] = kab;
    });

    const spvRows = [['Nama SPV', 'Area']];
    Object.entries(spvMap).sort((a,b) => a[0].localeCompare(b[0])).forEach(([spv, area]) => {
      spvRows.push([spv, area]);
    });
    writeCsv('import-spv-from-data.csv', spvRows);
    console.log('   → ' + (spvRows.length - 1) + ' SPV unik ditemukan');
  }

  if (pmIdx >= 0) {
    // Build promotor template from PM names (treating PM as "promotor" placeholder)
    // In practice you'd fill Nama Promotor Outstore separately
    // Instead, generate SPV→Area mapping more accurately
    const promRows = [['Nama Promotor Outstore', 'SPV', 'Area', 'Status']];
    // Example rows only — admin harus isi nama promotor outstore secara manual
    promRows.push(['[Isi Nama Promotor]', '[Isi Nama SPV]', '[Isi Area/Kota]', 'Active']);
    writeCsv('template-promotor-fill.csv', promRows);
  }

} catch(e) {
  console.log('ℹ️  File Excel tidak ditemukan, hanya template kosong yang dibuat.');
  console.log('   Error:', e.message);
}

console.log('\n📋 File tersedia di folder public/:');
console.log('   template-spv.csv           — template kosong SPV');
console.log('   template-promotor.csv      — template kosong Promotor');
console.log('   import-spv-from-data.csv   — SPV dari data BTS (jika Excel ada)');
