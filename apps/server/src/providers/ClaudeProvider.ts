import Anthropic from "@anthropic-ai/sdk";
import { CrmRecord } from "../types/crm";
import { AIProvider } from "./AIProvider";
import { parseCrmRecords } from "./parseCrmResponse";
import {
  buildCrmExtractionUserPrompt,
  CRM_EXTRACTION_RETRY_SUFFIX,
  CRM_EXTRACTION_SYSTEM_PROMPT,
} from "../prompts/crmExtraction.prompt";

export class RateLimitError extends Error {
  constructor(message: string, public retryAfterMs?: number) {
    super(message);
  }
}

function parseRetryAfterMs(response: Response, body: string): number | undefined {
  const header = response.headers.get("retry-after");
  if (header) {
    const seconds = Number(header);
    if (!Number.isNaN(seconds)) return seconds * 1000;
  }
  const match = body.match(/try again in ([\d.]+)s/i);
  if (match) return Number(match[1]) * 1000;
  return undefined;
}

const ANTHROPIC_MODEL = "claude-sonnet-4-6";
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const GEMINI_URL_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

type Transport = "anthropic" | "openrouter" | "gemini" | "groq";

interface ClaudeProviderConfig {
  /** "anthropic" (default, per assignment spec), or "openrouter" / "gemini" / "groq" (dev/testing swaps). */
  transport?: Transport;
  model?: string;
  maxTokens?: number;
}

export class ClaudeProvider implements AIProvider {
  private anthropicClient?: Anthropic;
  private transport: Transport;
  private apiKey: string;
  private model: string;
  private maxTokens: number;

  constructor(apiKey: string, config: ClaudeProviderConfig = {}) {
    this.apiKey = apiKey;
    this.transport = config.transport ?? "anthropic";
    this.model = config.model ?? this.defaultModel();
    this.maxTokens = config.maxTokens ?? 8192;
    if (this.transport === "anthropic") {
      this.anthropicClient = new Anthropic({ apiKey });
    }
  }

  private defaultModel(): string {
    if (this.transport === "openrouter") return "anthropic/claude-haiku-4.5";
    if (this.transport === "gemini") return "gemini-2.5-flash";
    if (this.transport === "groq") return "llama-3.3-70b-versatile";
    return ANTHROPIC_MODEL;
  }

  async extractBatch(rows: Record<string, unknown>[]): Promise<CrmRecord[]> {
    const userPrompt = buildCrmExtractionUserPrompt(rows);

    const firstAttempt = await this.callModel(userPrompt);
    try {
      return parseCrmRecords(firstAttempt);
    } catch {
      const retryAttempt = await this.callModel(userPrompt + CRM_EXTRACTION_RETRY_SUFFIX);
      return parseCrmRecords(retryAttempt);
    }
  }

  private async callModel(userPrompt: string): Promise<string> {
    if (this.transport === "openrouter") return this.callOpenAiCompatible(OPENROUTER_URL, "OpenRouter", userPrompt);
    if (this.transport === "groq") return this.callOpenAiCompatible(GROQ_URL, "Groq", userPrompt);
    if (this.transport === "gemini") return this.callGemini(userPrompt);
    return this.callAnthropic(userPrompt);
  }

  private async callAnthropic(userPrompt: string): Promise<string> {
    const response = await this.anthropicClient!.messages.create({
      model: this.model,
      max_tokens: this.maxTokens,
      system: CRM_EXTRACTION_SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    });

    const textBlock = response.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("Claude response did not contain a text block");
    }
    return textBlock.text;
  }

  private async callOpenAiCompatible(url: string, providerName: string, userPrompt: string): Promise<string> {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: this.maxTokens,
        messages: [
          { role: "system", content: CRM_EXTRACTION_SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      if (response.status === 429) {
        throw new RateLimitError(`${providerName} rate limited (429): ${body}`, parseRetryAfterMs(response, body));
      }
      throw new Error(`${providerName} request failed (${response.status}): ${body}`);
    }

    const json = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = json.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error(`${providerName} response did not contain message content`);
    }
    return content;
  }

  private async callGemini(userPrompt: string): Promise<string> {
    const url = `${GEMINI_URL_BASE}/${this.model}:generateContent?key=${this.apiKey}`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: CRM_EXTRACTION_SYSTEM_PROMPT }] },
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        generationConfig: { maxOutputTokens: this.maxTokens },
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Gemini request failed (${response.status}): ${body}`);
    }

    const json = (await response.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const content = json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("");
    if (!content) {
      throw new Error("Gemini response did not contain content");
    }
    return content;
  }
}
