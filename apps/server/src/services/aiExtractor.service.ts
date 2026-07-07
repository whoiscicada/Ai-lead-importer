import pLimit from "p-limit";
import { AIProvider } from "../providers/AIProvider";
import { RateLimitError } from "../providers/ClaudeProvider";
import { batchRows } from "./batcher.service";
import { sanitizeRecord } from "./validator.service";
import { CrmRecord, SkippedRow } from "../types/crm";

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 500;
const MAX_RATE_LIMIT_WAIT_MS = 60_000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function hasContactInfo(row: Record<string, unknown>): boolean {
  return Object.entries(row).some(([key, value]) => {
    if (typeof value !== "string" || !value.trim()) return false;
    const lowerKey = key.toLowerCase();
    if (lowerKey.includes("email")) return true;
    if (/phone|mobile|contact|whatsapp/.test(lowerKey)) return true;
    return false;
  });
}

async function extractBatchWithRetry(
  provider: AIProvider,
  batch: Record<string, unknown>[],
  onProgress?: (message: string) => void
): Promise<{ records: CrmRecord[]; skipped: SkippedRow[] }> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const rawRecords = await provider.extractBatch(batch);

      const sanitized = rawRecords.map((record) => sanitizeRecord(record));
      const records = sanitized.filter((r) => r.keep).map((r) => r.record);

      // The model returns at most one record per eligible input row, in order,
      // but may silently drop rows. Anything beyond what the model returned
      // (that still has contact info) is treated as an AI omission.
      const skipped: SkippedRow[] = [];
      const returnedCount = rawRecords.length;
      const eligibleRows = batch.filter(hasContactInfo);
      if (returnedCount < eligibleRows.length) {
        for (const row of eligibleRows.slice(returnedCount)) {
          skipped.push({ row, reason: "AI omitted row" });
        }
      }
      for (const row of batch.filter((r) => !hasContactInfo(r))) {
        skipped.push({ row, reason: "No email or mobile number" });
      }
      for (const { record, keep, reason } of sanitized) {
        if (!keep && reason) {
          skipped.push({ row: record as unknown as Record<string, unknown>, reason });
        }
      }

      return { records, skipped };
    } catch (err) {
      lastError = err;
      if (attempt < MAX_RETRIES) {
        const waitMs =
          err instanceof RateLimitError && err.retryAfterMs
            ? Math.min(err.retryAfterMs, MAX_RATE_LIMIT_WAIT_MS)
            : BASE_DELAY_MS * 2 ** (attempt - 1);
        onProgress?.(`Batch failed (attempt ${attempt}/${MAX_RETRIES}), retrying in ${Math.round(waitMs / 1000)}s...`);
        await sleep(waitMs);
      }
    }
  }

  console.error("AI extraction failed after retries:", lastError);
  return {
    records: [],
    skipped: batch.map((row) => ({ row, reason: "AI extraction failed" })),
  };
}

export async function extractAllBatches(
  provider: AIProvider,
  rows: Record<string, unknown>[],
  batchSize: number,
  onProgress?: (message: string) => void,
  concurrency = 3
): Promise<{ imported: CrmRecord[]; skipped: SkippedRow[] }> {
  const batches = batchRows(rows, batchSize);
  const limit = pLimit(concurrency);

  const results = await Promise.all(
    batches.map((batch, index) =>
      limit(() => {
        onProgress?.(`Processing batch ${index + 1}/${batches.length}`);
        return extractBatchWithRetry(provider, batch, onProgress);
      })
    )
  );

  const imported: CrmRecord[] = [];
  const skipped: SkippedRow[] = [];
  for (const result of results) {
    imported.push(...result.records);
    skipped.push(...result.skipped);
  }

  return { imported, skipped };
}
