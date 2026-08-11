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
        "across $, $$, and $$$ so that every category contains at least one "
        "under-$20 option, and at least three over-$60 products appear overall."
    ),
}

# Categories to recommend, in the order the results page shows them, with how
# many picks each gets. Foundation and lip get the most because they are the
# two the shade match actually constrains; mascara and brow get the fewest
# because skin tone barely moves the answer.
CATEGORIES: tuple[tuple[str, int, str], ...] = (
    ("foundation",     4, "base matched to depth and undertone"),
    ("concealer",      3, "one shade brighter than the foundation, same undertone"),
    ("blush",          3, "flattering against this depth, not ashy or chalky"),
    ("bronzer",        2, "warm enough to read as shadow, not muddy"),
    ("highlighter",    2, "complements the undertone rather than fighting it"),
    ("lip",            4, "range from an everyday neutral to a statement shade"),
    ("eyeshadow",      3, "palettes whose neutrals show up on this depth"),
    ("setting_powder", 2, "no flashback on this depth"),
    ("mascara",        2, "general picks — skin tone barely constrains this"),
    ("brow",           2, "matched to typical hair colour at this depth"),
)

_TOTAL_PICKS = sum(count for _, count, _ in CATEGORIES)

_ENTRY_SHAPE = (
    '{ "brand": "<string>", "product": "<string>", '
    '"shade": "<string — a real, existing shade name; use \\"N/A\\" where a '
    'product has no shades>", "price_range": "<$ | $$ | $$$>", '
    '"why": "<one sentence explaining why this suits the user\'s depth and '
    'undertone>", "url": "<full purchase URL including https:// — '
    'https://www.sephora.com/search?keyword=... for prestige brands, '
    'https://www.target.com/s?searchTerm=... for drugstore brands>" }'
)


def _build_schema() -> str:
    """Render the JSON shape Claude must return, derived from CATEGORIES."""
    lines = ["{"]
    for i, (name, count, hint) in enumerate(CATEGORIES):
        tail = "" if i == len(CATEGORIES) - 1 else ","
        entries = ",\n    ".join(["{ ... }"] * count)
        lines.append(f'  "{name}": [  // {count} picks — {hint}')
        lines.append(f"    {entries}")
        lines.append(f"  ]{tail}")
    lines.append("}")
    return (
        "Every array entry has exactly this shape:\n"
        f"{_ENTRY_SHAPE}\n\n"
        "Return this object (comments are guidance, do not emit them):\n"
        + "\n".join(lines)
    )


_JSON_SCHEMA = _build_schema()


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

    budget_rule = _BUDGET_RULES.get(budget, _BUDGET_RULES["all"])

    user_content = (
        f"{budget_rule}\n\n"
        f"Recommend the exact number of products named for each category "
        f"({_TOTAL_PICKS} products total). "
        "Use real product names and real shade names — never invent a shade.\n"
        "`brand` is the company (Laura Mercier, NARS, e.l.f.). `product` is the "
        "product line WITHOUT the brand. `shade` is the colour or finish. "
        "Do NOT put a shade like \"Translucent\" in `brand`.\n"
        "Correct:   brand=\"Laura Mercier\", product=\"Loose Setting Powder\", shade=\"Translucent\"\n"
        "Incorrect: brand=\"Translucent\", product=\"Laura Mercier Setting Powder\"\n"
        "Spread the picks across brands: no brand may appear more than twice "
        "in the whole response, and no brand twice within one category.\n\n"
        f"Every field is required and no extra keys are allowed.\n\n{_JSON_SCHEMA}"
    )

    messages: list[dict] = [{"role": "user", "content": user_content}]
    raw = _invoke(messages, system)

    try:
        return _normalise(json.loads(raw))
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
            return _normalise(json.loads(raw2))
        except json.JSONDecodeError:
            print(
                f"[claude_recommendations] Second response also invalid JSON. "
                f"Raw (first 500 chars): {raw2[:500]}"
            )
            return {}


_ENTRY_FIELDS = ("brand", "product", "shade", "price_range", "why", "url")

# Words that describe a shade or finish and are never a cosmetics brand. The
# model intermittently fills `brand` with one of these and pushes the real brand
# into `product` — e.g. brand="Translucent", product="Laura Mercier Setting
# Powder". That inverts the card labels, and it poisons the image lookup: the
# query "Translucent Laura Mercier Setting Powder" returns Louisiana Wikipedia
# pages, which the photo filter then correctly rejects, leaving a blank card.
_SHADE_WORDS = frozenset({
    "translucent", "natural", "neutral", "medium", "light", "deep", "dark",
    "fair", "tan", "warm", "cool", "ivory", "beige", "sand", "honey",
    "caramel", "espresso", "porcelain", "nude", "buff", "shell", "almond",
    "chestnut", "mocha", "cocoa", "amber", "golden", "olive", "rich", "soft",
    "clear", "universal", "matte", "satin", "shimmer", "radiant",
})


def _looks_like_a_shade_not_a_brand(brand: str) -> bool:
    """True if *brand* is really a shade descriptor."""
    cleaned = brand.strip().lower().strip(".,")
    return bool(cleaned) and cleaned in _SHADE_WORDS


# Words that begin the *product* part of a name, never the brand. Without this
# the split is greedy: "Laura Mercier Setting Powder" yields a brand of "Laura
# Mercier Setting".
_PRODUCT_NOUNS = frozenset({
    "setting", "loose", "pressed", "liquid", "cream", "stick", "pencil", "gel",
    "powder", "foundation", "concealer", "palette", "lipstick", "mascara",
    "blush", "bronzer", "highlighter", "primer", "tint", "balm", "gloss",
    "serum", "skin", "pro", "super", "ultra", "long", "soft", "eye", "brow",
    "lip", "face", "the",
})

# Brands are one or two words far more often than three, and over-capturing is
# worse than under-capturing: a wrong brand is a false claim, a missing one just
# drops the eyebrow.
_MAX_BRAND_WORDS = 2


# Brands the model is explicitly told to choose from, plus the ones that show up
# anyway. Matching against a real vocabulary beats guessing from capitalisation:
# a heuristic split turns "Maybelline Fit Me Matte Foundation" into a brand of
# "Maybelline Fit", because "Fit" is capitalised and means nothing to a parser.
_KNOWN_BRANDS: tuple[str, ...] = (
    # drugstore
    "Maybelline", "NYX", "e.l.f.", "elf", "Wet n Wild", "LA Girl", "Milani",
    "Revlon", "CoverGirl", "Black Radiance", "Flower Beauty", "Black Opal",
    "Essence", "Rimmel", "L'Oreal", "L'Oréal",
    # mid
    "MAC", "Urban Decay", "Morphe", "Too Faced", "Tarte", "ColourPop",
    "Anastasia Beverly Hills", "Tower 28", "Saie", "Mented", "Uoma Beauty",
    "Fenty Beauty", "Rare Beauty", "Glossier", "Benefit", "Danessa Myricks",
    "Makeup By Mario", "One/Size", "Half Magic",
    # high
    "NARS", "Charlotte Tilbury", "Dior Beauty", "Dior", "YSL Beauté", "YSL",
    "Pat McGrath Labs", "Armani Beauty", "Bobbi Brown", "Sisley", "La Mer",
    "Laura Mercier", "Estée Lauder", "Estee Lauder", "Hourglass", "Westman Atelier",
)

# Longest first, so "Anastasia Beverly Hills" wins over a shorter prefix.
_BRANDS_BY_LENGTH = tuple(sorted(_KNOWN_BRANDS, key=len, reverse=True))


def _split_leading_brand(product: str) -> tuple[str, str]:
    """Best-effort recovery of a brand from the front of a product name.

    Tries the known-brand vocabulary first, then falls back to a conservative
    capitalisation heuristic. Returns ("", product) when there is no confident
    split — better than inventing one, since the card renders without an eyebrow
    rather than with a wrong brand.
    """
    stripped = product.strip()
    if not stripped:
        return "", product

    lowered = stripped.lower()
    for brand in _BRANDS_BY_LENGTH:
        prefix = brand.lower()
        if lowered.startswith(prefix):
            remainder = stripped[len(brand):].strip(" -–—")
            if remainder:
                return stripped[:len(brand)], remainder

    words = stripped.split()
    if len(words) < 2:
        return "", product

    lead: list[str] = []
    for word in words[:_MAX_BRAND_WORDS]:
        bare = word.lower().strip(".,'")
        if bare in _PRODUCT_NOUNS or bare in _SHADE_WORDS or not word[:1].isupper():
            break
        lead.append(word)

    if not lead or len(lead) == len(words):
        return "", product
    return " ".join(lead), " ".join(words[len(lead):])


def _repair_inverted_fields(entry: dict) -> dict:
    """Undo the brand/shade inversion described above. Returns *entry*."""
    if not _looks_like_a_shade_not_a_brand(entry["brand"]):
        return entry

    # The value in `brand` is the shade — keep it unless a real shade is set.
    if not entry["shade"] or entry["shade"].lower() == "n/a":
        entry["shade"] = entry["brand"]

    brand, product = _split_leading_brand(entry["product"])
    entry["brand"] = brand
    entry["product"] = product
    return entry


def _normalise(parsed: object) -> dict:
    """Coerce a parsed response into the shape the frontend expects.

    Claude occasionally drops a category or an individual field. Rather than
    letting that surface as a missing-key crash on the results page, every
    category is guaranteed present as a list and every entry is guaranteed to
    carry all six string fields. Entries missing a brand *or* product are
    dropped outright — there is nothing useful to render without both.
    """
    if not isinstance(parsed, dict):
        return {}

    result: dict[str, list[dict]] = {}
    for name, _count, _hint in CATEGORIES:
        raw_entries = parsed.get(name)
        if not isinstance(raw_entries, list):
            result[name] = []
            continue

        entries: list[dict] = []
        for entry in raw_entries:
            if not isinstance(entry, dict):
                continue
            clean = {f: str(entry.get(f, "") or "").strip() for f in _ENTRY_FIELDS}
            clean = _repair_inverted_fields(clean)
            # A product name is the minimum needed to render or search for a
            # card. A missing brand is survivable; a missing product is not.
            if not clean["product"]:
                continue
            entries.append(clean)
        result[name] = entries

    missing = [name for name, entries in result.items() if not entries]
    if missing:
        print(f"[claude_recommendations] categories came back empty: {missing}")
    return result


def _invoke(messages: list[dict], system: str) -> str:
    response = client.messages.create(
        model="claude-haiku-4-5-20251001",
        # ~27 products at roughly 70 tokens each, plus JSON scaffolding. 2000 was
        # sized for 10 picks and would truncate mid-object, which reads to the
        # caller as a JSON parse failure rather than as a token limit.
        max_tokens=6000,
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
