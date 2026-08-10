import { type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Sits one level above the page — the default. */
  raised?: boolean;
  /** Adds hover lift. Only for cards that are actually clickable. */
  interactive?: boolean;
  padding?: "none" | "sm" | "md" | "lg";
}

const paddings: Record<NonNullable<CardProps["padding"]>, string> = {
  none: "",
  sm: "p-4",
  md: "p-5 md:p-6",
  lg: "p-6 md:p-8",
};

export function Card({
  className,
  raised = true,
  interactive = false,
  padding = "md",
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        "rounded-card border border-line",
        raised ? "bg-surface shadow-card" : "bg-transparent",
        paddings[padding],
        interactive &&
          "transition-all duration-[--duration-base] ease-[--ease-out-soft] " +
            "hover:border-line-strong hover:shadow-lift hover:-translate-y-0.5",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

/** Eyebrow + title pair used at the top of most cards and sections. */
export function CardHeader({
  label,
  title,
  action,
  className,
}: {
  label?: string;
  title: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-4 flex items-start justify-between gap-4", className)}>
      <div>
        {label && (
          <p className="text-label uppercase text-accent">{label}</p>
        )}
        <h2 className="text-heading font-semibold text-text">{title}</h2>
      </div>
      {action}
    </div>
  );
}
