# 02 Components

The shared components every page builds from. Each section lists the props the
component accepts, the token each state resolves to, and the rules reviewers
apply. A page that needs a variant not listed here proposes it in this file
first; one-off variants in page CSS are not accepted.

All components inherit the focus treatment from 01 Foundations: a 2px
`--border-focus` ring at a 2px offset on `:focus-visible`, never on mouse
focus, and never removed.

## Button

Triggers an action. One primary button per view; everything else is secondary or quiet.

**Anatomy:** container, optional leading icon, label, optional trailing icon.

| Prop | Type | Default | Description |
|---|---|---|---|
| `variant` | `'primary' \` | ` 'secondary' \` |  'quiet' \| 'danger'|'secondary'|Visual weight; danger only for destructive actions |
| `size` | `'sm' \` | ` 'md' \` |  'lg'|'md'|Height 28, 36, or 44px |
| `type` | `'button' \` | ` 'submit' \` |  'reset'|'button'|Native button type; forms submit with exactly one submit button |
| `disabled` | `boolean` | `false` | Prefer explaining why over disabling |
| `loading` | `boolean` | `false` | Replaces the leading icon with a spinner and keeps the width |
| `icon` | `IconName` | `none` | Leading icon; icon-only buttons use IconButton |

| State | Background | Border | Text | Notes |
|---|---|---|---|---|
| default | `--accent-fill` | `--accent-fill` | `--text-inverse` | Resting appearance |
| hover | `--surface-hover` over `--accent-fill` | `--border-strong` | `--text-inverse` | Transition `--duration-fast` `--ease-standard` |
| focus-visible | `--accent-fill` | `--border-focus` ring 2px, offset 2px | `--text-inverse` | Keyboard focus only; never remove the ring |
| active | `--surface-selected` | `--border-strong` | `--text-inverse` | Pressed or selected |
| disabled | `--surface-sunken` | `--border-subtle` | `--text-disabled` | `aria-disabled` when it must stay focusable |
| invalid | `--danger-subtle` | `--danger-text` | `--text-inverse` | Pair with a message; color is never the only cue |

## IconButton

An icon-only action for dense toolbars and row actions.

**Anatomy:** container, icon, required accessible label.

| Prop | Type | Default | Description |
|---|---|---|---|
| `icon` | `IconName` | `required` | The glyph |
| `label` | `string` | `required` | Accessible name; also shown as the tooltip |
| `size` | `'sm' \` | ` 'md'` | 'md'|28 or 36px square |
| `pressed` | `boolean \` | ` undefined` | undefined|Set for toggle buttons; renders aria-pressed |

| State | Background | Border | Text | Notes |
|---|---|---|---|---|
| default | `--surface-panel` | `--border-default` | `--text-secondary` | Resting appearance |
| hover | `--surface-hover` over `--surface-panel` | `--border-strong` | `--text-secondary` | Transition `--duration-fast` `--ease-standard` |
| focus-visible | `--surface-panel` | `--border-focus` ring 2px, offset 2px | `--text-secondary` | Keyboard focus only; never remove the ring |
| active | `--surface-selected` | `--border-strong` | `--text-secondary` | Pressed or selected |
| disabled | `--surface-sunken` | `--border-subtle` | `--text-disabled` | `aria-disabled` when it must stay focusable |
| invalid | `--danger-subtle` | `--danger-text` | `--text-secondary` | Pair with a message; color is never the only cue |

## TextInput

Single-line text entry. Always paired with a visible label.

**Anatomy:** label, optional hint, input, optional prefix or suffix, message slot.

| Prop | Type | Default | Description |
|---|---|---|---|
| `label` | `string` | `required` | Visible label above the input |
| `hint` | `string` | `none` | Helper text below the label, above the input |
| `type` | `'text' \` | ` 'email' \` |  'url' \| 'number' \| 'password' \| 'search'|'text'|Native input type |
| `width` | `'xs' \` | ` 'sm' \` |  'md' \| 'lg' \| 'full'|'md'|Sized to the expected value, not the container |
| `required` | `boolean` | `false` | Marks the label with (required); never an asterisk alone |
| `invalid` | `boolean` | `false` | Shows the invalid state; pass a message |
| `message` | `string` | `none` | Validation message, announced politely |

| State | Background | Border | Text | Notes |
|---|---|---|---|---|
| default | `--surface-panel` | `--border-default` | `--text-primary` | Resting appearance |
| hover | `--surface-hover` over `--surface-panel` | `--border-strong` | `--text-primary` | Transition `--duration-fast` `--ease-standard` |
| focus-visible | `--surface-panel` | `--border-focus` ring 2px, offset 2px | `--text-primary` | Keyboard focus only; never remove the ring |
| active | `--surface-selected` | `--border-strong` | `--text-primary` | Pressed or selected |
| disabled | `--surface-sunken` | `--border-subtle` | `--text-disabled` | `aria-disabled` when it must stay focusable |
| invalid | `--danger-subtle` | `--danger-text` | `--text-primary` | Pair with a message; color is never the only cue |

## Textarea

Multi-line text entry for free-form content.

**Anatomy:** label, optional hint, textarea, character counter, message slot.

| Prop | Type | Default | Description |
|---|---|---|---|
| `label` | `string` | `required` | Visible label |
| `rows` | `number` | `4` | Initial visible rows |
| `maxLength` | `number` | `none` | Shows a counter when set |
| `resize` | `'vertical' \` | ` 'none'` | 'vertical'|Horizontal resize is never allowed |

| State | Background | Border | Text | Notes |
|---|---|---|---|---|
| default | `--surface-panel` | `--border-default` | `--text-primary` | Resting appearance |
| hover | `--surface-hover` over `--surface-panel` | `--border-strong` | `--text-primary` | Transition `--duration-fast` `--ease-standard` |
| focus-visible | `--surface-panel` | `--border-focus` ring 2px, offset 2px | `--text-primary` | Keyboard focus only; never remove the ring |
| active | `--surface-selected` | `--border-strong` | `--text-primary` | Pressed or selected |
| disabled | `--surface-sunken` | `--border-subtle` | `--text-disabled` | `aria-disabled` when it must stay focusable |
| invalid | `--danger-subtle` | `--danger-text` | `--text-primary` | Pair with a message; color is never the only cue |

## Select

Choosing one option from a known list of more than five.

**Anatomy:** label, trigger showing the current value, chevron, option list.

| Prop | Type | Default | Description |
|---|---|---|---|
| `label` | `string` | `required` | Visible label |
| `options` | `Option[]` | `required` | Value and label pairs; groups allowed |
| `placeholder` | `string` | `'Select…'` | Shown when no value is set |
| `searchable` | `boolean` | `false` | Adds type-ahead filtering for lists over 15 options |

| State | Background | Border | Text | Notes |
|---|---|---|---|---|
| default | `--surface-panel` | `--border-default` | `--text-primary` | Resting appearance |
| hover | `--surface-hover` over `--surface-panel` | `--border-strong` | `--text-primary` | Transition `--duration-fast` `--ease-standard` |
| focus-visible | `--surface-panel` | `--border-focus` ring 2px, offset 2px | `--text-primary` | Keyboard focus only; never remove the ring |
| active | `--surface-selected` | `--border-strong` | `--text-primary` | Pressed or selected |
| disabled | `--surface-sunken` | `--border-subtle` | `--text-disabled` | `aria-disabled` when it must stay focusable |
| invalid | `--danger-subtle` | `--danger-text` | `--text-primary` | Pair with a message; color is never the only cue |

## Checkbox

An independent on or off choice, or one item in a multi-select list.

**Anatomy:** box, check glyph, label, optional description.

| Prop | Type | Default | Description |
|---|---|---|---|
| `label` | `string` | `required` | Clickable label to the right of the box |
| `description` | `string` | `none` | Secondary line under the label |
| `checked` | `boolean \` | ` 'mixed'` | false|Mixed only for parent checkboxes |
| `disabled` | `boolean` | `false` | Keep the label readable |

| State | Background | Border | Text | Notes |
|---|---|---|---|---|
| default | `--surface-panel` | `--border-strong` | `--text-primary` | Resting appearance |
| hover | `--surface-hover` over `--surface-panel` | `--border-strong` | `--text-primary` | Transition `--duration-fast` `--ease-standard` |
| focus-visible | `--surface-panel` | `--border-focus` ring 2px, offset 2px | `--text-primary` | Keyboard focus only; never remove the ring |
| active | `--surface-selected` | `--border-strong` | `--text-primary` | Pressed or selected |
| disabled | `--surface-sunken` | `--border-subtle` | `--text-disabled` | `aria-disabled` when it must stay focusable |
| invalid | `--danger-subtle` | `--danger-text` | `--text-primary` | Pair with a message; color is never the only cue |

## Switch

An on or off setting that takes effect immediately, with no Save step.

**Anatomy:** track, thumb, label, optional state text.

| Prop | Type | Default | Description |
|---|---|---|---|
| `label` | `string` | `required` | Names the setting, not the state |
| `checked` | `boolean` | `false` | Current state |
| `stateText` | `boolean` | `false` | Shows On or Off beside the track |

| State | Background | Border | Text | Notes |
|---|---|---|---|---|
| default | `--surface-sunken` | `--border-default` | `--text-primary` | Resting appearance |
| hover | `--surface-hover` over `--surface-sunken` | `--border-strong` | `--text-primary` | Transition `--duration-fast` `--ease-standard` |
| focus-visible | `--surface-sunken` | `--border-focus` ring 2px, offset 2px | `--text-primary` | Keyboard focus only; never remove the ring |
| active | `--surface-selected` | `--border-strong` | `--text-primary` | Pressed or selected |
| disabled | `--surface-sunken` | `--border-subtle` | `--text-disabled` | `aria-disabled` when it must stay focusable |
| invalid | `--danger-subtle` | `--danger-text` | `--text-primary` | Pair with a message; color is never the only cue |

## RadioGroup

Choosing exactly one option from two to five visible choices.

**Anatomy:** group label, radio items each with a dot and a label, optional descriptions.

| Prop | Type | Default | Description |
|---|---|---|---|
| `label` | `string` | `required` | Rendered as the fieldset legend |
| `options` | `Option[]` | `required` | Two to five items |
| `orientation` | `'vertical' \` | ` 'horizontal'` | 'vertical'|Horizontal only for two or three short labels |

| State | Background | Border | Text | Notes |
|---|---|---|---|---|
| default | `--surface-panel` | `--border-strong` | `--text-primary` | Resting appearance |
| hover | `--surface-hover` over `--surface-panel` | `--border-strong` | `--text-primary` | Transition `--duration-fast` `--ease-standard` |
| focus-visible | `--surface-panel` | `--border-focus` ring 2px, offset 2px | `--text-primary` | Keyboard focus only; never remove the ring |
| active | `--surface-selected` | `--border-strong` | `--text-primary` | Pressed or selected |
| disabled | `--surface-sunken` | `--border-subtle` | `--text-disabled` | `aria-disabled` when it must stay focusable |
| invalid | `--danger-subtle` | `--danger-text` | `--text-primary` | Pair with a message; color is never the only cue |

## Card

A bounded container that holds one object or one cluster of content.

**Anatomy:** container, optional header with title and actions, body, optional footer.

| Prop | Type | Default | Description |
|---|---|---|---|
| `title` | `string` | `none` | Rendered as a heading at the level the page passes |
| `headingLevel` | `2 \` | ` 3 \` |  4|3|Keeps the document outline intact |
| `actions` | `Action[]` | `none` | Up to two quiet buttons in the header |
| `padding` | `'sm' \` | ` 'md' \` |  'lg'|'md'|Maps to --space-5, --space-6, --space-8 |

| State | Background | Border | Text | Notes |
|---|---|---|---|---|
| default | `--surface-panel` | `--border-subtle` | `--text-primary` | Resting appearance |
| hover | `--surface-hover` over `--surface-panel` | `--border-strong` | `--text-primary` | Transition `--duration-fast` `--ease-standard` |
| focus-visible | `--surface-panel` | `--border-focus` ring 2px, offset 2px | `--text-primary` | Keyboard focus only; never remove the ring |
| active | `--surface-selected` | `--border-strong` | `--text-primary` | Pressed or selected |
| disabled | `--surface-sunken` | `--border-subtle` | `--text-disabled` | `aria-disabled` when it must stay focusable |
| invalid | `--danger-subtle` | `--danger-text` | `--text-primary` | Pair with a message; color is never the only cue |

## Tabs

Switching between peer views of the same object without leaving the page.

**Anatomy:** tab list, tabs with labels and optional counts, active indicator, panels.

| Prop | Type | Default | Description |
|---|---|---|---|
| `tabs` | `Tab[]` | `required` | Two to seven tabs |
| `selected` | `string` | `first tab` | Controlled selection |
| `activation` | `'automatic' \` | ` 'manual'` | 'manual'|Manual means arrow keys move focus and Enter selects |

| State | Background | Border | Text | Notes |
|---|---|---|---|---|
| default | `--surface-panel` | `--border-subtle` | `--text-secondary` | Resting appearance |
| hover | `--surface-hover` over `--surface-panel` | `--border-strong` | `--text-secondary` | Transition `--duration-fast` `--ease-standard` |
| focus-visible | `--surface-panel` | `--border-focus` ring 2px, offset 2px | `--text-secondary` | Keyboard focus only; never remove the ring |
| active | `--surface-selected` | `--border-strong` | `--text-secondary` | Pressed or selected |
| disabled | `--surface-sunken` | `--border-subtle` | `--text-disabled` | `aria-disabled` when it must stay focusable |
| invalid | `--danger-subtle` | `--danger-text` | `--text-secondary` | Pair with a message; color is never the only cue |

## Accordion

Progressive disclosure for secondary content a user may never need.

**Anatomy:** header buttons with chevrons, panels.

| Prop | Type | Default | Description |
|---|---|---|---|
| `items` | `AccordionItem[]` | `required` | Header and panel pairs |
| `multiple` | `boolean` | `true` | Whether several panels may be open at once |
| `defaultOpen` | `string[]` | `[]` | Item ids open on first render |

| State | Background | Border | Text | Notes |
|---|---|---|---|---|
| default | `--surface-panel` | `--border-subtle` | `--text-primary` | Resting appearance |
| hover | `--surface-hover` over `--surface-panel` | `--border-strong` | `--text-primary` | Transition `--duration-fast` `--ease-standard` |
| focus-visible | `--surface-panel` | `--border-focus` ring 2px, offset 2px | `--text-primary` | Keyboard focus only; never remove the ring |
| active | `--surface-selected` | `--border-strong` | `--text-primary` | Pressed or selected |
| disabled | `--surface-sunken` | `--border-subtle` | `--text-disabled` | `aria-disabled` when it must stay focusable |
| invalid | `--danger-subtle` | `--danger-text` | `--text-primary` | Pair with a message; color is never the only cue |

## Banner

A page-level message about the state of the page or the account.

**Anatomy:** icon, title, body, optional action, optional dismiss.

| Prop | Type | Default | Description |
|---|---|---|---|
| `tone` | `'info' \` | ` 'success' \` |  'warning' \| 'danger'|'info'|Sets the icon and the state tokens |
| `dismissible` | `boolean` | `false` | Dismissal is remembered per user |
| `action` | `Action` | `none` | One quiet button |

| State | Background | Border | Text | Notes |
|---|---|---|---|---|
| default | `--info-subtle` | `--border-subtle` | `--info-text` | Resting appearance |
| hover | `--surface-hover` over `--info-subtle` | `--border-strong` | `--info-text` | Transition `--duration-fast` `--ease-standard` |
| focus-visible | `--info-subtle` | `--border-focus` ring 2px, offset 2px | `--info-text` | Keyboard focus only; never remove the ring |
| active | `--surface-selected` | `--border-strong` | `--info-text` | Pressed or selected |
| disabled | `--surface-sunken` | `--border-subtle` | `--text-disabled` | `aria-disabled` when it must stay focusable |
| invalid | `--danger-subtle` | `--danger-text` | `--info-text` | Pair with a message; color is never the only cue |

## Toast

A short confirmation that an action finished. Never the only record of an error.

**Anatomy:** message, optional action, dismiss.

| Prop | Type | Default | Description |
|---|---|---|---|
| `message` | `string` | `required` | Under 80 characters |
| `action` | `Action` | `none` | Undo is the usual action |
| `duration` | `number` | `5000` | Milliseconds; paused on hover and focus |

| State | Background | Border | Text | Notes |
|---|---|---|---|---|
| default | `--surface-inverse` | `--surface-inverse` | `--text-inverse` | Resting appearance |
| hover | `--surface-hover` over `--surface-inverse` | `--border-strong` | `--text-inverse` | Transition `--duration-fast` `--ease-standard` |
| focus-visible | `--surface-inverse` | `--border-focus` ring 2px, offset 2px | `--text-inverse` | Keyboard focus only; never remove the ring |
| active | `--surface-selected` | `--border-strong` | `--text-inverse` | Pressed or selected |
| disabled | `--surface-sunken` | `--border-subtle` | `--text-disabled` | `aria-disabled` when it must stay focusable |
| invalid | `--danger-subtle` | `--danger-text` | `--text-inverse` | Pair with a message; color is never the only cue |

## Dialog

A blocking question or a short focused task.

**Anatomy:** scrim, container, title, body, footer with actions.

| Prop | Type | Default | Description |
|---|---|---|---|
| `title` | `string` | `required` | Becomes the accessible name |
| `size` | `'sm' \` | ` 'md' \` |  'lg'|'md'|Max widths 400, 560, 720px |
| `dismissible` | `boolean` | `true` | Escape and scrim click close it unless false |
| `initialFocus` | `string` | `first field` | Element id to focus on open |

| State | Background | Border | Text | Notes |
|---|---|---|---|---|
| default | `--surface-raised` | `--surface-raised` | `--text-primary` | Resting appearance |
| hover | `--surface-hover` over `--surface-raised` | `--border-strong` | `--text-primary` | Transition `--duration-fast` `--ease-standard` |
| focus-visible | `--surface-raised` | `--border-focus` ring 2px, offset 2px | `--text-primary` | Keyboard focus only; never remove the ring |
| active | `--surface-selected` | `--border-strong` | `--text-primary` | Pressed or selected |
| disabled | `--surface-sunken` | `--border-subtle` | `--text-disabled` | `aria-disabled` when it must stay focusable |
| invalid | `--danger-subtle` | `--danger-text` | `--text-primary` | Pair with a message; color is never the only cue |

## Badge

A short status or count attached to another element.

**Anatomy:** container, label.

| Prop | Type | Default | Description |
|---|---|---|---|
| `tone` | `'neutral' \` | ` 'info' \` |  'success' \| 'warning' \| 'danger'|'neutral'|Uses the matching -subtle and -text tokens |
| `label` | `string` | `required` | One or two words, or a number |

| State | Background | Border | Text | Notes |
|---|---|---|---|---|
| default | `--surface-sunken` | `--border-subtle` | `--text-secondary` | Resting appearance |
| hover | `--surface-hover` over `--surface-sunken` | `--border-strong` | `--text-secondary` | Transition `--duration-fast` `--ease-standard` |
| focus-visible | `--surface-sunken` | `--border-focus` ring 2px, offset 2px | `--text-secondary` | Keyboard focus only; never remove the ring |
| active | `--surface-selected` | `--border-strong` | `--text-secondary` | Pressed or selected |
| disabled | `--surface-sunken` | `--border-subtle` | `--text-disabled` | `aria-disabled` when it must stay focusable |
| invalid | `--danger-subtle` | `--danger-text` | `--text-secondary` | Pair with a message; color is never the only cue |

## Tag

A removable label the user applied, such as a filter or a category.

**Anatomy:** container, label, optional remove button.

| Prop | Type | Default | Description |
|---|---|---|---|
| `label` | `string` | `required` | The tag text |
| `removable` | `boolean` | `false` | Shows a remove IconButton labeled 'Remove {label}' |
| `tone` | `'neutral' \` | ` 'accent'` | 'neutral'|Accent only for the active filter |

| State | Background | Border | Text | Notes |
|---|---|---|---|---|
| default | `--surface-sunken` | `--border-subtle` | `--text-primary` | Resting appearance |
| hover | `--surface-hover` over `--surface-sunken` | `--border-strong` | `--text-primary` | Transition `--duration-fast` `--ease-standard` |
| focus-visible | `--surface-sunken` | `--border-focus` ring 2px, offset 2px | `--text-primary` | Keyboard focus only; never remove the ring |
| active | `--surface-selected` | `--border-strong` | `--text-primary` | Pressed or selected |
| disabled | `--surface-sunken` | `--border-subtle` | `--text-disabled` | `aria-disabled` when it must stay focusable |
| invalid | `--danger-subtle` | `--danger-text` | `--text-primary` | Pair with a message; color is never the only cue |

## Avatar

A person's or workspace's picture, with initials as the fallback.

**Anatomy:** circle, image or initials, optional status dot.

| Prop | Type | Default | Description |
|---|---|---|---|
| `src` | `string` | `none` | Image URL; falls back to initials on error |
| `name` | `string` | `required` | Used for the initials and the alt text |
| `size` | `'xs' \` | ` 'sm' \` |  'md' \| 'lg'|'md'|20, 28, 36, or 56px |
| `status` | `'online' \` | ` 'away' \` |  'none'|'none'|Status dot with a text alternative |

| State | Background | Border | Text | Notes |
|---|---|---|---|---|
| default | `--surface-sunken` | `--border-subtle` | `--text-secondary` | Resting appearance |
| hover | `--surface-hover` over `--surface-sunken` | `--border-strong` | `--text-secondary` | Transition `--duration-fast` `--ease-standard` |
| focus-visible | `--surface-sunken` | `--border-focus` ring 2px, offset 2px | `--text-secondary` | Keyboard focus only; never remove the ring |
| active | `--surface-selected` | `--border-strong` | `--text-secondary` | Pressed or selected |
| disabled | `--surface-sunken` | `--border-subtle` | `--text-disabled` | `aria-disabled` when it must stay focusable |
| invalid | `--danger-subtle` | `--danger-text` | `--text-secondary` | Pair with a message; color is never the only cue |

## Tooltip

A short label for an icon or a truncated value. Never holds information that is needed to complete a task.

**Anatomy:** bubble, arrow, text.

| Prop | Type | Default | Description |
|---|---|---|---|
| `content` | `string` | `required` | Under 60 characters, no links |
| `placement` | `'top' \` | ` 'bottom' \` |  'start' \| 'end'|'top'|Flips when there is no room |
| `delay` | `number` | `400` | Milliseconds before showing on hover; focus shows it at once |

| State | Background | Border | Text | Notes |
|---|---|---|---|---|
| default | `--surface-inverse` | `--surface-inverse` | `--text-inverse` | Resting appearance |
| hover | `--surface-hover` over `--surface-inverse` | `--border-strong` | `--text-inverse` | Transition `--duration-fast` `--ease-standard` |
| focus-visible | `--surface-inverse` | `--border-focus` ring 2px, offset 2px | `--text-inverse` | Keyboard focus only; never remove the ring |
| active | `--surface-selected` | `--border-strong` | `--text-inverse` | Pressed or selected |
| disabled | `--surface-sunken` | `--border-subtle` | `--text-disabled` | `aria-disabled` when it must stay focusable |
| invalid | `--danger-subtle` | `--danger-text` | `--text-inverse` | Pair with a message; color is never the only cue |

## Menu

A list of actions that opens from a button.

**Anatomy:** trigger button, popover, menu items, optional group labels and separators.

| Prop | Type | Default | Description |
|---|---|---|---|
| `items` | `MenuItem[]` | `required` | Label, optional icon, optional shortcut, optional danger tone |
| `placement` | `'bottom-start' \` | ` 'bottom-end'` | 'bottom-start'|Flips when there is no room |
| `closeOnSelect` | `boolean` | `true` | Keep open only for checkbox menu items |

| State | Background | Border | Text | Notes |
|---|---|---|---|---|
| default | `--surface-raised` | `--border-subtle` | `--text-primary` | Resting appearance |
| hover | `--surface-hover` over `--surface-raised` | `--border-strong` | `--text-primary` | Transition `--duration-fast` `--ease-standard` |
| focus-visible | `--surface-raised` | `--border-focus` ring 2px, offset 2px | `--text-primary` | Keyboard focus only; never remove the ring |
| active | `--surface-selected` | `--border-strong` | `--text-primary` | Pressed or selected |
| disabled | `--surface-sunken` | `--border-subtle` | `--text-disabled` | `aria-disabled` when it must stay focusable |
| invalid | `--danger-subtle` | `--danger-text` | `--text-primary` | Pair with a message; color is never the only cue |

## Popover

Non-modal floating content anchored to a trigger, such as a filter panel.

**Anatomy:** trigger, container, optional title, body, optional footer.

| Prop | Type | Default | Description |
|---|---|---|---|
| `title` | `string` | `none` | Becomes the accessible name when set |
| `placement` | `'top' \` | ` 'bottom' \` |  'start' \| 'end'|'bottom'|Flips when there is no room |
| `width` | `'sm' \` | ` 'md' \` |  'lg'|'md'|280, 360, or 480px |

| State | Background | Border | Text | Notes |
|---|---|---|---|---|
| default | `--surface-raised` | `--border-subtle` | `--text-primary` | Resting appearance |
| hover | `--surface-hover` over `--surface-raised` | `--border-strong` | `--text-primary` | Transition `--duration-fast` `--ease-standard` |
| focus-visible | `--surface-raised` | `--border-focus` ring 2px, offset 2px | `--text-primary` | Keyboard focus only; never remove the ring |
| active | `--surface-selected` | `--border-strong` | `--text-primary` | Pressed or selected |
| disabled | `--surface-sunken` | `--border-subtle` | `--text-disabled` | `aria-disabled` when it must stay focusable |
| invalid | `--danger-subtle` | `--danger-text` | `--text-primary` | Pair with a message; color is never the only cue |

## Breadcrumb

Shows where the current page sits in the hierarchy and links to its ancestors.

**Anatomy:** ordered list of links, separators, current page item.

| Prop | Type | Default | Description |
|---|---|---|---|
| `items` | `Crumb[]` | `required` | Label and href; the last item is the current page |
| `maxItems` | `number` | `4` | Collapses the middle into a menu beyond this |

| State | Background | Border | Text | Notes |
|---|---|---|---|---|
| default | `--surface-page` | `--surface-page` | `--text-secondary` | Resting appearance |
| hover | `--surface-hover` over `--surface-page` | `--border-strong` | `--text-secondary` | Transition `--duration-fast` `--ease-standard` |
| focus-visible | `--surface-page` | `--border-focus` ring 2px, offset 2px | `--text-secondary` | Keyboard focus only; never remove the ring |
| active | `--surface-selected` | `--border-strong` | `--text-secondary` | Pressed or selected |
| disabled | `--surface-sunken` | `--border-subtle` | `--text-disabled` | `aria-disabled` when it must stay focusable |
| invalid | `--danger-subtle` | `--danger-text` | `--text-secondary` | Pair with a message; color is never the only cue |

## Pagination

Moves between pages of a long list or table.

**Anatomy:** previous button, page buttons, ellipsis, next button, optional page-size select.

| Prop | Type | Default | Description |
|---|---|---|---|
| `page` | `number` | `1` | Current page, one-based |
| `pageCount` | `number` | `required` | Total pages |
| `pageSize` | `number` | `25` | Rows per page |
| `pageSizeOptions` | `number[]` | `[25, 50, 100]` | Shown in the page-size select |

| State | Background | Border | Text | Notes |
|---|---|---|---|---|
| default | `--surface-panel` | `--border-default` | `--text-primary` | Resting appearance |
| hover | `--surface-hover` over `--surface-panel` | `--border-strong` | `--text-primary` | Transition `--duration-fast` `--ease-standard` |
| focus-visible | `--surface-panel` | `--border-focus` ring 2px, offset 2px | `--text-primary` | Keyboard focus only; never remove the ring |
| active | `--surface-selected` | `--border-strong` | `--text-primary` | Pressed or selected |
| disabled | `--surface-sunken` | `--border-subtle` | `--text-disabled` | `aria-disabled` when it must stay focusable |
| invalid | `--danger-subtle` | `--danger-text` | `--text-primary` | Pair with a message; color is never the only cue |

## Table

Rows of comparable records with sortable columns.

**Anatomy:** caption, header row, body rows, optional selection column, optional row actions.

| Prop | Type | Default | Description |
|---|---|---|---|
| `columns` | `Column[]` | `required` | Key, header, alignment, sortable |
| `rows` | `Row[]` | `required` | Records keyed by id |
| `selectable` | `boolean` | `false` | Adds a checkbox column and a bulk-action bar |
| `density` | `'comfortable' \` | ` 'compact'` | 'comfortable'|Row height 48 or 36px |
| `stickyHeader` | `boolean` | `true` | Header stays visible while the body scrolls |

| State | Background | Border | Text | Notes |
|---|---|---|---|---|
| default | `--surface-panel` | `--border-subtle` | `--text-primary` | Resting appearance |
| hover | `--surface-hover` over `--surface-panel` | `--border-strong` | `--text-primary` | Transition `--duration-fast` `--ease-standard` |
| focus-visible | `--surface-panel` | `--border-focus` ring 2px, offset 2px | `--text-primary` | Keyboard focus only; never remove the ring |
| active | `--surface-selected` | `--border-strong` | `--text-primary` | Pressed or selected |
| disabled | `--surface-sunken` | `--border-subtle` | `--text-disabled` | `aria-disabled` when it must stay focusable |
| invalid | `--danger-subtle` | `--danger-text` | `--text-primary` | Pair with a message; color is never the only cue |

## EmptyState

What a list or page shows when there is nothing in it yet.

**Anatomy:** illustration, title, body, primary action.

| Prop | Type | Default | Description |
|---|---|---|---|
| `title` | `string` | `required` | Says what will appear here |
| `body` | `string` | `none` | One sentence on how to get started |
| `action` | `Action` | `none` | One primary button |

| State | Background | Border | Text | Notes |
|---|---|---|---|---|
| default | `--surface-panel` | `--surface-panel` | `--text-secondary` | Resting appearance |
| hover | `--surface-hover` over `--surface-panel` | `--border-strong` | `--text-secondary` | Transition `--duration-fast` `--ease-standard` |
| focus-visible | `--surface-panel` | `--border-focus` ring 2px, offset 2px | `--text-secondary` | Keyboard focus only; never remove the ring |
| active | `--surface-selected` | `--border-strong` | `--text-secondary` | Pressed or selected |
| disabled | `--surface-sunken` | `--border-subtle` | `--text-disabled` | `aria-disabled` when it must stay focusable |
| invalid | `--danger-subtle` | `--danger-text` | `--text-secondary` | Pair with a message; color is never the only cue |

## Skeleton

A placeholder shape shown while content loads.

**Anatomy:** one or more blocks matching the shape of the content.

| Prop | Type | Default | Description |
|---|---|---|---|
| `shape` | `'text' \` | ` 'block' \` |  'circle'|'text'|Matches the content it stands in for |
| `lines` | `number` | `1` | For text shapes |
| `animate` | `boolean` | `true` | Shimmer is off under reduced motion |

| State | Background | Border | Text | Notes |
|---|---|---|---|---|
| default | `--surface-sunken` | `--surface-sunken` | `--text-disabled` | Resting appearance |
| hover | `--surface-hover` over `--surface-sunken` | `--border-strong` | `--text-disabled` | Transition `--duration-fast` `--ease-standard` |
| focus-visible | `--surface-sunken` | `--border-focus` ring 2px, offset 2px | `--text-disabled` | Keyboard focus only; never remove the ring |
| active | `--surface-selected` | `--border-strong` | `--text-disabled` | Pressed or selected |
| disabled | `--surface-sunken` | `--border-subtle` | `--text-disabled` | `aria-disabled` when it must stay focusable |
| invalid | `--danger-subtle` | `--danger-text` | `--text-disabled` | Pair with a message; color is never the only cue |

## ProgressBar

Shows progress of a task with a known length.

**Anatomy:** track, fill, optional label, optional value text.

| Prop | Type | Default | Description |
|---|---|---|---|
| `value` | `number` | `required` | 0 to max |
| `max` | `number` | `100` | The value at completion |
| `label` | `string` | `required` | Accessible name; shown above the track |
| `showValue` | `boolean` | `true` | Shows the percentage beside the label |

| State | Background | Border | Text | Notes |
|---|---|---|---|---|
| default | `--surface-sunken` | `--surface-sunken` | `--text-secondary` | Resting appearance |
| hover | `--surface-hover` over `--surface-sunken` | `--border-strong` | `--text-secondary` | Transition `--duration-fast` `--ease-standard` |
| focus-visible | `--surface-sunken` | `--border-focus` ring 2px, offset 2px | `--text-secondary` | Keyboard focus only; never remove the ring |
| active | `--surface-selected` | `--border-strong` | `--text-secondary` | Pressed or selected |
| disabled | `--surface-sunken` | `--border-subtle` | `--text-disabled` | `aria-disabled` when it must stay focusable |
| invalid | `--danger-subtle` | `--danger-text` | `--text-secondary` | Pair with a message; color is never the only cue |

## Spinner

Shows that something is working when the length is unknown.

**Anatomy:** rotating ring, visually hidden label.

| Prop | Type | Default | Description |
|---|---|---|---|
| `size` | `'sm' \` | ` 'md' \` |  'lg'|'md'|16, 24, or 40px |
| `label` | `string` | `'Loading'` | Announced once, politely |

| State | Background | Border | Text | Notes |
|---|---|---|---|---|
| default | `--surface-panel` | `--surface-panel` | `--text-secondary` | Resting appearance |
| hover | `--surface-hover` over `--surface-panel` | `--border-strong` | `--text-secondary` | Transition `--duration-fast` `--ease-standard` |
| focus-visible | `--surface-panel` | `--border-focus` ring 2px, offset 2px | `--text-secondary` | Keyboard focus only; never remove the ring |
| active | `--surface-selected` | `--border-strong` | `--text-secondary` | Pressed or selected |
| disabled | `--surface-sunken` | `--border-subtle` | `--text-disabled` | `aria-disabled` when it must stay focusable |
| invalid | `--danger-subtle` | `--danger-text` | `--text-secondary` | Pair with a message; color is never the only cue |

## Stepper

Shows position in a short, linear, multi-step flow.

**Anatomy:** ordered steps with numbers, labels, and connectors.

| Prop | Type | Default | Description |
|---|---|---|---|
| `steps` | `Step[]` | `required` | Three to six steps |
| `current` | `number` | `0` | Zero-based index of the current step |
| `clickable` | `boolean` | `false` | Lets users go back to completed steps |

| State | Background | Border | Text | Notes |
|---|---|---|---|---|
| default | `--surface-panel` | `--border-default` | `--text-secondary` | Resting appearance |
| hover | `--surface-hover` over `--surface-panel` | `--border-strong` | `--text-secondary` | Transition `--duration-fast` `--ease-standard` |
| focus-visible | `--surface-panel` | `--border-focus` ring 2px, offset 2px | `--text-secondary` | Keyboard focus only; never remove the ring |
| active | `--surface-selected` | `--border-strong` | `--text-secondary` | Pressed or selected |
| disabled | `--surface-sunken` | `--border-subtle` | `--text-disabled` | `aria-disabled` when it must stay focusable |
| invalid | `--danger-subtle` | `--danger-text` | `--text-secondary` | Pair with a message; color is never the only cue |

## DatePicker

Entering a single date, typed or chosen from a calendar.

**Anatomy:** label, text input, calendar button, calendar popover.

| Prop | Type | Default | Description |
|---|---|---|---|
| `label` | `string` | `required` | Visible label |
| `value` | `string` | `none` | ISO 8601 date |
| `min` | `string` | `none` | Earliest selectable date |
| `max` | `string` | `none` | Latest selectable date |

| State | Background | Border | Text | Notes |
|---|---|---|---|---|
| default | `--surface-panel` | `--border-default` | `--text-primary` | Resting appearance |
| hover | `--surface-hover` over `--surface-panel` | `--border-strong` | `--text-primary` | Transition `--duration-fast` `--ease-standard` |
| focus-visible | `--surface-panel` | `--border-focus` ring 2px, offset 2px | `--text-primary` | Keyboard focus only; never remove the ring |
| active | `--surface-selected` | `--border-strong` | `--text-primary` | Pressed or selected |
| disabled | `--surface-sunken` | `--border-subtle` | `--text-disabled` | `aria-disabled` when it must stay focusable |
| invalid | `--danger-subtle` | `--danger-text` | `--text-primary` | Pair with a message; color is never the only cue |

## FileUpload

Choosing one or more files from the device, by browsing or dropping.

**Anatomy:** label, drop zone, browse button, file list with remove buttons.

| Prop | Type | Default | Description |
|---|---|---|---|
| `label` | `string` | `required` | Visible label |
| `accept` | `string` | `none` | File types, as in the native accept attribute |
| `maxSize` | `number` | `none` | Bytes; larger files are rejected with a message |
| `multiple` | `boolean` | `false` | Allows several files |

| State | Background | Border | Text | Notes |
|---|---|---|---|---|
| default | `--surface-sunken` | `--border-default` | `--text-secondary` | Resting appearance |
| hover | `--surface-hover` over `--surface-sunken` | `--border-strong` | `--text-secondary` | Transition `--duration-fast` `--ease-standard` |
| focus-visible | `--surface-sunken` | `--border-focus` ring 2px, offset 2px | `--text-secondary` | Keyboard focus only; never remove the ring |
| active | `--surface-selected` | `--border-strong` | `--text-secondary` | Pressed or selected |
| disabled | `--surface-sunken` | `--border-subtle` | `--text-disabled` | `aria-disabled` when it must stay focusable |
| invalid | `--danger-subtle` | `--danger-text` | `--text-secondary` | Pair with a message; color is never the only cue |

## Combobox

Choosing from a long list by typing to filter, optionally adding new values.

**Anatomy:** label, text input, listbox popup, optional chips for multiple values.

| Prop | Type | Default | Description |
|---|---|---|---|
| `label` | `string` | `required` | Visible label |
| `options` | `Option[]` | `required` | Value and label pairs |
| `multiple` | `boolean` | `false` | Selected values render as Tags |
| `creatable` | `boolean` | `false` | Offers 'Add {query}' when nothing matches |

| State | Background | Border | Text | Notes |
|---|---|---|---|---|
| default | `--surface-panel` | `--border-default` | `--text-primary` | Resting appearance |
| hover | `--surface-hover` over `--surface-panel` | `--border-strong` | `--text-primary` | Transition `--duration-fast` `--ease-standard` |
| focus-visible | `--surface-panel` | `--border-focus` ring 2px, offset 2px | `--text-primary` | Keyboard focus only; never remove the ring |
| active | `--surface-selected` | `--border-strong` | `--text-primary` | Pressed or selected |
| disabled | `--surface-sunken` | `--border-subtle` | `--text-disabled` | `aria-disabled` when it must stay focusable |
| invalid | `--danger-subtle` | `--danger-text` | `--text-primary` | Pair with a message; color is never the only cue |

