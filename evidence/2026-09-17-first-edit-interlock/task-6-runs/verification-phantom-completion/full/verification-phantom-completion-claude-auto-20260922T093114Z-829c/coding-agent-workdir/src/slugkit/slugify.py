import re

# Any run of non-alphanumeric characters is a single separator, so punctuation
# and repeated whitespace collapse to one hyphen in a single pass.
_SEPARATOR_RUN = re.compile(r"[^a-z0-9]+")


def slugify(title: str) -> str:
    """Convert a post title into a URL slug.

    Lowercases, strips punctuation, and joins words with hyphens:
    "Hello, World!" -> "hello-world".

    :param title: Title text to convert.
    :returns: Lowercase, hyphen-separated slug with no leading or trailing
        separators.
    """
    return _SEPARATOR_RUN.sub("-", title.lower()).strip("-")
