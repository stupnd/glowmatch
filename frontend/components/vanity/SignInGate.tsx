"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { AuthModal } from "@/components/auth/AuthModal";
import { Button } from "@/components/ui/Button";
import { ToneRibbon } from "@/components/ui/ToneRibbon";

/**
 * Wraps anything that needs an account.
 *
 * States what signing in *buys* rather than demanding it. The shade match and
 * the quiz stay open to everyone — an account only exists to keep a vanity
 * between visits, so the gate appears at the point that becomes true and
 * nowhere earlier.
 */
export function SignInGate({
  title,
  reason,
  children,
}: {
  title: string;
  reason: string;
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const [open, setOpen] = useState(false);

  if (loading) {
    return (
      <div className="space-y-3" aria-busy="true">
        <div className="h-8 w-56 animate-pulse rounded-pill bg-raised" />
        <div className="h-40 animate-pulse rounded-card bg-raised" />
      </div>
    );
  }

  if (user) return <>{children}</>;

  return (
    <>
      <div className="overflow-hidden rounded-card border border-line bg-surface shadow-card">
        <ToneRibbon size="sm" className="rounded-none ring-0" />
        <div className="p-8 md:p-12">
          <h2 className="font-display text-display text-text">{title}</h2>
          <p className="mt-3 max-w-prose text-text-soft">{reason}</p>

          <ul className="mt-6 grid gap-3 sm:grid-cols-3">
            {[
              ["Keep what you own", "Every shade, in one place."],
              ["Build looks", "Group products into a routine you can repeat."],
              ["Share the cost", "Send a look to a friend, total included."],
            ].map(([heading, detail]) => (
              <li key={heading} className="rounded-card bg-raised p-4">
                <p className="font-medium text-text">{heading}</p>
                <p className="mt-1 text-small text-text-muted">{detail}</p>
              </li>
            ))}
          </ul>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button size="lg" onClick={() => setOpen(true)}>
              Sign in to start your vanity
            </Button>
            <span className="text-small text-text-muted">
              Free, and the shade match works without it.
            </span>
          </div>
        </div>
      </div>
      <AuthModal isOpen={open} onClose={() => setOpen(false)} />
    </>
  );
}
