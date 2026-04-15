import json
import os
import random

import anthropic

client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))

BUDGET_CONTEXT: dict[str, str] = {
    "drugstore": (
        "ONLY recommend drugstore brands "
        "(Maybelline, NYX, e.l.f, Wet n Wild, LA Girl, Milani, Revlon, CoverGirl). "
        "Price range $ only. Do NOT suggest any mid-range or luxury brands."
    ),
    "mid-range": (
        "ONLY recommend mid-range brands "
        "(MAC, Urban Decay, Morphe, Too Faced, Tarte, ColourPop, Anastasia Beverly Hills). "
        "Price range $$ only. Do NOT suggest drugstore or luxury brands."
    ),
    "high-end": (
        "ONLY recommend high-end/luxury brands "
        "(Fenty Beauty, NARS, Charlotte Tilbury, Dior, YSL, Pat McGrath, Armani Beauty). "
        "Price range $$$ only. Do NOT suggest drugstore or mid-range brands."
    ),
    "all": (
        "Mix of drugstore and high-end options. "
        "For each category include one affordable ($) option and one splurge ($$–$$$) option."
    ),
}


def get_full_beauty_recommendations(
    monk_scale: str,
    undertone: str,
    avg_hex: str,
    budget: str = "all",
) -> dict:
    """
    Call Claude to generate full beauty product recommendations
    across foundation, concealer, blush, bronzer, and lip.
    Returns a structured dict with recommendations per category.
    """

    budget_instruction = BUDGET_CONTEXT.get(budget, BUDGET_CONTEXT["all"])

    seed_brands = random.sample([
        "Rhode", "Mented", "Black Opal", "Uoma Beauty",
        "Tower 28", "Saie", "Flower Beauty", "Black Radiance"
    ], 3)

    prompt = f"""You are an expert inclusive beauty advisor with deep \
knowledge of makeup products across all price ranges and brands.

A user's skin tone has been analyzed:
- Monk Skin Tone Scale: {monk_scale} (scale of 1-10, 1=lightest, 10=deepest)
- Undertone: {undertone} (warm/cool/neutral)
- Skin hex color: {avg_hex}

BUDGET CONSTRAINT (strictly follow this — it is the user's top priority):
{budget_instruction}

IMPORTANT: Never recommend the same brand twice across categories combined. \
Use a wide variety of brands. Include at least one unexpected or indie brand \
recommendation. For each category always give one drugstore AND one mid/high-end \
option regardless of budget filter (budget filter affects which gets listed first, \
not exclusivity).
Rotate between these brands across categories:
Foundation: Fenty, Maybelline, NARS, Black Opal, Mented, Make Up For Ever, Lancôme, NYX
Concealer: Rare Beauty, e.l.f, Tarte, NARS, Black Radiance, L'Oreal, Bobbi Brown
Blush: Tower 28, Milani, NARS, Fenty, Saie, Glossier, MAC, Flower Beauty
Bronzer: Fenty, Physicians Formula, Too Faced, Hoola Benefit, Rare Beauty, Milk Makeup
Lip: Charlotte Tilbury, NYX, MAC, Fenty, Rhode, Mented, Uoma Beauty, e.l.f

Try to feature at least one of these brands if appropriate for the skin tone: {seed_brands}

Give personalized product recommendations across these categories.
For each product include: brand, product name, specific shade name, \
price range ($/$$/$$$ for drugstore/mid/high-end), and a 1 sentence \
reason why it works for this person's specific tone and undertone.

Be specific with shade names — use real shades that actually exist.
Be inclusive and celebratory in tone.

Respond ONLY with a JSON object in exactly this shape, \
no preamble, no markdown, no backticks:

{{
  "foundation": [
    {{
      "brand": "Fenty Beauty",
      "product": "Pro Filt'r Soft Matte",
      "shade": "310W",
      "price_range": "$$",
      "why": "The warm undertone in 310W perfectly matches your golden warmth."
    }},
    {{
      "brand": "Maybelline",
      "product": "Fit Me Matte + Poreless",
      "shade": "330 Toffee",
      "price_range": "$",
      "why": "A drugstore pick that nails your depth without breaking the bank."
    }}
  ],
  "concealer": [
    {{
      "brand": "...",
      "product": "...",
      "shade": "...",
      "price_range": "...",
      "why": "..."
    }},
    {{
      "brand": "...",
      "product": "...",
      "shade": "...",
      "price_range": "...",
      "why": "..."
    }}
  ],
  "blush": [
    {{
      "brand": "...",
      "product": "...",
      "shade": "...",
      "price_range": "...",
      "why": "..."
    }},
    {{
      "brand": "...",
      "product": "...",
      "shade": "...",
      "price_range": "...",
      "why": "..."
    }}
  ],
  "bronzer": [
    {{
      "brand": "...",
      "product": "...",
      "shade": "...",
      "price_range": "...",
      "why": "..."
    }},
    {{
      "brand": "...",
      "product": "...",
      "shade": "...",
      "price_range": "...",
      "why": "..."
    }}
  ],
  "lip": [
    {{
      "brand": "...",
      "product": "...",
      "shade": "...",
      "price_range": "...",
      "why": "..."
    }},
    {{
      "brand": "...",
      "product": "...",
      "shade": "...",
      "price_range": "...",
      "why": "..."
    }}
  ]
}}

Return exactly 2 options per category (10 products total).
Strictly respect the budget constraint above — only recommend brands \
in the specified tier.
"""

    message = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=1500,
        messages=[{"role": "user", "content": prompt}],
    )

    text = message.content[0].text.strip()
    text = text.replace("```json", "").replace("```", "").strip()
    return json.loads(text)
