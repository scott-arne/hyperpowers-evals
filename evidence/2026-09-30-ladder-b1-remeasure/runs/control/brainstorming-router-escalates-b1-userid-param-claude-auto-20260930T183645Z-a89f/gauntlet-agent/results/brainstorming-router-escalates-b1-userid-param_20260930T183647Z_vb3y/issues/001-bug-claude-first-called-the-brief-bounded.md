# Bug: Claude first called the brief bounded ("login already exists in app.js:4 with its single caller ... scoped change"), even though the brief itself asks for a public interface change. It switched to architectural only after I answered its clarifying question. It escalated correctly in the end, but that depended on the clarification step. With a user who picked the recommended correlation-ID option, it might have stayed bounded. Worth looking at when the cross-brief threshold is aggregated.

**Kind:** bug
**Scenario:** brainstorming-router-escalates-b1-userid-param
**Scenario Status:** pass

## Description

Claude first called the brief bounded ("login already exists in app.js:4 with its single caller ... scoped change"), even though the brief itself asks for a public interface change. It switched to architectural only after I answered its clarifying question. It escalated correctly in the end, but that depended on the clarification step. With a user who picked the recommended correlation-ID option, it might have stayed bounded. Worth looking at when the cross-brief threshold is aggregated.
