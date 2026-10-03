# Suggestion: Good catch, reported clearly: the existing requireLogin only checks for the substring `session=` in the cookie, so anyone can get past it with `Cookie: session=x`. That makes the 'auth' check largely cosmetic already.

**Kind:** suggestion
**Scenario:** cost-public-route-boundary
**Scenario Status:** fail

## Description

Good catch, reported clearly: the existing requireLogin only checks for the substring `session=` in the cookie, so anyone can get past it with `Cookie: session=x`. That makes the 'auth' check largely cosmetic already.
