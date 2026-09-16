import re


def slugify(title: str) -> str:
    """Convert a post title into a URL slug.

    Lowercases, strips punctuation, and joins words with hyphens:
    "Hello, World!" -> "hello-world".
    """
    result = title.lower()
    # Drop punctuation before collapsing whitespace so that removed characters
    # cannot leave stray separators behind.
    result = re.sub(r"[^a-z0-9\s]", "", result)
    result = re.sub(r"\s+", "-", result)
    return result.strip("-")
