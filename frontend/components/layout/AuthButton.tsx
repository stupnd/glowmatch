"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { AuthModal } from "@/components/auth/AuthModal";
import { cn } from "@/lib/utils";

export interface AuthButtonProps {
  className?: string;
}

export function AuthButton({ className }: AuthButtonProps) {
  const { user, loading } = useAuth();
  const [open, setOpen] = useState(false);

  if (loading) {
    return (
      <div
        className={cn(
          "h-10 w-24 animate-pulse rounded-full bg-mauve/30",
          className,
        )}
        aria-hidden
      />
    );
  }

  if (user) {
    const initial = (user.email?.[0] ?? "?").toUpperCase();
    return (
      <Link
        href="/profile"
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-full border-2 border-plum bg-blush font-display text-sm font-bold text-plum shadow-soft transition-transform hover:scale-105",
          className,
        )}
        title={user.email ?? "Profile"}
        aria-label="Open profile"
      >
        {initial}
      </Link>
    );
  }

  return (
    <>
      <button
        type="button"
        className={cn(
          "rounded-full border-2 border-plum bg-canvas px-5 py-2 font-sans text-sm font-semibold text-plum shadow-soft transition-colors hover:bg-blush",
          className,
        )}
        onClick={() => setOpen(true)}
      >
        Sign in
      </button>
      <AuthModal isOpen={open} onClose={() => setOpen(false)} />
    </>
  );
}
