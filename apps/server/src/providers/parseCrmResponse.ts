import { z } from "zod";
import { CRM_STATUS, CrmRecord, DATA_SOURCE } from "../types/crm";

const crmRecordSchema = z.object({
  created_at: z.string().nullable(),
  name: z.string().nullable(),
  email: z.string().nullable(),
  country_code: z.string().nullable(),
  mobile_without_country_code: z.string().nullable(),
  company: z.string().nullable(),
  city: z.string().nullable(),
  state: z.string().nullable(),
  country: z.string().nullable(),
  lead_owner: z.string().nullable(),
  crm_status: z.enum([...CRM_STATUS, ""] as [string, ...string[]]),
  crm_note: z.string().nullable(),
  data_source: z.enum([...DATA_SOURCE, ""] as [string, ...string[]]),
  possession_time: z.string().nullable(),
  description: z.string().nullable(),
});

const crmRecordArraySchema = z.array(crmRecordSchema);

function stripCodeFences(text: string): string {
  const trimmed = text.trim();
  const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  return fenceMatch ? fenceMatch[1] : trimmed;
}

export function parseCrmRecords(text: string): CrmRecord[] {
  const cleaned = stripCodeFences(text);
  const json = JSON.parse(cleaned);
  return crmRecordArraySchema.parse(json) as CrmRecord[];
}
