from textstats.count import count_words


def report(text):
    return {"words": count_words(text), "lines": len(text.splitlines())}
