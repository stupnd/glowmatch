"""Claude-powered foundation shade equivalency matcher.

Takes a free-text foundation description from the user and returns 3 alternative
foundations at different price points that are an equivalent shade match for the
user's detected MST level and undertone.

Public API
----------
match_foundation(shade_input, mst_level, undertone) -> list[dict]
"""

from __future__ import annotations

import json
import os

import anthropic

client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))

_SCHEMA = """\
[
  {
    "brand":        "<string>",
    "name":         "<string — full product name>",
    "shade":        "<string — a real, existing shade name for this product>",
    "price_tier":   "<$ | $$ | $$$>",
    "match_reason": "<one sentence explaining why this is an equivalent match>"
  },
  { "brand": "...", "name": "...", "shade": "...", "price_tier": "...", "match_reason": "..." },
  { "brand": "...", "name": "...", "shade": "...", "price_tier": "...", "match_reason": "..." }
]"""


def match_foundation(
    shade_input: str,
    mst_level: int,
    undertone: str,
) -> list[dict]:
    """Return 3 alternative foundations equivalent to *shade_input*.

    Uses one Claude API call with a single retry on invalid JSON.
    Returns an empty list on persistent failure rather than raising.
    """
    system = (
        "You are a makeup artist with encyclopedic knowledge of foundation formulas "
        "and shade ranges across every major beauty brand. "
        "Return ONLY a JSON array, no preamble, no markdown fences."
    )

    user_content = (
        f'The user currently wears: "{shade_input}". '
        f"Their skin tone is MST-{mst_level} with {undertone} undertone. "
        "Suggest exactly 3 alternative foundations, one at each price tier ($, $$, $$$), "
        "that would be an equivalent shade match. "
        "Use real product names and real existing shade names that the user can actually buy. "
        f"Return ONLY this JSON shape — every field required, no extra keys:\n\n{_SCHEMA}"
    )

    messages: list[dict] = [{"role": "user", "content": user_content}]
    raw = _invoke(messages, system)

    try:
        result = json.loads(raw)
        return result if isinstance(result, list) else []
    except json.JSONDecodeError:
        print("[foundation_matcher] First response was not valid JSON — retrying.")
        retry_messages = messages + [
            {"role": "assistant", "content": raw},
            {
                "role": "user",
                "content": (
                    "Your response was not valid JSON. "
                    "Return ONLY the JSON array, starting with [ and ending with ]."
                ),
            },
        ]
        raw2 = _invoke(retry_messages, system)
        try:
            result2 = json.loads(raw2)
            return result2 if isinstance(result2, list) else []
        except json.JSONDecodeError:
            print(
                f"[foundation_matcher] Both attempts failed. "
                f"Raw (first 300 chars): {raw2[:300]}"
            )
            return []


def _invoke(messages: list[dict], system: str) -> str:
    response = client.messages.create(
        model="claude-sonnet-4-5",
        max_tokens=800,
        system=system,
        messages=messages,
    )
    return response.content[0].text.strip()
