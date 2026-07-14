Act as a Python expert and Data Engineer. I need a Python script to build a 'Data Preparation Pipeline' for a Quran Tafsir project.

Goal: The script should generate a unified JSON structure for each Surah by merging Quranic text and Nabulsi's Tafsir content.

Requirements:

Input Sources:

Quranic Text: Fetch from Tanzil.net (XML or JSON format).

Tafsir Content: Extract from nabulsi.com (Scraping logic required).

Data Processing:

Create a JSON structure for each Surah following this schema:

JSON
{
  "surah_id": int,
  "name": "string",
  "ayahs": [
    {
      "number": int,
      "text": "string",
      "tafsir_short": "string",
      "tafsir_long": "string",
      "media": {
        "audio_url": "string",
        "video_url": "string"
      }
    }
  ]
}
Logic:

Use BeautifulSoup or playwright for scraping the Tafsir content.

Use requests to fetch Quranic text.

Implement a mapping function to match the Tafsir content with the correct Ayah number.

Output: Save the output as individual JSON files (e.g., 1.json, 2.json, ...).

Deliverable:

Provide a clean, modular Python script with logging and error handling.

Include a 'map_media_links' function placeholder where I can manually add or define the logic for external media URLs (audio/video).

Ensure the code is easy to run from the terminal."
