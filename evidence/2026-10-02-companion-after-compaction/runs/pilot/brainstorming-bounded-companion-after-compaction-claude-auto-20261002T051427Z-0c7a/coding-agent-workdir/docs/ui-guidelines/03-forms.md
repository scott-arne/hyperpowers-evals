# 03 Forms

How fields, labels, help, validation, and saving behave on every form in the
app. These rules apply field by field and to the save behavior of a form as a
whole.

## Labels and help

- Every field has a visible label. Placeholder text is never a label and never
  holds information the user needs after they start typing.
- Labels sit above their control, left-aligned, in `--type-label`. The gap from
  label to control is `--space-4`.
- Checkbox and switch labels sit to the right of the control, and the whole
  label is clickable.
- Hint text sits between the label and the control in `--type-body-sm` and
  `--text-secondary`, and the control references it with
  `aria-describedby`.
- Mark required fields with "(required)" after the label when most fields are
  optional, or mark optional fields with "(optional)" when most are required.
  Never rely on an asterisk alone.
- Keep labels to a noun phrase: "Display name", not "Enter your display name".

## Field sizing

Size the control to the value it will hold, not to the container. A five-digit
number in a full-width input reads as a bug.

| Field type | Control | Width token | Validation | Keyboard and input mode | Notes |
|---|---|---|---|---|---|
| Person name | TextInput | `md` | 1 to 80 characters | autocomplete=name | Do not split into first and last unless a downstream system requires it |
| Display name | TextInput | `md` | 1 to 50 characters, trimmed | autocomplete=nickname | Shown to other users |
| Email address | TextInput type=email | `lg` | Syntax check on blur, existence check on save | inputmode=email, autocomplete=email | Changing it sends a confirmation email |
| Phone number | TextInput type=tel | `sm` | E.164 after normalization | inputmode=tel, autocomplete=tel | Show the normalized form after blur |
| URL | TextInput type=url | `lg` | Absolute http or https | inputmode=url | Prefix https:// when the user omits a scheme |
| Password | TextInput type=password | `md` | Policy from the auth service | autocomplete=new-password | Show and hide toggle as an IconButton |
| One-time code | TextInput | `xs` | 6 digits | inputmode=numeric, autocomplete=one-time-code | Paste fills every box |
| Search | TextInput type=search | `lg` | none | enterkeyhint=search | Clear button inside the field |
| Integer quantity | TextInput type=number | `xs` | Min and max from the API | inputmode=numeric | No spinner arrows |
| Duration in minutes | TextInput type=number | `xs` | 1 to 1440 | inputmode=numeric | Suffix "min" inside the field |
| Currency amount | TextInput | `sm` | Two decimals, locale aware | inputmode=decimal | Currency symbol as a prefix |
| Percentage | TextInput | `xs` | 0 to 100 | inputmode=decimal | Suffix "%" |
| Date | Date picker | `sm` | Valid calendar date | Typed entry allowed | Format from 04 Content |
| Date range | Two date pickers | `sm each` | Start before end | Typed entry allowed | Presets in a Select beside it |
| Time | TextInput | `xs` | 24-hour or 12-hour per locale | inputmode=numeric | Never a Select of every minute |
| Time zone | Select searchable | `lg` | IANA zone id | Type-ahead | Default to the browser zone; show the UTC offset in each option |
| Language | Select | `md` | Supported locale list | Type-ahead | Each option in its own language |
| Country | Select searchable | `md` | ISO 3166 list | Type-ahead | Put the detected country first |
| Theme or appearance | RadioGroup | `n/a` | One of the listed values | Arrow keys | Options: Light, Dark, Match system |
| Single on or off setting saved with the form | Checkbox | `n/a` | none | Space toggles | Use Switch only when the change applies immediately |
| Single on or off setting applied immediately | Switch | `n/a` | none | Space toggles | Never inside a form that has a Save button |
| Several independent options | Checkbox list | `n/a` | Optional minimum | Space toggles | Fieldset with a legend |
| One of two to five options | RadioGroup | `n/a` | Required unless a default is safe | Arrow keys | Show every option |
| One of six or more options | Select | `md` | Required unless a default is safe | Type-ahead | Group long lists |
| Long free text | Textarea | `full` | Max length from the API | none | Counter when a max exists |
| Secret value, shown once | Read-only field with copy button | `lg` | none | Copy with one click | Mask after the first view |
| Secret value, regenerable | Read-only field plus Button | `lg` | Confirm before regenerating | none | Regenerating revokes the old value |
| Avatar or image | File input with preview | `n/a` | Type and size from the API | none | Show the current image beside the control |
| Color | Swatch picker | `n/a` | One of the palette tokens | Arrow keys | Never free-form hex |
| Tags | Combobox with chips | `lg` | Max count from the API | Enter adds, Backspace removes | Suggest existing tags first |

## Validation

- Validate on blur for format, on save for anything that needs the server.
  Never validate on every keystroke; the exception is a counter that shows the
  remaining characters.
- An invalid field shows the invalid state from 02 Components and a message
  directly below the control, in `--danger-text`, starting with the field
  name.
- On a failed save, move focus to the first invalid field and show a Banner
  with tone `danger` at the top of the form listing every invalid field as a
  link to that field.
- Keep what the user typed. Never clear a field because it failed validation.

### Message catalog

Use these messages verbatim; reviewers diff against this table. `{field}` is
the field's label in sentence case.

| Code | Message | When |
|---|---|---|
| `required` | {field} is required. | Empty required field on save |
| `too_short` | {field} must be at least {min} characters. | Below minimum length |
| `too_long` | {field} must be {max} characters or fewer. | Above maximum length |
| `email_format` | {field} must be an email address, like name@example.com. | Email syntax check fails |
| `email_taken` | That email address is already in use. | Server rejects the email |
| `url_format` | {field} must be a full web address, starting with https://. | URL syntax check fails |
| `url_unreachable` | We could not reach that address. Check it and try again. | Server cannot fetch the URL |
| `number_format` | {field} must be a number. | Non-numeric entry |
| `number_min` | {field} must be {min} or more. | Below the minimum value |
| `number_max` | {field} must be {max} or less. | Above the maximum value |
| `integer_only` | {field} must be a whole number. | Decimal in an integer field |
| `date_format` | {field} must be a date, like {example}. | Unparseable date |
| `date_past` | {field} must be today or later. | Date in the past where not allowed |
| `date_order` | The end date must be after the start date. | Range out of order |
| `time_format` | {field} must be a time, like {example}. | Unparseable time |
| `zone_unknown` | Choose a time zone from the list. | Free text in a zone field |
| `choice_required` | Choose an option for {field}. | No radio selected |
| `file_type` | {field} must be a {types} file. | Wrong file type |
| `file_size` | {field} must be smaller than {size}. | File too large |
| `password_policy` | Your password needs {rules}. | Fails the auth policy |
| `password_mismatch` | The passwords do not match. | Confirmation differs |
| `code_invalid` | That code is not valid. Check it and try again. | Wrong one-time code |
| `code_expired` | That code has expired. Request a new one. | Expired one-time code |
| `save_conflict` | Someone else changed these settings. Reload to see their changes. | Version conflict on save |
| `save_failed` | We could not save your changes. Try again. | Unexpected server error |
| `offline` | You are offline. Your changes will be saved when you reconnect. | No network on save |
| `session_expired` | Your session has expired. Sign in again to save. | Auth expired on save |
| `rate_limited` | Too many attempts. Try again in {minutes} minutes. | Server rate limit |
| `permission_denied` | You do not have permission to change {field}. | Authorization failure |

## Saving

- A form with a Save button saves every field at once. Show the button in its
  `loading` state while saving and keep it in place; do not move or resize it.
- Disable nothing while saving. If the user edits a field mid-save, the next
  save sends the new value.
- On success, show a Toast ("Settings saved") and keep the user where they
  were. Do not navigate away and do not scroll.
- When the form has unsaved changes and the user tries to leave, confirm with
  a Dialog: title "Discard unsaved changes?", actions "Keep editing" (primary)
  and "Discard" (quiet).
- Settings that take effect immediately use a Switch and never sit inside a
  form with a Save button. Mixing the two on one page is allowed only when the
  immediate settings are clearly separated from the saved ones.
- Secrets (API tokens, recovery codes) are never sent back to the server on
  save. They are read-only, shown masked after the first view, and changed only
  through their own regenerate action with a confirming Dialog.

## Keyboard behavior

| Key | In a text field | On a checkbox or switch | In a select | On the form |
|---|---|---|---|---|
| Tab | Next field | Next field | Next field | Moves through fields in reading order |
| Shift+Tab | Previous field | Previous field | Previous field | Reverse order |
| Enter | Submits the form | No effect | Opens or selects | Submits from any text field |
| Space | Types a space | Toggles | Opens | No effect |
| Escape | Clears a search field | No effect | Closes the list | Closes an open Dialog |
| Arrow keys | Moves the caret | No effect | Moves through options | Moves within a RadioGroup |
| Home / End | Line start or end | No effect | First or last option | No effect |

## Field state reference

What each control looks like and announces in each state. Values are the
semantic tokens from 01 Foundations; reviewers compare rendered states against
these tables.

### TextInput

Renders as a text box. Screen readers announce it as "edit text".

| State | Background | Border | Text | Icon | Announcement |
|---|---|---|---|---|---|
| empty | `--surface-panel` | `--border-default` | `--text-tertiary` placeholder | `--text-tertiary` | "{label}, edit text, empty" |
| filled | `--surface-panel` | `--border-default` | `--text-primary` | `--text-secondary` | "{label}, edit text, {value}" |
| hover | `--surface-panel` | `--border-strong` | `--text-primary` | `--text-secondary` | none; hover is not announced |
| focused | `--surface-panel` | `--border-focus`, 2px ring at 2px offset | `--text-primary` | `--text-primary` | "{label}, edit text, {value or empty}, {hint}" |
| invalid | `--danger-subtle` | `--danger-text` | `--text-primary`, message in `--danger-text` | `--danger-text` alert glyph | "{label}, edit text, invalid entry, {message}" |
| disabled | `--surface-sunken` | `--border-subtle` | `--text-disabled` | `--text-disabled` | "{label}, edit text, dimmed" |
| read-only | `--surface-sunken` | `--border-subtle` | `--text-secondary` | `--text-tertiary` lock glyph | "{label}, edit text, read-only, {value}" |

### Textarea

Renders as a multi-line text box. Screen readers announce it as "edit text, multi-line".

| State | Background | Border | Text | Icon | Announcement |
|---|---|---|---|---|---|
| empty | `--surface-panel` | `--border-default` | `--text-tertiary` placeholder | `--text-tertiary` | "{label}, edit text, multi-line, empty" |
| filled | `--surface-panel` | `--border-default` | `--text-primary` | `--text-secondary` | "{label}, edit text, multi-line, {value}" |
| hover | `--surface-panel` | `--border-strong` | `--text-primary` | `--text-secondary` | none; hover is not announced |
| focused | `--surface-panel` | `--border-focus`, 2px ring at 2px offset | `--text-primary` | `--text-primary` | "{label}, edit text, multi-line, {value or empty}, {hint}" |
| invalid | `--danger-subtle` | `--danger-text` | `--text-primary`, message in `--danger-text` | `--danger-text` alert glyph | "{label}, edit text, multi-line, invalid entry, {message}" |
| disabled | `--surface-sunken` | `--border-subtle` | `--text-disabled` | `--text-disabled` | "{label}, edit text, multi-line, dimmed" |
| read-only | `--surface-sunken` | `--border-subtle` | `--text-secondary` | `--text-tertiary` lock glyph | "{label}, edit text, multi-line, read-only, {value}" |

### Select

Renders as a collapsed list showing the current value. Screen readers announce it as "pop-up button".

| State | Background | Border | Text | Icon | Announcement |
|---|---|---|---|---|---|
| empty | `--surface-panel` | `--border-default` | `--text-tertiary` placeholder | `--text-tertiary` | "{label}, pop-up button, empty" |
| filled | `--surface-panel` | `--border-default` | `--text-primary` | `--text-secondary` | "{label}, pop-up button, {value}" |
| hover | `--surface-panel` | `--border-strong` | `--text-primary` | `--text-secondary` | none; hover is not announced |
| focused | `--surface-panel` | `--border-focus`, 2px ring at 2px offset | `--text-primary` | `--text-primary` | "{label}, pop-up button, {value or empty}, {hint}" |
| invalid | `--danger-subtle` | `--danger-text` | `--text-primary`, message in `--danger-text` | `--danger-text` alert glyph | "{label}, pop-up button, invalid entry, {message}" |
| disabled | `--surface-sunken` | `--border-subtle` | `--text-disabled` | `--text-disabled` | "{label}, pop-up button, dimmed" |
| read-only | `--surface-sunken` | `--border-subtle` | `--text-secondary` | `--text-tertiary` lock glyph | "{label}, pop-up button, read-only, {value}" |

### Checkbox

Renders as a box with a check glyph. Screen readers announce it as "checkbox".

| State | Background | Border | Text | Icon | Announcement |
|---|---|---|---|---|---|
| empty | `--surface-panel` | `--border-strong` | `--text-tertiary` placeholder | `--text-tertiary` | "{label}, checkbox, empty" |
| filled | `--surface-panel` | `--border-strong` | `--text-primary` | `--text-secondary` | "{label}, checkbox, {value}" |
| hover | `--surface-panel` | `--border-strong` | `--text-primary` | `--text-secondary` | none; hover is not announced |
| focused | `--surface-panel` | `--border-focus`, 2px ring at 2px offset | `--text-primary` | `--text-primary` | "{label}, checkbox, {value or empty}, {hint}" |
| invalid | `--danger-subtle` | `--danger-text` | `--text-primary`, message in `--danger-text` | `--danger-text` alert glyph | "{label}, checkbox, invalid entry, {message}" |
| disabled | `--surface-sunken` | `--border-subtle` | `--text-disabled` | `--text-disabled` | "{label}, checkbox, dimmed" |
| read-only | `--surface-sunken` | `--border-subtle` | `--text-secondary` | `--text-tertiary` lock glyph | "{label}, checkbox, read-only, {value}" |

### Switch

Renders as a track and thumb. Screen readers announce it as "switch".

| State | Background | Border | Text | Icon | Announcement |
|---|---|---|---|---|---|
| empty | `--surface-panel` | `--border-default` | `--text-tertiary` placeholder | `--text-tertiary` | "{label}, switch, empty" |
| filled | `--surface-panel` | `--border-default` | `--text-primary` | `--text-secondary` | "{label}, switch, {value}" |
| hover | `--surface-panel` | `--border-strong` | `--text-primary` | `--text-secondary` | none; hover is not announced |
| focused | `--surface-panel` | `--border-focus`, 2px ring at 2px offset | `--text-primary` | `--text-primary` | "{label}, switch, {value or empty}, {hint}" |
| invalid | `--danger-subtle` | `--danger-text` | `--text-primary`, message in `--danger-text` | `--danger-text` alert glyph | "{label}, switch, invalid entry, {message}" |
| disabled | `--surface-sunken` | `--border-subtle` | `--text-disabled` | `--text-disabled` | "{label}, switch, dimmed" |
| read-only | `--surface-sunken` | `--border-subtle` | `--text-secondary` | `--text-tertiary` lock glyph | "{label}, switch, read-only, {value}" |

### RadioGroup

Renders as a dot in a ring, one per option. Screen readers announce it as "radio button".

| State | Background | Border | Text | Icon | Announcement |
|---|---|---|---|---|---|
| empty | `--surface-panel` | `--border-strong` | `--text-tertiary` placeholder | `--text-tertiary` | "{label}, radio button, empty" |
| filled | `--surface-panel` | `--border-strong` | `--text-primary` | `--text-secondary` | "{label}, radio button, {value}" |
| hover | `--surface-panel` | `--border-strong` | `--text-primary` | `--text-secondary` | none; hover is not announced |
| focused | `--surface-panel` | `--border-focus`, 2px ring at 2px offset | `--text-primary` | `--text-primary` | "{label}, radio button, {value or empty}, {hint}" |
| invalid | `--danger-subtle` | `--danger-text` | `--text-primary`, message in `--danger-text` | `--danger-text` alert glyph | "{label}, radio button, invalid entry, {message}" |
| disabled | `--surface-sunken` | `--border-subtle` | `--text-disabled` | `--text-disabled` | "{label}, radio button, dimmed" |
| read-only | `--surface-sunken` | `--border-subtle` | `--text-secondary` | `--text-tertiary` lock glyph | "{label}, radio button, read-only, {value}" |

### Date picker

Renders as a text box with a calendar button. Screen readers announce it as "edit text, date".

| State | Background | Border | Text | Icon | Announcement |
|---|---|---|---|---|---|
| empty | `--surface-panel` | `--border-default` | `--text-tertiary` placeholder | `--text-tertiary` | "{label}, edit text, date, empty" |
| filled | `--surface-panel` | `--border-default` | `--text-primary` | `--text-secondary` | "{label}, edit text, date, {value}" |
| hover | `--surface-panel` | `--border-strong` | `--text-primary` | `--text-secondary` | none; hover is not announced |
| focused | `--surface-panel` | `--border-focus`, 2px ring at 2px offset | `--text-primary` | `--text-primary` | "{label}, edit text, date, {value or empty}, {hint}" |
| invalid | `--danger-subtle` | `--danger-text` | `--text-primary`, message in `--danger-text` | `--danger-text` alert glyph | "{label}, edit text, date, invalid entry, {message}" |
| disabled | `--surface-sunken` | `--border-subtle` | `--text-disabled` | `--text-disabled` | "{label}, edit text, date, dimmed" |
| read-only | `--surface-sunken` | `--border-subtle` | `--text-secondary` | `--text-tertiary` lock glyph | "{label}, edit text, date, read-only, {value}" |

### File input

Renders as a drop zone with a browse button. Screen readers announce it as "button, file upload".

| State | Background | Border | Text | Icon | Announcement |
|---|---|---|---|---|---|
| empty | `--surface-panel` | `--border-default` | `--text-tertiary` placeholder | `--text-tertiary` | "{label}, button, file upload, empty" |
| filled | `--surface-panel` | `--border-default` | `--text-primary` | `--text-secondary` | "{label}, button, file upload, {value}" |
| hover | `--surface-panel` | `--border-strong` | `--text-primary` | `--text-secondary` | none; hover is not announced |
| focused | `--surface-panel` | `--border-focus`, 2px ring at 2px offset | `--text-primary` | `--text-primary` | "{label}, button, file upload, {value or empty}, {hint}" |
| invalid | `--danger-subtle` | `--danger-text` | `--text-primary`, message in `--danger-text` | `--danger-text` alert glyph | "{label}, button, file upload, invalid entry, {message}" |
| disabled | `--surface-sunken` | `--border-subtle` | `--text-disabled` | `--text-disabled` | "{label}, button, file upload, dimmed" |
| read-only | `--surface-sunken` | `--border-subtle` | `--text-secondary` | `--text-tertiary` lock glyph | "{label}, button, file upload, read-only, {value}" |

### Combobox with chips

Renders as a text box followed by a chip list. Screen readers announce it as "combo box".

| State | Background | Border | Text | Icon | Announcement |
|---|---|---|---|---|---|
| empty | `--surface-panel` | `--border-default` | `--text-tertiary` placeholder | `--text-tertiary` | "{label}, combo box, empty" |
| filled | `--surface-panel` | `--border-default` | `--text-primary` | `--text-secondary` | "{label}, combo box, {value}" |
| hover | `--surface-panel` | `--border-strong` | `--text-primary` | `--text-secondary` | none; hover is not announced |
| focused | `--surface-panel` | `--border-focus`, 2px ring at 2px offset | `--text-primary` | `--text-primary` | "{label}, combo box, {value or empty}, {hint}" |
| invalid | `--danger-subtle` | `--danger-text` | `--text-primary`, message in `--danger-text` | `--danger-text` alert glyph | "{label}, combo box, invalid entry, {message}" |
| disabled | `--surface-sunken` | `--border-subtle` | `--text-disabled` | `--text-disabled` | "{label}, combo box, dimmed" |
| read-only | `--surface-sunken` | `--border-subtle` | `--text-secondary` | `--text-tertiary` lock glyph | "{label}, combo box, read-only, {value}" |

### Swatch picker

Renders as a row of palette swatches. Screen readers announce it as "radio group, color".

| State | Background | Border | Text | Icon | Announcement |
|---|---|---|---|---|---|
| empty | `--surface-panel` | `--border-subtle` | `--text-tertiary` placeholder | `--text-tertiary` | "{label}, radio group, color, empty" |
| filled | `--surface-panel` | `--border-subtle` | `--text-primary` | `--text-secondary` | "{label}, radio group, color, {value}" |
| hover | `--surface-panel` | `--border-strong` | `--text-primary` | `--text-secondary` | none; hover is not announced |
| focused | `--surface-panel` | `--border-focus`, 2px ring at 2px offset | `--text-primary` | `--text-primary` | "{label}, radio group, color, {value or empty}, {hint}" |
| invalid | `--danger-subtle` | `--danger-text` | `--text-primary`, message in `--danger-text` | `--danger-text` alert glyph | "{label}, radio group, color, invalid entry, {message}" |
| disabled | `--surface-sunken` | `--border-subtle` | `--text-disabled` | `--text-disabled` | "{label}, radio group, color, dimmed" |
| read-only | `--surface-sunken` | `--border-subtle` | `--text-secondary` | `--text-tertiary` lock glyph | "{label}, radio group, color, read-only, {value}" |

### Read-only field

Renders as a sunken value with a copy button. Screen readers announce it as "read-only text".

| State | Background | Border | Text | Icon | Announcement |
|---|---|---|---|---|---|
| empty | `--surface-panel` | `--border-subtle` | `--text-tertiary` placeholder | `--text-tertiary` | "{label}, read-only text, empty" |
| filled | `--surface-panel` | `--border-subtle` | `--text-primary` | `--text-secondary` | "{label}, read-only text, {value}" |
| hover | `--surface-panel` | `--border-strong` | `--text-primary` | `--text-secondary` | none; hover is not announced |
| focused | `--surface-panel` | `--border-focus`, 2px ring at 2px offset | `--text-primary` | `--text-primary` | "{label}, read-only text, {value or empty}, {hint}" |
| invalid | `--danger-subtle` | `--danger-text` | `--text-primary`, message in `--danger-text` | `--danger-text` alert glyph | "{label}, read-only text, invalid entry, {message}" |
| disabled | `--surface-sunken` | `--border-subtle` | `--text-disabled` | `--text-disabled` | "{label}, read-only text, dimmed" |
| read-only | `--surface-sunken` | `--border-subtle` | `--text-secondary` | `--text-tertiary` lock glyph | "{label}, read-only text, read-only, {value}" |

## Autocomplete tokens

Personal-data fields carry the matching `autocomplete` token so browsers and
password managers can fill them (accessibility checklist row 1.3.5).

| Field | Token | Notes |
|---|---|---|
| Full name | `name` | One field; do not split unless required |
| Given name | `given-name` | Only when a downstream system requires the split |
| Family name | `family-name` | Only when a downstream system requires the split |
| Display name | `nickname` | Shown to other members |
| Email address | `email` | Also on sign-in forms |
| Username for sign-in | `username` | Email doubles as the username here |
| Current password | `current-password` | Sign-in and change-password forms |
| New password | `new-password` | Sign-up and change-password forms |
| One-time code | `one-time-code` | Paste fills every box |
| Phone number | `tel` | Store E.164 |
| Phone country code | `tel-country-code` | Only when collected separately |
| Organization | `organization` | Workspace name on invoices |
| Job title | `organization-title` | Optional profile field |
| Street address line 1 | `address-line1` | Billing address |
| Street address line 2 | `address-line2` | Billing address |
| City | `address-level2` | Billing address |
| State or region | `address-level1` | Billing address |
| Postal code | `postal-code` | Billing address |
| Country | `country` | ISO 3166 code as the value |
| Country name | `country-name` | Display label only |
| Language | `language` | BCP 47 tag as the value |
| Birthday | `bday` | Never required |
| Profile photo URL | `photo` | Avatar URL field |
| Website | `url` | Profile field |
| Time zone | `off` | No standard token; disable autofill |
| Session timeout | `off` | Not personal data |
| API token | `off` | Never autofill secrets |
| Search | `off` | Autofill would leak history |
