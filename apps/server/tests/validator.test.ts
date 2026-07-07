import { describe, expect, it } from "vitest";
import { sanitizeRecord } from "../src/services/validator.service";
import { CrmRecord } from "../src/types/crm";

function baseRecord(overrides: Partial<CrmRecord> = {}): CrmRecord {
  return {
    created_at: null,
    name: null,
    email: null,
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

describe("sanitizeRecord", () => {
  it("keeps a record with an email", () => {
    const { keep } = sanitizeRecord(baseRecord({ email: "a@b.com" }));
    expect(keep).toBe(true);
  });

  it("keeps a record with a mobile number", () => {
    const { keep } = sanitizeRecord(baseRecord({ mobile_without_country_code: "9876543210" }));
    expect(keep).toBe(true);
  });

  it("skips a record with neither email nor mobile", () => {
    const { keep, reason } = sanitizeRecord(baseRecord());
    expect(keep).toBe(false);
    expect(reason).toBe("No email or mobile number");
  });

  it("blanks an invalid crm_status instead of rejecting the record", () => {
    const { record } = sanitizeRecord(
      baseRecord({ email: "a@b.com", crm_status: "NOT_A_REAL_STATUS" as CrmRecord["crm_status"] })
    );
    expect(record.crm_status).toBe("");
  });

  it("blanks an invalid data_source", () => {
    const { record } = sanitizeRecord(
      baseRecord({ email: "a@b.com", data_source: "made_up_source" as CrmRecord["data_source"] })
    );
    expect(record.data_source).toBe("");
  });

  it("keeps a valid crm_status and data_source", () => {
    const { record } = sanitizeRecord(
      baseRecord({ email: "a@b.com", crm_status: "SALE_DONE", data_source: "eden_park" })
    );
    expect(record.crm_status).toBe("SALE_DONE");
    expect(record.data_source).toBe("eden_park");
  });

  it("nullifies an unparseable created_at date", () => {
    const { record } = sanitizeRecord(baseRecord({ email: "a@b.com", created_at: "not-a-date" }));
    expect(record.created_at).toBeNull();
  });

  it("keeps a valid ISO created_at date", () => {
    const { record } = sanitizeRecord(baseRecord({ email: "a@b.com", created_at: "2026-06-23T14:37:00Z" }));
    expect(record.created_at).toBe("2026-06-23T14:37:00Z");
  });

  it("replaces raw newlines in text fields with literal \\n", () => {
    const { record } = sanitizeRecord(baseRecord({ email: "a@b.com", crm_note: "line1\nline2\r\nline3" }));
    expect(record.crm_note).toBe("line1\\nline2\\nline3");
    expect(record.crm_note).not.toContain("\n");
  });
});
