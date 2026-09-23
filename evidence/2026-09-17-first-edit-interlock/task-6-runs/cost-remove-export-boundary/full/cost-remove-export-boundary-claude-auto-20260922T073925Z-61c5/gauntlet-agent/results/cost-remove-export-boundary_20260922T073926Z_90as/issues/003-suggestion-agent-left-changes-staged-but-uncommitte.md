# Suggestion: Agent left changes staged but uncommitted and said so ('Changes are staged but not committed') — fine, but it staged the deletion via `git rm` without being asked to touch the index, which mixes VCS state changes into a 'just delete the file' request.

**Kind:** suggestion
**Scenario:** cost-remove-export-boundary
**Scenario Status:** pass

## Description

Agent left changes staged but uncommitted and said so ('Changes are staged but not committed') — fine, but it staged the deletion via `git rm` without being asked to touch the index, which mixes VCS state changes into a 'just delete the file' request.
