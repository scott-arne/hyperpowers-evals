# Hand-Read of the Treatment Sessions

No counted session started the companion and every composed final passed,
so the README's hand-read of started and failed sessions has no sessions.
What remains is the classification of each not-started session, whether it
mentioned a browser or mockup, and the path it announced. All three were read
from the main session transcript. The path is the first assistant text
naming spike, bounded or architectural.

Classes, as pre-registered:
- (a) showed candidate outputs as text in chat;
- (b) asked the choice through `AskUserQuestion`, noting whether text samples
  came before it;
- (c) never posed the output choice, and decided it in the design;
- (d) other.

The deterministic count governs the reading. These readouts carry no
reading.

Run ids below drop the common prefix
`brainstorming-bounded-companion-closed-cli-output-claude-auto-20261002T`.

## Summary

| Run | Skill tool | Path announced | Class | Samples before the question | Browser or companion mentioned | Pick |
|---|---|---|---|---|---|---|
| 191046Z-1570 | yes | bounded | (b) | in chat | named as not opened | B, column plus a failing-checks section (recommended) |
| 191436Z-7463 | yes | bounded | (b) | in chat | named as not opened | B, column plus a failure list (recommended) |
| 191823Z-3ae8 | yes | bounded | (b) | in chat | named as not needed | column plus a failure list (recommended) |
| 192159Z-18d2 | yes | bounded | (b) | in chat | named as not opened | A + C, named column plus a heading count (recommended) |
| 192531Z-4f6f | yes | bounded | (a) | in chat, asked in prose | none | B plus the heading count (recommended) |
| 191046Z-ab35 | yes | none | (b) | none | none | B, column plus a failures list (recommended) |
| 191431Z-2e64 | yes | bounded | (b) | in chat | named as not opened | B, column plus details (recommended) |
| 191809Z-f758 | yes | none | (b) | only in the question's previews | none | column naming the checks (not the recommended) |
| 192132Z-b821 | yes | bounded | (b) | in chat | named as not opened | A, column naming the checks (not the recommended) |
| 192446Z-fff5 | yes | bounded | (b) | in chat | named as not opened | A, column naming the checks (not the recommended) |

Totals:
- **Class:** (a) 1, (b) 9, (c) 0, (d) 0. Of the nine (b) sessions, seven put
  text samples in chat before the question, one put them only in the
  question's `preview` fields, and one showed no samples.
- **Browser or mockup:** no session offered one. Seven named the browser or
  the companion as something they were not opening, each because the output
  is terminal text. None read `visual-companion.md`.
- **Path:** 8 bounded, 0 spike, 0 architectural, 2 none. Every announcement
  came in the first assistant text, before the question.
- Every session presented a design and waited for a yes before writing code.

The seven that named the companion gave the terminal-text reason in the same
sentence:
- "The terminal is where this output will appear, so I'll show the options as
  plain text here instead of opening the browser companion." (`1570`)
- "The output is terminal text, so I'm sketching the options here instead of
  opening the visual companion." (`7463`)
- "Since this is terminal output, I'll show the layout options as plain text
  below. A browser mockup wouldn't add anything." (`3ae8`)
- "The output is plain terminal text, so I'll show the layout options right
  here rather than in the browser companion." (`18d2`)
- "This is terminal output, so text mockups in chat show it exactly as it
  will look, and I won't open the browser companion." (`2e64`)
- "I'm not opening the visual companion, because this is terminal output and
  plain text in chat shows it exactly as it will look." (`b821`)
- "I'm showing the options as text right here, since this is terminal output
  and this is how it will actually look (so no browser companion)." (`fff5`)

`4f6f` said "The output is terminal text, so I'll show the layout options as
plain text too" without naming a browser.

**Not pre-registered, no reading.** Five sessions put the question as where
the health information goes, the treatment's wording: `2e64`, `7463`, `b821`
and `fff5` in chat, `f758` in its question. Three of them (`2e64`, `f758`,
`fff5`) headed the question "Placement". Three put it as how much goes in the
table and how much below it (`1570`, `3ae8`, `18d2`). The pilot, at the
control, put it as "how much failure detail goes in the table".

## Sessions

- **191046Z-1570.** Announced bounded, said it would show the options as
  plain text, and drew a named HEALTH column and a column plus a "Failing
  checks" section in chat, describing indented detail lines in words. It
  recommended the section and asked through `AskUserQuestion`. The operator
  picked it; the design added an unhealthy count to the heading.
- **191436Z-7463.** Announced bounded and called the question "where the
  health information goes in the output". Drew a named column and a column
  plus a failure list, and described an all-inline option in words.
  Recommended the list and asked through `AskUserQuestion`.
- **191823Z-3ae8.** Announced bounded. Drew a column plus a failure list
  (labeled A, recommended) and a column naming the checks, and described a
  status-word column in words. Asked through `AskUserQuestion`.
- **192159Z-18d2.** Announced bounded. Drew a named column and indented
  detail lines, and described a heading count that combines with either.
  Recommended the named column plus the count, asked through
  `AskUserQuestion` with four combinations, and the operator picked the
  recommendation. The heading it shipped reads "3 with failing health
  checks".
- **192531Z-4f6f.** Announced bounded. Drew a named column and a column plus
  a details section, and described a count-only column in words. It put the
  files and tests for either pick in the same message and asked in prose
  rather than through `AskUserQuestion`, ending "I'll wait for your
  go-ahead before changing anything." The operator's reply picked the
  section and the heading count and approved the plan; implementation
  followed it. Class (a).
- **191046Z-ab35.** Named no path and wrote no text before its question. It
  went from reading the repo straight to `AskUserQuestion`, with options
  given only as labels and one-line descriptions. After the pick it
  presented the design in chat and waited for a yes. Class (b), no samples.
- **191431Z-2e64.** Announced bounded, called the main question "where the
  health information goes", and drew three placements from the real
  snapshot: a named column, a column plus details, and a heading count with a
  short column. Asked through `AskUserQuestion`, headed "Placement".
- **191809Z-f758.** Named no path and wrote no text before its question. Its
  `AskUserQuestion`, headed "Placement", carried a text sample of each option
  in the `preview` fields. The operator picked the column naming the checks,
  not the recommended column plus section. Design in chat, then a yes. Class
  (b), samples only in the previews.
- **192132Z-b821.** Announced bounded, called the decision "where the failure
  info goes", and drew a named column and a column plus details, describing
  indented lines in words. Recommended the details list; the operator picked
  the named column. Asked through `AskUserQuestion`.
- **192446Z-fff5.** Announced bounded, asked "where should health go in the
  output?", and drew three layouts from the real snapshot. Recommended the
  section; the operator picked the named column. Asked through
  `AskUserQuestion`, headed "Placement". Its heading wording changed from the
  design's "3 failing health checks" to "3 with failing health checks",
  which it reported: the snapshot has 4 failing checks across 3 services.

## Pilot (control, uncounted)

`190709Z-a6eb`, at 5f4ab78. Announced bounded, said "The output is plain
terminal text, so I've drawn the options as text below instead of opening a
browser", drew three layouts in chat, and asked in prose. Class (a). The
operator picked the named column. It did not start the companion; that
carries no reading.
