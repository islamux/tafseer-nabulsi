"""Scrape lesson pages from nabulsi.com with polite rate limiting."""

import re
from urllib.parse import urljoin, unquote

import requests
from bs4 import BeautifulSoup

from src.config import MAX_RETRIES, NABULSI_BASE_URL, REQUEST_DELAY_SECONDS, RETRY_BACKOFF_BASE
from src.utils.cache import get_cached, set_cached
from src.utils.rate_limit import wait_if_needed


def fetch_page(url: str, retries: int = MAX_RETRIES) -> str:
    """Fetch a page with disk cache, rate limiting, and retry."""
    cached = get_cached(url)
    if cached:
        return cached

    for attempt in range(retries):
        try:
            wait_if_needed(REQUEST_DELAY_SECONDS)
            resp = requests.get(url, timeout=30)
            resp.raise_for_status()
            body = resp.text
            set_cached(url, body)
            return body
        except requests.RequestException as e:
            if attempt == retries - 1:
                raise
            delay = REQUEST_DELAY_SECONDS * (RETRY_BACKOFF_BASE ** attempt)
            wait_if_needed(delay)

    raise RuntimeError(f"Failed to fetch {url} after {retries} retries")


def extract_story_links_from_category(category_html: str, category_url: str) -> list[dict]:
    """Extract story links from a surah category page.

    Returns list of {url, title_raw} with deduplication.
    """
    soup = BeautifulSoup(category_html, "lxml")
    stories = []
    seen_urls: set[str] = set()

    for link in soup.select("a[href*='/story/']"):
        href = link.get("href", "").strip()
        if not href:
            continue

        full_url = urljoin(category_url, href)
        if full_url in seen_urls:
            continue
        seen_urls.add(full_url)

        title = link.get_text(strip=True)
        stories.append({
            "url": full_url,
            "title_raw": title,
        })

    return stories


def fetch_story_page(url: str) -> dict | None:
    """Fetch a story page and extract title + body text.

    Returns {url, title, body, category_name, category_url} or None on failure.
    """
    try:
        html = fetch_page(url)
    except Exception:
        return None

    soup = BeautifulSoup(html, "lxml")

    title_tag = soup.find("title")
    title = title_tag.text.strip() if title_tag else ""

    # Extract category link (surah category)
    category_name = ""
    category_url = ""
    for a in soup.find_all("a"):
        href = a.get("href", "")
        if "/category/" in href:
            text = a.get_text(strip=True)
            if text:
                category_name = text
                category_url = urljoin(NABULSI_BASE_URL, href)
                break

    # Extract body from sg-post-content
    body = ""
    content_div = soup.find("div", class_="sg-post-content")
    if content_div:
        body = content_div.get_text(separator="\n", strip=True)

    if not body:
        # Fallback: try other content containers
        for selector in ["article", ".story-content", ".article-body", ".entry-content"]:
            el = soup.select_one(selector)
            if el:
                body = el.get_text(separator="\n", strip=True)
                break

    return {
        "url": url,
        "title": title,
        "body": body,
        "category_name": category_name,
        "category_url": category_url,
    }


def extract_lesson_links(category_html: str, category_url: str) -> list[dict]:
    """Extract lesson links from a surah category page.

    Returns list of {title, url, lesson_number}.
    """
    stories = extract_story_links_from_category(category_html, category_url)
    lessons = []

    for story in stories:
        title = story["title_raw"]
        if not title or len(title) < 5:
            continue

        num_match = re.match(r"(\d+)", title)
        lesson_num = int(num_match.group(1)) if num_match else 0

        lessons.append({
            "title": title,
            "url": story["url"],
            "lesson_number": lesson_num,
        })

    return lessons


def extract_lesson_content(story_html: str) -> str:
    """Extract the main body text from a lesson/story page."""
    soup = BeautifulSoup(story_html, "lxml")

    for selector in ["article", ".story-content", ".article-body", ".content-body", ".post-content"]:
        el = soup.select_one(selector)
        if el:
            return el.get_text(separator="\n", strip=True)

    best = ""
    for div in soup.find_all("div"):
        text = div.get_text(strip=True)
        if len(text) > len(best):
            best = text
    return best
