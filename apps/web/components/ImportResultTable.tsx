"use client";

import { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { CRM_FIELDS, CrmRecord } from "@/types/crm";

const VIRTUALIZE_THRESHOLD = 500;
const ROW_HEIGHT = 36;

interface ImportResultTableProps {
  records: CrmRecord[];
}

function cellValue(record: CrmRecord, field: keyof CrmRecord): string {
  const value = record[field];
  return value === null || value === undefined || value === "" ? "—" : String(value);
}

function HeaderRow() {
  return (
    <tr>
      {CRM_FIELDS.map((field) => (
        <th key={field} className="whitespace-nowrap px-3 py-2 font-semibold text-zinc-700 dark:text-zinc-200">
          {field}
        </th>
      ))}
    </tr>
  );
}

function DataRow({ record }: { record: CrmRecord }) {
  return (
    <tr className="border-t border-zinc-200 dark:border-zinc-700">
      {CRM_FIELDS.map((field) => (
        <td key={field} className="whitespace-nowrap px-3 py-2 text-zinc-600 dark:text-zinc-300">
          {cellValue(record, field)}
        </td>
      ))}
    </tr>
  );
}

function PlainTable({ records }: { records: CrmRecord[] }) {
  return (
    <div className="max-h-[600px] overflow-auto rounded-md border border-zinc-200 dark:border-zinc-700">
      <div className="overflow-x-auto">
        <table className="w-full min-w-max text-left text-sm">
          <thead className="sticky top-0 bg-zinc-100 dark:bg-zinc-800">
            <HeaderRow />
          </thead>
          <tbody>
            {records.map((record, idx) => (
              <DataRow key={idx} record={record} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function VirtualizedTable({ records }: { records: CrmRecord[] }) {
  const parentRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: records.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 10,
  });

  return (
    <div ref={parentRef} className="max-h-[600px] overflow-auto rounded-md border border-zinc-200 dark:border-zinc-700">
      <div className="overflow-x-auto">
        <table className="w-full min-w-max text-left text-sm">
          <thead className="sticky top-0 z-10 bg-zinc-100 dark:bg-zinc-800">
            <HeaderRow />
          </thead>
          <tbody style={{ display: "block", height: virtualizer.getTotalSize(), position: "relative" }}>
            {virtualizer.getVirtualItems().map((virtualRow) => (
              <tr
                key={virtualRow.index}
                className="absolute left-0 top-0 flex w-full border-t border-zinc-200 dark:border-zinc-700"
                style={{ transform: `translateY(${virtualRow.start}px)`, height: virtualRow.size }}
              >
                {CRM_FIELDS.map((field) => (
                  <td key={field} className="flex-1 whitespace-nowrap px-3 py-2 text-zinc-600 dark:text-zinc-300">
                    {cellValue(records[virtualRow.index], field)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function ImportResultTable({ records }: ImportResultTableProps) {
  if (records.length === 0) {
    return <p className="text-sm text-zinc-500 dark:text-zinc-400">No imported records to display.</p>;
  }
  return records.length > VIRTUALIZE_THRESHOLD ? (
    <VirtualizedTable records={records} />
  ) : (
    <PlainTable records={records} />
  );
}
