import { parse } from "csv-parse/sync";
import { HttpError } from "../middleware/error.middleware";

export function parseCsv(buffer: Buffer): Record<string, string>[] {
  let rows: Record<string, string>[];
  try {
    rows = parse(buffer, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Malformed CSV";
    throw new HttpError(400, `Failed to parse CSV: ${message}`);
  }

  if (rows.length === 0) {
    throw new HttpError(400, "CSV file contains no data rows");
  }

  return rows;
}
