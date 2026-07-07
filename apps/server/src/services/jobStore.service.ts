import { EventEmitter } from "events";
import { randomUUID } from "crypto";
import { CrmRecord, SkippedRow } from "../types/crm";

export type JobEvent =
  | { type: "progress"; message: string }
  | { type: "batch"; batchIndex: number; totalBatches: number; imported: CrmRecord[]; skipped: SkippedRow[] }
  | { type: "done"; totalImported: number; totalSkipped: number }
  | { type: "error"; message: string; status: number };

interface Job {
  id: string;
  emitter: EventEmitter;
  events: JobEvent[];
  finished: boolean;
}

const jobs = new Map<string, Job>();
const JOB_TTL_MS = 5 * 60_000;

export function createJob(): Job {
  const job: Job = { id: randomUUID(), emitter: new EventEmitter(), events: [], finished: false };
  job.emitter.setMaxListeners(0);
  jobs.set(job.id, job);
  setTimeout(() => jobs.delete(job.id), JOB_TTL_MS).unref();
  return job;
}

export function getJob(id: string): Job | undefined {
  return jobs.get(id);
}

export function emitJobEvent(job: Job, event: JobEvent): void {
  job.events.push(event);
  job.emitter.emit("event", event);
  if (event.type === "done" || event.type === "error") {
    job.finished = true;
  }
}
