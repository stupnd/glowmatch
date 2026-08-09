"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { UploadZone } from "@/components/upload/UploadZone";

export function LandingView() {
  return (
    <>
      <section className="relative overflow-hidden pb-20 pt-28 md:pb-28 md:pt-36">
        <div className="absolute inset-0 -z-10 gradient-bg opacity-[0.94]" />
        <div className="pointer-events-none absolute -left-24 top-24 h-72 w-72 rounded-full bg-flare/25 blur-3xl" />
        <div className="pointer-events-none absolute -right-16 bottom-16 h-80 w-80 rounded-full bg-plum/40 blur-3xl" />

        <div className="mx-auto max-w-6xl px-6">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: "easeOut" }}
            className="max-w-3xl"
          >
            <Badge tone="neutral" className="border-canvas/40 bg-canvas/15 text-canvas">
              Shade intelligence · lip lab · your rules
            </Badge>
            <h1 className="mt-6 font-display text-5xl font-bold leading-[1.05] tracking-tight text-canvas md:text-7xl md:leading-[1.02]">
              Turn every selfie into a power profile.
            </h1>
            <p className="mt-6 max-w-xl font-sans text-lg text-canvas/90 md:text-xl">
              Tinted reads your undertone and depth, then beams back editorial,
              color-forward picks — foundation to gloss — without the beige
              minimalism.
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <Button
                variant="accent"
                className="shadow-rose"
                onClick={() =>
                  document.getElementById("upload")?.scrollIntoView({
                    behavior: "smooth",
                  })
                }
              >
                Find my shade
              </Button>
              <Link
                href="/lip-combo"
                className="inline-flex items-center justify-center rounded-full border-2 border-canvas bg-transparent px-6 py-3 font-sans text-sm font-semibold tracking-wide text-canvas transition-colors hover:bg-canvas/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-canvas"
              >
                Build a lip combo
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="border-y border-mauve/25 bg-canvas py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-10 md:grid-cols-3">
            {[
              {
                title: "Face-forward CV",
                body: "Landmarks, undertone, Monk-scale storytelling — fast and loud.",
              },
              {
                title: "Living palette",
                body: "Match cards that feel like magazine pulls, not spreadsheets.",
              },
              {
                title: "Lip lab export",
                body: "Stack formulas, remix finishes, share like a moodboard.",
              },
            ].map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ delay: i * 0.08, duration: 0.4 }}
              >
                <Card className="card-hover h-full border-plum/10 bg-blush/40">
                  <p className="font-display text-2xl font-bold text-plum">
                    {item.title}
                  </p>
                  <p className="mt-3 font-sans text-sm leading-relaxed text-berry/75">
                    {item.body}
                  </p>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section id="upload" className="py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-12 max-w-2xl">
            <p className="font-display text-4xl font-bold text-plum md:text-5xl">
              Upload flow
            </p>
            <p className="mt-4 font-sans text-berry/75">
              Hook your analyzer here — drag a selfie, flip the camera, keep the
              glam lighting honest.
            </p>
          </div>
          <UploadZone />
        </div>
      </section>

      <section className="bg-plum py-20 text-canvas">
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-8 px-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="font-display text-4xl font-bold md:text-5xl">
              Ready when you are.
            </p>
            <p className="mt-3 max-w-xl font-sans text-canvas/80">
              Ship the backend, wire Supabase rows, and let Tinted headline your
              beauty OS.
            </p>
          </div>
          <Button variant="accent" className="shrink-0 shadow-rose">
            View roadmap
          </Button>
        </div>
      </section>
    </>
  );
}
