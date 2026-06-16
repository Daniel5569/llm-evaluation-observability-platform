import type { EvalTestCase } from "@/lib/evaluation-types";
import { roundScore } from "@/lib/evaluation-engine";

export function Scorecard({ testCases }: { testCases: EvalTestCase[] }) {
  const metrics = Object.keys(testCases[0]?.candidateScores ?? {});

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {metrics.map((metric) => {
        const score = average(testCases.map((testCase) => testCase.candidateScores[metric] ?? 0));

        return (
          <div key={metric} className="panel p-3">
            <div className="label mb-2">{metric}</div>
            <div className="flex items-end justify-between gap-3">
              <span className="text-2xl font-semibold text-ink">{roundScore(score).toFixed(2)}</span>
              <span className="text-xs text-muted">candidate</span>
            </div>
            <div className="mt-3 h-1.5 rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-brand" style={{ width: `${Math.min(100, score * 100)}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((total, value) => total + value, 0) / values.length;
}
