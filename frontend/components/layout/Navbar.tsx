import Link from "next/link";
import { cn } from "@/lib/utils";
import { AuthButton } from "@/components/layout/AuthButton";

export interface NavbarProps {
  className?: string;
}

export function Navbar({ className }: NavbarProps) {
  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 h-16 border-b border-mauve/25 bg-blush/95 backdrop-blur-md",
        className,
      )}
    >
      <nav className="relative mx-auto flex h-full max-w-6xl items-center px-6">
        <Link
          href="/"
          className="font-display text-2xl font-bold tracking-tight text-plum md:text-[1.65rem]"
        >
          Tinted.
        </Link>

        <div className="pointer-events-none absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 justify-center">
          <Link
            href="/lip-combo"
            className="pointer-events-auto rounded-full border border-plum/25 bg-canvas px-4 py-1.5 font-sans text-xs font-semibold uppercase tracking-[0.2em] text-plum shadow-soft transition-colors hover:border-plum hover:bg-blush md:text-sm md:tracking-[0.24em]"
          >
            lip combo ✦
          </Link>
        </div>

        <div className="ml-auto flex items-center gap-3">
          <AuthButton />
        </div>
      </nav>
    </header>
  );
}
