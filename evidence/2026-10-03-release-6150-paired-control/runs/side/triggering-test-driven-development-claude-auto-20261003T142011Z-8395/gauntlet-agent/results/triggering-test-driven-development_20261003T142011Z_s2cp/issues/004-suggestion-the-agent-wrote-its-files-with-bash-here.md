# Suggestion: The agent wrote its files with bash heredocs (`cat > file <<EOF`) instead of the Edit/Write tools. Graders that only look for Edit/Write events to find 'implementation writes' may miss these.

**Kind:** suggestion
**Scenario:** triggering-test-driven-development
**Scenario Status:** pass

## Description

The agent wrote its files with bash heredocs (`cat > file <<EOF`) instead of the Edit/Write tools. Graders that only look for Edit/Write events to find 'implementation writes' may miss these.
