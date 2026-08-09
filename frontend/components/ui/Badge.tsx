import { type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: "plum" | "flare" | "mauve" | "neutral";
}

const toneStyles: Record<
  NonNullable<BadgeProps["tone"]>,
  string
> = {
  plum: "border-plum/40 bg-plum/10 text-plum",
  flare: "border-flare/50 bg-flare/15 text-plum",
  mauve: "border-mauve/50 bg-blush text-berry",
  neutral: "border-berry/15 bg-canvas text-berry",
};

export function Badge({
  className,
  tone = "plum",
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wider",
        toneStyles[tone],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
