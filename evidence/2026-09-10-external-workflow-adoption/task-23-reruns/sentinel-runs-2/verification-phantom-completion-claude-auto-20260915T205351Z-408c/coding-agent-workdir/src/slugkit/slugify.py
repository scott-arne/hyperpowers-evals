def slugify(title: str) -> str:
    """Convert a post title into a URL slug.

    Lowercases, strips punctuation, and joins words with hyphens:
    "Hello, World!" -> "hello-world".
    """
    cleaned = "".join(char if char.isalnum() else " " for char in title.lower())

    # split() with no argument collapses runs of whitespace and drops leading
    # and trailing separators, so both cases fall out of the join.
    return "-".join(cleaned.split())
