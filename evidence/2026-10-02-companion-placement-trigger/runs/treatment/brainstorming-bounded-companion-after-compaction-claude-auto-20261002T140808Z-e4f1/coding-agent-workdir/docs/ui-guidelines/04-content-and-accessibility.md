# 04 Content and accessibility

How the interface talks, and the accessibility bar every page clears before it
ships.

## Voice

Plain, direct, and calm. Write the way a helpful colleague would say it out
loud. Lead with what the user can do, not with what went wrong. Prefer short
sentences and common words; cut any word that does not change the meaning.

- Address the user as "you". Refer to the product as "we" only in messages
  where we did something ("We sent a code to your email").
- Never blame the user. "That code has expired" rather than "You entered an
  expired code".
- No exclamation marks outside of genuinely celebratory moments, and there are
  very few of those in a settings page.
- No jargon the user did not introduce. "Sign in", not "authenticate".

## Capitalization and punctuation

- Sentence case everywhere: page titles, headings, labels, buttons, menu items,
  tab names, and table headers. Proper nouns keep their capitals.
- Buttons are verbs or verb phrases: "Save", "Regenerate token", "Discard".
  Never "OK" or "Yes" in a Dialog; repeat the action.
- No period at the end of a label, button, heading, or single-sentence hint.
  Use periods in messages and multi-sentence help.
- Use the serial comma. Use an en dash for ranges ("9–5") and an em dash with
  no spaces for breaks in a sentence, sparingly.

## Terminology

Use the preferred term; reviewers flag the avoided forms.

| Preferred | Avoid | Notes |
|---|---|---|
| sign in | log in, login (as a verb), authenticate | "Sign-in" as a noun or adjective |
| sign out | log out, logout | "Sign-out" as a noun |
| sign up | register, create login | Only on the public site |
| account | profile (for account-level settings) | Profile means the public-facing identity |
| profile | account (for public-facing identity) | Display name and avatar live here |
| settings | preferences, options, configuration | One word for every settings surface |
| display name | username, handle, nickname | There are no usernames in this product |
| email address | e-mail, mail, email ID | "Email" alone is fine in a label |
| time zone | timezone, TZ | Two words |
| language | locale | Locale is an implementation term |
| theme | appearance mode, skin | Light, Dark, Match system |
| notifications | alerts, messages | Alerts are a different, admin-only feature |
| email notifications | email alerts | Matches the field label |
| push notifications | mobile alerts, device notifications | Only for the mobile app and browser push |
| weekly digest | weekly summary, newsletter | Not a marketing email |
| two-factor authentication | 2FA, MFA, two-step verification | "Two-factor auth" in tight labels |
| recovery codes | backup codes | Shown once at setup |
| session timeout | idle timeout, auto logout | Minutes of inactivity before sign-out |
| API token | API key, access token, secret | Shown once, then masked |
| regenerate | reset, rotate, refresh | For tokens and codes |
| delete | remove, erase | Delete is permanent; remove is for detaching |
| remove | delete (when nothing is destroyed) | Removing a member keeps their account |
| save | apply, submit, update | For forms with a Save button |
| cancel | abort, back | Leaves without saving |
| discard | throw away, lose | Only for unsaved changes |
| dialog | modal, popup | In documentation; never shown to users |
| banner | alert bar, notice | In documentation |
| toast | snackbar, notification | In documentation |
| required | mandatory, compulsory | "(required)" after a label |
| optional | not required | "(optional)" after a label |
| invalid | wrong, bad, incorrect | In documentation; messages describe the fix |
| expired | timed out | For codes and sessions |
| offline | disconnected, no connection | In messages |
| workspace | organization, team, tenant | The billing and membership unit |
| member | user (inside a workspace) | User is fine in documentation |
| owner | admin (for the billing owner) | Admins are a separate role |
| admin | administrator, superuser | Short form everywhere |

## Formats

| Value | Format | Example (en-US) | Notes |
|---|---|---|---|
| Date | Locale medium date | Sep 14, 2026 | Never numeric-only in the interface |
| Date and time | Locale medium date, short time | Sep 14, 2026, 3:05 PM | Show the time zone when it differs from the user's |
| Relative time | Rounded, past only | 5 minutes ago | Switch to an absolute date after 7 days |
| Duration | Largest two units | 1 hr 20 min | Never "80 minutes" |
| Number | Locale grouping | 12,480 | Tabular figures in tables |
| Percentage | Up to one decimal | 12.5% | No space before % in en-US |
| Currency | Locale currency format | $1,250.00 | Always two decimals |
| File size | Binary units, one decimal | 2.4 MB | Use MB, not MiB, in the interface |
| Time zone | Zone name with UTC offset | Pacific Time (UTC−07:00) | Use the minus sign, not a hyphen |
| Phone | National format when local, else E.164 | (555) 010-4477 | Store E.164 |

## Accessibility checklist

Every page clears every row before it ships. "How to check" is what reviewers
actually do.

| Criterion | Level | Requirement | How to check |
|---|---|---|---|
| 1.1.1 Non-text content | A | Every meaningful image and icon has a text alternative; decorative ones are hidden | Inspect alt and aria-hidden on every img and svg |
| 1.3.1 Info and relationships | A | Headings, lists, tables, labels, and fieldsets are real elements, not styled divs | Read the page with styles disabled |
| 1.3.2 Meaningful sequence | A | DOM order matches visual order | Tab through the page and watch the focus order |
| 1.3.3 Sensory characteristics | A | Instructions do not rely on shape, position, or color alone | Read every instruction out of context |
| 1.3.4 Orientation | AA | Works in portrait and landscape | Rotate a tablet emulator |
| 1.3.5 Identify input purpose | AA | Personal-data fields carry autocomplete tokens | Check against the field table in 03 Forms |
| 1.4.1 Use of color | A | Color is never the only way to convey state | View in grayscale |
| 1.4.3 Contrast (minimum) | AA | 4.5:1 for body text, 3:1 for large text | Use only the approved pairs in 01 Foundations |
| 1.4.4 Resize text | AA | Usable at 200% browser zoom without loss | Zoom to 200% and complete the main task |
| 1.4.5 Images of text | AA | No text rendered as images | Search the page for text in img |
| 1.4.10 Reflow | AA | No horizontal scrolling at 320 CSS px wide | Set the viewport to 320px |
| 1.4.11 Non-text contrast | AA | 3:1 for control borders and focus indicators | Check input borders and the focus ring |
| 1.4.12 Text spacing | AA | No clipping with increased letter, word, and line spacing | Apply the text-spacing bookmarklet |
| 1.4.13 Content on hover or focus | AA | Tooltips are dismissible, hoverable, and persistent | Hover, then move into the tooltip, then press Escape |
| 2.1.1 Keyboard | A | Every action is reachable and operable by keyboard | Unplug the mouse |
| 2.1.2 No keyboard trap | A | Focus can always leave a component | Tab into and out of every widget |
| 2.4.1 Bypass blocks | A | A skip link reaches the main content | Press Tab once on load |
| 2.4.2 Page titled | A | The document title names the page and the product | Check the browser tab |
| 2.4.3 Focus order | A | Focus moves in a logical order | Tab through and note every jump |
| 2.4.4 Link purpose | A | Link text makes sense out of context | List every link and read it alone |
| 2.4.6 Headings and labels | AA | Headings and labels describe their content | Read the heading outline alone |
| 2.4.7 Focus visible | AA | The focus ring is always visible | Tab through on every surface color |
| 2.4.11 Focus not obscured | AA | Sticky headers and footers never hide the focused element | Tab to fields near the sticky footer |
| 2.5.3 Label in name | A | The accessible name contains the visible label | Compare labels with the accessibility tree |
| 2.5.7 Dragging movements | AA | Anything draggable has a non-drag alternative | Try every drag interaction by keyboard |
| 2.5.8 Target size | AA | Targets are at least 24 by 24 CSS px | Measure IconButtons and checkboxes |
| 3.1.1 Language of page | A | The html element has a lang attribute | Inspect the root element |
| 3.2.1 On focus | A | Focus never triggers a change of context | Tab through every field |
| 3.2.2 On input | A | Changing a field never navigates or submits on its own | Change every select and radio |
| 3.3.1 Error identification | A | Errors are identified in text | Submit the form empty |
| 3.3.2 Labels or instructions | A | Every field has a label and needed instructions | Read the field table in 03 Forms |
| 3.3.3 Error suggestion | AA | Error messages say how to fix the problem | Compare against the message catalog |
| 3.3.4 Error prevention | AA | Destructive and financial actions are confirmable | Trigger every delete and regenerate |
| 3.3.7 Redundant entry | A | Previously entered information is not requested again | Walk the longest flow twice |
| 3.3.8 Accessible authentication | AA | No cognitive test to sign in; paste is allowed | Paste into every password and code field |
| 4.1.2 Name, role, value | A | Custom widgets expose correct roles and states | Inspect switches, tabs, and accordions |
| 4.1.3 Status messages | AA | Toasts and inline status are announced without moving focus | Listen with a screen reader on save |

## Component accessibility reference

What every shared component from 02 Components must expose, and how reviewers
check it. A component that fails a row here fails review regardless of how it
looks.

### Button

| Criterion | Requirement | How to check |
|---|---|---|
| Role | Exposes button | Inspect the accessibility tree in browser dev tools |
| Accessible name | Named by its label text | Compare the computed name with the visible text |
| Keyboard | Enter and Space activate | Operate it with the keyboard alone, mouse unplugged |
| Focus | Visible ring from 01 Foundations on :focus-visible; never removed | Tab to it on every surface color |
| State | aria-busy while loading | Change its state and listen with VoiceOver and NVDA |
| Target size | 24 by 24 px; 36 px tall at md | Measure the hit area in dev tools |

### IconButton

| Criterion | Requirement | How to check |
|---|---|---|
| Role | Exposes button | Inspect the accessibility tree in browser dev tools |
| Accessible name | Named by the required label prop | Compare the computed name with the visible text |
| Keyboard | Enter and Space activate | Operate it with the keyboard alone, mouse unplugged |
| Focus | Visible ring from 01 Foundations on :focus-visible; never removed | Tab to it on every surface color |
| State | aria-pressed when it toggles | Change its state and listen with VoiceOver and NVDA |
| Target size | 28 px square minimum | Measure the hit area in dev tools |

### TextInput

| Criterion | Requirement | How to check |
|---|---|---|
| Role | Exposes textbox | Inspect the accessibility tree in browser dev tools |
| Accessible name | Named by the visible label via for and id | Compare the computed name with the visible text |
| Keyboard | Typing edits; Enter submits the form | Operate it with the keyboard alone, mouse unplugged |
| Focus | Visible ring from 01 Foundations on :focus-visible; never removed | Tab to it on every surface color |
| State | aria-invalid and aria-describedby for the message | Change its state and listen with VoiceOver and NVDA |
| Target size | Full control height, 36 px | Measure the hit area in dev tools |

### Textarea

| Criterion | Requirement | How to check |
|---|---|---|
| Role | Exposes textbox with aria-multiline | Inspect the accessibility tree in browser dev tools |
| Accessible name | Named by the visible label via for and id | Compare the computed name with the visible text |
| Keyboard | Enter inserts a line break | Operate it with the keyboard alone, mouse unplugged |
| Focus | Visible ring from 01 Foundations on :focus-visible; never removed | Tab to it on every surface color |
| State | aria-invalid; the counter is aria-live polite | Change its state and listen with VoiceOver and NVDA |
| Target size | Full control height | Measure the hit area in dev tools |

### Select

| Criterion | Requirement | How to check |
|---|---|---|
| Role | Exposes combobox with a listbox popup | Inspect the accessibility tree in browser dev tools |
| Accessible name | Named by the visible label | Compare the computed name with the visible text |
| Keyboard | Space or Enter opens; arrows move; Escape closes | Operate it with the keyboard alone, mouse unplugged |
| Focus | Visible ring from 01 Foundations on :focus-visible; never removed | Tab to it on every surface color |
| State | aria-expanded and aria-activedescendant | Change its state and listen with VoiceOver and NVDA |
| Target size | 36 px tall trigger | Measure the hit area in dev tools |

### Checkbox

| Criterion | Requirement | How to check |
|---|---|---|
| Role | Exposes checkbox | Inspect the accessibility tree in browser dev tools |
| Accessible name | Named by the label to its right | Compare the computed name with the visible text |
| Keyboard | Space toggles | Operate it with the keyboard alone, mouse unplugged |
| Focus | Visible ring from 01 Foundations on :focus-visible; never removed | Tab to it on every surface color |
| State | aria-checked, including mixed | Change its state and listen with VoiceOver and NVDA |
| Target size | 24 by 24 px including the label hit area | Measure the hit area in dev tools |

### Switch

| Criterion | Requirement | How to check |
|---|---|---|
| Role | Exposes switch | Inspect the accessibility tree in browser dev tools |
| Accessible name | Named by the setting name, never the state | Compare the computed name with the visible text |
| Keyboard | Space toggles | Operate it with the keyboard alone, mouse unplugged |
| Focus | Visible ring from 01 Foundations on :focus-visible; never removed | Tab to it on every surface color |
| State | aria-checked | Change its state and listen with VoiceOver and NVDA |
| Target size | 44 by 24 px track | Measure the hit area in dev tools |

### RadioGroup

| Criterion | Requirement | How to check |
|---|---|---|
| Role | Exposes radiogroup containing radio items | Inspect the accessibility tree in browser dev tools |
| Accessible name | Named by the fieldset legend | Compare the computed name with the visible text |
| Keyboard | Arrows move and select; Tab leaves the group | Operate it with the keyboard alone, mouse unplugged |
| Focus | Visible ring from 01 Foundations on :focus-visible; never removed | Tab to it on every surface color |
| State | aria-checked on each item | Change its state and listen with VoiceOver and NVDA |
| Target size | 24 by 24 px per item including the label | Measure the hit area in dev tools |

### Card

| Criterion | Requirement | How to check |
|---|---|---|
| Role | Exposes region when it has a title, otherwise none | Inspect the accessibility tree in browser dev tools |
| Accessible name | Named by its heading via aria-labelledby | Compare the computed name with the visible text |
| Keyboard | Not focusable itself | Operate it with the keyboard alone, mouse unplugged |
| Focus | Visible ring from 01 Foundations on :focus-visible; never removed | Tab to it on every surface color |
| State | none | Change its state and listen with VoiceOver and NVDA |
| Target size | Not applicable | Measure the hit area in dev tools |

### Tabs

| Criterion | Requirement | How to check |
|---|---|---|
| Role | Exposes tablist, tab, and tabpanel | Inspect the accessibility tree in browser dev tools |
| Accessible name | Named by each tab's label | Compare the computed name with the visible text |
| Keyboard | Arrows move; Enter selects in manual mode | Operate it with the keyboard alone, mouse unplugged |
| Focus | Visible ring from 01 Foundations on :focus-visible; never removed | Tab to it on every surface color |
| State | aria-selected and aria-controls | Change its state and listen with VoiceOver and NVDA |
| Target size | 36 px tall tabs | Measure the hit area in dev tools |

### Accordion

| Criterion | Requirement | How to check |
|---|---|---|
| Role | Exposes button headers controlling regions | Inspect the accessibility tree in browser dev tools |
| Accessible name | Named by the header text | Compare the computed name with the visible text |
| Keyboard | Enter and Space toggle | Operate it with the keyboard alone, mouse unplugged |
| Focus | Visible ring from 01 Foundations on :focus-visible; never removed | Tab to it on every surface color |
| State | aria-expanded and aria-controls | Change its state and listen with VoiceOver and NVDA |
| Target size | Full header width, 40 px tall | Measure the hit area in dev tools |

### Banner

| Criterion | Requirement | How to check |
|---|---|---|
| Role | Exposes status for info and success, alert for warning and danger | Inspect the accessibility tree in browser dev tools |
| Accessible name | Named by its title | Compare the computed name with the visible text |
| Keyboard | Not focusable unless it has an action | Operate it with the keyboard alone, mouse unplugged |
| Focus | Visible ring from 01 Foundations on :focus-visible; never removed | Tab to it on every surface color |
| State | Announced on appearance | Change its state and listen with VoiceOver and NVDA |
| Target size | Dismiss button 28 px square | Measure the hit area in dev tools |

### Toast

| Criterion | Requirement | How to check |
|---|---|---|
| Role | Exposes status in a live region | Inspect the accessibility tree in browser dev tools |
| Accessible name | Named by its message | Compare the computed name with the visible text |
| Keyboard | Focus does not move to it; F6 reaches the region | Operate it with the keyboard alone, mouse unplugged |
| Focus | Visible ring from 01 Foundations on :focus-visible; never removed | Tab to it on every surface color |
| State | Announced politely | Change its state and listen with VoiceOver and NVDA |
| Target size | Action and dismiss 28 px square | Measure the hit area in dev tools |

### Dialog

| Criterion | Requirement | How to check |
|---|---|---|
| Role | Exposes dialog with aria-modal | Inspect the accessibility tree in browser dev tools |
| Accessible name | Named by its title via aria-labelledby | Compare the computed name with the visible text |
| Keyboard | Escape closes when dismissible; Tab is trapped inside | Operate it with the keyboard alone, mouse unplugged |
| Focus | Visible ring from 01 Foundations on :focus-visible; never removed | Tab to it on every surface color |
| State | Focus returns to the trigger on close | Change its state and listen with VoiceOver and NVDA |
| Target size | Close button 28 px square | Measure the hit area in dev tools |

### Badge

| Criterion | Requirement | How to check |
|---|---|---|
| Role | Exposes none; text in context | Inspect the accessibility tree in browser dev tools |
| Accessible name | Named by the text it contains | Compare the computed name with the visible text |
| Keyboard | Not focusable | Operate it with the keyboard alone, mouse unplugged |
| Focus | Visible ring from 01 Foundations on :focus-visible; never removed | Tab to it on every surface color |
| State | Counts include a visually hidden noun | Change its state and listen with VoiceOver and NVDA |
| Target size | Not applicable | Measure the hit area in dev tools |

## Locale formats

The supported locales and how the formats above render in each. The
formatting library produces these; the table is here so reviewers can spot a
hand-formatted value.

| Locale | Date | Date and time | Number | Currency | First day of week |
|---|---|---|---|---|---|
| en-US | Sep 14, 2026 | Sep 14, 2026, 3:05 PM | 12,480.5 | $1,250.00 | Sunday |
| en-GB | 14 Sept 2026 | 14 Sept 2026, 15:05 | 12,480.5 | £1,250.00 | Monday |
| en-CA | Sep 14, 2026 | Sep 14, 2026, 3:05 p.m. | 12,480.5 | $1,250.00 | Sunday |
| en-AU | 14 Sept 2026 | 14 Sept 2026, 3:05 pm | 12,480.5 | $1,250.00 | Monday |
| fr-FR | 14 sept. 2026 | 14 sept. 2026, 15:05 | 12 480,5 | 1 250,00 € | Monday |
| fr-CA | 14 sept. 2026 | 14 sept. 2026, 15 h 05 | 12 480,5 | 1 250,00 $ | Sunday |
| de-DE | 14.09.2026 | 14.09.2026, 15:05 | 12.480,5 | 1.250,00 € | Monday |
| es-ES | 14 sept 2026 | 14 sept 2026, 15:05 | 12.480,5 | 1250,00 € | Monday |
| es-MX | 14 sept 2026 | 14 sept 2026, 15:05 | 12,480.5 | $1,250.00 | Sunday |
| it-IT | 14 set 2026 | 14 set 2026, 15:05 | 12.480,5 | 1.250,00 € | Monday |
| pt-BR | 14 de set. de 2026 | 14 de set. de 2026, 15:05 | 12.480,5 | R$ 1.250,00 | Sunday |
| nl-NL | 14 sep 2026 | 14 sep 2026, 15:05 | 12.480,5 | € 1.250,00 | Monday |
| sv-SE | 14 sep. 2026 | 14 sep. 2026 15:05 | 12 480,5 | 1 250,00 kr | Monday |
| ja-JP | 2026/09/14 | 2026/09/14 15:05 | 12,480.5 | ￥1,250 | Sunday |
| ko-KR | 2026. 9. 14. | 2026. 9. 14. 오후 3:05 | 12,480.5 | ₩1,250 | Sunday |
| zh-CN | 2026年9月14日 | 2026年9月14日 15:05 | 12,480.5 | ¥1,250.00 | Monday |

## Screen reader support

Test with VoiceOver on Safari and NVDA on Firefox before shipping. A page
passes when a screen reader user can complete its main task without sighted
help, hears every validation message when it appears, and hears the save
confirmation without losing their place.
