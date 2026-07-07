import { CrmRecord, ImportResult, SkippedRow } from "@/types/crm";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

export class ApiError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
  }
}

type JobEvent =
  | { type: "progress"; message: string }
  | { type: "batch"; batchIndex: number; totalBatches: number; imported: CrmRecord[]; skipped: SkippedRow[] }
  | { type: "done"; totalImported: number; totalSkipped: number }
  | { type: "error"; message: string; status: number };

export interface StreamCallbacks {
  onProgress?: (message: string) => void;
  onBatch?: (batchIndex: number, totalBatches: number, imported: CrmRecord[], skipped: SkippedRow[]) => void;
  onDone?: (totalImported: number, totalSkipped: number) => void;
  onError?: (message: string) => void;
}

export async function importCsvFileStreaming(file: File, callbacks: StreamCallbacks): Promise<() => void> {
  const formData = new FormData();
  formData.append("file", file);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/api/import/jobs`, { method: "POST", body: formData });
  } catch {
    callbacks.onError?.("Could not reach the import server. Check your connection and try again.");
    return () => {};
  }

  if (!response.ok) {
    let message = `Import failed with status ${response.status}`;
    try {
      const body = await response.json();
      if (body?.error) message = body.error;
    } catch {
      // ignore body parse failure, use default message
    }
    callbacks.onError?.(message);
    return () => {};
  }

  const { jobId } = (await response.json()) as { jobId: string };
  const eventSource = new EventSource(`${API_BASE_URL}/api/import/jobs/${jobId}/stream`);

  eventSource.onmessage = (raw) => {
    const event = JSON.parse(raw.data) as JobEvent;
    if (event.type === "progress") {
      callbacks.onProgress?.(event.message);
    } else if (event.type === "batch") {
      callbacks.onBatch?.(event.batchIndex, event.totalBatches, event.imported, event.skipped);
    } else if (event.type === "done") {
      callbacks.onDone?.(event.totalImported, event.totalSkipped);
      eventSource.close();
    } else if (event.type === "error") {
      callbacks.onError?.(event.message);
      eventSource.close();
    }
  };

  eventSource.onerror = () => {
    callbacks.onError?.("Lost connection to the import server.");
    eventSource.close();
  };

  return () => eventSource.close();
}

export async function importCsvFile(file: File): Promise<ImportResult> {
  const formData = new FormData();
  formData.append("file", file);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/api/import`, {
      method: "POST",
      body: formData,
    });
  } catch {
    throw new ApiError("Could not reach the import server. Check your connection and try again.");
  }

  if (!response.ok) {
    let message = `Import failed with status ${response.status}`;
    try {
      const body = await response.json();
      if (body?.error) message = body.error;
    } catch {
      // ignore body parse failure, use default message
    }
    throw new ApiError(message, response.status);
  }

  return response.json();
}
