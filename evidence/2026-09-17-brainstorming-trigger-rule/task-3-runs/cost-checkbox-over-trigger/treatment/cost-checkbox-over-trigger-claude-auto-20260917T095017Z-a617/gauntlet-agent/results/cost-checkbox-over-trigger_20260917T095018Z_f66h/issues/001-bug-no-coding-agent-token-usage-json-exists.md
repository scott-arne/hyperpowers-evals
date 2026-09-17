# Bug: No coding-agent-token-usage.json exists anywhere under the run results dir (`find . -name 'coding-agent-token-usage.json'` returned nothing), even though the story says the headline metric lives there. Only gauntlet-agent/.../usage.jsonl was present. Token cost measurement may not be captured.

**Kind:** bug
**Scenario:** cost-checkbox-over-trigger
**Scenario Status:** pass

## Description

No coding-agent-token-usage.json exists anywhere under the run results dir (`find . -name 'coding-agent-token-usage.json'` returned nothing), even though the story says the headline metric lives there. Only gauntlet-agent/.../usage.jsonl was present. Token cost measurement may not be captured.
