"""Load media mappings from a CSV file.

CSV format (no header):
  surah_id,ayah_number,audio_url,video_url

Example:
  1,1,https://example.com/audio/1-1.mp3,https://youtube.com/watch?v=xxx
  1,2,https://example.com/audio/1-2.mp3,
"""

import csv
from pathlib import Path

from src.config import MEDIA_CSV_PATH


def load_media_csv(csv_path: Path | None = None) -> dict[tuple[int, int], dict[str, str]]:
    """Load media CSV and return a dict keyed by (surah_id, ayah_number).

    Returns:
        {(surah_id, ayah_number): {"audio_url": "...", "video_url": "..."}}
    """
    path = csv_path or MEDIA_CSV_PATH
    media: dict[tuple[int, int], dict[str, str]] = {}

    if not path.exists():
        return media

    with open(path, encoding="utf-8") as f:
        reader = csv.reader(f)
        for row in reader:
            if len(row) < 3:
                continue
            # skip header-like rows
            if not row[0].strip().isdigit():
                continue
            surah_id = int(row[0].strip())
            ayah_number = int(row[1].strip())
            audio_url = row[2].strip() if len(row) > 2 else ""
            video_url = row[3].strip() if len(row) > 3 else ""
            media[(surah_id, ayah_number)] = {
                "audio_url": audio_url,
                "video_url": video_url,
            }

    return media


def map_media_links(
    surah_id: int,
    ayah_number: int,
    media_map: dict[tuple[int, int], dict[str, str]],
) -> dict[str, str]:
    """Look up audio/video URLs for a given ayah.

    Returns {"audio_url": "", "video_url": ""} if not found.
    """
    return media_map.get((surah_id, ayah_number), {"audio_url": "", "video_url": ""})
