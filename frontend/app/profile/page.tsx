"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export default function ProfilePage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) router.replace("/");
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-6xl items-center justify-center px-6 py-24">
        <div className="h-12 w-48 animate-pulse rounded-card bg-surface" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-16 md:py-24">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Badge tone="accent">Signed in</Badge>
        <h1 className="mt-4 font-display text-title text-text md:text-display">
          Your Tinted studio
        </h1>
        <p className="mt-4 max-w-prose text-text-soft">
          Profile route placeholder — connect Supabase tables for shade history,
          lip decks, and inventory next.
        </p>
      </motion.div>

      <div className="mt-12 grid gap-6 md:grid-cols-2">
        <Card>
          <p className="text-heading font-semibold text-text">Account</p>
          <p className="mt-3 break-all text-small text-text-soft">
            {user.email}
          </p>
        </Card>
        <Card>
          <p className="text-heading font-semibold text-text">Journal</p>
          <p className="mt-3 text-small text-text-soft">
            Recent analyses render here once wired to your backend.
          </p>
        </Card>
      </div>
    </div>
  );
}
