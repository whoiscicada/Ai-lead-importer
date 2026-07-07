import dotenv from "dotenv";

dotenv.config();

type AiTransport = "anthropic" | "openrouter" | "gemini" | "groq";

const DEV_TRANSPORTS = new Set(["openrouter", "gemini", "groq"]);

function resolveAiTransport(): AiTransport {
  const value = process.env.AI_TRANSPORT;
  if (value && DEV_TRANSPORTS.has(value)) {
    return value as AiTransport;
  }
  return "anthropic";
}

export const env = {
  port: Number(process.env.PORT ?? 8080),
  corsOrigin: process.env.CORS_ORIGIN ?? "*",
  anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? "",
  batchSize: Number(process.env.BATCH_SIZE ?? 25),
  maxFileSizeMb: Number(process.env.MAX_FILE_SIZE_MB ?? 5),
  aiConcurrency: Number(process.env.AI_CONCURRENCY ?? 3),
  // "openrouter"/"gemini"/"groq" are dev-only escape hatches; production defaults to direct Anthropic per spec.
  aiTransport: resolveAiTransport(),
  openrouterApiKey: process.env.OPENROUTER_API_KEY ?? "",
  openrouterModel: process.env.OPENROUTER_MODEL ?? "anthropic/claude-haiku-4.5",
  openrouterMaxTokens: Number(process.env.OPENROUTER_MAX_TOKENS ?? 3000),
  geminiApiKey: process.env.GEMINI_API_KEY ?? "",
  geminiModel: process.env.GEMINI_MODEL ?? "gemini-2.5-flash",
  geminiMaxTokens: Number(process.env.GEMINI_MAX_TOKENS ?? 8192),
  groqApiKey: process.env.GROQ_API_KEY ?? "",
  groqModel: process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile",
  groqMaxTokens: Number(process.env.GROQ_MAX_TOKENS ?? 8192),
};
