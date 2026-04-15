import json
import os

import anthropic


def get_shade_recommendations(
    monk_scale: str,
    undertone: str,
    avg_hex: str,
    matched_shades: list[dict],
) -> list[str]:
    """
    Call Claude to generate personalized recommendation text for each matched shade.
    Returns a list of recommendation strings (one per shade, same order as matched_shades).
    Raises on API error so the caller can fall back gracefully.
    """
    client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))

    shade_list = "\n".join(
        f"{i+1}. {s['shade_name']} ({s['hex']})" for i, s in enumerate(matched_shades)
    )

    prompt = f"""You are a professional makeup artist specializing in foundation matching.

A customer has the following skin profile:
- Monk Skin Tone scale: {monk_scale}
- Undertone: {undertone}
- Skin hex color: {avg_hex}

Their top matched Fenty Beauty Pro Filt'r foundation shades are:
{shade_list}

Write a single short, warm, personalized recommendation sentence (under 20 words) for each shade above, explaining why it suits this person's specific tone and undertone. Return ONLY a JSON array of exactly {len(matched_shades)} strings, in the same order as the shades listed. No keys, no markdown, no extra text."""

    message = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=512,
        messages=[{"role": "user", "content": prompt}],
    )

    raw = message.content[0].text.strip()
    recommendations: list[str] = json.loads(raw)

    if not isinstance(recommendations, list) or len(recommendations) != len(matched_shades):
        raise ValueError("Unexpected response shape from Claude")

    return recommendations
