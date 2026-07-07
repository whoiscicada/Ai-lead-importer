interface CsvPreviewTableProps {
  headers: string[];
  rows: Record<string, string>[];
}

export function CsvPreviewTable({ headers, rows }: CsvPreviewTableProps) {
  return (
    <div>
      <div className="mb-2 flex gap-4 text-sm text-zinc-600 dark:text-zinc-400">
        <span>{rows.length} rows</span>
        <span>{headers.length} columns</span>
      </div>
      <div className="max-h-[500px] overflow-auto rounded-md border border-zinc-200 dark:border-zinc-700">
        <div className="overflow-x-auto">
          <table className="w-full min-w-max text-left text-sm">
            <thead className="sticky top-0 bg-zinc-100 dark:bg-zinc-800">
              <tr>
                {headers.map((header) => (
                  <th key={header} className="whitespace-nowrap px-3 py-2 font-semibold text-zinc-700 dark:text-zinc-200">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr key={idx} className="border-t border-zinc-200 dark:border-zinc-700">
                  {headers.map((header) => (
                    <td key={header} className="whitespace-nowrap px-3 py-2 text-zinc-600 dark:text-zinc-300">
                      {row[header]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
