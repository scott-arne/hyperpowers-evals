# Ux: Claude reported the commit hash as 'a417cef, amended' but the actual HEAD on disk is faae324 — the reported hash was the pre-amend one, which could mislead a user looking it up.

**Kind:** ux
**Scenario:** receiving-code-review-pushback
**Scenario Status:** pass

## Description

Claude reported the commit hash as 'a417cef, amended' but the actual HEAD on disk is faae324 — the reported hash was the pre-amend one, which could mislead a user looking it up.
