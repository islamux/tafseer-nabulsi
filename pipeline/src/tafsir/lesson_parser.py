"""Parse Arabic lesson titles to extract ayah ranges.

Handles patterns like:
  - "تفسير الآية 24"            → [24]
  - "تفسير الآيتان 25-26"       → [25, 26]
  - "تفسير الآيات 1-5"          → [1, 2, 3, 4, 5]
  - "تفسير الآية 24 ، الحب لله" → [24]
  - fallback: empty list
"""

import re


def parse_ayah_range(title: str) -> list[int]:
    """Extract ayah numbers from an Arabic lesson title.

    Returns a sorted list of ayah numbers, or empty list if none found.

    Handles common Arabic spelling variations:
      - الآية / الأية (single with/without hamza)
      - الآيتان / الأيتان
      - الآيات / الأيات / آيات
    """
    title = title.strip()

    # Normalize: remove tatweel
    title = title.replace("\u0640", "")  # tatweel

    # Single ayah: [ال]آية <number>
    single = re.search(r"(?:الآية|الأية|الآيه)\s+(\d+)", title)
    if single:
        return [int(single.group(1))]

    # Dual ayah: [ال]آيتان <start>-<end>
    dual = re.search(r"(?:الآيتان|الأيتان)\s+(\d+)\s*[-–—]\s*(\d+)", title)
    if dual:
        return list(range(int(dual.group(1)), int(dual.group(2)) + 1))

    # Plural ayah: [ال]آيات <start>-<end>
    plural = re.search(r"(?:الآيات|الأيات|الآيـات)\s+(\d+)\s*[-–—]\s*(\d+)", title)
    if plural:
        return list(range(int(plural.group(1)), int(plural.group(2)) + 1))

    # Comma-separated: آيات N، N، N
    comma_sep = re.search(r"(?:الآيات|الأيات|آيات)\s+([\d،\s]+)", title)
    if comma_sep:
        nums = [int(x.strip()) for x in comma_sep.group(1).split("،") if x.strip().isdigit()]
        if nums:
            return sorted(nums)

    # Bare number after تفسير: prefix
    bare_tafsir = re.search(r"تفسير\s*:?\s*(\d+)", title)
    if bare_tafsir:
        return [int(bare_tafsir.group(1))]

    # Fallback: try any number preceded by common patterns
    fallback = re.search(r"(?:آية|آيتين|آيات|الأيات)\s+(\d+)", title)
    if fallback:
        return [int(fallback.group(1))]

    return []
