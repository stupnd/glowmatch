"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Tabs } from "@/components/ui/Tabs";

export interface ResultsScreenProps {
  className?: string;
}

const DEMO_TABS = [
  { id: "foundation", label: "Foundation" },
  { id: "lip", label: "Lip" },
  { id: "cheeks", label: "Cheeks" },
];

export function ResultsScreen({ className }: ResultsScreenProps) {
  const [tab, setTab] = useState("foundation");

  return (
    <motion.section
      className={className}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
    >
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-display text-4xl font-bold text-plum md:text-5xl">
            Your match deck
          </p>
          <p className="mt-2 max-w-xl font-sans text-berry/75">
            Placeholder results layout — wire this to your analysis API when
            ready.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge tone="plum">MST sample</Badge>
          <Badge tone="flare">Warm undertone</Badge>
        </div>
      </div>

      <Tabs tabs={DEMO_TABS} activeId={tab} onChange={setTab} className="mb-8" />

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="card-hover border-plum/15">
          <p className="font-display text-xl font-bold text-plum">
            Shade snapshot
          </p>
          <p className="mt-2 font-sans text-sm text-berry/70">
            Hex swatches, Monk band, and undertone chips render here.
          </p>
          <div className="mt-6 flex gap-3">
            <div className="h-14 w-14 rounded-full bg-plum shadow-plum ring-4 ring-blush" />
            <div className="h-14 w-14 rounded-full bg-flare shadow-rose ring-4 ring-blush" />
            <div className="h-14 w-14 rounded-full bg-mauve shadow-soft ring-4 ring-blush" />
          </div>
        </Card>

        <Card className="card-hover gradient-bg border-none text-canvas shadow-plum">
          <p className="font-display text-xl font-bold">AI picks</p>
          <p className="mt-2 font-sans text-sm text-canvas/85">
            Category:&nbsp;
            <span className="font-semibold capitalize">{tab}</span>
          </p>
          <ul className="mt-6 space-y-3 font-sans text-sm">
            <li className="rounded-card border border-canvas/25 bg-canvas/10 px-4 py-3 backdrop-blur-sm">
              Product cards + rationale stack goes here.
            </li>
            <li className="rounded-card border border-canvas/25 bg-canvas/10 px-4 py-3 backdrop-blur-sm">
              Tie-ins for budget tiers and brand diversity.
            </li>
          </ul>
        </Card>
      </div>
    </motion.section>
  );
}
