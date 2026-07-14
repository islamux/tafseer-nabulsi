"""Extract and clean tafsir content from fetched HTML."""

from dataclasses import dataclass

from src.tafsir.lesson_parser import parse_ayah_range


@dataclass
class TafsirEntry:
    ayah_numbers: list[int]
    title: str
    theme: str
    body: str


def process_lesson(title: str, body: str) -> TafsirEntry:
    """Parse a lesson title and body into a structured TafsirEntry.

    Extracts ayah range from the Arabic title and cleans the body text.
    """
    ayahs = parse_ayah_range(title)

    # Extract theme from title (text after the last comma or after ayah numbers)
    theme = _extract_theme(title)

    # Clean body
    body = _clean_text(body)

    return TafsirEntry(
        ayah_numbers=ayahs,
        title=title,
        theme=theme,
        body=body,
    )


def _extract_theme(title: str) -> str:
    """Extract the thematic part of a lesson title.

    E.g., "01 - سورة التوبة - تفسير الآية 24 ، الحب لله وحده"
    → "الحب لله وحده"
    """
    # Split on commas (Arabic ,) and take the last meaningful part
    parts = title.split("،")
    if len(parts) > 1:
        return parts[-1].strip()

    # Try dash-separated format
    parts = title.split(" - ")
    if len(parts) > 2:
        return parts[-1].strip()

    return ""


def _clean_text(text: str) -> str:
    """Clean extracted text: normalize whitespace, strip."""
    import re
    text = re.sub(r"\s+", " ", text)
    text = re.sub(r"\n\s*\n", "\n", text)
    return text.strip()
