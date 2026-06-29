/**
 * Universal file parser — supports CSV, TSV, XLSX, XLS
 * No server needed, runs entirely in the browser.
 */

// ── CSV/TSV parsing ────────────────────────────────────────────────────────

export function parseCSV(text: string): string[][] {
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const rows: string[][] = [];
  for (const line of lines) {
    if (!line.trim()) continue;
    rows.push(parseCSVLine(line));
  }
  return rows;
}

function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let i = 0;
  while (i < line.length) {
    if (line[i] === '"') {
      let field = "";
      i++;
      while (i < line.length) {
        if (line[i] === '"' && line[i + 1] === '"') { field += '"'; i += 2; }
        else if (line[i] === '"') { i++; break; }
        else { field += line[i++]; }
      }
      fields.push(field.trim());
      if (line[i] === ",") i++;
    } else {
      const end = line.indexOf(",", i);
      if (end === -1) { fields.push(line.slice(i).trim()); break; }
      fields.push(line.slice(i, end).trim());
      i = end + 1;
    }
  }
  return fields;
}

export function csvToObjects(rows: string[][]): Record<string, string>[] {
  if (rows.length < 2) return [];
  const headers = rows[0].map((h) => h.trim());
  return rows.slice(1).map((row) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => { obj[h] = (row[i] ?? "").trim(); });
    return obj;
  });
}

// ── Column name normalizer ─────────────────────────────────────────────────
// Maps Excel column names → our expected column names

const COLUMN_ALIASES: Record<string, string> = {
  // Tower ID variants
  "new xl id":                            "Tower ID",
  "tower id":                             "Tower ID",
  "id bts":                               "Tower ID",
  "id tower":                             "Tower ID",

  // Tower Name variants
  "tower name":                           "Tower Name",
  "nama tower":                           "Tower Name",

  // Date variants
  "new tower oa date (newtower activated)": "New Tower OA Date (NewTower Activated)",
  "new tower oa date":                    "New Tower OA Date (NewTower Activated)",
  "oa date":                              "New Tower OA Date (NewTower Activated)",
  "tanggal oa":                           "New Tower OA Date (NewTower Activated)",

  // Lat/Long
  "lat":                                  "Lat",
  "latitude":                             "Lat",
  "long":                                 "Long",
  "longitude":                            "Long",
  "lng":                                  "Long",

  // Cluster
  "cluster xls":                          "Cluster",
  "cluster xl":                           "Cluster",
  "cluster":                              "Cluster",

  // Qty
  "qty sp seeding by brand(s)":           "Qty SP Seeding per BTS",
  "qty sp seeding per bts":               "Qty SP Seeding per BTS",
  "qty seeding":                          "Qty SP Seeding per BTS",
  "qty":                                  "Qty SP Seeding per BTS",

  // PM
  "pm":                                   "PM",
  "project manager":                      "PM",
  "spm":                                  "PM",

  // SPV
  "spv":                                  "SPV",
  "supervisor":                           "SPV",

  // Kabupaten
  "kabupaten":                            "Kabupaten",
  "kab":                                  "Kabupaten",
  "kota":                                 "Kabupaten",
  "city":                                 "Kabupaten",

  // Promotor
  "nama promotor outstore":               "Nama Promotor Outstore",
  "nama promotor":                        "Nama Promotor Outstore",
  "promotor":                             "Nama Promotor Outstore",
  "promoter":                             "Nama Promotor Outstore",

  // SPV (for promotor sheet)
  "nama spv":                             "Nama SPV",
  "area":                                 "Area",
  "status":                               "Status",
};

function normalizeHeader(h: string): string {
  const lower = h.toLowerCase().trim();
  return COLUMN_ALIASES[lower] || h.trim();
}

// ── Excel serial date converter ────────────────────────────────────────────

function excelSerialToDate(serial: number): string {
  // Excel epoch offset: Dec 30, 1899
  const date = new Date(Date.UTC(1899, 11, 30) + serial * 86400000);
  const y  = date.getUTCFullYear();
  const m  = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d  = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function convertCellValue(value: unknown, headerNormalized: string): string {
  if (value === null || value === undefined) return "";

  // Date column — convert serial or Date object
  if (headerNormalized === "New Tower OA Date (NewTower Activated)") {
    if (value instanceof Date) {
      const y = value.getFullYear();
      const m = String(value.getMonth() + 1).padStart(2, "0");
      const d = String(value.getDate()).padStart(2, "0");
      return `${y}-${m}-${d}`;
    }
    const num = Number(value);
    if (!isNaN(num) && num > 1000 && num < 100000) {
      return excelSerialToDate(num);
    }
  }

  return String(value).trim();
}

// ── XLSX file parser (browser) ─────────────────────────────────────────────

async function parseXLSX(file: File): Promise<{ headers: string[]; rows: Record<string, string>[]; total: number; errors: string[] }> {
  // Dynamic import to keep bundle size down
  const XLSX = await import("xlsx");

  const buffer     = await file.arrayBuffer();
  const workbook   = XLSX.read(buffer, { type: "array", cellDates: true });
  const sheetName  = workbook.SheetNames[0];
  const worksheet  = workbook.Sheets[sheetName];

  // Get raw rows (array of arrays)
  const rawRows: unknown[][] = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    raw:    true,
    defval: "",
  }) as unknown[][];

  if (rawRows.length < 2) {
    return { headers: [], rows: [], total: 0, errors: ["File kosong atau hanya header"] };
  }

  // Normalize headers
  const originalHeaders = (rawRows[0] as unknown[]).map((h) => String(h ?? "").trim());
  const normalizedHeaders = originalHeaders.map(normalizeHeader);

  console.log("Original headers:", originalHeaders);
  console.log("Normalized headers:", normalizedHeaders);

  // Convert data rows
  const objects: Record<string, string>[] = [];
  for (let r = 1; r < rawRows.length; r++) {
    const row = rawRows[r] as unknown[];
    const obj: Record<string, string> = {};
    let hasValue = false;
    normalizedHeaders.forEach((h, i) => {
      const val = convertCellValue(row[i], h);
      obj[h] = val;
      if (val) hasValue = true;
    });
    if (hasValue) objects.push(obj);
  }

  return {
    headers: normalizedHeaders,
    rows:    objects,
    total:   objects.length,
    errors:  [],
  };
}

// ── Main export ────────────────────────────────────────────────────────────

export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = (e) => resolve((e.target?.result as string) ?? "");
    reader.onerror = () => reject(new Error("Gagal membaca file"));
    reader.readAsText(file, "UTF-8");
  });
}

export interface ImportResult {
  headers: string[];
  rows:    Record<string, string>[];
  total:   number;
  errors:  string[];
}

export async function parseImportFile(file: File): Promise<ImportResult> {
  const name = file.name.toLowerCase();

  // Excel files
  if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
    return parseXLSX(file);
  }

  // CSV / TSV
  const text      = await readFileAsText(file);
  const separator = text.includes("\t") ? "\t" : ",";
  const normalised = separator === "\t" ? text.replace(/\t/g, ",") : text;
  const rawRows   = parseCSV(normalised);

  if (rawRows.length < 2) {
    return { headers: [], rows: [], total: 0, errors: ["File kosong atau hanya header"] };
  }

  // Normalize headers from CSV too
  const headers = rawRows[0].map(normalizeHeader);
  const objects = rawRows.slice(1).map((row) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => { obj[h] = (row[i] ?? "").trim(); });
    return obj;
  }).filter((r) => Object.values(r).some((v) => v.trim() !== ""));

  return {
    headers,
    rows:   objects,
    total:  objects.length,
    errors: [],
  };
}
