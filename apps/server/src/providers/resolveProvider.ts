import { env } from "../config/env";
import { ClaudeProvider } from "./ClaudeProvider";

interface ProviderConfig {
  apiKey: string;
  missingVar: string;
  model?: string;
  maxTokens?: number;
}

export function resolveProviderConfig(): ProviderConfig {
  if (env.aiTransport === "openrouter") {
    return {
      apiKey: env.openrouterApiKey,
      missingVar: "OPENROUTER_API_KEY",
      model: env.openrouterModel,
      maxTokens: env.openrouterMaxTokens,
    };
  }
  if (env.aiTransport === "gemini") {
    return {
      apiKey: env.geminiApiKey,
      missingVar: "GEMINI_API_KEY",
      model: env.geminiModel,
      maxTokens: env.geminiMaxTokens,
    };
  }
  if (env.aiTransport === "groq") {
    return {
      apiKey: env.groqApiKey,
      missingVar: "GROQ_API_KEY",
      model: env.groqModel,
      maxTokens: env.groqMaxTokens,
    };
  }
  return { apiKey: env.anthropicApiKey, missingVar: "ANTHROPIC_API_KEY" };
}

export function buildProvider(): ClaudeProvider {
  const config = resolveProviderConfig();
  return new ClaudeProvider(config.apiKey, {
    transport: env.aiTransport,
    model: config.model,
    maxTokens: config.maxTokens,
  });
}
