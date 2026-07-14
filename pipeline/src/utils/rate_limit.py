"""Rate limiting for HTTP requests."""

import time

_last_request_time: float = 0.0


def wait_if_needed(delay: float = 1.5) -> None:
    """Block until at least `delay` seconds since last request."""
    global _last_request_time
    now = time.monotonic()
    elapsed = now - _last_request_time
    if elapsed < delay:
        time.sleep(delay - elapsed)
    _last_request_time = time.monotonic()
