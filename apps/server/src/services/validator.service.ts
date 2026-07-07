import { CRM_STATUS, CrmRecord, DATA_SOURCE } from "../types/crm";

const CRM_STATUS_SET = new Set<string>(CRM_STATUS);
const DATA_SOURCE_SET = new Set<string>(DATA_SOURCE);

function isValidDate(value: string | null): boolean {
  if (value === null) return true;
  return !Number.isNaN(new Date(value).getTime());
}

function hasContact(record: Pick<CrmRecord, "email" | "mobile_without_country_code">): boolean {
  return Boolean(record.email?.trim()) || Boolean(record.mobile_without_country_code?.trim());
}

function stripNewlines(value: string | null): string | null {
  if (value === null) return null;
  return value.replace(/\r\n|\r|\n/g, "\\n");
}

/**
 * Sanitizes a record returned by the AI: blanks invalid enums, strips raw
 * newlines from string fields, and reports whether the record should be
 * kept (has email or mobile) or skipped.
 */
export function sanitizeRecord(record: CrmRecord): { record: CrmRecord; keep: boolean; reason?: string } {
  const sanitized: CrmRecord = {
    ...record,
    crm_status: CRM_STATUS_SET.has(record.crm_status) ? record.crm_status : "",
    data_source: DATA_SOURCE_SET.has(record.data_source) ? record.data_source : "",
    created_at: isValidDate(record.created_at) ? record.created_at : null,
    name: stripNewlines(record.name),
    email: stripNewlines(record.email),
    company: stripNewlines(record.company),
    city: stripNewlines(record.city),
    state: stripNewlines(record.state),
    country: stripNewlines(record.country),
    lead_owner: stripNewlines(record.lead_owner),
    crm_note: stripNewlines(record.crm_note),
    possession_time: stripNewlines(record.possession_time),
    description: stripNewlines(record.description),
  };

  if (!hasContact(sanitized)) {
    return { record: sanitized, keep: false, reason: "No email or mobile number" };
  }

  return { record: sanitized, keep: true };
}
