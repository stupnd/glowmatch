import { type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: "accent" | "neutral" | "success" | "warn" | "danger";
}

const tones: Record<NonNullable<BadgeProps["tone"]>, string> = {
  accent: "border-accent/40 bg-accent-dim text-accent",
  neutral: "border-line-strong bg-raised text-text-soft",
  success: "border-success/40 bg-success/10 text-success",
  warn: "border-warn/40 bg-warn/10 text-warn",
  danger: "border-danger/40 bg-danger/10 text-danger",
};

export function Badge({
  className,
  tone = "accent",
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-pill border px-2.5 py-1",
        "text-label font-semibold uppercase",
        tones[tone],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
