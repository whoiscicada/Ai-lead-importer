"use client";

import { useState } from "react";
import { CsvDropzone } from "@/components/CsvDropzone";
import { CsvPreviewTable } from "@/components/CsvPreviewTable";
import { ImportSummary } from "@/components/ImportSummary";
import { ImportResultTable } from "@/components/ImportResultTable";
import { SkippedRowsTable } from "@/components/SkippedRowsTable";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { parseCsvPreview, ParsedCsv, downloadImportedCsv, downloadSkippedCsv } from "@/lib/csv";
import { importCsvFile } from "@/lib/api";
import { ImportResult } from "@/types/crm";

type Stage = "upload" | "preview" | "importing" | "results";

export default function Home() {
  const [stage, setStage] = useState<Stage>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ParsedCsv | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  async function handleFileSelected(selected: File) {
    setFile(selected);
    setParseError(null);
    try {
      const parsed = await parseCsvPreview(selected);
      setPreview(parsed);
      setStage("preview");
    } catch (err) {
      setParseError(err instanceof Error ? err.message : "Could not parse this CSV file.");
    }
  }

  async function handleConfirmImport() {
    if (!file) return;
    setStage("importing");
    setError(null);
    try {
      const importResult = await importCsvFile(file);
      setResult(importResult);
      setStage("results");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed. Please try again.");
      setStage("preview");
    }
  }

  function handleReset() {
    setStage("upload");
    setFile(null);
    setPreview(null);
    setResult(null);
    setError(null);
    setParseError(null);
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            GrowEasy CSV Importer
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Upload any CRM lead CSV — AI maps it to the GrowEasy schema.
          </p>
        </div>
        <ThemeToggle />
      </div>

      {stage === "upload" && <CsvDropzone onFileSelected={handleFileSelected} />}

      {parseError && (
        <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300">
          {parseError}
        </div>
      )}

      {stage === "preview" && preview && (
        <div className="flex flex-col gap-4">
          <CsvPreviewTable headers={preview.headers} rows={preview.rows} />
          {error && (
            <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300">
              {error}
            </div>
          )}
          <div className="flex gap-3">
            <Button onClick={handleConfirmImport}>Confirm Import</Button>
            <Button variant="secondary" onClick={handleReset}>
              Choose a different file
            </Button>
          </div>
        </div>
      )}

      {stage === "importing" && (
        <div className="flex flex-col items-center gap-3 py-16 text-zinc-600 dark:text-zinc-300">
          <Spinner className="h-8 w-8" />
          <p className="text-sm">AI is mapping your CSV to the CRM schema…</p>
        </div>
      )}

      {stage === "results" && result && (
        <div className="flex flex-col gap-6">
          <ImportSummary totalImported={result.totalImported} totalSkipped={result.totalSkipped} />
          <ImportResultTable records={result.imported} />
          <SkippedRowsTable skipped={result.skipped} />
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => downloadImportedCsv(result.imported)} disabled={result.imported.length === 0}>
              Download imported CSV
            </Button>
            <Button
              variant="secondary"
              onClick={() => downloadSkippedCsv(result.skipped)}
              disabled={result.skipped.length === 0}
            >
              Download skipped CSV
            </Button>
            <Button variant="secondary" onClick={handleReset}>
              Import another file
            </Button>
          </div>
        </div>
      )}
    </main>
  );
}
