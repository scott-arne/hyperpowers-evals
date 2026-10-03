# Suggestion: Its very first command ran `git ls-files` with no filter, which in this repo produces the roughly 33KB listing. It recovered right away by filtering out vendor/, pipeline/ and data/ and listing vendor/kit, and that is how it found the kit.

**Kind:** suggestion
**Scenario:** writing-plans-reuses-component-library-large
**Scenario Status:** pass

## Description

Its very first command ran `git ls-files` with no filter, which in this repo produces the roughly 33KB listing. It recovered right away by filtering out vendor/, pipeline/ and data/ and listing vendor/kit, and that is how it found the kit.
