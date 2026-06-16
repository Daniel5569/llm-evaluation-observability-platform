import type { EvalRun } from "@/lib/evaluation-types";

export function TrendChart({ runs }: { runs: EvalRun[] }) {
  const sorted = [...runs].sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
  const max = Math.max(...sorted.map((run) => run.weightedScore), 1);

  return (
    <div className="flex h-36 items-end gap-2 border-t border-line pt-4">
      {sorted.map((run) => (
        <div key={run.id} className="flex min-w-10 flex-1 flex-col items-center gap-2">
          <div className="flex h-24 w-full items-end rounded bg-slate-100">
            <div
              className="w-full rounded bg-brand transition-all"
              style={{ height: `${Math.max(8, (run.weightedScore / max) * 100)}%` }}
              title={`${run.id}: ${run.weightedScore}`}
            />
          </div>
          <span className="max-w-16 truncate text-[10px] text-muted">{run.promptVersion}</span>
        </div>
      ))}
    </div>
  );
}
