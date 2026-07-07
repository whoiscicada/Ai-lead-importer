import { Request, Response } from "express";
import { parseCsv } from "../services/csvParser.service";
import { extractAllBatches, hasContactInfo } from "../services/aiExtractor.service";
import { ClaudeProvider } from "../providers/ClaudeProvider";
import { HttpError } from "../middleware/error.middleware";
import { env } from "../config/env";
import { ImportResult } from "../types/crm";

function resolveProviderConfig(): {
  apiKey: string;
  missingVar: string;
  model?: string;
  maxTokens?: number;
} {
  if (env.aiTransport === "openrouter") {
    return { apiKey: env.openrouterApiKey, missingVar: "OPENROUTER_API_KEY", model: env.openrouterModel, maxTokens: env.openrouterMaxTokens };
  }
  if (env.aiTransport === "gemini") {
    return { apiKey: env.geminiApiKey, missingVar: "GEMINI_API_KEY", model: env.geminiModel, maxTokens: env.geminiMaxTokens };
  }
  if (env.aiTransport === "groq") {
    return { apiKey: env.groqApiKey, missingVar: "GROQ_API_KEY", model: env.groqModel, maxTokens: env.groqMaxTokens };
  }
  return { apiKey: env.anthropicApiKey, missingVar: "ANTHROPIC_API_KEY" };
}

export async function importCsv(req: Request, res: Response): Promise<void> {
  if (!req.file) {
    throw new HttpError(400, "No CSV file uploaded (expected field name 'file')");
  }

  const providerConfig = resolveProviderConfig();
  if (!providerConfig.apiKey) {
    throw new HttpError(500, `Server is missing ${providerConfig.missingVar} configuration`);
  }

  const rows = parseCsv(req.file.buffer);

  if (!rows.some(hasContactInfo)) {
    throw new HttpError(422, "No column in this CSV looks like an email or phone/mobile number — nothing to import");
  }

  const provider = new ClaudeProvider(providerConfig.apiKey, {
    transport: env.aiTransport,
    model: providerConfig.model,
    maxTokens: providerConfig.maxTokens,
  });

  let imported: ImportResult["imported"] = [];
  let skipped: ImportResult["skipped"] = [];
  try {
    const result = await extractAllBatches(provider, rows, env.batchSize, undefined, env.aiConcurrency);
    imported = result.imported;
    skipped = result.skipped;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown AI provider error";
    throw new HttpError(500, `AI extraction failed: ${message}`);
  }

  if (imported.length === 0) {
    throw new HttpError(422, "No valid rows could be imported from this CSV");
  }

  const response: ImportResult = {
    imported,
    skipped,
    totalImported: imported.length,
    totalSkipped: skipped.length,
  };

  res.status(200).json(response);
}
