# Frontend research — what the beauty-tech industry actually does

Research notes gathered before the GlowMatch frontend rework. Everything below
is here to justify a specific product decision; where a finding did not change
what we build, it is not recorded.

Sources are listed at the bottom.

---

## 1. The category we are in

Shade matching is a real product category, not a novelty. Vendors (Perfect
Corp, ModiFace, Revieve, Orbo AI, PulpoAR, Arbelle) sell this as infrastructure
to brands, and the brands report meaningfully higher conversion and fewer
returns after deploying it. Il Makiage's PowerMatch is the reference
implementation people compare against: ~90% self-reported match accuracy,
trained across 700+ skin-tone combinations, mapped onto a 50-shade catalogue.

Three input methods exist in the market, and the strongest tools combine them:

| Method | Strength | Weakness |
|---|---|---|
| Selfie / live camera | Objective colour data | Lighting and camera variance |
| Quiz | Works with no camera, no lighting risk | Self-report bias |
| "Match my current foundation" | Anchors to a known good | Requires the user to own one |

**Decision:** GlowMatch already does selfie + live camera. We add the quiz as a
first-class, equal-status path — not a fallback — because it removes the two
things that make people bounce: needing good light, and needing to be
comfortable uploading their face.

## 2. Quiz structure

The playbook literature converges on three quiz archetypes:

1. **Skin-type classifier → routine builder.** 7–10 questions, outputs a 3–5
   step routine in application order. Fits wide catalogues.
2. **Concern-based recommender.** 5–7 questions, surfaces one or two hero
   products. Fits brands known for solving a specific problem.
3. **Lifestyle / personality quiz.** 8–12 questions, outputs a "skin
   personality" plus a curated collection. Fits identity-driven DTC brands.

**Decision:** archetype 1 for the skincare quiz. GlowMatch's value is breadth of
recommendation, and a routine in application order is a more useful artifact
than a single hero product.

The canonical question set, in this order:

1. Skin type — oily / dry / combination / sensitive / normal
2. Top concerns — **multi-select**: acne, dehydration, fine lines, dark spots,
   redness, dullness, texture
3. Current routine depth — none / minimal / moderate / advanced
4. Sun habits — daily SPF / occasional / rarely
5. Age band — under 25 / 25–35 / 35–50 / 50+
6. Ingredient experience — retinol, AHAs, niacinamide
7. Goal timeline — quick wins vs. long-term

**Scoring:** weighted tag scoring, *not* an if/else tree. Assign points to
product tags (`hydrating`, `brightening`, `exfoliating`, `gentle`, …) and take
the top scorer per routine slot. This matters: an if/else tree becomes
unmaintainable at question 5 and cannot express "two concerns that both point
at niacinamide."

**Results:** show recommendations in application order, each with a
one-sentence *"We picked this because you said…"*. This is the single most
copied pattern in the category and it is cheap to implement.

## 3. Trust patterns

The recurring theme across the trust literature is that beauty shoppers are
buying under uncertainty, and the UX job is to reduce it honestly.

- **Explain the match.** Never output a bare shade name. Say what was detected
  and why it led here. We already have Claude-generated reasoning — surface it
  prominently rather than burying it.
- **Show the product.** Price, real photography, and ingredients are the
  essentials on any beauty product surface. Our current cards are text-only,
  which reads as unfinished. *(This is the "photos in the description" ask.)*
- **Show diversity in imagery.** Brands that show a product across multiple
  skin tones outperform those showing one model.
- **Surface uncertainty rather than hiding it.** Confidence is a feature. If
  the quality gate or the classifier is unsure, saying so builds more trust
  than a falsely confident single answer — and it justifies showing a *range*
  of shades, which is what we already do.
- **Mixed reviews beat perfect reviews.** Showing negative alongside positive
  reads as credible. Glossier lets users filter reviews by similar complexion.
- **Complementary products / routines** reduce purchase uncertainty (Kiehl's).

**Anti-pattern we are explicitly not copying:** Il Makiage gates the result
behind an email capture. It is effective as a CRM tactic and it is hostile.
GlowMatch shows results immediately; saving to a profile is the optional
upgrade.

## 4. Quiz interaction mechanics

- **Progress must be visible.** Progress trackers measurably reduce dropout;
  users finish more when they can see the finish line. Use a compact
  "Step 2 of 7" plus a thin fill bar.
- **One question per screen** improves focus, with a real caveat: it costs more
  navigation, and on mobile it can *worsen* completion if each step is a page
  load. **Decision:** one question per screen, but client-side state with no
  navigation — instant transitions, no round trip.
- **Back must always work,** and answers must persist when going back.

## 5. Product cards

- **Consistent aspect ratio** across cards prevents layout shift and makes the
  grid read as a grid. 1:1 is the most versatile; 3:4 suits bottles.
- **Price at 16–18px, semi-bold**, visible without scrolling.
- **Colour as a swatch, not a word.** Visual variant cues beat text labels.
- Card images should be small (target <50KB, WebP) and lazy-loaded below fold.

## 6. Accessibility floor (WCAG 2.2)

Non-negotiable for this rework:

- Text/background contrast ≥ 4.5:1 (≥ 3:1 for large text). **Our current
  palette needs auditing** — `mauve #C9A0B4` and `flare #E8829A` are both too
  light to carry body text on `canvas #FDFAFA`.
- Variant selectors ≥ 24×24px; touch targets ≥ 44px.
- Descriptive `alt` on every product image — never a filename, never empty for
  a meaningful image.
- ARIA labels on icon-only controls (save/heart buttons).
- Never encode meaning in colour alone — a shade swatch needs its name in text
  next to it.
- Respect `prefers-reduced-motion`. We use framer-motion heavily.

## 7. UI principles applied to this rework

The general heuristics that shaped the layout decisions:

- **Recognition over recall** — show swatches and photos, don't make people
  hold a shade code in their head between screens.
- **Visibility of system status** — the analysis pipeline (quality gate →
  detection → classification → matching) takes real time; narrate the stage
  instead of showing a generic spinner.
- **Progressive disclosure** — lead with the top match, let depth (undertone
  reasoning, full shade range, Monk scale) expand on demand.
- **Error prevention over error messages** — the quality gate should coach
  before capture ("move toward a window"), not reject after.
- **User control** — every automated result needs a manual override. If we call
  someone MST-6 and they disagree, they must be able to say so.

---

## Sources

- [Best foundation shade finder technology 2026 — Arbelle](https://arbelle.ai/best-foundation-shade-finder-technology/)
- [What are the best foundation shade matching technologies in 2026? — Cosmetics Business](https://cosmeticsbusiness.com/what-are-the-best-foundation-shade-matching-technologies)
- [IL MAKIAGE PowerMatch](https://www.ilmakiage.com/powermatch-me)
- [IL MAKIAGE launches PowerMatch algorithm — PR Newswire](https://www.prnewswire.com/news-releases/il-makiage-launches-powermatch-algorithm-to-identify-the-perfect-shade-of-foundation-without-seeing-your-face-300808785.html)
- [The IL MAKIAGE Playbook — Beauty MarketingIQ](https://beautymarketingiq.substack.com/p/the-il-makiage-playbook)
- [Skincare quiz for brands: the build playbook — involve.me](https://www.involve.me/blog/quiz-for-skincare-brands)
- [Curology's customized skincare signup flow — GoodUX](https://goodux.appcues.com/blog/curologys-customized-skincare-sign-up-flow)
- [Building trust with UX — based on beauty industry examples — UX Collective](https://uxdesign.cc/building-trust-with-ux-based-on-beauty-industry-examples-1b65493c996a)
- [Progress Tracker Design: UX Best Practices — UXPin](https://www.uxpin.com/studio/blog/design-progress-trackers/)
- [Designing UX: Forms — UXmatters](https://www.uxmatters.com/mt/archives/2017/05/designing-ux-forms.php)
- [Ecommerce Website Accessibility Guide — UsableNet](https://blog.usablenet.com/ecommerce-website-accessibility-guide)
- [How to Design a Product Card to Convert Better — FoxEcom](https://foxecom.com/blogs/all/product-card-design)
