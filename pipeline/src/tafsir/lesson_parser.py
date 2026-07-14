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

    # Normalize: remove tatweel and normalize hamza variants
    title = title.replace("\u0640", "")  # tatweel

    # Pattern for single ayah: [ال]آية <number>
    single = re.search(r"(?:الآية|الأية|الآيه)\s+(\d+)", title)
    if single:
        return [int(single.group(1))]

    # Pattern for dual ayah: [ال]آيتان <start>-<end>
    dual = re.search(r"(?:الآيتان|الأيتان)\s+(\d+)\s*[-–—]\s*(\d+)", title)
    if dual:
        start, end = int(dual.group(1)), int(dual.group(2))
        return list(range(start, end + 1))

    # Pattern for plural ayah: [ال]آيات <start>-<end>
    plural = re.search(r"(?:الآيات|الأيات|الآيـات)\s+(\d+)\s*[-–—]\s*(\d+)", title)
    if plural:
        start, end = int(plural.group(1)), int(plural.group(2))
        return list(range(start, end + 1))

    # Fallback: try any number preceded by common patterns
    fallback = re.search(r"(?:آية|آيتين|آيات|الأيات)\s+(\d+)", title)
    if fallback:
        return [int(fallback.group(1))]

    return []
