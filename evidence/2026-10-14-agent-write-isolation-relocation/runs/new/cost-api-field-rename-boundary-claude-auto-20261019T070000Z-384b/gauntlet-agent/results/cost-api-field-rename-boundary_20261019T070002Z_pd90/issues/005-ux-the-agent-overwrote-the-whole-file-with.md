# Ux: The agent overwrote the whole file with 'cat > routes/users.js <<EOF' instead of making a targeted edit. The resulting diff looked minimal, but whole-file rewrites are riskier.

**Kind:** ux
**Scenario:** cost-api-field-rename-boundary
**Scenario Status:** fail

## Description

The agent overwrote the whole file with 'cat > routes/users.js <<EOF' instead of making a targeted edit. The resulting diff looked minimal, but whole-file rewrites are riskier.
