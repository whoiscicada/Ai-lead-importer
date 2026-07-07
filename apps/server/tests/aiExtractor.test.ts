import { describe, expect, it, vi } from "vitest";
import { extractAllBatches } from "../src/services/aiExtractor.service";
import { AIProvider } from "../src/providers/AIProvider";
import { CrmRecord } from "../src/types/crm";

function fakeRecord(overrides: Partial<CrmRecord> = {}): CrmRecord {
  return {
    created_at: null,
    name: "Jane",
    email: "jane@example.com",
    country_code: null,
    mobile_without_country_code: null,
    company: null,
    city: null,
    state: null,
    country: null,
    lead_owner: null,
    crm_status: "",
    crm_note: null,
    data_source: "",
    possession_time: null,
    description: null,
    ...overrides,
  };
}

describe("extractAllBatches", () => {
  it("returns imported records for a successful batch", async () => {
    const provider: AIProvider = {
      extractBatch: vi.fn().mockResolvedValue([fakeRecord()]),
    };

    const rows = [{ Email: "jane@example.com", Name: "Jane" }];
    const result = await extractAllBatches(provider, rows, 25);

    expect(result.imported).toHaveLength(1);
    expect(result.skipped).toHaveLength(0);
  });

  it("marks all rows in a batch as 'AI extraction failed' after exhausting retries", async () => {
    const provider: AIProvider = {
      extractBatch: vi.fn().mockRejectedValue(new Error("upstream error")),
    };

    const rows = [
      { Email: "a@example.com" },
      { Email: "b@example.com" },
    ];
    const result = await extractAllBatches(provider, rows, 25);

    expect(result.imported).toHaveLength(0);
    expect(result.skipped).toHaveLength(2);
    expect(result.skipped.every((s) => s.reason === "AI extraction failed")).toBe(true);
    expect(provider.extractBatch).toHaveBeenCalledTimes(3);
  });

  it("skips rows the model silently dropped as 'AI omitted row'", async () => {
    const provider: AIProvider = {
      extractBatch: vi.fn().mockResolvedValue([fakeRecord({ email: "a@example.com" })]),
    };

    const rows = [{ Email: "a@example.com" }, { Email: "b@example.com" }];
    const result = await extractAllBatches(provider, rows, 25);

    expect(result.imported).toHaveLength(1);
    expect(result.skipped).toHaveLength(1);
    expect(result.skipped[0].reason).toBe("AI omitted row");
  });

  it("skips rows with no contact info without calling them AI failures", async () => {
    const provider: AIProvider = {
      extractBatch: vi.fn().mockResolvedValue([]),
    };

    const rows = [{ Name: "No Contact" }];
    const result = await extractAllBatches(provider, rows, 25);

    expect(result.imported).toHaveLength(0);
    expect(result.skipped).toHaveLength(1);
    expect(result.skipped[0].reason).toBe("No email or mobile number");
  });
});

describe("ClaudeProvider response parsing", () => {
  it("strips markdown code fences before JSON.parse", async () => {
    vi.resetModules();
    const createMock = vi.fn().mockResolvedValue({
      content: [{ type: "text", text: "```json\n[]\n```" }],
    });
    vi.doMock("@anthropic-ai/sdk", () => ({
      default: class {
        messages = { create: createMock };
      },
    }));

    const { ClaudeProvider } = await import("../src/providers/ClaudeProvider");
    const provider = new ClaudeProvider("fake-key");
    const result = await provider.extractBatch([{ Email: "a@example.com" }]);

    expect(result).toEqual([]);
    expect(createMock).toHaveBeenCalledTimes(1);
    vi.doUnmock("@anthropic-ai/sdk");
  });

  it("retries once with a stricter prompt when the first response fails to parse", async () => {
    vi.resetModules();
    const createMock = vi
      .fn()
      .mockResolvedValueOnce({ content: [{ type: "text", text: "not json at all" }] })
      .mockResolvedValueOnce({ content: [{ type: "text", text: "[]" }] });
    vi.doMock("@anthropic-ai/sdk", () => ({
      default: class {
        messages = { create: createMock };
      },
    }));

    const { ClaudeProvider } = await import("../src/providers/ClaudeProvider");
    const provider = new ClaudeProvider("fake-key");
    const result = await provider.extractBatch([{ Email: "a@example.com" }]);

    expect(result).toEqual([]);
    expect(createMock).toHaveBeenCalledTimes(2);
    vi.doUnmock("@anthropic-ai/sdk");
  });
});
