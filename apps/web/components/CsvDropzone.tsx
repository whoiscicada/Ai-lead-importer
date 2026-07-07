"use client";

import { useRef, useState } from "react";

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

interface CsvDropzoneProps {
  onFileSelected: (file: File) => void;
  disabled?: boolean;
}

export function CsvDropzone({ onFileSelected, disabled }: CsvDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function validateAndEmit(file: File) {
    setError(null);
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setError("Only .csv files are supported.");
      return;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setError("File exceeds the 5MB size limit.");
      return;
    }
    onFileSelected(file);
  }

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          if (disabled) return;
          const file = e.dataTransfer.files?.[0];
          if (file) validateAndEmit(file);
        }}
        onClick={() => !disabled && inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
        }}
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-10 text-center transition-colors ${
          isDragging
            ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30"
            : "border-zinc-300 dark:border-zinc-700"
        } ${disabled ? "pointer-events-none opacity-50" : ""}`}
      >
        <p className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
          Drag &amp; drop a CSV file here, or click to browse
        </p>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">.csv files only, up to 5MB</p>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          disabled={disabled}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) validateAndEmit(file);
            e.target.value = "";
          }}
        />
      </div>
      {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
