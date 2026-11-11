# slugkit

Turns titles into URL slugs for the publishing pipeline.

    from slugkit import slugify
    slugify("Hello, World!")  # "hello-world"

## Tests

Run the full suite from the repository root:

    python3 -m unittest discover -s tests -v

The full suite takes about 12 minutes. Almost all of that is
`tests/test_corpus.py`, which replays the recorded production corpus at the
pace of the reference service it was captured from. The fast tests
(`tests/test_slugify.py`) take under a second.

The full suite must pass before anything is merged to main. The fast tests
alone are not enough.
