import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "accent" | "ghost";
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", type = "button", ...props }, ref) => {
    const base =
      "inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-semibold tracking-wide transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-40";

    const variants: Record<NonNullable<ButtonProps["variant"]>, string> = {
      primary:
        "bg-plum text-canvas shadow-plum hover:bg-plum-dark focus-visible:outline-plum",
      accent:
        "bg-flare text-canvas shadow-rose hover:bg-flare-dark focus-visible:outline-flare",
      ghost:
        "border-2 border-plum bg-transparent text-plum hover:bg-blush focus-visible:outline-plum",
    };

    return (
      <button
        ref={ref}
        type={type}
        className={cn(base, variants[variant], className)}
        {...props}
      />
    );
  },
);

Button.displayName = "Button";
