import json
import os

import anthropic

client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))


def get_full_beauty_recommendations(
    monk_scale: str,
    undertone: str,
    avg_hex: str,
) -> dict:
    """
    Call Claude to generate full beauty product recommendations
    across foundation, concealer, blush, bronzer, and lip.
    Returns a structured dict with recommendations per category.
    """

    prompt = f"""You are an expert inclusive beauty advisor with deep \
knowledge of makeup products across all price ranges and brands.

A user's skin tone has been analyzed:
- Monk Skin Tone Scale: {monk_scale} (scale of 1-10, 1=lightest, 10=deepest)
- Undertone: {undertone} (warm/cool/neutral)
- Skin hex color: {avg_hex}

Give personalized product recommendations across these categories.
For each product include: brand, product name, specific shade name, \
price range ($/$$/$$$ for drugstore/mid/high-end), and a 1 sentence \
reason why it works for this person's specific tone and undertone.

Include a mix of drugstore and high-end options.
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
      "why": "A drugstore dupe that nails your depth without breaking the bank."
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
Foundation options should span drugstore to high-end.
"""

    message = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=1500,
        messages=[{"role": "user", "content": prompt}],
    )

    text = message.content[0].text.strip()
    text = text.replace("```json", "").replace("```", "").strip()
    return json.loads(text)
