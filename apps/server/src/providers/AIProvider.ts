import { CrmRecord } from "../types/crm";

export interface AIProvider {
  extractBatch(rows: Record<string, unknown>[]): Promise<CrmRecord[]>;
}
