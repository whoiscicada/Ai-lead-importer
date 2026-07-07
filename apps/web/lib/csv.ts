import Papa from "papaparse";
import { CRM_FIELDS, CrmRecord, SkippedRow } from "@/types/crm";

export interface ParsedCsv {
  headers: string[];
  rows: Record<string, string>[];
}

export function parseCsvPreview(file: File): Promise<ParsedCsv> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          reject(new Error(results.errors[0].message));
          return;
        }
        resolve({
          headers: results.meta.fields ?? [],
          rows: results.data,
        });
      },
      error: (err) => reject(err),
    });
  });
}

function downloadTextFile(filename: string, content: string): void {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function downloadImportedCsv(records: CrmRecord[], filename = "groweasy-imported.csv"): void {
  const csv = Papa.unparse({
    fields: CRM_FIELDS,
    data: records.map((record) => CRM_FIELDS.map((field) => record[field] ?? "")),
  });
  downloadTextFile(filename, csv);
}

export function downloadSkippedCsv(skipped: SkippedRow[], filename = "groweasy-skipped.csv"): void {
  const columns = Array.from(new Set(skipped.flatMap((s) => Object.keys(s.row))));
  const fields = [...columns, "skip_reason"];
  const csv = Papa.unparse({
    fields,
    data: skipped.map((s) => [...columns.map((c) => s.row[c] ?? ""), s.reason]),
  });
  downloadTextFile(filename, csv);
}
