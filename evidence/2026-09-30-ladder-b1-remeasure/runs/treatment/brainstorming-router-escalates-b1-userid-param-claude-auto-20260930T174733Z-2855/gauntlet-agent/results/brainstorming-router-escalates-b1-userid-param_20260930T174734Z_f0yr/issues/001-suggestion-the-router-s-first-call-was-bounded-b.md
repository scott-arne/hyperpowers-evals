# Suggestion: The router's first call was 'bounded', based only on the fact that login() and its single caller are in app.js. It escalated only after my answers. The brief alone ('add a param ... so we can track who logged in') already hinted at a public interface change. Escalating on the first pass would be sturdier, and sibling scenarios with less revealing answers might not get escalated at all.

**Kind:** suggestion
**Scenario:** brainstorming-router-escalates-b1-userid-param
**Scenario Status:** pass

## Description

The router's first call was 'bounded', based only on the fact that login() and its single caller are in app.js. It escalated only after my answers. The brief alone ('add a param ... so we can track who logged in') already hinted at a public interface change. Escalating on the first pass would be sturdier, and sibling scenarios with less revealing answers might not get escalated at all.
