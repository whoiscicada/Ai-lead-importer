import { ImportResult } from "@/types/crm";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

export class ApiError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
  }
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
