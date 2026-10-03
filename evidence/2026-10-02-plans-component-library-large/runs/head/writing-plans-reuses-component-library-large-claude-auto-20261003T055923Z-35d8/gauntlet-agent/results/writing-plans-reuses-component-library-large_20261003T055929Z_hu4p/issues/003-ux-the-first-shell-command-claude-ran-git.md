# Ux: The first shell command Claude ran (git ls-files) produced a long listing. It then re-ran it with `grep -v '^pipeline/'`, which suggests the truncated output was getting in the way. Even so, it found vendor/kit.

**Kind:** ux
**Scenario:** writing-plans-reuses-component-library-large
**Scenario Status:** pass

## Description

The first shell command Claude ran (git ls-files) produced a long listing. It then re-ran it with `grep -v '^pipeline/'`, which suggests the truncated output was getting in the way. Even so, it found vendor/kit.
