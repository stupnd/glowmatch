"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { Page } from "@/components/ui/Page";
import { Section } from "@/components/ui/Section";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { SignInGate } from "@/components/vanity/SignInGate";
import { InventoryGrid } from "@/components/vanity/InventoryGrid";
import { AddProduct } from "@/components/vanity/AddProduct";
import {
  deleteInventoryItem,
  formatCents,
  listInventory,
  listRoutines,
  totalCents,
  type InventoryItem,
  type Routine,
} from "@/lib/vanity";

export default function VanityPage() {
  return (
    <Page width="grid">
      <header className="mb-(--space-section)">
        <p className="text-label uppercase text-accent">Your vanity</p>
        <h1 className="mt-2 font-display text-display text-text">
          Everything you own, in one place.
        </h1>
        <p className="mt-3 max-w-prose text-text-soft">
          Add what&apos;s on your shelf, then group products into looks you can
          repeat — and share, with the cost worked out.
        </p>
      </header>

      <SignInGate
        title="Sign in to build your vanity"
        reason="Your shelf and your looks are saved to your account so they're there next time. Shade matching and the quiz stay free and account-free."
      >
        <VanityContent />
      </SignInGate>
    </Page>
  );
}

function VanityContent() {
  const { user } = useAuth();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    try {
      const [inventory, looks] = await Promise.all([listInventory(), listRoutines()]);
      setItems(inventory);
      setRoutines(looks);
      setState("ready");
    } catch (caught) {
      // Almost always the migration not having been run yet, so say that
      // rather than surfacing a raw Postgres error.
      setError(
        caught instanceof Error && /relation .* does not exist/i.test(caught.message)
          ? "The database tables don't exist yet. Run supabase/migrations/0001_inventory_and_routines.sql in your Supabase SQL editor."
          : "Couldn't load your vanity. Please try again.",
      );
      setState("error");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const shelf = useMemo(() => items.filter((i) => !i.is_finished), [items]);
  const { total, unpriced } = useMemo(() => totalCents(shelf), [shelf]);

  const byCategory = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of shelf) {
      const key = item.category ?? "uncategorised";
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [shelf]);

  if (state === "loading") {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4" aria-busy="true">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-52 animate-pulse rounded-card bg-raised" />
        ))}
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="rounded-card border border-danger/30 bg-danger/5 p-6" role="alert">
        <p className="font-medium text-text">Couldn&apos;t load your vanity</p>
        <p className="mt-2 text-small text-text-soft">{error}</p>
        <Button className="mt-4" variant="secondary" onClick={() => void load()}>
          Try again
        </Button>
      </div>
    );
  }

  return (
    <>
      {/* At-a-glance numbers, so the page opens with something other than text. */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Products", value: String(shelf.length) },
          { label: "Shelf value", value: formatCents(total) },
          { label: "Categories", value: String(byCategory.length) },
          { label: "Looks", value: String(routines.length) },
        ].map((stat) => (
          <div key={stat.label} className="rounded-card border border-line bg-surface p-4 shadow-card">
            <p className="text-label uppercase text-text-muted">{stat.label}</p>
            <p className="mt-1 font-display text-title text-text tabular-nums">
              {stat.value}
            </p>
          </div>
        ))}
      </div>
      {unpriced > 0 && (
        <p className="mt-2 text-small text-text-muted">
          {unpriced} {unpriced === 1 ? "item has" : "items have"} no price, so
          the shelf value is a floor rather than a total.
        </p>
      )}

      <Section
        id="shelf"
        title="Your shelf"
        aside={
          <Button size="sm" onClick={() => setAdding((open) => !open)}>
            {adding ? "Close" : "Add a product"}
          </Button>
        }
      >
        {adding && user && (
          <AddProduct
            userId={user.id}
            onAdded={(item) => {
              setItems((prev) => [item, ...prev]);
              setAdding(false);
            }}
          />
        )}

        {shelf.length === 0 && !adding ? (
          <div className="rounded-card border border-dashed border-line-strong bg-surface p-10 text-center">
            <p className="font-medium text-text">Your shelf is empty</p>
            <p className="mx-auto mt-2 max-w-prose text-small text-text-soft">
              Add the products you already own. Once a few are in, you can group
              them into looks.
            </p>
            <Button className="mt-5" onClick={() => setAdding(true)}>
              Add your first product
            </Button>
          </div>
        ) : (
          <>
            {byCategory.length > 0 && (
              <div className="mb-4 flex flex-wrap gap-2">
                {byCategory.map(([name, count]) => (
                  <Badge key={name} tone="neutral">
                    {name} {count}
                  </Badge>
                ))}
              </div>
            )}
            <InventoryGrid
              items={shelf}
              onDelete={async (item) => {
                setItems((prev) => prev.filter((i) => i.id !== item.id));
                try {
                  await deleteInventoryItem(item.id);
                } catch {
                  void load(); // put it back if the delete didn't stick
                }
              }}
            />
          </>
        )}
      </Section>

      <Section
        id="looks"
        title="Your looks"
        description="Group products from your shelf into a routine — for going out, for everyday — and share it with the cost worked out."
        aside={
          <Link
            href="/vanity/looks"
            className="text-small font-medium text-accent hover:underline"
          >
            Manage looks →
          </Link>
        }
      >
        {routines.length === 0 ? (
          <div className="rounded-card border border-dashed border-line-strong bg-surface p-8 text-center">
            <p className="text-small text-text-soft">
              {shelf.length === 0
                ? "Add a few products first, then build your first look."
                : "No looks yet."}
            </p>
            {shelf.length > 0 && (
              <Link href="/vanity/looks" className="mt-4 inline-block">
                <Button size="sm">Build a look</Button>
              </Link>
            )}
          </div>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {routines.map((routine) => (
              <li key={routine.id}>
                <Link
                  href={`/vanity/looks?id=${routine.id}`}
                  className="flex h-full flex-col rounded-card border border-line bg-surface p-5 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-lift"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-text">{routine.title}</p>
                    {routine.is_public && <Badge tone="success">Shared</Badge>}
                  </div>
                  {routine.occasion && (
                    <p className="mt-1 text-small text-text-muted">
                      {routine.occasion}
                    </p>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </>
  );
}
