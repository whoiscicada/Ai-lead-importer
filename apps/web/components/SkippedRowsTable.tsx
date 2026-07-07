"use client";

import { useState } from "react";
import { SkippedRow } from "@/types/crm";

export function SkippedRowsTable({ skipped }: { skipped: SkippedRow[] }) {
  const [isOpen, setIsOpen] = useState(false);

  if (skipped.length === 0) return null;

  return (
    <div className="rounded-md border border-zinc-200 dark:border-zinc-700">
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium text-zinc-700 dark:text-zinc-200"
      >
        <span>Skipped rows ({skipped.length})</span>
        <span>{isOpen ? "▲" : "▼"}</span>
      </button>
      {isOpen && (
        <div className="max-h-[400px] overflow-auto border-t border-zinc-200 dark:border-zinc-700">
          <div className="overflow-x-auto">
            <table className="w-full min-w-max text-left text-sm">
              <thead className="sticky top-0 bg-zinc-100 dark:bg-zinc-800">
                <tr>
                  <th className="px-3 py-2 font-semibold text-zinc-700 dark:text-zinc-200">Reason</th>
                  <th className="px-3 py-2 font-semibold text-zinc-700 dark:text-zinc-200">Row data</th>
                </tr>
              </thead>
              <tbody>
                {skipped.map((item, idx) => (
                  <tr key={idx} className="border-t border-zinc-200 dark:border-zinc-700 align-top">
                    <td className="whitespace-nowrap px-3 py-2 text-red-600 dark:text-red-400">{item.reason}</td>
                    <td className="px-3 py-2 font-mono text-xs text-zinc-600 dark:text-zinc-300">
                      {JSON.stringify(item.row)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
