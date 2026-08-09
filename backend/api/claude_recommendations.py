import json
import os

import anthropic

from api.limits import record_claude_usage

client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))

# Budget keys must match what the frontend sends ("drugstore" | "mid" | "high" | "all").
_BUDGET_RULES: dict[str, str] = {
    "drugstore": (
        "Budget: DRUGSTORE only. Every product must be under $20. "
        "Choose from: Maybelline, NYX, e.l.f., Wet n Wild, LA Girl, Milani, "
        "Revlon, CoverGirl, Black Radiance, Flower Beauty. "
        "Set price_range to \"$\" for every entry. "
        "Do NOT include mid-range or luxury brands."
    ),
    "mid": (
        "Budget: MID-RANGE only. Every product must cost $20–$60. "
        "Choose from: MAC, Urban Decay, Morphe, Too Faced, Tarte, ColourPop, "
        "Anastasia Beverly Hills, Tower 28, Saie, Mented, Uoma Beauty. "
        "Set price_range to \"$$\" for every entry. "
        "Do NOT include drugstore or luxury brands."
    ),
    "high": (
        "Budget: HIGH-END / LUXURY only. Every product must cost over $60. "
        "Choose from: NARS, Charlotte Tilbury, Dior Beauty, YSL Beauté, "
        "Pat McGrath Labs, Armani Beauty, Bobbi Brown, Sisley, La Mer. "
        "Set price_range to \"$$$\" for every entry. "
        "Do NOT include drugstore or mid-range brands."
    ),
    "all": (
        "Budget: No constraint. Aim for variety — spread price_range values "
        "across $, $$, and $$$ so that at least one under-$20 and one over-$60 "
        "product appear among the 10 total picks."
    ),
}

_JSON_SCHEMA = """\
{
  "foundation": [
    {
      "brand": "<string>",
      "product": "<string>",
      "shade": "<string — a real, existing shade name>",
      "price_range": "<$ | $$ | $$$>",
      "why": "<one sentence explaining why this shade suits the user's depth and undertone>",
      "url": "<full purchase URL including https:// — use https://www.sephora.com/search?keyword=... for prestige brands, https://www.target.com/s?searchTerm=... for drugstore brands>"
    },
    { "brand": "...", "product": "...", "shade": "...", "price_range": "...", "why": "...", "url": "..." }
  ],
  "concealer": [
    { "brand": "...", "product": "...", "shade": "...", "price_range": "...", "why": "...", "url": "..." },
    { "brand": "...", "product": "...", "shade": "...", "price_range": "...", "why": "...", "url": "..." }
  ],
  "blush": [
    { "brand": "...", "product": "...", "shade": "...", "price_range": "...", "why": "...", "url": "..." },
    { "brand": "...", "product": "...", "shade": "...", "price_range": "...", "why": "...", "url": "..." }
  ],
  "bronzer": [
    { "brand": "...", "product": "...", "shade": "...", "price_range": "...", "why": "...", "url": "..." },
    { "brand": "...", "product": "...", "shade": "...", "price_range": "...", "why": "...", "url": "..." }
  ],
  "lip": [
    { "brand": "...", "product": "...", "shade": "...", "price_range": "...", "why": "...", "url": "..." },
    { "brand": "...", "product": "...", "shade": "...", "price_range": "...", "why": "...", "url": "..." }
  ]
}"""


def get_full_beauty_recommendations(
    monk_scale: str,
    undertone: str,
    avg_hex: str,
    budget: str = "all",
) -> dict:
    """Call Claude to generate beauty product recommendations.

    Returns a structured dict on success, or an empty dict if both attempts
    at producing valid JSON fail.  Never raises.
    """
    system = (
        f"You are a makeup artist recommending products for MST level {monk_scale}, "
        f"{undertone} undertone, approximate skin hex {avg_hex}. "
        "Return ONLY a JSON object, no preamble, no markdown fences."
    )
    record_claude_usage(message)

    budget_rule = _BUDGET_RULES.get(budget, _BUDGET_RULES["all"])

    user_content = (
        f"{budget_rule}\n\n"
        "Recommend exactly 2 products per category (10 products total). "
        "Use real product names and real shade names. "
        "Use a different brand for each of the 10 picks.\n\n"
        f"Return ONLY this JSON shape — every field required, no extra keys:\n\n{_JSON_SCHEMA}"
    )

    messages: list[dict] = [{"role": "user", "content": user_content}]
    raw = _invoke(messages, system)

    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        print("[claude_recommendations] First response was not valid JSON — retrying.")
        retry_messages = messages + [
            {"role": "assistant", "content": raw},
            {
                "role": "user",
                "content": (
                    "Your previous response was not valid JSON. "
                    "Return ONLY the JSON object, starting with { and ending with }."
                ),
            },
        ]
        raw2 = _invoke(retry_messages, system)
        try:
            return json.loads(raw2)
        except json.JSONDecodeError:
            print(
                f"[claude_recommendations] Second response also invalid JSON. "
                f"Raw (first 500 chars): {raw2[:500]}"
            )
            return {}


def _invoke(messages: list[dict], system: str) -> str:
    response = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=2000,
        system=system,
        messages=messages,
    )
    record_claude_usage(response)
    text = response.content[0].text.strip()
    # Strip markdown code fences if the model adds them despite being told not to
    if text.startswith("```"):
        text = text.split("\n", 1)[-1]  # drop first line (```json or ```)
    if text.endswith("```"):
        text = text.rsplit("```", 1)[0]
    return text.strip()
