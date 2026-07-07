import { Request, Response } from "express";
import { parseCsv } from "../services/csvParser.service";
import { extractAllBatches, hasContactInfo } from "../services/aiExtractor.service";
import { resolveProviderConfig, buildProvider } from "../providers/resolveProvider";
import { HttpError } from "../middleware/error.middleware";
import { env } from "../config/env";
import { createJob, emitJobEvent, getJob } from "../services/jobStore.service";

export async function startImportJob(req: Request, res: Response): Promise<void> {
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

  const job = createJob();
  res.status(202).json({ jobId: job.id });

  const provider = buildProvider();

  let totalImported = 0;
  let totalSkipped = 0;

  extractAllBatches(
    provider,
    rows,
    env.batchSize,
    (message) => emitJobEvent(job, { type: "progress", message }),
    env.aiConcurrency,
    (completion) => {
      totalImported += completion.records.length;
      totalSkipped += completion.skipped.length;
      emitJobEvent(job, {
        type: "batch",
        batchIndex: completion.batchIndex,
        totalBatches: completion.totalBatches,
        imported: completion.records,
        skipped: completion.skipped,
      });
    }
  )
    .then(() => {
      if (totalImported === 0) {
        emitJobEvent(job, { type: "error", message: "No valid rows could be imported from this CSV", status: 422 });
        return;
      }
      emitJobEvent(job, { type: "done", totalImported, totalSkipped });
    })
    .catch((err) => {
      const message = err instanceof Error ? err.message : "Unknown AI provider error";
      emitJobEvent(job, { type: "error", message: `AI extraction failed: ${message}`, status: 500 });
    });
}

export function streamImportJob(req: Request, res: Response): void {
  const job = getJob(req.params.jobId);
  if (!job) {
    throw new HttpError(404, "Job not found or already finished");
  }

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  const send = (event: unknown) => {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  };

  for (const event of job.events) {
    send(event);
  }

  const onEvent = (event: unknown) => {
    send(event);
    const typed = event as { type: string };
    if (typed.type === "done" || typed.type === "error") {
      cleanup();
    }
  };

  function cleanup() {
    job!.emitter.off("event", onEvent);
    res.end();
  }

  if (job.finished) {
    cleanup();
    return;
  }

  job.emitter.on("event", onEvent);
  req.on("close", cleanup);
}
