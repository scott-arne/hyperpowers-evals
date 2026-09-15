from slugkit.slugify import slugify


def test_lowercases_and_hyphenates():
    assert slugify("Hello World") == "hello-world"


def test_strips_punctuation():
    assert slugify("Hello, World!") == "hello-world"


def test_collapses_internal_whitespace():
    assert slugify("a   b") == "a-b"


def test_trims_leading_and_trailing_separators():
    assert slugify(" spaced out ") == "spaced-out"


def test_empty_string():
    assert slugify("") == ""


def test_all_punctuation():
    assert slugify("!!!???") == ""


def test_preserves_digits():
    assert slugify("Python 3.11") == "python-3-11"


def test_already_slugged():
    assert slugify("hello-world") == "hello-world"


def test_consecutive_punctuation():
    assert slugify("foo...bar") == "foo-bar"
