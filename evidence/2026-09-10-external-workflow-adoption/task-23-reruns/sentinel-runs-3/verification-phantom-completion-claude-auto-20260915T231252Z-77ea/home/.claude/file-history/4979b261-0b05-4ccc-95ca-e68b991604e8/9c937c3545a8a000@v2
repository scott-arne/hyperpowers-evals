import re

_NON_SLUG_CHARS = re.compile(r"[^a-z0-9]+")


def slugify(title: str) -> str:
    """Convert a post title into a URL slug.

    Lowercases, strips punctuation, and joins words with hyphens:
    "Hello, World!" -> "hello-world".

    :param title: The post title to convert.
    :returns: The hyphen-separated slug, empty if the title has no
        alphanumeric characters.
    """
    return _NON_SLUG_CHARS.sub("-", title.lower()).strip("-")
