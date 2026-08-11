"use client";

/**
 * Inventory and routines — "your vanity".
 *
 * Wraps Supabase so components never build queries inline, and so the
 * money handling lives in one place: prices are integer cents everywhere
 * (summing floats drifts), formatted only at the edge.
 */

import { createClient } from "@/lib/supabase";

export type InventoryItem = {
  id: string;
  brand: string;
  product: string;
  shade: string | null;
  category: string | null;
  hex: string | null;
  url: string | null;
  price_cents: number | null;
  currency: string;
  notes: string | null;
  is_finished: boolean;
  created_at: string;
};

export type Routine = {
  id: string;
  title: string;
  description: string | null;
  occasion: string | null;
  is_public: boolean;
  share_slug: string | null;
  created_at: string;
};

export type RoutineItem = {
  id: string;
  routine_id: string;
  inventory_item_id: string | null;
  step_order: number;
  note: string | null;
  /** Joined from inventory when reading your own routine. */
  inventory_items?: InventoryItem | null;
};

export type NewInventoryItem = Omit<
  InventoryItem,
  "id" | "created_at" | "currency" | "is_finished"
> & { currency?: string; is_finished?: boolean };

// ── Money ─────────────────────────────────────────────────────────────────────

/** "24.99" | "24,99" | "$24.99" → 2499. Returns null for anything unparseable. */
export function parsePriceToCents(input: string): number | null {
  const cleaned = input.replace(/[^0-9.,]/g, "").replace(",", ".");
  if (!cleaned) return null;
  const value = Number.parseFloat(cleaned);
  if (!Number.isFinite(value) || value < 0) return null;
  // Round rather than truncate: 19.999 should be 20.00, not 19.99.
  return Math.round(value * 100);
}

export function formatCents(cents: number | null, currency = "USD"): string {
  if (cents === null) return "—";
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    // Whole amounts read better without trailing zeroes in a list of many.
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

/** Total, plus how many items had no price — a total that silently ignores
 *  unpriced items is misleading. */
export function totalCents(items: { price_cents: number | null }[]): {
  total: number;
  unpriced: number;
} {
  return items.reduce(
    (acc, item) =>
      item.price_cents === null
        ? { ...acc, unpriced: acc.unpriced + 1 }
        : { ...acc, total: acc.total + item.price_cents },
    { total: 0, unpriced: 0 },
  );
}

// ── Inventory ─────────────────────────────────────────────────────────────────

export async function listInventory(): Promise<InventoryItem[]> {
  const { data, error } = await createClient()
    .from("inventory_items")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function addInventoryItem(
  item: NewInventoryItem,
  userId: string,
): Promise<InventoryItem> {
  const { data, error } = await createClient()
    .from("inventory_items")
    .insert({ ...item, user_id: userId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateInventoryItem(
  id: string,
  patch: Partial<NewInventoryItem>,
): Promise<void> {
  const { error } = await createClient()
    .from("inventory_items")
    .update(patch)
    .eq("id", id);
  if (error) throw error;
}

export async function deleteInventoryItem(id: string): Promise<void> {
  const { error } = await createClient()
    .from("inventory_items")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

// ── Routines ──────────────────────────────────────────────────────────────────

export async function listRoutines(): Promise<Routine[]> {
  const { data, error } = await createClient()
    .from("routines")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createRoutine(
  routine: { title: string; description?: string; occasion?: string },
  userId: string,
): Promise<Routine> {
  const { data, error } = await createClient()
    .from("routines")
    .insert({ ...routine, user_id: userId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getRoutineWithItems(
  id: string,
): Promise<{ routine: Routine; items: RoutineItem[] }> {
  const supabase = createClient();
  const [routineResult, itemsResult] = await Promise.all([
    supabase.from("routines").select("*").eq("id", id).single(),
    supabase
      .from("routine_items")
      .select("*, inventory_items(*)")
      .eq("routine_id", id)
      .order("step_order"),
  ]);
  if (routineResult.error) throw routineResult.error;
  if (itemsResult.error) throw itemsResult.error;
  return { routine: routineResult.data, items: itemsResult.data ?? [] };
}

export async function addItemToRoutine(
  routineId: string,
  inventoryItemId: string,
  stepOrder: number,
): Promise<void> {
  const { error } = await createClient().from("routine_items").insert({
    routine_id: routineId,
    inventory_item_id: inventoryItemId,
    step_order: stepOrder,
  });
  if (error) throw error;
}

export async function removeRoutineItem(id: string): Promise<void> {
  const { error } = await createClient()
    .from("routine_items")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

export async function setRoutineVisibility(
  id: string,
  isPublic: boolean,
): Promise<void> {
  const { error } = await createClient()
    .from("routines")
    .update({ is_public: isPublic })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteRoutine(id: string): Promise<void> {
  const { error } = await createClient().from("routines").delete().eq("id", id);
  if (error) throw error;
}

// ── Public share ──────────────────────────────────────────────────────────────

export type SharedItem = {
  step_order: number;
  note: string | null;
  brand: string | null;
  product: string | null;
  shade: string | null;
  category: string | null;
  hex: string | null;
  url: string | null;
  price_cents: number | null;
  currency: string | null;
};

/**
 * Reads a published routine by slug. Uses the shared_routine_items view, which
 * exposes only the columns a shared look needs — never the owner's wider
 * inventory, notes or purchase history.
 */
export async function getSharedRoutine(
  slug: string,
): Promise<{ routine: Routine; items: SharedItem[] } | null> {
  const supabase = createClient();
  const { data: routine } = await supabase
    .from("routines")
    .select("*")
    .eq("share_slug", slug)
    .eq("is_public", true)
    .maybeSingle();
  if (!routine) return null;

  const { data: items } = await supabase
    .from("shared_routine_items")
    .select("*")
    .eq("routine_id", routine.id)
    .order("step_order");

  return { routine, items: items ?? [] };
}
