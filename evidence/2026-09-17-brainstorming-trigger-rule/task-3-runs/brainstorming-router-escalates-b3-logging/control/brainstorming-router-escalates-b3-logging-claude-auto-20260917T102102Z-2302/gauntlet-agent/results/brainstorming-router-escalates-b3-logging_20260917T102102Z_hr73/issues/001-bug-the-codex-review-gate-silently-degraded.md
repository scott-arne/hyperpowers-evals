# Bug: The Codex review gate silently degraded: agent reported "Both captures normalized to incomplete ('json payload has no terminal verdict')" and "codexPath resolves to a 0.0.0-stub build that returns {} for every call", plus "status --json showed {\"running\":[],\"latestFinished\":null,\"recent\":[]} — no job was ever recorded. The preflight reported ok". Preflight reporting ok while every call returns {} is a mismatch worth investigating (may be intentional stub fixture).

**Kind:** bug
**Scenario:** brainstorming-router-escalates-b3-logging
**Scenario Status:** pass

## Description

The Codex review gate silently degraded: agent reported "Both captures normalized to incomplete ('json payload has no terminal verdict')" and "codexPath resolves to a 0.0.0-stub build that returns {} for every call", plus "status --json showed {\"running\":[],\"latestFinished\":null,\"recent\":[]} — no job was ever recorded. The preflight reported ok". Preflight reporting ok while every call returns {} is a mismatch worth investigating (may be intentional stub fixture).
