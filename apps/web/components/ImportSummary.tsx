import { Badge } from "./ui/Badge";

interface ImportSummaryProps {
  totalImported: number;
  totalSkipped: number;
}

export function ImportSummary({ totalImported, totalSkipped }: ImportSummaryProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Badge tone="success">{totalImported} imported</Badge>
      <Badge tone={totalSkipped > 0 ? "warning" : "neutral"}>{totalSkipped} skipped</Badge>
    </div>
  );
}
