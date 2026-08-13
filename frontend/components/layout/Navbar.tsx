"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { AuthButton } from "@/components/layout/AuthButton";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

const LINKS = [
  { href: "/match", label: "Shade match" },
  { href: "/quiz", label: "Skincare quiz" },
  { href: "/vanity", label: "My vanity" },
];

export function Navbar({ className }: { className?: string }) {
  const pathname = usePathname();

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 h-16",
        "border-b border-line bg-bg/85 backdrop-blur-md",
        className,
      )}
    >
      <nav
        aria-label="Main"
        className="mx-auto flex h-full max-w-6xl items-center gap-6 px-4 md:px-6"
      >
        <Link
          href="/"
          className="font-display text-heading font-semibold tracking-tight text-text"
        >
          Tinted<span className="text-accent">.</span>
        </Link>

        <ul className="flex min-w-0 items-center gap-1 overflow-x-auto">
          {LINKS.map((link) => {
            const active =
              link.href === "/"
                ? pathname === "/"
                : pathname.startsWith(link.href);
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  // aria-current is what actually tells a screen reader which
                  // page this is; the colour is only the visual half.
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "inline-flex min-h-11 items-center whitespace-nowrap rounded-pill px-3",
                    "text-small font-medium transition-colors duration-[--duration-fast]",
                    active
                      ? "bg-accent-dim text-accent"
                      : "text-text-soft hover:bg-raised hover:text-text",
                  )}
                >
                  {link.label}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="ml-auto flex items-center gap-3">
          <ThemeToggle />
          <AuthButton />
        </div>
      </nav>
    </header>
  );
}
