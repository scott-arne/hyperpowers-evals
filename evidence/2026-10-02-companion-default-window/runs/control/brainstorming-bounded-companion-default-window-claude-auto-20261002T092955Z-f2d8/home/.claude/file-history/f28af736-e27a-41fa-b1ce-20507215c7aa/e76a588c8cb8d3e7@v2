# 01 Foundations

These are the design tokens every page under `public/` draws from. Pages
reference tokens through CSS custom properties declared in the shared token
sheet; a raw hex value, pixel size, or duration in a page stylesheet is a
review comment. When a value you need is missing, add a token here first, then
reference it.

Tokens come in two layers. Palette tokens name a raw value and never carry
meaning. Semantic tokens name a role (surface, border, text, accent, state) and
point at a palette token per theme. Page CSS uses semantic tokens; palette
tokens appear only in this file and in the token sheet.

## Color palette

Twelve hues, eleven steps each. Steps below 500 are tints for surfaces and
borders; 500 is the reference fill; steps above 500 are for text and pressed
states. Contrast pairs that pass WCAG AA are listed under Semantic colors; do
not invent new pairings in page CSS.

| Token | Value | Typical use |
|---|---|---|
| `--color-slate-50` | `#f7f8f9` | Page and panel backgrounds |
| `--color-slate-100` | `#eff1f3` | Hover backgrounds on light surfaces |
| `--color-slate-200` | `#d8dce2` | Dividers and subtle borders |
| `--color-slate-300` | `#c1c7d0` | Input borders, disabled text |
| `--color-slate-400` | `#a2abb9` | Placeholder text and secondary icons |
| `--color-slate-500` | `#64748b` | Reference fill, focus rings |
| `--color-slate-600` | `#556276` | Hover state for filled controls |
| `--color-slate-700` | `#465161` | Pressed state, text on tints |
| `--color-slate-800` | `#373f4c` | Headings on tinted surfaces |
| `--color-slate-900` | `#282e37` | High-emphasis text |
| `--color-slate-950` | `#191d22` | Text on the darkest surfaces |
| `--color-gray-50` | `#f7f7f8` | Page and panel backgrounds |
| `--color-gray-100` | `#f0f0f2` | Hover backgrounds on light surfaces |
| `--color-gray-200` | `#dadbdf` | Dividers and subtle borders |
| `--color-gray-300` | `#c3c6cc` | Input borders, disabled text |
| `--color-gray-400` | `#a6aab2` | Placeholder text and secondary icons |
| `--color-gray-500` | `#6b7280` | Reference fill, focus rings |
| `--color-gray-600` | `#5a606c` | Hover state for filled controls |
| `--color-gray-700` | `#4a4f59` | Pressed state, text on tints |
| `--color-gray-800` | `#3a3e46` | Headings on tinted surfaces |
| `--color-gray-900` | `#2a2d33` | High-emphasis text |
| `--color-gray-950` | `#1a1c20` | Text on the darkest surfaces |
| `--color-red-50` | `#fef5f5` | Page and panel backgrounds |
| `--color-red-100` | `#fdecec` | Hover backgrounds on light surfaces |
| `--color-red-200` | `#fbd0d0` | Dividers and subtle borders |
| `--color-red-300` | `#f8b4b4` | Input borders, disabled text |
| `--color-red-400` | `#f58e8e` | Placeholder text and secondary icons |
| `--color-red-500` | `#ef4444` | Reference fill, focus rings |
| `--color-red-600` | `#cb3939` | Hover state for filled controls |
| `--color-red-700` | `#a72f2f` | Pressed state, text on tints |
| `--color-red-800` | `#832525` | Headings on tinted surfaces |
| `--color-red-900` | `#5f1b1b` | High-emphasis text |
| `--color-red-950` | `#3b1111` | Text on the darkest surfaces |
| `--color-orange-50` | `#fef8f3` | Page and panel backgrounds |
| `--color-orange-100` | `#fef1e7` | Hover backgrounds on light surfaces |
| `--color-orange-200` | `#fddcc4` | Dividers and subtle borders |
| `--color-orange-300` | `#fcc7a1` | Input borders, disabled text |
| `--color-orange-400` | `#fbab73` | Placeholder text and secondary icons |
| `--color-orange-500` | `#f97316` | Reference fill, focus rings |
| `--color-orange-600` | `#d36112` | Hover state for filled controls |
| `--color-orange-700` | `#ae500f` | Pressed state, text on tints |
| `--color-orange-800` | `#883f0c` | Headings on tinted surfaces |
| `--color-orange-900` | `#632e08` | High-emphasis text |
| `--color-orange-950` | `#3e1c05` | Text on the darkest surfaces |
| `--color-amber-50` | `#fefaf2` | Page and panel backgrounds |
| `--color-amber-100` | `#fef5e6` | Hover backgrounds on light surfaces |
| `--color-amber-200` | `#fce6c2` | Dividers and subtle borders |
| `--color-amber-300` | `#fbd89d` | Input borders, disabled text |
| `--color-amber-400` | `#f9c46c` | Placeholder text and secondary icons |
| `--color-amber-500` | `#f59e0b` | Reference fill, focus rings |
| `--color-amber-600` | `#d08609` | Hover state for filled controls |
| `--color-amber-700` | `#ab6e07` | Pressed state, text on tints |
| `--color-amber-800` | `#865606` | Headings on tinted surfaces |
| `--color-amber-900` | `#623f04` | High-emphasis text |
| `--color-amber-950` | `#3d2702` | Text on the darkest surfaces |
| `--color-green-50` | `#f3fcf6` | Page and panel backgrounds |
| `--color-green-100` | `#e8f9ee` | Hover backgrounds on light surfaces |
| `--color-green-200` | `#c7f0d6` | Dividers and subtle borders |
| `--color-green-300` | `#a6e7be` | Input borders, disabled text |
| `--color-green-400` | `#7adc9e` | Placeholder text and secondary icons |
| `--color-green-500` | `#22c55e` | Reference fill, focus rings |
| `--color-green-600` | `#1ca74f` | Hover state for filled controls |
| `--color-green-700` | `#178941` | Pressed state, text on tints |
| `--color-green-800` | `#126c33` | Headings on tinted surfaces |
| `--color-green-900` | `#0d4e25` | High-emphasis text |
| `--color-green-950` | `#083117` | Text on the darkest surfaces |
| `--color-teal-50` | `#f3fbfa` | Page and panel backgrounds |
| `--color-teal-100` | `#e7f7f6` | Hover backgrounds on light surfaces |
| `--color-teal-200` | `#c4ede8` | Dividers and subtle borders |
| `--color-teal-300` | `#a1e2db` | Input borders, disabled text |
| `--color-teal-400` | `#72d4c9` | Placeholder text and secondary icons |
| `--color-teal-500` | `#14b8a6` | Reference fill, focus rings |
| `--color-teal-600` | `#119c8d` | Hover state for filled controls |
| `--color-teal-700` | `#0e8074` | Pressed state, text on tints |
| `--color-teal-800` | `#0b655b` | Headings on tinted surfaces |
| `--color-teal-900` | `#084942` | High-emphasis text |
| `--color-teal-950` | `#052e29` | Text on the darkest surfaces |
| `--color-cyan-50` | `#f2fbfc` | Page and panel backgrounds |
| `--color-cyan-100` | `#e6f7fa` | Hover backgrounds on light surfaces |
| `--color-cyan-200` | `#c0ecf4` | Dividers and subtle borders |
| `--color-cyan-300` | `#9be1ed` | Input borders, disabled text |
| `--color-cyan-400` | `#69d3e5` | Placeholder text and secondary icons |
| `--color-cyan-500` | `#06b6d4` | Reference fill, focus rings |
| `--color-cyan-600` | `#059ab4` | Hover state for filled controls |
| `--color-cyan-700` | `#047f94` | Pressed state, text on tints |
| `--color-cyan-800` | `#036474` | Headings on tinted surfaces |
| `--color-cyan-900` | `#024854` | High-emphasis text |
| `--color-cyan-950` | `#012d35` | Text on the darkest surfaces |
| `--color-blue-50` | `#f5f8fe` | Page and panel backgrounds |
| `--color-blue-100` | `#ebf2fe` | Hover backgrounds on light surfaces |
| `--color-blue-200` | `#cedffc` | Dividers and subtle borders |
| `--color-blue-300` | `#b0cdfb` | Input borders, disabled text |
| `--color-blue-400` | `#89b4f9` | Placeholder text and secondary icons |
| `--color-blue-500` | `#3b82f6` | Reference fill, focus rings |
| `--color-blue-600` | `#326ed1` | Hover state for filled controls |
| `--color-blue-700` | `#295bac` | Pressed state, text on tints |
| `--color-blue-800` | `#204787` | Headings on tinted surfaces |
| `--color-blue-900` | `#173462` | High-emphasis text |
| `--color-blue-950` | `#0e203d` | Text on the darkest surfaces |
| `--color-indigo-50` | `#f7f7fe` | Page and panel backgrounds |
| `--color-indigo-100` | `#efeffd` | Hover backgrounds on light surfaces |
| `--color-indigo-200` | `#d8d8fb` | Dividers and subtle borders |
| `--color-indigo-300` | `#c0c1f9` | Input borders, disabled text |
| `--color-indigo-400` | `#a1a3f6` | Placeholder text and secondary icons |
| `--color-indigo-500` | `#6366f1` | Reference fill, focus rings |
| `--color-indigo-600` | `#5456cc` | Hover state for filled controls |
| `--color-indigo-700` | `#4547a8` | Pressed state, text on tints |
| `--color-indigo-800` | `#363884` | Headings on tinted surfaces |
| `--color-indigo-900` | `#272860` | High-emphasis text |
| `--color-indigo-950` | `#18193c` | Text on the darkest surfaces |
| `--color-violet-50` | `#f9f6fe` | Page and panel backgrounds |
| `--color-violet-100` | `#f3eefe` | Hover backgrounds on light surfaces |
| `--color-violet-200` | `#e2d6fc` | Dividers and subtle borders |
| `--color-violet-300` | `#d0bdfb` | Input borders, disabled text |
| `--color-violet-400` | `#b99df9` | Placeholder text and secondary icons |
| `--color-violet-500` | `#8b5cf6` | Reference fill, focus rings |
| `--color-violet-600` | `#764ed1` | Hover state for filled controls |
| `--color-violet-700` | `#6140ac` | Pressed state, text on tints |
| `--color-violet-800` | `#4c3287` | Headings on tinted surfaces |
| `--color-violet-900` | `#372462` | High-emphasis text |
| `--color-violet-950` | `#22173d` | Text on the darkest surfaces |
| `--color-pink-50` | `#fef5f9` | Page and panel backgrounds |
| `--color-pink-100` | `#fdecf4` | Hover backgrounds on light surfaces |
| `--color-pink-200` | `#fad1e5` | Dividers and subtle borders |
| `--color-pink-300` | `#f7b5d6` | Input borders, disabled text |
| `--color-pink-400` | `#f391c1` | Placeholder text and secondary icons |
| `--color-pink-500` | `#ec4899` | Reference fill, focus rings |
| `--color-pink-600` | `#c83d82` | Hover state for filled controls |
| `--color-pink-700` | `#a5326b` | Pressed state, text on tints |
| `--color-pink-800` | `#812754` | Headings on tinted surfaces |
| `--color-pink-900` | `#5e1c3d` | High-emphasis text |
| `--color-pink-950` | `#3b1226` | Text on the darkest surfaces |

## Semantic colors

Each semantic token resolves to a palette token per theme. The dark theme is
not shipped yet, but its column is maintained so that pages written today do
not need a second pass.

| Token | Light | Dark | Role |
|---|---|---|---|
| `--surface-page` | `slate-50` | `slate-950` | The page background behind every panel |
| `--surface-panel` | `#ffffff` | `slate-900` | Primary content panels |
| `--surface-raised` | `#ffffff` | `slate-800` | Menus, popovers, dialogs |
| `--surface-sunken` | `slate-100` | `slate-950` | Wells, code blocks, read-only fields |
| `--surface-hover` | `slate-100` | `slate-800` | Row and item hover |
| `--surface-selected` | `blue-50` | `blue-900` | Selected rows, active navigation items |
| `--surface-inverse` | `slate-900` | `slate-50` | Tooltips, toasts |
| `--border-subtle` | `slate-200` | `slate-800` | Dividers between related items |
| `--border-default` | `slate-300` | `slate-700` | Input borders, panel outlines |
| `--border-strong` | `slate-400` | `slate-600` | Borders that must read at a glance |
| `--border-focus` | `blue-500` | `blue-400` | Focus ring, 2px, offset 2px |
| `--text-primary` | `slate-900` | `slate-50` | Body text, headings |
| `--text-secondary` | `slate-600` | `slate-300` | Helper text, metadata |
| `--text-tertiary` | `slate-500` | `slate-400` | Placeholders, timestamps |
| `--text-disabled` | `slate-400` | `slate-600` | Disabled labels and values |
| `--text-inverse` | `#ffffff` | `slate-900` | Text on inverse and filled surfaces |
| `--text-link` | `blue-600` | `blue-400` | Inline links |
| `--text-link-hover` | `blue-700` | `blue-300` | Inline link hover |
| `--accent-fill` | `blue-600` | `blue-500` | Primary buttons, checked controls |
| `--accent-fill-hover` | `blue-700` | `blue-400` | Primary button hover |
| `--accent-fill-pressed` | `blue-800` | `blue-300` | Primary button pressed |
| `--accent-subtle` | `blue-50` | `blue-950` | Accent backgrounds, info banners |
| `--danger-fill` | `red-600` | `red-500` | Destructive buttons |
| `--danger-fill-hover` | `red-700` | `red-400` | Destructive button hover |
| `--danger-text` | `red-700` | `red-300` | Error messages, invalid field text |
| `--danger-subtle` | `red-50` | `red-950` | Error banners, invalid field background |
| `--warning-text` | `amber-800` | `amber-300` | Warning messages |
| `--warning-subtle` | `amber-50` | `amber-950` | Warning banners |
| `--success-text` | `green-700` | `green-300` | Success messages |
| `--success-subtle` | `green-50` | `green-950` | Success banners |
| `--info-text` | `blue-700` | `blue-300` | Informational messages |
| `--info-subtle` | `blue-50` | `blue-950` | Informational banners |
| `--overlay-scrim` | `slate-900` at 48% | `slate-950` at 64% | Behind dialogs |

Approved contrast pairs (AA for body text): `--text-primary` on every surface
token; `--text-secondary` on `--surface-page`, `--surface-panel`,
`--surface-raised`; `--text-inverse` on `--accent-fill`, `--danger-fill`,
`--surface-inverse`. `--text-tertiary` passes AA only for large text and is
never used for content a user must read to complete a task.

## Spacing

One scale, used for padding, gaps, and margins alike. Steps are named by index,
not by size, so that the scale can be retuned without renaming.

| Token | rem | px | Typical use |
|---|---|---|---|
| `--space-0` | 0 | 0 | Resetting inherited spacing |
| `--space-1` | 0.125 | 2 | Hairline offsets, icon nudges |
| `--space-2` | 0.25 | 4 | Gap between an icon and its label |
| `--space-3` | 0.375 | 6 | Padding inside badges and chips |
| `--space-4` | 0.5 | 8 | Gap between a label and its control |
| `--space-5` | 0.75 | 12 | Vertical gap between stacked fields |
| `--space-6` | 1 | 16 | Padding inside inputs and small cards |
| `--space-7` | 1.25 | 20 | Gap between buttons in a button row |
| `--space-8` | 1.5 | 24 | Padding inside panels |
| `--space-9` | 2 | 32 | Gap between panels |
| `--space-10` | 2.5 | 40 | Page gutter on tablet |
| `--space-11` | 3 | 48 | Page gutter on desktop |
| `--space-12` | 4 | 64 | Top margin above a page title |
| `--space-13` | 5 | 80 | Empty-state padding |
| `--space-14` | 6 | 96 | Marketing sections only |
| `--space-15` | 8 | 128 | Marketing sections only |

## Typography

One family for interface text and one for code. Sizes are set in rem so they
follow the user's browser setting.

| Role | Token | Size (rem) | Line height | Weight | Tracking |
|---|---|---|---|---|---|
| Display | `--type-display` | 2.25 | 1.15 | 700 | -0.02em |
| Page title | `--type-title` | 1.5 | 1.25 | 650 | -0.01em |
| Heading 2 | `--type-h2` | 1.25 | 1.3 | 600 | -0.005em |
| Heading 3 | `--type-h3` | 1.0625 | 1.35 | 600 | 0 |
| Heading 4 | `--type-h4` | 0.9375 | 1.4 | 600 | 0.01em |
| Body large | `--type-body-lg` | 1.0625 | 1.6 | 400 | 0 |
| Body | `--type-body` | 0.9375 | 1.55 | 400 | 0 |
| Body small | `--type-body-sm` | 0.8125 | 1.5 | 400 | 0.005em |
| Label | `--type-label` | 0.875 | 1.4 | 500 | 0 |
| Caption | `--type-caption` | 0.75 | 1.4 | 400 | 0.01em |
| Overline | `--type-overline` | 0.6875 | 1.3 | 600 | 0.08em |
| Code | `--type-code` | 0.8125 | 1.5 | 400 | 0 |

Families: `--font-sans` is `"Inter", system-ui, -apple-system, "Segoe UI",
sans-serif`; `--font-mono` is `"JetBrains Mono", ui-monospace, "SF Mono",
Menlo, monospace`. Numbers in tables use `font-variant-numeric: tabular-nums`.

## Radii

| Token | Value | Use |
|---|---|---|
| `--radius-none` | 0 | Tables, full-bleed surfaces |
| `--radius-sm` | 4px | Badges, checkboxes, small inputs |
| `--radius-md` | 6px | Inputs, buttons |
| `--radius-lg` | 8px | Panels, cards |
| `--radius-xl` | 12px | Dialogs |
| `--radius-full` | 9999px | Pills, avatars, switches |

## Elevation

| Token | Value | Use |
|---|---|---|
| `--shadow-0` | none | Flat surfaces |
| `--shadow-1` | `0 1px 2px rgb(15 23 42 / 0.06)` | Panels on the page background |
| `--shadow-2` | `0 2px 6px rgb(15 23 42 / 0.08)` | Raised cards, sticky headers |
| `--shadow-3` | `0 8px 24px rgb(15 23 42 / 0.12)` | Menus, popovers |
| `--shadow-4` | `0 16px 48px rgb(15 23 42 / 0.18)` | Dialogs |

## Layers

| Token | Value | Use |
|---|---|---|
| `--z-base` | 0 | Page content |
| `--z-sticky` | 100 | Sticky headers and footers |
| `--z-dropdown` | 200 | Menus and popovers |
| `--z-overlay` | 300 | Dialog scrims |
| `--z-dialog` | 310 | Dialogs |
| `--z-toast` | 400 | Toasts |
| `--z-tooltip` | 500 | Tooltips |

## Motion

| Token | Value | Use |
|---|---|---|
| `--duration-instant` | 50ms | Checkbox and switch state changes |
| `--duration-fast` | 120ms | Hover and focus transitions |
| `--duration-base` | 200ms | Expanding and collapsing |
| `--duration-slow` | 320ms | Dialogs entering |
| `--ease-standard` | `cubic-bezier(0.2, 0, 0, 1)` | Most transitions |
| `--ease-enter` | `cubic-bezier(0, 0, 0, 1)` | Elements entering |
| `--ease-exit` | `cubic-bezier(0.3, 0, 1, 1)` | Elements leaving |

Every transition is disabled under `prefers-reduced-motion: reduce`.

## Breakpoints and grid

| Token | Min width | Columns | Gutter | Page margin |
|---|---|---|---|---|
| `--bp-xs` | 0 | 4 | 16px | 16px |
| `--bp-sm` | 480px | 4 | 16px | 20px |
| `--bp-md` | 768px | 8 | 24px | 32px |
| `--bp-lg` | 1024px | 12 | 24px | 40px |
| `--bp-xl` | 1280px | 12 | 32px | 48px |
| `--bp-2xl` | 1536px | 12 | 32px | auto, content capped at 1280px |

| Token | Value | Use |
|---|---|---|
| `--layout-content-max` | 960px | Max width of a single-panel page such as account activity |

## Borders, icons, and opacity

| Token | Value | Use |
|---|---|---|
| `--border-width-hairline` | 1px | Dividers, panel outlines, input borders |
| `--border-width-thick` | 2px | Focus rings, selected cards, invalid inputs |
| `--border-width-heavy` | 4px | The active-tab indicator and left accents on banners |
| `--icon-xs` | 12px | Inline with caption text |
| `--icon-sm` | 16px | Inline with body text, inside small buttons |
| `--icon-md` | 20px | Default for buttons and inputs |
| `--icon-lg` | 24px | Navigation and empty-state accents |
| `--icon-xl` | 40px | Empty-state illustrations |
| `--opacity-disabled` | 0.48 | Only for imagery; disabled text uses `--text-disabled` |
| `--opacity-scrim` | 0.48 | Dialog scrim in the light theme |
| `--opacity-hover-overlay` | 0.04 | Hover overlay on images and avatars |
| `--opacity-pressed-overlay` | 0.08 | Pressed overlay on images and avatars |

## Data visualization

Charts use a separate categorical sequence so that series never borrow state
colors (a red series reads as an error). Use the sequence in order; past eight
series, group the remainder into "Other".

| Token | Light | Dark | Order |
|---|---|---|---|
| `--chart-1` | `blue-600` | `blue-400` | First series |
| `--chart-2` | `teal-600` | `teal-400` | Second series |
| `--chart-3` | `violet-600` | `violet-400` | Third series |
| `--chart-4` | `amber-600` | `amber-400` | Fourth series |
| `--chart-5` | `pink-600` | `pink-400` | Fifth series |
| `--chart-6` | `cyan-700` | `cyan-300` | Sixth series |
| `--chart-7` | `indigo-700` | `indigo-300` | Seventh series |
| `--chart-8` | `slate-500` | `slate-400` | Eighth series, and "Other" |
| `--chart-grid` | `slate-200` | `slate-800` | Gridlines |
| `--chart-axis` | `slate-500` | `slate-400` | Axis labels and ticks |
| `--chart-sequential-low` | `blue-50` | `blue-950` | Low end of a heatmap |
| `--chart-sequential-high` | `blue-800` | `blue-300` | High end of a heatmap |

## Token use by surface

The table below is the reference reviewers use when they check a surface.
Every cell names the token; nothing in a page stylesheet should contradict it.

| Surface | Background | Border | Text | Radius | Shadow | Padding |
|---|---|---|---|---|---|---|
| Page | `--surface-page` | none | `--text-primary` | `--radius-none` | `--shadow-0` | `--space-11` |
| Panel | `--surface-panel` | `--border-subtle` | `--text-primary` | `--radius-lg` | `--shadow-1` | `--space-8` |
| Card | `--surface-panel` | `--border-subtle` | `--text-primary` | `--radius-lg` | `--shadow-1` | `--space-6` |
| Input | `--surface-panel` | `--border-default` | `--text-primary` | `--radius-md` | `--shadow-0` | `--space-4` `--space-5` |
| Read-only field | `--surface-sunken` | `--border-subtle` | `--text-secondary` | `--radius-md` | `--shadow-0` | `--space-4` `--space-5` |
| Menu | `--surface-raised` | `--border-subtle` | `--text-primary` | `--radius-lg` | `--shadow-3` | `--space-2` |
| Dialog | `--surface-raised` | none | `--text-primary` | `--radius-xl` | `--shadow-4` | `--space-8` |
| Toast | `--surface-inverse` | none | `--text-inverse` | `--radius-lg` | `--shadow-3` | `--space-5` `--space-6` |
| Tooltip | `--surface-inverse` | none | `--text-inverse` | `--radius-sm` | `--shadow-2` | `--space-2` `--space-4` |
| Table header | `--surface-sunken` | `--border-default` | `--text-secondary` | `--radius-none` | `--shadow-0` | `--space-4` `--space-6` |
| Table row | `--surface-panel` | `--border-subtle` | `--text-primary` | `--radius-none` | `--shadow-0` | `--space-4` `--space-6` |
| Banner | state `-subtle` | none | state `-text` | `--radius-md` | `--shadow-0` | `--space-5` `--space-6` |
| Sticky footer | `--surface-panel` | `--border-subtle` | `--text-primary` | `--radius-none` | `--shadow-2` | `--space-5` `--space-8` |
