/**
 * Minimal CSV/TSV parser — no dependencies.
 * Handles quoted fields, commas inside quotes, and CRLF/LF line endings.
 */

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
      // quoted field
      let field = "";
      i++; // skip opening quote
      while (i < line.length) {
        if (line[i] === '"' && line[i + 1] === '"') {
          field += '"';
          i += 2;
        } else if (line[i] === '"') {
          i++; // skip closing quote
          break;
        } else {
          field += line[i++];
        }
      }
      fields.push(field.trim());
      if (line[i] === ",") i++; // skip comma
    } else {
      // unquoted field
      const end = line.indexOf(",", i);
      if (end === -1) {
        fields.push(line.slice(i).trim());
        break;
      }
      fields.push(line.slice(i, end).trim());
      i = end + 1;
    }
  }
  return fields;
}

/** Convert CSV rows (array of arrays) into array of objects using first row as headers */
export function csvToObjects(rows: string[][]): Record<string, string>[] {
  if (rows.length < 2) return [];
  const headers = rows[0].map((h) => h.trim());
  return rows.slice(1).map((row) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => {
      obj[h] = (row[i] ?? "").trim();
    });
    return obj;
  });
}

/** Read a File and return its text content */
export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string ?? "");
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsText(file, "UTF-8");
  });
}

export interface ImportResult {
  headers: string[];
  rows: Record<string, string>[];
  total: number;
  errors: string[];
}

/** Parse an uploaded CSV/TSV file and return structured result */
export async function parseImportFile(file: File): Promise<ImportResult> {
  const text = await readFileAsText(file);
  const separator = text.includes("\t") ? "\t" : ",";
  
  // If TSV, replace tabs with commas for uniform parsing
  const normalised = separator === "\t" ? text.replace(/\t/g, ",") : text;
  const rawRows = parseCSV(normalised);

  if (rawRows.length < 2) {
    return { headers: [], rows: [], total: 0, errors: ["File kosong atau hanya berisi header"] };
  }

  const headers = rawRows[0];
  const objects = csvToObjects(rawRows);

  // Filter completely empty rows
  const validRows = objects.filter((r) =>
    Object.values(r).some((v) => v.trim() !== "")
  );

  return {
    headers,
    rows: validRows,
    total: validRows.length,
    errors: [],
  };
}
