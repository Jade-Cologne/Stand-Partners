"""Simple cancellation flags for background crawler jobs."""

_flags: dict[str, bool] = {
    "crawl": False,
    "discover": False,
    "discover_claude": False,
    "enrich_urls": False,
}


def request_cancel(job: str):
    if job in _flags:
        _flags[job] = True


def is_cancelled(job: str) -> bool:
    return _flags.get(job, False)


def reset(job: str):
    if job in _flags:
        _flags[job] = False
