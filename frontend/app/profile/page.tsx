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
        <div className="h-12 w-48 animate-pulse rounded-card bg-blush" />
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
        <h1 className="mt-4 font-display text-5xl font-bold text-plum md:text-6xl">
          Your Tinted studio
        </h1>
        <p className="mt-4 max-w-2xl font-sans text-berry/75">
          Profile route placeholder — connect Supabase tables for shade history,
          lip decks, and inventory next.
        </p>
      </motion.div>

      <div className="mt-12 grid gap-6 md:grid-cols-2">
        <Card className="border-plum/15 shadow-soft">
          <p className="font-display text-2xl font-bold text-plum">Account</p>
          <p className="mt-3 font-sans text-sm text-berry/70 break-all">
            {user.email}
          </p>
        </Card>
        <Card className="gradient-bg border-none text-canvas shadow-plum">
          <p className="font-display text-2xl font-bold">Journal</p>
          <p className="mt-3 font-sans text-sm text-canvas/85">
            Recent analyses render here once wired to your backend.
          </p>
        </Card>
      </div>
    </div>
  );
}
