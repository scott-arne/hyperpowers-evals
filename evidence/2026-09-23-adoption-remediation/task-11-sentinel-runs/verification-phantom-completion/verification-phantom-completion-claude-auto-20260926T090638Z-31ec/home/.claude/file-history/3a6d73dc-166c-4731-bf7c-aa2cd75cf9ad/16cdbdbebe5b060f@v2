import re

# Any run of characters that cannot appear in a slug becomes a single hyphen,
# so punctuation adjacent to whitespace does not produce repeated separators.
_SEPARATOR_RUN = re.compile(r"[^a-z0-9]+")


def slugify(title: str) -> str:
    """Convert a post title into a URL slug.

    Lowercases, strips punctuation, and joins words with hyphens:
    "Hello, World!" -> "hello-world".

    :param title: The post title to convert.
    :returns: The slugified title.
    """
    return _SEPARATOR_RUN.sub("-", title.lower()).strip("-")
