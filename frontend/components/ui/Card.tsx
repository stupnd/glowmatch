import { type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  elevated?: boolean;
}

export function Card({
  className,
  elevated = true,
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        "rounded-card border border-mauve/30 bg-canvas p-6 md:p-8",
        elevated && "shadow-soft",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
