"""Length limits for slugs."""

__all__ = ["truncate_slug"]


def truncate_slug(slug: str, max_len: int) -> str:
    """Cut ``slug`` to at most ``max_len`` characters at a hyphen boundary."""
    if len(slug) <= max_len:
        return slug
    cut = slug[: max_len + 1]
    head, sep, _ = cut.rpartition("-")
    return head if sep and head else slug[:max_len]
