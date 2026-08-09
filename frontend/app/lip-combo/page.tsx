import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export default function LipComboPage() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-16 md:py-24">
      <div className="relative overflow-hidden rounded-card border border-plum/15 bg-blush/60 p-10 shadow-plum md:p-14">
        <div className="absolute -right-10 top-8 h-56 w-56 rounded-full bg-flare/35 blur-3xl" />
        <div className="absolute -left-16 bottom-0 h-48 w-48 rounded-full bg-plum/25 blur-3xl" />

        <div className="relative max-w-2xl">
          <p className="font-display text-5xl font-bold text-plum md:text-6xl">
            Lip combo lab
          </p>
          <p className="mt-5 font-sans text-lg text-berry/80">
            Stack bullets, glosses, and liners — this route is scaffolded for your
            canvas builder and export pipeline.
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <Button variant="primary">Start mixing</Button>
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-full border-2 border-plum bg-transparent px-6 py-3 font-sans text-sm font-semibold tracking-wide text-plum transition-colors hover:bg-blush focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum"
            >
              Back home
            </Link>
          </div>
        </div>
      </div>

      <div className="mt-12 grid gap-6 md:grid-cols-3">
        <Card>
          <p className="font-display text-xl font-bold text-plum">Deck builder</p>
          <p className="mt-2 font-sans text-sm text-berry/70">
            Drag-and-drop tiles + labels land here.
          </p>
        </Card>
        <Card>
          <p className="font-display text-xl font-bold text-plum">Brand pulls</p>
          <p className="mt-2 font-sans text-sm text-berry/70">
            Tie into search or curated SKU lists.
          </p>
        </Card>
        <Card>
          <p className="font-display text-xl font-bold text-plum">Share cards</p>
          <p className="mt-2 font-sans text-sm text-berry/70">
            Export-ready frames with Tinted gradients.
          </p>
        </Card>
      </div>
    </div>
  );
}
