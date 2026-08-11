import { cn } from "@/lib/utils";

/**
 * Step progress for the quiz.
 *
 * The research is unambiguous that a visible finish line raises completion, and
 * that the count ("Step 2 of 7") does more work than the bar — so the count is
 * text, not a decoration, and the bar is aria-hidden because it would otherwise
 * announce the same thing twice.
 */
export function ProgressBar({
  current,
  total,
  className,
}: {
  current: number;
  total: number;
  className?: string;
}) {
  const clamped = Math.min(Math.max(current, 0), total);
  const percent = total > 0 ? (clamped / total) * 100 : 0;

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-baseline justify-between">
        <p className="text-label uppercase text-text-muted">
          Step {clamped} of {total}
        </p>
        <p className="text-label tabular-nums text-text-muted">
          {Math.round(percent)}%
        </p>
      </div>
      <div
        className="h-1 overflow-hidden rounded-pill bg-raised"
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-label="Quiz progress"
      >
        <div
          className="h-full rounded-pill bg-accent transition-[width] duration-(--duration-base) ease-(--ease-out-soft)"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
