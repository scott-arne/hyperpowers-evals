import re

# Any run of characters outside the slug alphabet becomes a single separator.
_SEPARATOR_RUN = re.compile(r"[^a-z0-9]+")


def slugify(title: str) -> str:
    """Convert a post title into a URL slug.

    Lowercases, strips punctuation, and joins words with hyphens:
    "Hello, World!" -> "hello-world".

    :param title: Human-readable post title.
    :returns: Lowercase, hyphen-separated slug.
    """
    return _SEPARATOR_RUN.sub("-", title.lower()).strip("-")
