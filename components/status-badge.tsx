import clsx from "clsx";
import type { Recommendation, ReviewStatus, RunStatus, Severity } from "@/lib/evaluation-types";
import { titleCase } from "@/lib/formatters";

type BadgeTone = "green" | "amber" | "red" | "blue" | "gray";

const toneClasses: Record<BadgeTone, string> = {
  green: "border-emerald-200 bg-emerald-50 text-emerald-700",
  amber: "border-amber-200 bg-amber-50 text-amber-700",
  red: "border-rose-200 bg-rose-50 text-rose-700",
  blue: "border-sky-200 bg-sky-50 text-sky-700",
  gray: "border-slate-200 bg-slate-50 text-slate-600"
};

export function StatusBadge({
  value,
  tone
}: {
  value: ReviewStatus | RunStatus | Recommendation | Severity | string;
  tone?: BadgeTone;
}) {
  const resolvedTone = tone ?? toneFor(value);

  return (
    <span
      className={clsx(
        "inline-flex items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-semibold",
        toneClasses[resolvedTone]
      )}
    >
      {titleCase(value)}
    </span>
  );
}

function toneFor(value: string): BadgeTone {
  if (["passed", "approved", "ship", "low", "production"].includes(value)) return "green";
  if (["needs_review", "needs review", "medium", "review", "candidate", "ignored"].includes(value)) return "amber";
  if (["failed", "hold", "needs_fix", "high", "critical", "regression_detected"].includes(value)) return "red";
  return "gray";
}
