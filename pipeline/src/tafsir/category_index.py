"""Full per-surah story discovery via the category AJAX pagination endpoint.

nabulsi.co category pages render only a small initial batch of lessons behind a
"load more" button. That button calls a paginated JSON endpoint
(``get-read-more-post-category``) driven by hidden inputs on the category page.
This module reads those inputs and walks the endpoint to collect a surah's
complete story list.
"""

from collections.abc import Callable
from dataclasses import dataclass
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup

from src.config import REQUEST_DELAY_SECONDS
from src.utils.rate_limit import wait_if_needed

AJAX_PATH = "get-read-more-post-category"
DEFAULT_HEADERS = {"User-Agent": "tafsir-pipeline/0.1 (+contact)"}


@dataclass(frozen=True)
class PaginationInputs:
    category_id: str
    base_url: str
    start_page: int


def extract_category_pagination_inputs(category_html: str) -> PaginationInputs | None:
    """Read the hidden #category_id, #url, #last_id inputs from a category page."""
    soup = BeautifulSoup(category_html, "lxml")
    cat_el = soup.find(id="category_id")
    url_el = soup.find(id="url")
    if not (cat_el and url_el and cat_el.get("value") and url_el.get("value")):
        return None
    last_el = soup.find(id="last_id")
    raw_start = (last_el.get("value") if last_el else None) or "1"
    try:
        start_page = int(raw_start)
    except ValueError:
        start_page = 1
    return PaginationInputs(
        category_id=cat_el.get("value"),
        base_url=url_el.get("value"),
        start_page=start_page,
    )


def parse_stories_from_html(html: str) -> list[dict]:
    """Extract deduped {url, title} story links from an HTML chunk.

    Story cards render the same href twice — an empty thumbnail <a> followed by
    the titled <a> — so we keep the first occurrence per href but upgrade its
    title if a later link with the same href carries non-empty text.
    """
    soup = BeautifulSoup(html, "lxml")
    by_href: dict[str, dict] = {}
    order: list[str] = []
    for a in soup.select("a[href*='/story/']"):
        href = (a.get("href") or "").strip()
        if not href:
            continue
        title = a.get_text(strip=True)
        if href not in by_href:
            by_href[href] = {"url": href, "title": title}
            order.append(href)
        elif title and not by_href[href]["title"]:
            by_href[href]["title"] = title
    return [by_href[href] for href in order]


def is_tafsir_title(title: str) -> bool:
    """True if the lesson title denotes a tafsir lesson."""
    return "تفسير" in title


def collect_all_stories(
    category_id: str,
    fetch_page: Callable[[str, int], tuple[list[str], bool]],
) -> list[dict]:
    """Walk the AJAX endpoint page-by-page until exhausted.

    ``fetch_page(category_id, page) -> (html_chunks, no_more)`` where
    ``html_chunks`` is a list of HTML strings and ``no_more`` signals the end.
    Returns deduped {url, title} across all pages.
    """
    seen: set[str] = set()
    all_stories: list[dict] = []
    page = 1
    while True:
        chunks, no_more = fetch_page(category_id, page)
        for chunk in chunks:
            for story in parse_stories_from_html(chunk):
                if story["url"] in seen:
                    continue
                seen.add(story["url"])
                all_stories.append(story)
        if no_more:
            break
        page += 1
    return all_stories


def make_ajax_fetcher(base_url: str) -> Callable[[str, int], tuple[list[str], bool]]:
    """Build a fetcher for ``collect_all_stories`` that hits the live endpoint."""
    endpoint = urljoin(base_url + "/", AJAX_PATH)

    def fetch_page(category_id: str, page: int) -> tuple[list[str], bool]:
        wait_if_needed(REQUEST_DELAY_SECONDS)
        resp = requests.get(
            endpoint,
            params={"last_id": str(page), "category_id": category_id},
            headers=DEFAULT_HEADERS,
            timeout=30,
        )
        resp.raise_for_status()
        data = resp.json()
        chunks = list(data[0]) if data and data[0] else []
        no_more = bool(data[1]) if len(data) > 1 else True
        return chunks, no_more

    return fetch_page
