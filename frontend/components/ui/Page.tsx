import { cn } from "@/lib/utils";

/**
 * Standard page container.
 *
 * Every route was setting its own max-width and vertical padding, so moving
 * between them shifted the left margin and the distance from the nav. Three
 * widths, chosen by content rather than by whoever wrote the page:
 *
 *   prose  — one column of reading or a single question
 *   list   — stacked cards, e.g. a routine
 *   grid   — multi-column product grids
 */
const widths = {
  prose: "max-w-2xl",
  list: "max-w-3xl",
  grid: "max-w-5xl",
} as const;

export function Page({
  width = "grid",
  children,
  className,
}: {
  width?: keyof typeof widths;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mx-auto px-4 pb-24 pt-10 md:px-6 md:pt-14",
        widths[width],
        className,
      )}
    >
      {children}
    </div>
  );
}
