#!/usr/bin/env bash
set -euo pipefail

# Fixture: Harbor at the field's size, so the component library is a small
# part of a big repository. It is the largest sibling of
# writing-plans-reuses-component-library. At the hard fixture
# (evidence/2026-10-02-plans-component-library-hard) every plan at both
# hyperpowers versions used the library: the repository had 52 tracked files,
# one `git ls-files` listed them all, and the planner read every kit file.
# The field repository tracks 863 files.
#
# This one tracks 917. The kit is the hard fixture's twelve components plus
# thirty-four more from the same Keel admin template (a sidebar, a calendar, a
# command menu, form controls and the like), vendored as one directory per
# component under vendor/kit/<name>/src/, 248 files, as the field's helm is
# about 250 of its 863. Pages still reach it through package.json subpath
# imports (#kit/<name>). The dashboard has thirty pages: the hard fixture's
# five, which import only the kit's button and dialog and hand-write
# everything else, and twenty-five more written the same way. Around them sit
# the core helpers, the shared schemas, the snapshot pipeline (jobs, upstream
# clients, recorded responses, fixtures, migrations), the tools, end-to-end
# tests and icons. The README does not mention the kit, and the spec still
# points at the Services page.
#
# The point of the size is what a planner sees first: `git ls-files` here
# prints about 33KB, past the 30,000 characters at which Claude Code moves
# output to a file and shows only its first 2KB, and that preview, sorted
# bytewise, ends in pipeline/, long before vendor/.
#
# The field failure this reproduces (predict-before-structure, 2026-07 to
# 2026-10): pages imported only the vendored helm's button and dialog, the
# first page hand-wrote its cards, and later plans mirrored the nearest page,
# so the hand-written markup spread. docs/hyperpowers/ is gitignored, as it
# was there.
#
# Regenerated deterministically on every run: the generator below uses a
# fixed seed, and nothing else here is random.

setup-helpers run create_base_repo

# The bulk of the repository comes from this generator: the rest of the kit,
# the other pages, the core and shared modules, the pipeline and its fixtures.
GEN_DIR=$(mktemp -d)
trap 'rm -rf "$GEN_DIR"' EXIT
cat > "$GEN_DIR/gen.mjs" <<'GEN'
// Writes the bulk of the Harbor fixture: the rest of the Keel kit, the other
// dashboard pages, the core and shared modules, the snapshot pipeline and the
// tools. Run from the fixture root as `node gen.mjs kit|app|deploys`.
// Deterministic: the only randomness is a fixed-seed generator.
import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

function write(path, text) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, text.endsWith('\n') ? text : `${text}\n`);
}

const camel = (s) => s.replace(/-(\w)/g, (_, c) => c.toUpperCase());
const pascal = (s) => {
  const c = camel(s);
  return c[0].toUpperCase() + c.slice(1);
};
const words = (s) => s.replace(/-/g, ' ');
const sentence = (s) => {
  const w = words(s);
  return w[0].toUpperCase() + w.slice(1);
};
const reEsc = (s) => String(s).replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
const GENERATED_AT = '2026-10-01T09:30:00Z';

// mulberry32, seeded once, so every run writes the same bytes.
let seed = 0x5eed1234;
function rand() {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = seed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const pick = (list) => list[Math.floor(rand() * list.length)];
const int = (lo, hi) => lo + Math.floor(rand() * (hi - lo + 1));

// Minutes before the snapshot time, as an ISO timestamp without milliseconds.
function ago(minutes) {
  const t = Date.parse(GENERATED_AT) - minutes * 60_000;
  return new Date(t).toISOString().replace('.000Z', 'Z');
}
function ahead(minutes) {
  return ago(-minutes);
}

// Serializes a value as a JS literal in the dashboard's style: unquoted keys,
// single-quoted strings.
function lit(value, indent = '') {
  if (value === null) return 'null';
  if (typeof value === 'string') return `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
  if (typeof value !== 'object') return String(value);
  if (Array.isArray(value)) {
    if (value.every((v) => typeof v !== 'object' || v === null)) return `[${value.map((v) => lit(v)).join(', ')}]`;
    const inner = value.map((v) => `${indent}  ${lit(v, `${indent}  `)},`).join('\n');
    return `[\n${inner}\n${indent}]`;
  }
  const keys = Object.entries(value).map(([k, v]) => `${/^[a-zA-Z_$][\w$]*$/.test(k) ? k : `'${k}'`}: ${lit(v, indent)}`);
  return `{ ${keys.join(', ')} }`;
}

// One JSON row per line, the way the pipeline writes snapshots.
function snapshotJson(key, rows, extra = {}) {
  const lines = rows.map((r) => `    ${JSON.stringify(r).replace(/":/g, '": ').replace(/,"/g, ', "').replace(/^\{/, '{ ').replace(/\}$/, ' }')}`);
  const more = Object.entries(extra)
    .map(([k, v]) => `  "${k}": ${JSON.stringify(v)},\n`)
    .join('');
  return `{\n  "generatedAt": "${GENERATED_AT}",\n${more}  "${key}": [\n${lines.join(',\n')}\n  ]\n}\n`;
}

const SERVICES = ['api-gateway', 'billing', 'notifications', 'search', 'auth', 'ledger', 'media', 'reports', 'checkout', 'catalog', 'scheduler', 'webhooks'];
const PEOPLE = ['dana', 'marco', 'sam', 'priya', 'lee', 'noor', 'ivan', 'grace', 'tomas', 'aiko'];
const TEAMS = ['platform', 'payments', 'messaging', 'search', 'identity', 'data'];
const REGIONS = ['eu-west-1', 'eu-central-1', 'us-east-1', 'us-west-2', 'ap-southeast-1'];
const ENVIRONMENTS = ['production', 'staging'];

// --- The rest of the Keel kit ----------------------------------------------
//
// One directory per component, one file per part, as in the twelve components
// setup.sh writes by hand. No component here renders a data table, a select or
// a combobox, so the hand-written table and select stay the only ones.

const KIT = {
  sidebar: {
    doc: 'Collapsible side navigation for an app shell.',
    parts: ['', 'provider', 'trigger', 'rail', 'inset', 'header', 'footer', 'content', 'group', 'group-label', 'group-action', 'group-content', 'menu', 'menu-item', 'menu-button', 'menu-action', 'menu-badge', 'menu-skeleton', 'menu-sub', 'menu-sub-item', 'menu-sub-button', 'separator', 'input', 'wrapper', 'toggle', 'collapse', 'section'],
  },
  'dropdown-menu': {
    doc: 'Menu that opens from a trigger. Built on `<details>`, so it opens without script.',
    parts: ['', 'trigger', 'content', 'item', 'checkbox-item', 'radio-group', 'radio-item', 'label', 'separator', 'shortcut', 'group', 'sub', 'sub-trigger', 'sub-content', 'portal', 'indicator', 'arrow'],
  },
  'date-picker': {
    doc: 'Date or date-range field with a calendar popover and preset ranges.',
    parts: ['', 'trigger', 'input', 'popover', 'calendar', 'presets', 'preset', 'range', 'range-start', 'range-end', 'footer', 'clear', 'apply', 'label', 'hint'],
  },
  'context-menu': {
    doc: 'Menu for a region, opened from its trigger area.',
    parts: ['', 'trigger', 'content', 'item', 'checkbox-item', 'radio-item', 'label', 'separator', 'shortcut', 'group', 'sub', 'sub-trigger', 'sub-content'],
  },
  command: {
    doc: 'Command palette: a search input over a grouped list of actions.',
    parts: ['', 'dialog', 'input', 'list', 'empty', 'group', 'item', 'separator', 'shortcut', 'loading', 'footer', 'icon'],
  },
  sheet: {
    doc: 'Panel that slides in from an edge of the screen.',
    parts: ['', 'trigger', 'content', 'header', 'footer', 'title', 'description', 'close', 'overlay', 'body', 'portal'],
  },
  menubar: {
    doc: 'Horizontal bar of menus, as in a desktop application.',
    parts: ['', 'menu', 'trigger', 'content', 'item', 'separator', 'label', 'shortcut', 'sub', 'sub-trigger'],
  },
  popover: {
    doc: 'Floating panel anchored to its trigger. Built on `<details>`.',
    parts: ['', 'trigger', 'content', 'anchor', 'close', 'arrow', 'header', 'body'],
  },
  'navigation-menu': {
    doc: 'Site navigation with optional flyout panels.',
    parts: ['', 'list', 'item', 'trigger', 'content', 'link', 'indicator', 'viewport'],
  },
  breadcrumb: {
    doc: 'Breadcrumb trail.',
    parts: ['', 'list', 'item', 'link', 'page', 'separator', 'ellipsis', 'icon'],
  },
  'input-group': {
    doc: 'Input with addons, text or buttons attached at either end.',
    parts: ['', 'addon', 'input', 'button', 'text', 'textarea', 'icon'],
  },
  avatar: {
    doc: 'User avatar: an image, or initials when there is none.',
    parts: ['', 'image', 'fallback', 'group', 'badge', 'status'],
  },
  accordion: {
    doc: 'Stack of collapsible sections. Each item is a `<details>`.',
    parts: ['', 'item', 'trigger', 'content', 'header', 'icon'],
  },
  'input-otp': {
    doc: 'One-time code input, one slot per character.',
    parts: ['', 'group', 'slot', 'separator', 'caret'],
  },
  calendar: {
    doc: 'Month calendar.',
    parts: ['', 'header', 'grid', 'day', 'nav'],
  },
  'hover-card': {
    doc: 'Card shown when the trigger is hovered or focused.',
    parts: ['', 'trigger', 'content', 'arrow'],
  },
  'radio-group': {
    doc: 'Set of radio buttons.',
    parts: ['', 'item', 'indicator'],
  },
  collapsible: {
    doc: 'A section that expands and collapses. Built on `<details>`.',
    parts: ['', 'trigger', 'content'],
  },
  switch: { doc: 'On/off switch.', parts: ['', 'thumb'] },
  progress: { doc: 'Progress bar.', parts: ['', 'indicator'] },
  tooltip: { doc: 'Tooltip for a control.', parts: ['', 'content'] },
  toast: { doc: 'Transient notification.', parts: ['', 'region'] },
};

// Components built on <details>: the root is the element, the trigger its
// <summary>.
const DISCLOSURE = new Set(['dropdown-menu', 'context-menu', 'popover', 'hover-card', 'collapsible', 'date-picker']);

const PART_DOC = {
  provider: 'state holder. Wrap the app shell in it once',
  trigger: 'trigger, the control that opens it',
  rail: 'rail, the strip that stays visible when it is collapsed',
  inset: 'inset, the main content area beside it',
  header: 'header',
  footer: 'footer',
  content: 'content panel',
  group: 'group of related items',
  'group-label': 'group label',
  'group-action': 'action shown beside a group label',
  'group-content': 'group body',
  menu: 'menu list',
  'menu-item': 'menu entry',
  'menu-button': 'menu button, the link or button inside a menu entry',
  'menu-action': 'secondary action for a menu entry',
  'menu-badge': 'count or status at the end of a menu entry',
  'menu-skeleton': 'placeholder entry shown while a menu loads',
  'menu-sub': 'nested menu',
  'menu-sub-item': 'nested menu entry',
  'menu-sub-button': 'nested menu button',
  separator: 'separator',
  input: 'input',
  wrapper: 'wrapper, which lays it out next to the inset',
  toggle: 'toggle, which collapses or expands it',
  collapse: 'collapsible section',
  section: 'section',
  item: 'item',
  'checkbox-item': 'item with a check state',
  'radio-group': 'group of mutually exclusive items',
  'radio-item': 'item in a radio group',
  label: 'label',
  shortcut: 'keyboard shortcut hint',
  sub: 'submenu',
  'sub-trigger': 'item that opens a submenu',
  'sub-content': 'submenu panel',
  portal: 'portal target, rendered at the end of `<body>`',
  indicator: 'indicator',
  arrow: 'arrow pointing at the trigger',
  popover: 'popover panel',
  calendar: 'calendar slot',
  presets: 'list of preset ranges',
  preset: 'preset range',
  range: 'pair of range fields',
  'range-start': 'start date field',
  'range-end': 'end date field',
  clear: 'clear button',
  apply: 'apply button',
  hint: 'hint text',
  dialog: 'dialog wrapper',
  list: 'list',
  empty: 'message shown when nothing matches',
  loading: 'loading message',
  icon: 'icon slot',
  title: 'title',
  description: 'description',
  close: 'close button',
  overlay: 'overlay behind the panel',
  body: 'body',
  anchor: 'anchor, which positions the content when the trigger is elsewhere',
  link: 'link',
  viewport: 'viewport the content renders into',
  page: 'current page, the last entry',
  ellipsis: 'ellipsis for collapsed entries',
  addon: 'addon, text or an icon at either end',
  button: 'button',
  text: 'text',
  textarea: 'multi-line input',
  image: 'image',
  fallback: 'initials, shown when there is no image',
  badge: 'badge',
  status: 'presence dot',
  slot: 'single-character slot',
  caret: 'caret for the active slot',
  grid: 'month grid',
  day: 'day cell',
  nav: 'previous and next month links',
  thumb: 'thumb',
  region: 'live region the toasts render into',
};

const ROLES = {
  'dropdown-menu': { content: 'menu', group: 'group', 'radio-group': 'group', 'sub-content': 'menu' },
  'context-menu': { content: 'menu', group: 'group', 'sub-content': 'menu' },
  menubar: { content: 'menu' },
  command: { list: 'listbox', group: 'group' },
  'input-otp': { group: 'group' },
  calendar: { grid: 'grid' },
  sheet: { content: 'dialog' },
  toast: { region: 'region' },
  'radio-group': { '': 'radiogroup' },
  tooltip: { content: 'tooltip' },
};
const ITEM_ROLES = { 'dropdown-menu': 'menuitem', 'context-menu': 'menuitem', menubar: 'menuitem', command: 'option' };

const TAGS = {
  'navigation-menu': { '': 'nav', list: 'ul', item: 'li' },
  breadcrumb: { '': 'nav', list: 'ol', item: 'li' },
  sidebar: { '': 'aside', menu: 'ul', 'menu-item': 'li', 'menu-sub': 'ul', 'menu-sub-item': 'li', header: 'header', footer: 'footer', inset: 'main', section: 'section' },
  sheet: { header: 'header', footer: 'footer' },
  popover: { header: 'header' },
  command: { list: 'ul', footer: 'footer' },
  'date-picker': { footer: 'footer' },
};

const TEXT_TAGS = {
  title: 'h2',
  description: 'p',
  label: 'span',
  'group-label': 'div',
  shortcut: 'kbd',
  hint: 'p',
  text: 'span',
  empty: 'p',
  loading: 'p',
  fallback: 'span',
  badge: 'span',
  'menu-badge': 'span',
  addon: 'span',
};

const ITEM_PARTS = new Set(['item', 'link', 'button', 'menu-button', 'menu-sub-button', 'menu-action', 'group-action', 'sub-trigger', 'preset', 'clear', 'apply']);
const DECOR_PARTS = new Set(['icon', 'indicator', 'arrow', 'caret', 'thumb', 'menu-skeleton', 'status', 'anchor']);
const INPUT_PARTS = new Set(['input', 'range-start', 'range-end']);

function fnName(component, part) {
  return camel(part ? `${component}-${part}` : component);
}

function cls(component, part) {
  return part ? `kit-${component}__${part}` : `kit-${component}`;
}

function jsdoc(lines) {
  return `/**\n${lines.map((l) => (l ? ` * ${l}` : ' *')).join('\n')}\n */`;
}

function partDoc(component, part) {
  if (!part) return KIT[component].doc;
  return `${sentence(component)} ${PART_DOC[part]}.`;
}

// Returns [docLines, signature, body] for one part.
function partSource(component, part) {
  const name = fnName(component, part);
  const c = cls(component, part);
  const role = ROLES[component]?.[part];
  const roleAttr = role ? ` role="${role}"` : '';
  const doc = partDoc(component, part);
  const common = ['@param {string} [opts.class] Extra class names.', '@param {Record<string, string | boolean>} [opts.attrs] Extra attributes.'];

  if (!part && DISCLOSURE.has(component)) {
    return [
      [doc, '', '@param {object} opts', '@param {string} opts.children Trusted HTML: the trigger first, then the content.', '@param {boolean} [opts.open]', ...common, '@returns {string}'],
      `export function ${name}({ children, open = false, class: className = '', attrs: extra = {} })`,
      `  return \`<details class="\${cx('${c}', className)}"\${attrs({ ...extra, open })}>\${children}</details>\`;`,
    ];
  }
  if (part === 'trigger' && DISCLOSURE.has(component)) {
    return [
      [doc, '', '@param {{label: string, class?: string}} opts', '@returns {string}'],
      `export function ${name}({ label, class: className = '' })`,
      `  return \`<summary class="\${cx('${c}', className)}">\${esc(label)}</summary>\`;`,
    ];
  }
  if (part === 'trigger' || part === 'toggle') {
    return [
      [doc, '', '@param {object} opts', '@param {string} opts.label', '@param {string} [opts.controls] Id of the element it opens.', ...common, '@returns {string}'],
      `export function ${name}({ label, controls, class: className = '', attrs: extra = {} })`,
      `  return \`<button class="\${cx('${c}', className)}" type="button"\${attrs({ 'aria-controls': controls, ...extra })}>\${esc(label)}</button>\`;`,
    ];
  }
  if (part === 'checkbox-item' || part === 'radio-item') {
    const r = part === 'checkbox-item' ? 'menuitemcheckbox' : 'menuitemradio';
    return [
      [doc, '', '@param {{label: string, checked?: boolean, attrs?: Record<string, string | boolean>}} opts', '@returns {string}'],
      `export function ${name}({ label, checked = false, attrs: extra = {} })`,
      `  return \`<button class="${c}" type="button" role="${r}" aria-checked="\${checked}"\${attrs(extra)}>\${esc(label)}</button>\`;`,
    ];
  }
  if (component === 'radio-group' && part === 'item') {
    return [
      [doc, '', '@param {{name: string, value: string, label: string, checked?: boolean}} opts', '@returns {string}'],
      `export function ${name}({ name, value, label, checked = false })`,
      `  return \`<label class="${c}"><input type="radio" name="\${esc(name)}" value="\${esc(value)}"\${checked ? ' checked' : ''}> \${esc(label)}</label>\`;`,
    ];
  }
  if (part === 'close') {
    return [
      [doc, '', '@param {{label?: string}} [opts] Accessible name.', '@returns {string}'],
      `export function ${name}({ label = 'Close' } = {})`,
      `  return \`<button class="${c}" type="button" aria-label="\${esc(label)}">×</button>\`;`,
    ];
  }
  if (part === 'day') {
    return [
      [doc, '', '@param {{date: string, selected?: boolean, outside?: boolean}} opts', '  `date` is `YYYY-MM-DD`; `outside` marks days of the adjacent months.', '@returns {string}'],
      `export function ${name}({ date, selected = false, outside = false })`,
      `  const day = Number(String(date).slice(8, 10));\n  return \`<button class="\${cx('${c}', outside && '${c}--outside')}" type="button" data-date="\${esc(date)}" aria-pressed="\${selected}">\${day}</button>\`;`,
    ];
  }
  if (part === 'nav') {
    return [
      [doc, '', '@param {{prevHref: string, nextHref: string}} opts', '@returns {string}'],
      `export function ${name}({ prevHref, nextHref })`,
      `  return \`<div class="${c}"><a href="\${esc(prevHref)}" aria-label="Previous month">‹</a><a href="\${esc(nextHref)}" aria-label="Next month">›</a></div>\`;`,
    ];
  }
  if (part === 'image') {
    return [
      [doc, '', '@param {{src: string, alt: string}} opts', '@returns {string}'],
      `export function ${name}({ src, alt })`,
      `  return \`<img class="${c}" src="\${esc(src)}" alt="\${esc(alt)}">\`;`,
    ];
  }
  if (part === 'slot') {
    return [
      [doc, '', '@param {{char?: string, active?: boolean}} [opts]', '@returns {string}'],
      `export function ${name}({ char = '', active = false } = {})`,
      `  return \`<span class="\${cx('${c}', active && '${c}--active')}">\${esc(char)}</span>\`;`,
    ];
  }
  if (part === 'separator') {
    const tag = component === 'breadcrumb' ? 'li' : 'div';
    const inner = component === 'breadcrumb' ? '/' : component === 'input-otp' ? '-' : '';
    const r = component === 'breadcrumb' ? 'role="presentation" aria-hidden="true"' : 'role="separator"';
    return [[doc, '', '@returns {string}'], `export function ${name}()`, `  return '<${tag} class="${c}" ${r}>${inner}</${tag}>';`];
  }
  if (part === 'textarea') {
    return [
      [doc, '', '@param {{name: string, value?: string, rows?: number}} opts', '@returns {string}'],
      `export function ${name}({ name, value = '', rows = 3 })`,
      `  return \`<textarea class="${c}" name="\${esc(name)}" rows="\${Number(rows) || 3}">\${esc(value)}</textarea>\`;`,
    ];
  }
  if (INPUT_PARTS.has(part)) {
    const type = part === 'input' ? (component === 'date-picker' ? 'date' : 'text') : 'date';
    return [
      [doc, '', '@param {object} opts', '@param {string} opts.name', '@param {string} [opts.value]', '@param {string} [opts.placeholder]', '@param {Record<string, string | boolean>} [opts.attrs] Extra attributes.', '@returns {string}'],
      `export function ${name}({ name, value = '', placeholder = '', attrs: extra = {} })`,
      `  return \`<input class="${c}" type="${type}" name="\${esc(name)}" value="\${esc(value)}"\${attrs({ placeholder: placeholder || false, ...extra })}>\`;`,
    ];
  }
  if (part === 'page') {
    return [
      [doc, '', '@param {{text: string}} opts', '@returns {string}'],
      `export function ${name}({ text })`,
      `  return \`<span class="${c}" aria-current="page">\${esc(text)}</span>\`;`,
    ];
  }
  if (part === 'ellipsis') {
    return [[doc, '', '@returns {string}'], `export function ${name}()`, `  return '<span class="${c}" aria-hidden="true">…</span>';`];
  }
  if (ITEM_PARTS.has(part)) {
    const r = ITEM_ROLES[component];
    const roleText = r ? ` role="${r}"` : '';
    return [
      [doc, ' A link when `href` is given, otherwise a button.', '', '@param {object} opts', '@param {string} opts.label', '@param {string} [opts.href]', '@param {boolean} [opts.disabled] For a button only.', '@param {Record<string, string | boolean>} [opts.attrs] Extra attributes.', '@returns {string}'],
      `export function ${name}({ label, href, disabled = false, attrs: extra = {} })`,
      `  if (href) return \`<a class="${c}"${roleText} href="\${esc(href)}"\${attrs(extra)}>\${esc(label)}</a>\`;\n  return \`<button class="${c}" type="button"${roleText}\${attrs({ ...extra, disabled })}>\${esc(label)}</button>\`;`,
    ];
  }
  if (DECOR_PARTS.has(part)) {
    return [
      [doc, '', '@param {{class?: string}} [opts]', '@returns {string}'],
      `export function ${name}({ class: className = '' } = {})`,
      `  return \`<span class="\${cx('${c}', className)}" aria-hidden="true"></span>\`;`,
    ];
  }
  if (TEXT_TAGS[part]) {
    const tag = TEXT_TAGS[part];
    const extraAttr = part === 'loading' ? ' role="status"' : '';
    return [
      [doc, '', '@param {{text: string, class?: string}} opts', '@returns {string}'],
      `export function ${name}({ text, class: className = '' })`,
      `  return \`<${tag} class="\${cx('${c}', className)}"${extraAttr}>\${esc(text)}</${tag}>\`;`,
    ];
  }
  const tag = TAGS[component]?.[part] ?? 'div';
  if (!part && tag === 'nav') {
    return [
      [doc, '', '@param {{label: string, children: string, class?: string}} opts', '  `children` is trusted HTML.', '@returns {string}'],
      `export function ${name}({ label, children, class: className = '' })`,
      `  return \`<nav class="\${cx('${c}', className)}" aria-label="\${esc(label)}">\${children}</nav>\`;`,
    ];
  }
  return [
    [doc, '', '@param {object} [opts]', '@param {string} [opts.children] Trusted HTML.', ...common, '@returns {string}'],
    `export function ${name}({ children = '', class: className = '', attrs: extra = {} } = {})`,
    `  return \`<${tag} class="\${cx('${c}', className)}"${roleAttr}\${attrs(extra)}>\${children}</${tag}>\`;`,
  ];
}

// Parts whose markup is more than a wrapper, written out in full.
const BESPOKE = {
  'progress/': [
    ['Progress bar.', '', '@param {{value: number, max?: number, label: string}} opts', '@returns {string}'],
    'export function progress({ value, max = 100, label })',
    "  const pct = Math.max(0, Math.min(100, (Number(value) / Number(max)) * 100 || 0));\n  return `<div class=\"kit-progress\" role=\"progressbar\" aria-label=\"${esc(label)}\" aria-valuenow=\"${esc(value)}\" aria-valuemin=\"0\" aria-valuemax=\"${esc(max)}\"><span class=\"kit-progress__indicator\" style=\"width: ${pct.toFixed(1)}%\"></span></div>`;",
  ],
  'switch/': [
    ['On/off switch, a checkbox styled as a track and thumb.', '', '@param {{name: string, label: string, checked?: boolean}} opts', '@returns {string}'],
    'export function switchControl({ name, label, checked = false })',
    "  return `<label class=\"kit-switch\"><input type=\"checkbox\" role=\"switch\" name=\"${esc(name)}\"${checked ? ' checked' : ''}><span class=\"kit-switch__track\"><span class=\"kit-switch__thumb\"></span></span> ${esc(label)}</label>`;",
  ],
  'tooltip/': [
    ['Tooltip. Wraps a control and shows `text` on hover and focus.', '', '@param {{text: string, children: string}} opts `children` is trusted HTML.', '@returns {string}'],
    'export function tooltip({ text, children })',
    "  return `<span class=\"kit-tooltip\">${children}<span class=\"kit-tooltip__content\" role=\"tooltip\">${esc(text)}</span></span>`;",
  ],
  'toast/': [
    ['Transient notification.', '', '@param {{title: string, body?: string, tone?: \'info\' | \'ok\' | \'warn\' | \'bad\'}} opts', '@returns {string}'],
    "export function toast({ title, body = '', tone = 'info' })",
    "  const more = body ? `<p class=\"kit-toast__body\">${esc(body)}</p>` : '';\n  return `<div class=\"kit-toast kit-toast--${esc(tone)}\" role=\"status\"><p class=\"kit-toast__title\">${esc(title)}</p>${more}</div>`;",
  ],
  'avatar/': [
    ['User avatar: an image, or initials when there is none.', '', '@param {{name: string, src?: string, size?: \'sm\' | \'md\' | \'lg\'}} opts', '@returns {string}'],
    "export function avatar({ name, src, size = 'md' })",
    "  const initials = String(name)\n    .split(/\\s+/)\n    .map((w) => w[0] ?? '')\n    .join('')\n    .slice(0, 2)\n    .toUpperCase();\n  const inner = src\n    ? `<img class=\"kit-avatar__image\" src=\"${esc(src)}\" alt=\"${esc(name)}\">`\n    : `<span class=\"kit-avatar__fallback\" aria-label=\"${esc(name)}\">${esc(initials)}</span>`;\n  return `<span class=\"${cx('kit-avatar', `kit-avatar--${size}`)}\">${inner}</span>`;",
  ],
};

// Single-part components, written out in full.
const SINGLE = {
  toggle: [
    ['A two-state button. The pressed state is `aria-pressed`.', '', '@param {{label: string, pressed?: boolean, attrs?: Record<string, string | boolean>}} opts', '@returns {string}'],
    'export function toggle({ label, pressed = false, attrs: extra = {} })',
    '  return `<button class="kit-toggle" type="button" aria-pressed="${pressed}"${attrs(extra)}>${esc(label)}</button>`;',
  ],
  textarea: [
    ['Multi-line text input.', '', '@param {{name: string, value?: string, rows?: number, placeholder?: string}} opts', '@returns {string}'],
    "export function textarea({ name, value = '', rows = 3, placeholder = '' })",
    '  return `<textarea class="kit-textarea" name="${esc(name)}" rows="${Number(rows) || 3}"${attrs({ placeholder: placeholder || false })}>${esc(value)}</textarea>`;',
  ],
  spinner: [
    ['Loading spinner with an accessible label.', '', '@param {{label?: string}} [opts]', '@returns {string}'],
    "export function spinner({ label = 'Loading' } = {})",
    '  return `<span class="kit-spinner" role="status"><span class="kit-sr-only">${esc(label)}</span></span>`;',
  ],
  slider: [
    ['Range slider.', '', '@param {{name: string, label: string, value?: number, min?: number, max?: number, step?: number}} opts', '@returns {string}'],
    'export function slider({ name, label, value = 0, min = 0, max = 100, step = 1 })',
    '  return `<input class="kit-slider" type="range" name="${esc(name)}" aria-label="${esc(label)}" value="${esc(value)}" min="${esc(min)}" max="${esc(max)}" step="${esc(step)}">`;',
  ],
  skeleton: [
    ['Placeholder block shown while content loads.', '', '@param {{width?: string, height?: string}} [opts] CSS lengths.', '@returns {string}'],
    "export function skeleton({ width = '100%', height = '1rem' } = {})",
    '  return `<span class="kit-skeleton" style="width: ${esc(width)}; height: ${esc(height)}" aria-hidden="true"></span>`;',
  ],
  separator: [
    ['Visual separator.', '', "@param {{orientation?: 'horizontal' | 'vertical'}} [opts]", '@returns {string}'],
    "export function separator({ orientation = 'horizontal' } = {})",
    "  const o = orientation === 'vertical' ? 'vertical' : 'horizontal';\n  return `<div class=\"kit-separator kit-separator--${o}\" role=\"separator\" aria-orientation=\"${o}\"></div>`;",
  ],
  'scroll-area': [
    ['Scrollable region with a fixed maximum height. Focusable, so it scrolls from the keyboard.', '', '@param {{children: string, label: string, maxHeight?: string}} opts', '  `children` is trusted HTML.', '@returns {string}'],
    "export function scrollArea({ children, label, maxHeight = '20rem' })",
    '  return `<div class="kit-scroll-area" style="max-height: ${esc(maxHeight)}" tabindex="0" aria-label="${esc(label)}">${children}</div>`;',
  ],
  label: [
    ['Form label.', '', '@param {{text: string, for?: string}} opts', '@returns {string}'],
    'export function label({ text, for: htmlFor })',
    '  return `<label class="kit-label"${attrs({ for: htmlFor })}>${esc(text)}</label>`;',
  ],
  input: [
    ['Text input.', '', '@param {object} opts', '@param {string} opts.name', '@param {string} [opts.value]', "@param {'text' | 'search' | 'email' | 'number' | 'url'} [opts.type]", '@param {string} [opts.placeholder]', '@param {Record<string, string | boolean>} [opts.attrs] Extra attributes.', '@returns {string}'],
    "export function input({ name, value = '', type = 'text', placeholder = '', attrs: extra = {} })",
    '  return `<input class="kit-input" type="${esc(type)}" name="${esc(name)}" value="${esc(value)}"${attrs({ placeholder: placeholder || false, ...extra })}>`;',
  ],
  checkbox: [
    ['Checkbox with its label.', '', '@param {{name: string, label: string, checked?: boolean, value?: string}} opts', '@returns {string}'],
    "export function checkbox({ name, label, checked = false, value = 'on' })",
    "  return `<label class=\"kit-checkbox\"><input type=\"checkbox\" name=\"${esc(name)}\" value=\"${esc(value)}\"${checked ? ' checked' : ''}> ${esc(label)}</label>`;",
  ],
  kbd: [
    ['Keyboard key, or a chord when given several keys.', '', '@param {string | string[]} keys', '@returns {string}'],
    'export function kbd(keys)',
    "  return []\n    .concat(keys)\n    .map((k) => `<kbd class=\"kit-kbd\">${esc(k)}</kbd>`)\n    .join('+');",
  ],
  'aspect-ratio': [
    ['Box that keeps its content at a fixed aspect ratio.', '', '@param {{children: string, ratio?: number}} opts `children` is trusted HTML.', '@returns {string}'],
    'export function aspectRatio({ children, ratio = 16 / 9 })',
    '  return `<div class="kit-aspect-ratio" style="aspect-ratio: ${Number(ratio) || 16 / 9}">${children}</div>`;',
  ],
};

const KIT_CSS = {
  sidebar: '.kit-sidebar { display: flex; flex-direction: column; width: 15rem; border-right: 1px solid var(--kit-border); }',
  'dropdown-menu': '.kit-dropdown-menu { position: relative; display: inline-block; } .kit-dropdown-menu__content { position: absolute; min-width: 10rem; background: #fff; border: 1px solid var(--kit-border); border-radius: 6px; padding: .25rem; }',
  'date-picker': '.kit-date-picker { position: relative; display: inline-flex; flex-direction: column; gap: .25rem; }',
  'context-menu': '.kit-context-menu__content { min-width: 10rem; background: #fff; border: 1px solid var(--kit-border); border-radius: 6px; }',
  command: '.kit-command { border: 1px solid var(--kit-border); border-radius: 8px; overflow: hidden; } .kit-command__input { width: 100%; border: 0; border-bottom: 1px solid var(--kit-border); padding: .5rem .75rem; }',
  sheet: '.kit-sheet__content { position: fixed; top: 0; right: 0; bottom: 0; width: 24rem; background: #fff; box-shadow: -4px 0 16px rgb(0 0 0 / .15); }',
  menubar: '.kit-menubar { display: flex; gap: .25rem; border: 1px solid var(--kit-border); border-radius: 6px; padding: .25rem; }',
  popover: '.kit-popover { position: relative; display: inline-block; } .kit-popover__content { position: absolute; z-index: 10; background: #fff; border: 1px solid var(--kit-border); border-radius: 6px; padding: .75rem; }',
  'navigation-menu': '.kit-navigation-menu__list { display: flex; gap: 1rem; list-style: none; margin: 0; padding: 0; }',
  breadcrumb: '.kit-breadcrumb__list { display: flex; gap: .5rem; list-style: none; margin: 0 0 1rem; padding: 0; color: var(--kit-muted); }',
  'input-group': '.kit-input-group { display: inline-flex; align-items: stretch; border: 1px solid var(--kit-border); border-radius: 6px; }',
  avatar: '.kit-avatar { display: inline-flex; align-items: center; justify-content: center; width: 2rem; height: 2rem; border-radius: 50%; background: #eaeef2; overflow: hidden; }',
  accordion: '.kit-accordion__item { border-bottom: 1px solid var(--kit-border); } .kit-accordion__trigger { padding: .5rem 0; cursor: pointer; }',
  'input-otp': '.kit-input-otp__slot { display: inline-flex; width: 2rem; height: 2.5rem; align-items: center; justify-content: center; border: 1px solid var(--kit-border); }',
  calendar: '.kit-calendar__grid { display: grid; grid-template-columns: repeat(7, 2rem); gap: 2px; } .kit-calendar__day--outside { color: var(--kit-muted); }',
  'hover-card': '.kit-hover-card__content { position: absolute; z-index: 10; width: 16rem; background: #fff; border: 1px solid var(--kit-border); border-radius: 6px; padding: .75rem; }',
  'radio-group': '.kit-radio-group { display: flex; flex-direction: column; gap: .25rem; }',
  collapsible: '.kit-collapsible__trigger { cursor: pointer; }',
  switch: '.kit-switch__track { display: inline-block; width: 2rem; height: 1rem; border-radius: 1rem; background: var(--kit-border); vertical-align: middle; }',
  progress: '.kit-progress { height: .5rem; background: #eaeef2; border-radius: 1rem; overflow: hidden; } .kit-progress__indicator { display: block; height: 100%; background: var(--kit-info); }',
  tooltip: '.kit-tooltip { position: relative; } .kit-tooltip__content { display: none; position: absolute; bottom: 100%; padding: .25rem .5rem; background: #24292f; color: #fff; border-radius: 4px; font-size: .75rem; } .kit-tooltip:hover .kit-tooltip__content, .kit-tooltip:focus-within .kit-tooltip__content { display: block; }',
  toast: '.kit-toast { border: 1px solid var(--kit-border); border-radius: 6px; padding: .5rem .75rem; background: #fff; }',
  textarea: '.kit-textarea { width: 100%; padding: .25rem .5rem; font: inherit; }',
  spinner: '.kit-spinner { display: inline-block; width: 1rem; height: 1rem; border: 2px solid var(--kit-border); border-top-color: var(--kit-info); border-radius: 50%; animation: kit-spin 1s linear infinite; } @keyframes kit-spin { to { transform: rotate(360deg); } } .kit-sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }',
  slider: '.kit-slider { width: 100%; }',
  skeleton: '.kit-skeleton { display: block; background: #eaeef2; border-radius: 4px; }',
  separator: '.kit-separator--horizontal { height: 1px; background: var(--kit-border); margin: .5rem 0; } .kit-separator--vertical { width: 1px; background: var(--kit-border); }',
  'scroll-area': '.kit-scroll-area { overflow: auto; }',
  label: '.kit-label { font-size: .8rem; font-weight: 600; }',
  input: '.kit-input { padding: .25rem .5rem; border: 1px solid var(--kit-border); border-radius: 6px; font: inherit; }',
  checkbox: '.kit-checkbox { display: inline-flex; gap: .35rem; align-items: center; }',
  kbd: '.kit-kbd { padding: 0 .3rem; border: 1px solid var(--kit-border); border-radius: 4px; font-size: .75rem; background: #f6f8fa; }',
  'aspect-ratio': '.kit-aspect-ratio { position: relative; width: 100%; overflow: hidden; }',
};

function moduleSource([docLines, signature, body]) {
  const used = ['attrs', 'cx', 'esc'].filter((f) => body.includes(`${f}(`));
  const head = used.length ? `import { ${used.join(', ')} } from '#kit/utils';\n\n` : '';
  return `${head}${jsdoc(docLines)}\n${signature} {\n${body}\n}\n`;
}

function genKit() {
  const index = (component, entries) =>
    entries.map(([fn, file]) => `export { ${fn} } from './lib/${file}.js';`).join('\n');
  for (const [component, { parts }] of Object.entries(KIT)) {
    const entries = [];
    for (const part of parts) {
      const file = part ? `${component}-${part}` : component;
      const src = BESPOKE[`${component}/${part}`] ?? partSource(component, part);
      const fn = src[1].match(/export function (\w+)/)[1];
      write(`vendor/kit/${component}/src/lib/${file}.js`, moduleSource(src));
      entries.push([fn, file]);
    }
    write(`vendor/kit/${component}/src/index.js`, index(component, entries));
  }
  for (const [component, src] of Object.entries(SINGLE)) {
    const fn = src[1].match(/export function (\w+)/)[1];
    write(`vendor/kit/${component}/src/lib/${component}.js`, moduleSource(src));
    write(`vendor/kit/${component}/src/index.js`, index(component, [[fn, component]]));
  }
  appendFileSync('public/kit.css', `${Object.values(KIT_CSS).join('\n')}\n`);
}

// --- The other dashboard pages ---------------------------------------------
//
// Each page hand-writes its markup the way the first five do: tables, selects
// and pills in the page module, with only the kit button and dialog imported.

const pad = (n, w = 2) => String(n).padStart(w, '0');

const ALERT_NAMES = ['high-error-rate', 'p95-latency', 'disk-almost-full', 'cert-expiring', 'queue-backlog', 'crash-looping', 'replica-lag', 'memory-pressure', 'node-not-ready', 'budget-burn', 'dns-failures', 'cpu-throttled', 'heartbeat-missing', 'conn-pool-full'];
const DBS = ['billing-main', 'ledger', 'search-meta', 'auth', 'media-meta', 'reports-olap', 'checkout', 'catalog', 'sessions', 'scheduler'];
const QUEUES = ['email-send', 'webhook-deliver', 'invoice-render', 'search-index', 'thumbnail', 'ledger-post', 'audit-ship', 'export-csv', 'sms-send', 'push-send', 'report-build', 'cache-warm'];
const JOBS = ['nightly-backup', 'invoice-run', 'reindex-search', 'rotate-logs', 'expire-sessions', 'sync-catalog', 'refresh-rates', 'purge-media', 'send-digests', 'compact-ledger', 'vacuum-db', 'renew-certs'];
const SUBDOMAINS = ['api', 'app', 'auth', 'billing', 'cdn', 'docs', 'status', 'hooks', 'media', 'search'];
const TOKENS = ['ci-deploy', 'grafana-read', 'pager-sync', 'backup-agent', 'billing-export', 'search-admin', 'status-page', 'chatops', 'audit-reader', 'release-bot'];
const ENDPOINTS = ['/v1/charges', '/v1/invoices', '/v1/search', '/v1/sessions', '/v1/users', '/v1/media', '/v1/catalog/items', '/v1/checkout', '/v1/webhooks', '/v1/ledger/entries', '/v1/notifications'];
const SECRETS = ['db-billing-password', 'stripe-api-key', 'smtp-password', 'jwt-signing-key', 'search-admin-key', 'sentry-dsn', 'pager-token', 'cdn-signing-key', 'oauth-client-secret', 'backup-encryption-key'];
const VENDORS = ['Stripe', 'Twilio', 'SendGrid', 'Cloudflare', 'PagerDuty', 'GitHub', 'Datadog', 'Sentry', 'Okta'];
const ALL_REGIONS = [...REGIONS, 'europe-west1', 'us-central1', 'asia-east1'];

const PAGES = [
  {
    name: 'alerts', title: 'Alerts', kind: 'table', key: 'alerts', count: 14,
    comment: ['Firing and recent alerts. Filter with ?severity=critical|warning|info; sort', 'with ?sort=name|firedAt and ?dir=asc|desc (default: name, ascending).'],
    columns: [['name', 'Alert'], ['service', 'Service'], ['severity', 'Severity'], ['state', 'State'], ['firedAt', 'Fired']],
    filter: { field: 'severity', const: 'SEVERITIES', values: ['critical', 'warning', 'info'], all: 'All severities', label: 'Severity' },
    sorts: [['name', 'text'], ['firedAt', 'text']],
    pill: { field: 'severity', map: { critical: 'pill-red', warning: 'pill-amber' }, fallback: 'pill-grey' },
    legend: { title: 'Severities', items: [['critical', 'pill-red', 'pages whoever is on call'], ['warning', 'pill-amber', 'opens a ticket for the owning team'], ['info', 'pill-grey', 'shown here only']] },
    empty: 'No alerts at this severity.',
    row: (i) => ({ name: ALERT_NAMES[i], service: pick(SERVICES), severity: pick(['critical', 'warning', 'warning', 'info']), state: pick(['firing', 'acknowledged', 'silenced']), firedAt: ago(int(3, 2880)) }),
    mini: [{ severity: 'critical', firedAt: '2026-10-01T08:12:00Z' }, { severity: 'warning', firedAt: '2026-09-30T22:40:00Z' }, { severity: 'critical', firedAt: '2026-10-01T09:01:00Z' }],
  },
  {
    name: 'hosts', title: 'Hosts', kind: 'table', key: 'hosts', count: 16,
    comment: ['Hosts and their load. Filter with ?region=<region>; sort with', '?sort=name|load and ?dir=asc|desc (default: name, ascending).'],
    columns: [['name', 'Host'], ['region', 'Region'], ['role', 'Role'], ['status', 'Status'], ['load', 'Load'], ['upSince', 'Up since']],
    filter: { field: 'region', const: 'REGIONS', values: REGIONS, all: 'All regions', label: 'Region' },
    sorts: [['name', 'text'], ['load', 'number']],
    pill: { field: 'status', map: { up: 'pill-green', draining: 'pill-amber' }, fallback: 'pill-red' },
    empty: 'No hosts in this region.',
    row: (i) => {
      const role = ['web', 'api', 'worker', 'cache'][i % 4];
      return { name: `${role}-${pad(i + 1)}`, region: pick(REGIONS), role, status: pick(['up', 'up', 'up', 'draining', 'down']), load: Math.round(rand() * 400) / 100, upSince: ago(int(600, 40000)) };
    },
    mini: [{ region: 'eu-west-1', load: 0.42 }, { region: 'eu-central-1', load: 1.9 }, { region: 'eu-west-1', load: 3.05 }],
  },
  {
    name: 'clusters', title: 'Clusters', kind: 'panels', key: 'clusters', count: 9,
    comment: ['Kubernetes clusters, one panel per region.'],
    group: ['region', 'regions'], item: 'name', detail: 'version', noun: 'clusters',
    pill: { field: 'status', map: { healthy: 'pill-green', upgrading: 'pill-amber' }, fallback: 'pill-red' },
    footer: { label: 'View hosts', href: '`/hosts?region=${encodeURIComponent(region)}`', test: (g) => `/hosts?region=${g}` },
    row: (i) => ({ name: `k8s-${['blue', 'green', 'amber', 'teal'][i % 4]}-${pad(i + 1)}`, region: pick(REGIONS), version: pick(['1.31.4', '1.32.1', '1.32.2']), nodes: int(3, 40), status: pick(['healthy', 'healthy', 'upgrading', 'degraded']) }),
    mini: [{ region: 'us-east-1', status: 'degraded' }, { region: 'eu-west-1', status: 'healthy' }, { region: 'us-east-1', status: 'healthy' }],
  },
  {
    name: 'databases', title: 'Databases', kind: 'table', key: 'databases', count: 10,
    comment: ['Database instances, by name.'],
    columns: [['name', 'Database'], ['engine', 'Engine'], ['version', 'Version'], ['size', 'Size'], ['replicas', 'Replicas'], ['status', 'Status']],
    pill: { field: 'status', map: { online: 'pill-green', maintenance: 'pill-amber' }, fallback: 'pill-red' },
    empty: 'No databases.',
    row: (i) => {
      const engine = pick(['postgres', 'postgres', 'mysql', 'redis']);
      const version = { postgres: pick(['16.4', '17.2']), mysql: '8.4.3', redis: '7.4.1' }[engine];
      return { name: DBS[i], engine, version, size: `${int(1, 900)} GB`, replicas: int(0, 3), status: pick(['online', 'online', 'online', 'maintenance', 'offline']) };
    },
    mini: [{ status: 'maintenance' }, { status: 'online' }, { status: 'offline' }],
  },
  {
    name: 'queues', title: 'Queues', kind: 'table', key: 'queues', count: 12,
    comment: ['Work queues and how far behind their consumers are. Sort with', '?sort=name|depth and ?dir=asc|desc (default: name, ascending).'],
    columns: [['name', 'Queue'], ['depth', 'Depth'], ['consumers', 'Consumers'], ['oldest', 'Oldest message'], ['status', 'Status']],
    sorts: [['name', 'text'], ['depth', 'number']],
    pill: { field: 'status', map: { ok: 'pill-green', backlog: 'pill-amber' }, fallback: 'pill-red' },
    empty: 'No queues.',
    row: (i) => ({ name: QUEUES[i], depth: int(0, 20000), consumers: int(0, 12), oldest: `${int(0, 59)}m`, status: pick(['ok', 'ok', 'backlog', 'stalled']) }),
    mini: [{ depth: 120, status: 'backlog' }, { depth: 9800 }, { depth: 0 }],
  },
  {
    name: 'jobs', title: 'Jobs', kind: 'list', key: 'jobs', count: 12,
    comment: ['Scheduled jobs, by name. ?state=failed shows only the jobs whose last run', 'failed.'],
    titleField: 'name', meta: [['schedule', ''], ['lastRun', 'last run ']], order: ['name', 'asc'],
    tabs: { param: 'state', options: [['all', 'All'], ['failed', 'Failed']], match: "state === 'all' || j.state === 'failed'", member: (r, t) => t === 'all' || r.state === 'failed' },
    pill: { field: 'state', map: { ok: 'pill-green', running: 'pill-grey' }, fallback: 'pill-red' },
    empty: 'No jobs to show.',
    row: (i) => ({ name: JOBS[i], schedule: pick(['hourly', 'daily 02:00', 'daily 04:30', 'weekly Mon 03:00', 'every 15m']), lastRun: ago(int(5, 1440)), state: pick(['ok', 'ok', 'ok', 'failed', 'running']) }),
    mini: [{ state: 'failed' }, { state: 'ok' }, { state: 'running' }],
  },
  {
    name: 'certificates', title: 'Certificates', kind: 'table', key: 'certificates', count: 10,
    comment: ['TLS certificates and when they expire. Sort with ?sort=domain|expiresAt', 'and ?dir=asc|desc (default: domain, ascending).'],
    columns: [['domain', 'Domain'], ['issuer', 'Issuer'], ['expiresAt', 'Expires'], ['status', 'Status']],
    sorts: [['domain', 'text'], ['expiresAt', 'text']],
    pill: { field: 'status', map: { valid: 'pill-green', expiring: 'pill-amber' }, fallback: 'pill-red' },
    empty: 'No certificates.',
    row: (i) => {
      const minutes = int(-2000, 150000);
      const status = minutes < 0 ? 'expired' : minutes < 43200 ? 'expiring' : 'valid';
      return { domain: `${SUBDOMAINS[i]}.example.com`, issuer: pick(["Let's Encrypt R11", 'Sectigo RSA DV', 'Amazon RSA 2048 M02']).replace("'", ''), expiresAt: ahead(minutes), status };
    },
    mini: [{ expiresAt: '2026-11-20T00:00:00Z', status: 'valid' }, { expiresAt: '2026-10-09T00:00:00Z', status: 'expiring' }, { expiresAt: '2027-02-01T00:00:00Z', status: 'valid' }],
  },
  {
    name: 'domains', title: 'Domains', kind: 'table', key: 'domains', count: 7,
    comment: ['Registered domains, their renewal dates and whether DNS resolves as', 'configured.'],
    columns: [['name', 'Domain'], ['registrar', 'Registrar'], ['expiresAt', 'Renews'], ['dns', 'DNS']],
    pill: { field: 'dns', map: { ok: 'pill-green' }, fallback: 'pill-red' },
    empty: 'No domains.',
    row: (i) => ({ name: ['example.com', 'example.net', 'example.io', 'example-status.com', 'example.dev', 'example.co.uk', 'example.app'][i], registrar: pick(['Gandi', 'Namecheap', 'Route 53']), expiresAt: ahead(int(20000, 500000)), dns: pick(['ok', 'ok', 'ok', 'misconfigured']) }),
    mini: [{ dns: 'misconfigured' }, { dns: 'ok' }, { dns: 'ok' }],
  },
  {
    name: 'costs', title: 'Costs', kind: 'panels', key: 'budgets', count: 12,
    comment: ['Month-to-date spend against budget, one panel per team.'],
    group: ['team', 'teams'], item: 'service', detail: 'spent', noun: 'services',
    pill: { field: 'status', map: { under: 'pill-green', near: 'pill-amber' }, fallback: 'pill-red' },
    row: (i) => {
      const budget = int(10, 80) * 100;
      const spent = Math.round(budget * (0.4 + rand() * 0.8));
      const status = spent > budget ? 'over' : spent > budget * 0.9 ? 'near' : 'under';
      return { service: SERVICES[i], team: pick(TEAMS), budget: `$${budget}`, spent: `$${spent}`, status };
    },
    mini: [{ team: 'payments', status: 'over' }, { team: 'platform', status: 'under' }, { team: 'payments', status: 'near' }],
  },
  {
    name: 'capacity', title: 'Capacity', kind: 'table', key: 'resources', count: 12,
    comment: ['How much of each pool is in use, by resource.'],
    columns: [['name', 'Resource'], ['kind', 'Kind'], ['used', 'Used'], ['total', 'Total'], ['status', 'Status']],
    pill: { field: 'status', map: { ok: 'pill-green', tight: 'pill-amber' }, fallback: 'pill-red' },
    empty: 'No resources.',
    row: (i) => {
      const kind = ['compute', 'memory', 'storage'][i % 3];
      const total = int(4, 64) * 16;
      const used = Math.round(total * rand());
      const status = used > total * 0.95 ? 'full' : used > total * 0.8 ? 'tight' : 'ok';
      return { name: `${kind}-${REGIONS[Math.floor(i / 3) % REGIONS.length]}`, kind, used, total, status };
    },
    mini: [{ status: 'tight' }, { status: 'ok' }, { status: 'full' }],
  },
  {
    name: 'slos', title: 'SLOs', kind: 'table', key: 'slos', count: 12,
    comment: ['Service level objectives and the error budget left this month. Sort with', '?sort=name|budgetLeft and ?dir=asc|desc (default: name, ascending).'],
    columns: [['name', 'Objective'], ['service', 'Service'], ['target', 'Target'], ['current', 'Current'], ['budgetLeft', 'Budget left %'], ['status', 'Status']],
    sorts: [['name', 'text'], ['budgetLeft', 'number']],
    pill: { field: 'status', map: { met: 'pill-green', 'at-risk': 'pill-amber' }, fallback: 'pill-red' },
    legend: { title: 'Objective states', items: [['met', 'pill-green', 'more than a quarter of the budget left'], ['at-risk', 'pill-amber', 'less than a quarter left'], ['breached', 'pill-red', 'the budget is spent']] },
    empty: 'No objectives.',
    row: (i) => {
      const budgetLeft = int(-20, 100);
      const status = budgetLeft < 0 ? 'breached' : budgetLeft < 25 ? 'at-risk' : 'met';
      return { name: `${SERVICES[i]}-${pick(['availability', 'latency'])}`, service: SERVICES[i], target: pick(['99.9%', '99.95%', '99.5%']), current: `${(99 + rand()).toFixed(2)}%`, budgetLeft, status };
    },
    mini: [{ budgetLeft: 64, status: 'met' }, { budgetLeft: -4, status: 'breached' }, { budgetLeft: 12, status: 'at-risk' }],
  },
  {
    name: 'maintenance', title: 'Maintenance', kind: 'list', key: 'windows', count: 9,
    comment: ['Planned maintenance windows. Upcoming ones by default; ?when=done shows the', 'finished ones.'],
    titleField: 'title', meta: [['service', ''], ['startsAt', 'starts '], ['endsAt', 'ends ']], order: ['startsAt', 'asc'],
    tabs: { param: 'when', options: [['upcoming', 'Upcoming'], ['done', 'Done']], match: 'w.state === when', member: (r, t) => r.state === t },
    pill: { field: 'state', map: { upcoming: 'pill-amber' }, fallback: 'pill-grey' },
    empty: 'No maintenance windows to show.',
    row: (i) => {
      const start = int(-20000, 20000);
      return { id: `mw-${200 + i}`, title: `${pick(['Upgrade', 'Patch', 'Failover test for', 'Resize'])} ${pick(DBS)}`, service: pick(SERVICES), startsAt: ahead(start), endsAt: ahead(start + int(30, 240)), state: start > 0 ? 'upcoming' : 'done' };
    },
    mini: [{ title: 'Upgrade ledger', state: 'upcoming', startsAt: '2026-10-04T01:00:00Z' }, { title: 'Patch auth', state: 'done', startsAt: '2026-09-20T01:00:00Z' }, { title: 'Resize catalog', state: 'upcoming', startsAt: '2026-10-02T01:00:00Z' }],
  },
  {
    name: 'changes', title: 'Changes', kind: 'list', key: 'changes', count: 11,
    comment: ['Change requests, newest first. Pending ones by default; ?view=decided', 'shows the approved and rejected ones.'],
    titleField: 'title', meta: [['author', 'by '], ['openedAt', 'opened ']], order: ['openedAt', 'desc'],
    tabs: { param: 'view', options: [['pending', 'Pending'], ['decided', 'Decided']], match: "(view === 'pending' ? c.state === 'pending' : c.state !== 'pending')", member: (r, t) => (t === 'pending' ? r.state === 'pending' : r.state !== 'pending') },
    pill: { field: 'risk', map: { high: 'pill-red', medium: 'pill-amber' }, fallback: 'pill-grey' },
    empty: 'No change requests to show.',
    row: (i) => ({ id: `cr-${880 + i}`, title: `${pick(['Raise', 'Lower', 'Rotate', 'Move', 'Enable'])} ${pick(['connection limits', 'TLS ciphers', 'cache TTLs', 'worker counts', 'log retention'])} for ${pick(SERVICES)}`, author: pick(PEOPLE), risk: pick(['low', 'low', 'medium', 'high']), state: pick(['pending', 'approved', 'rejected']), openedAt: ago(int(30, 9000)) }),
    mini: [{ title: 'Rotate TLS ciphers for auth', risk: 'high', state: 'pending' }, { title: 'Raise cache TTLs for search', risk: 'low', state: 'approved' }, { title: 'Move logs for billing', risk: 'medium', state: 'pending' }],
  },
  {
    name: 'flags', title: 'Flags', kind: 'table', key: 'flags', count: 14,
    comment: ['Feature flags. Filter with ?environment=production|staging; sort with', '?sort=name|updatedAt and ?dir=asc|desc (default: name, ascending).'],
    columns: [['name', 'Flag'], ['environment', 'Environment'], ['state', 'State'], ['rollout', 'Rollout'], ['owner', 'Owner'], ['updatedAt', 'Updated']],
    filter: { field: 'environment', const: 'ENVIRONMENTS', values: ENVIRONMENTS, all: 'All environments', label: 'Environment' },
    sorts: [['name', 'text'], ['updatedAt', 'text']],
    pill: { field: 'state', map: { on: 'pill-green', partial: 'pill-amber' }, fallback: 'pill-grey' },
    legend: { title: 'Flag states', items: [['on', 'pill-green', 'everyone gets the feature'], ['partial', 'pill-amber', 'a percentage rollout'], ['off', 'pill-grey', 'nobody gets it']] },
    empty: 'No flags in this environment.',
    row: (i) => {
      const state = pick(['on', 'off', 'partial']);
      return { name: `${pick(['new', 'fast', 'beta', 'v2'])}-${pick(['checkout', 'search', 'invoices', 'onboarding', 'exports', 'billing-ui', 'media-upload'])}-${i}`, environment: pick(ENVIRONMENTS), state, rollout: state === 'partial' ? `${pick([5, 10, 25, 50])}%` : state === 'on' ? '100%' : '0%', owner: pick(PEOPLE), updatedAt: ago(int(10, 20000)) };
    },
    mini: [{ environment: 'production', state: 'partial', updatedAt: '2026-09-29T10:00:00Z' }, { environment: 'staging', state: 'on', updatedAt: '2026-10-01T07:00:00Z' }, { environment: 'production', state: 'off', updatedAt: '2026-09-15T12:00:00Z' }],
  },
  {
    name: 'backups', title: 'Backups', kind: 'table', key: 'backups', count: 10,
    comment: ['The latest backup of each database. Sort with ?sort=database|finishedAt and', '?dir=asc|desc (default: database, ascending).'],
    columns: [['database', 'Database'], ['kind', 'Kind'], ['size', 'Size'], ['finishedAt', 'Finished'], ['status', 'Status']],
    sorts: [['database', 'text'], ['finishedAt', 'text']],
    pill: { field: 'status', map: { ok: 'pill-green', running: 'pill-grey' }, fallback: 'pill-red' },
    empty: 'No backups.',
    row: (i) => ({ database: DBS[i], kind: pick(['full', 'incremental']), size: `${int(1, 400)} GB`, finishedAt: ago(int(20, 1500)), status: pick(['ok', 'ok', 'ok', 'failed', 'running']) }),
    mini: [{ status: 'failed', finishedAt: '2026-10-01T02:10:00Z' }, { finishedAt: '2026-09-30T23:40:00Z' }, { finishedAt: '2026-10-01T04:05:00Z' }],
  },
  {
    name: 'tokens', title: 'Tokens', kind: 'table', key: 'tokens', count: 10,
    comment: ['API tokens issued to services and people, by name.'],
    columns: [['name', 'Token'], ['owner', 'Owner'], ['scopes', 'Scopes'], ['lastUsed', 'Last used'], ['expiresAt', 'Expires'], ['status', 'Status']],
    pill: { field: 'status', map: { active: 'pill-green', expiring: 'pill-amber' }, fallback: 'pill-grey' },
    empty: 'No tokens.',
    row: (i) => ({ name: TOKENS[i], owner: pick(PEOPLE), scopes: pick(['read', 'read write', 'deploy', 'admin']), lastUsed: ago(int(1, 30000)), expiresAt: ahead(int(1000, 400000)), status: pick(['active', 'active', 'expiring', 'revoked']) }),
    mini: [{ status: 'revoked' }, { status: 'active' }, { status: 'expiring' }],
  },
  {
    name: 'teams', title: 'Teams', kind: 'panels', key: 'teams', count: 6,
    comment: ['Teams by area, with their leads and whether the rotation is fully staffed.'],
    group: ['area', 'areas'], item: 'name', detail: 'lead', noun: 'teams',
    pill: { field: 'staffing', map: { staffed: 'pill-green' }, fallback: 'pill-amber' },
    row: (i) => ({ name: TEAMS[i], area: ['product', 'product', 'product', 'product', 'infrastructure', 'data'][i], lead: PEOPLE[i], members: int(3, 9), channel: `#team-${TEAMS[i]}`, staffing: pick(['staffed', 'staffed', 'short']) }),
    mini: [{ area: 'product', staffing: 'short' }, { area: 'infrastructure', staffing: 'staffed' }, { area: 'product', staffing: 'staffed' }],
  },
  {
    name: 'audit', title: 'Audit log', kind: 'table', key: 'entries', count: 16,
    comment: ['Who did what, from the audit trail. Filter with', '?action=deploy|rollback|config|access; sort with ?sort=at|actor and', '?dir=asc|desc (default: at, ascending).'],
    columns: [['at', 'When'], ['actor', 'Actor'], ['action', 'Action'], ['target', 'Target'], ['result', 'Result']],
    filter: { field: 'action', const: 'ACTIONS', values: ['deploy', 'rollback', 'config', 'access'], all: 'All actions', label: 'Action' },
    sorts: [['at', 'text'], ['actor', 'text']],
    pill: { field: 'result', map: { ok: 'pill-green' }, fallback: 'pill-red' },
    empty: 'No entries for this action.',
    row: (i) => ({ at: ago(i * 47 + int(0, 40)), actor: pick(PEOPLE), action: pick(['deploy', 'rollback', 'config', 'access']), target: pick(SERVICES), result: pick(['ok', 'ok', 'ok', 'denied']) }),
    mini: [{ action: 'deploy', actor: 'dana', result: 'denied' }, { action: 'config', actor: 'priya' }, { action: 'deploy', actor: 'lee' }],
  },
  {
    name: 'endpoints', title: 'Endpoints', kind: 'table', key: 'endpoints', count: 11,
    comment: ['Public API endpoints with their latency and error rate over the last hour.', 'Sort with ?sort=path|p95 and ?dir=asc|desc (default: path, ascending).'],
    columns: [['path', 'Path'], ['method', 'Method'], ['service', 'Service'], ['p95', 'p95 ms'], ['errorRate', 'Errors'], ['status', 'Status']],
    sorts: [['path', 'text'], ['p95', 'number']],
    pill: { field: 'status', map: { ok: 'pill-green', slow: 'pill-amber' }, fallback: 'pill-red' },
    empty: 'No endpoints.',
    row: (i) => ({ path: ENDPOINTS[i], method: pick(['GET', 'GET', 'POST', 'PUT']), service: pick(SERVICES), p95: int(20, 1800), errorRate: `${(rand() * 3).toFixed(2)}%`, status: pick(['ok', 'ok', 'slow', 'erroring']) }),
    mini: [{ p95: 240, status: 'slow' }, { p95: 35 }, { p95: 1210 }],
  },
  {
    name: 'regions', title: 'Regions', kind: 'panels', key: 'regions', count: 8,
    comment: ['Cloud regions we run in, grouped by provider.'],
    group: ['provider', 'providers'], item: 'name', detail: 'services', noun: 'regions',
    pill: { field: 'status', map: { operational: 'pill-green', degraded: 'pill-amber' }, fallback: 'pill-red' },
    row: (i) => ({ name: ALL_REGIONS[i], provider: i < REGIONS.length ? 'aws' : 'gcp', services: int(2, 12), status: pick(['operational', 'operational', 'operational', 'degraded', 'outage']) }),
    mini: [{ provider: 'gcp', status: 'outage' }, { provider: 'aws', status: 'operational' }, { provider: 'aws', status: 'degraded' }],
  },
  {
    name: 'vendors', title: 'Vendors', kind: 'list', key: 'vendors', count: 9,
    comment: ['Third-party services we depend on, from their status pages.'],
    titleField: 'name', meta: [['category', ''], ['checkedAt', 'checked ']], order: ['name', 'asc'],
    link: { label: 'Status page', field: 'statusPage' },
    pill: { field: 'status', map: { operational: 'pill-green', degraded: 'pill-amber' }, fallback: 'pill-red' },
    empty: 'No vendors.',
    row: (i) => ({ name: VENDORS[i], category: pick(['payments', 'messaging', 'email', 'edge', 'paging', 'source', 'monitoring', 'errors', 'identity']), status: pick(['operational', 'operational', 'operational', 'degraded', 'outage']), checkedAt: ago(int(1, 10)), statusPage: `https://status.${VENDORS[i].toLowerCase()}.example.com` }),
    mini: [{ status: 'degraded' }, { status: 'operational' }, { status: 'outage' }],
  },
  {
    name: 'status', title: 'Status', kind: 'panels', key: 'components', count: 10,
    comment: ['The public status page as customers see it, one panel per component group.'],
    group: ['group', 'groups'], item: 'name', noun: 'components',
    pill: { field: 'state', map: { operational: 'pill-green', degraded: 'pill-amber' }, fallback: 'pill-red' },
    row: (i) => ({ name: ['API', 'Dashboard', 'Webhooks', 'Checkout', 'Search', 'Email delivery', 'SMS delivery', 'Media uploads', 'Reports', 'Single sign-on'][i], group: ['Core', 'Core', 'Core', 'Payments', 'Core', 'Messaging', 'Messaging', 'Core', 'Data', 'Core'][i], state: pick(['operational', 'operational', 'operational', 'degraded', 'outage']) }),
    mini: [{ group: 'Messaging', state: 'degraded' }, { group: 'Core', state: 'operational' }, { group: 'Messaging', state: 'operational' }],
  },
  {
    name: 'reports', title: 'Reports', kind: 'list', key: 'reports', count: 8,
    comment: ['Weekly and monthly operations reports, newest first.'],
    titleField: 'title', meta: [['period', ''], ['owner', 'by '], ['publishedAt', 'published ']], order: ['publishedAt', 'desc'],
    link: { label: 'Open', field: 'url' },
    pill: { field: 'state', map: { published: 'pill-green' }, fallback: 'pill-grey' },
    empty: 'No reports yet.',
    row: (i) => ({ id: `rep-${40 + i}`, title: `${pick(['Weekly ops review', 'Incident summary', 'Capacity review', 'Cost review'])} ${40 - i}`, period: pick(['week', 'month']), owner: pick(PEOPLE), publishedAt: ago(i * 10080 + int(0, 600)), state: i === 0 ? 'draft' : 'published', url: `https://wiki.example.com/reports/rep-${40 + i}` }),
    mini: [{ title: 'Weekly ops review 40', state: 'draft', publishedAt: '2026-10-01T08:00:00Z' }, { title: 'Cost review 39', publishedAt: '2026-09-24T08:00:00Z' }, { title: 'Incident summary 38', publishedAt: '2026-09-17T08:00:00Z' }],
  },
  {
    name: 'secrets', title: 'Secrets', kind: 'table', key: 'secrets', count: 10,
    comment: ['Secrets and when they were last rotated, by name. Values never reach the', 'snapshot.'],
    columns: [['name', 'Secret'], ['store', 'Store'], ['rotatedAt', 'Rotated'], ['rotateBy', 'Rotate by'], ['status', 'Status']],
    pill: { field: 'status', map: { ok: 'pill-green', due: 'pill-amber' }, fallback: 'pill-red' },
    empty: 'No secrets.',
    row: (i) => ({ name: SECRETS[i], store: pick(['vault', 'kms']), rotatedAt: ago(int(1000, 200000)), rotateBy: ahead(int(-5000, 100000)), status: pick(['ok', 'ok', 'due', 'overdue']) }),
    mini: [{ status: 'overdue' }, { status: 'ok' }, { status: 'due' }],
  },
  {
    name: 'webhooks', title: 'Webhooks', kind: 'table', key: 'webhooks', count: 9,
    comment: ['Outgoing webhook subscriptions and their last delivery, by name.'],
    columns: [['name', 'Webhook'], ['url', 'URL'], ['events', 'Events'], ['lastDelivery', 'Last delivery'], ['status', 'Status']],
    pill: { field: 'status', map: { healthy: 'pill-green', paused: 'pill-grey' }, fallback: 'pill-red' },
    empty: 'No webhooks.',
    row: (i) => {
      const name = `${pick(['acme', 'globex', 'initech', 'umbrella', 'hooli', 'stark', 'wayne', 'wonka', 'tyrell'])}-${pick(['orders', 'invoices', 'refunds'])}-${i}`;
      return { name, url: `https://hooks.${name.split('-')[0]}.example.com/in`, events: pick(['charge.*', 'invoice.paid', 'refund.created', 'customer.*']), lastDelivery: ago(int(1, 3000)), status: pick(['healthy', 'healthy', 'failing', 'paused']) };
    },
    mini: [{ status: 'failing' }, { status: 'healthy' }, { status: 'paused' }],
  },
];

function pillClassFor(pill, value) {
  return pill.map[value] ?? pill.fallback;
}

function pillSource({ field, map, fallback }) {
  const lines = [`function ${field}Class(${field}) {`];
  for (const [value, c] of Object.entries(map)) lines.push(`  if (${field} === '${value}') return '${c}';`);
  lines.push(`  return '${fallback}';`, '}');
  return lines.join('\n');
}

function pillCell(v, field) {
  return `<span class="pill \${${field}Class(${v}.${field})}">\${escapeHtml(${v}.${field})}</span>`;
}

function tableSource(p) {
  const v = p.key[0];
  const arr = camel(p.key);
  const f = p.filter;
  const out = [];
  if (p.legend) out.push("import { button } from '#kit/button';", "import { dialog } from '#kit/dialog';");
  out.push("import { escapeHtml } from '../html.js';", '', ...p.comment.map((l) => `// ${l}`));
  if (f) out.push(`const ${f.const} = ${lit(f.values)};`);
  if (p.sorts) {
    out.push('const SORTS = {');
    for (const [key, type] of p.sorts) {
      out.push(type === 'number' ? `  ${key}: (a, b) => a.${key} - b.${key},` : `  ${key}: (a, b) => a.${key}.localeCompare(b.${key}),`);
    }
    out.push('};');
  }
  out.push('', `export function render${pascal(p.name)}(${f || p.sorts ? 'snapshot, query' : 'snapshot'}) {`);
  if (f || p.sorts) {
    if (f) out.push(`  const ${f.field} = ${f.const}.includes(query.${f.field}) ? query.${f.field} : 'all';`);
    if (p.sorts) {
      out.push(`  const sort = Object.hasOwn(SORTS, query.sort ?? '') ? query.sort : '${p.sorts[0][0]}';`);
      out.push("  const dir = query.dir === 'desc' ? 'desc' : 'asc';");
    }
    out.push('', `  let ${arr} = snapshot.${p.key};`);
    if (f) out.push(`  if (${f.field} !== 'all') ${arr} = ${arr}.filter((${v}) => ${v}.${f.field} === ${f.field});`);
    if (p.sorts) {
      out.push("  const factor = dir === 'desc' ? -1 : 1;");
      out.push(`  ${arr} = [...${arr}].sort((a, b) => factor * SORTS[sort](a, b));`);
    }
  } else {
    const first = p.columns[0][0];
    out.push(`  const ${arr} = [...snapshot.${p.key}].sort((a, b) => a.${first}.localeCompare(b.${first}));`);
  }
  if (f) {
    out.push('', `  const options = ['all', ...${f.const}]`);
    out.push('    .map((value) => {');
    out.push(`      const selected = value === ${f.field} ? ' selected' : '';`);
    out.push(`      return \`<option value="\${value}"\${selected}>\${value === 'all' ? '${f.all}' : value}</option>\`;`);
    out.push('    })');
    out.push("    .join('');");
  }
  if (p.sorts) {
    const prefix = f ? `${f.field}=\${${f.field}}&amp;` : '';
    out.push('');
    if (f) out.push('  // Sorting keeps the filter, and the filter form keeps the sort.');
    out.push('  const sortHeader = (key, label) => {');
    out.push('    const active = key === sort;');
    out.push("    const next = active && dir === 'asc' ? 'desc' : 'asc';");
    out.push("    const arrow = active ? (dir === 'asc' ? ' ▲' : ' ▼') : '';");
    out.push("    const ariaSort = active ? ` aria-sort=\"${dir === 'asc' ? 'ascending' : 'descending'}\"` : '';");
    out.push(`    return \`<th\${ariaSort}><a href="?${prefix}sort=\${key}&amp;dir=\${next}">\${label}\${arrow}</a></th>\`;`);
    out.push('  };');
  }
  out.push('', `  const rows = ${arr}`, '    .map(', `      (${v}) => \`<tr>`);
  for (const [field] of p.columns) {
    out.push(field === p.pill.field ? `  <td>${pillCell(v, field)}</td>` : `  <td>\${escapeHtml(${v}.${field})}</td>`);
  }
  out.push('</tr>`,', '    )', "    .join('\\n');", '');
  const sortKeys = new Map((p.sorts ?? []).map(([key]) => [key, true]));
  out.push('  const table =', `    ${arr}.length === 0`, `      ? '<p class="muted">${p.empty}</p>'`, '      : `<table class="list-table">', '<thead><tr>');
  for (const [field, label] of p.columns) {
    out.push(sortKeys.has(field) ? `  \${sortHeader('${field}', '${label}')}` : `  <th>${label}</th>`);
  }
  out.push('</tr></thead>', '<tbody>', '${rows}', '</tbody>', '</table>`;');
  if (p.legend) {
    const id = `${p.name}-legend`;
    out.push('', '  const legend = dialog({', `    id: '${id}',`, `    title: '${p.legend.title}',`, '    body: `<ul class="legend">');
    for (const [value, c, text] of p.legend.items) out.push(`  <li><span class="pill ${c}">${value}</span> ${text}</li>`);
    out.push('</ul>`,', '  });');
    out.push('  const legendButton = button({', "    label: 'Legend',", "    variant: 'ghost',", "    size: 'sm',", `    attrs: { 'data-dialog-open': '${id}' },`, '  });');
  }
  out.push('');
  const head = p.legend ? ['  return `<div class="title-row">', `  <h1>${p.title}</h1>`, '  ${legendButton}', '</div>'] : [`  return \`<h1>${p.title}</h1>`];
  out.push(...head);
  if (f) {
    out.push(`<form method="get" action="/${p.name}" class="filters">`, `  <label>${f.label}`, `    <select name="${f.field}" onchange="this.form.submit()">\${options}</select>`, '  </label>');
    if (p.sorts) out.push('  <input type="hidden" name="sort" value="${sort}">', '  <input type="hidden" name="dir" value="${dir}">');
    out.push('</form>');
  }
  out.push(p.legend ? '${table}' : '${table}`;');
  if (p.legend) out.push('${legend}`;');
  out.push('}', '', pillSource(p.pill));
  return out.join('\n');
}

function listSource(p) {
  const v = p.key[0];
  const arr = camel(p.key);
  const t = p.tabs;
  const out = [];
  if (p.link) out.push("import { button } from '#kit/button';");
  out.push("import { escapeHtml } from '../html.js';", '', ...p.comment.map((l) => `// ${l}`));
  out.push(`export function render${pascal(p.name)}(${t ? 'snapshot, query' : 'snapshot'}) {`);
  const [o0, o1] = t ? t.options.map(([value]) => value) : [];
  if (t) out.push(`  const ${t.param} = query.${t.param} === '${o1}' ? '${o1}' : '${o0}';`);
  const [field, order] = p.order;
  const cmp = order === 'desc' ? `b.${field}.localeCompare(a.${field})` : `a.${field}.localeCompare(b.${field})`;
  out.push(`  const ${arr} = ${t ? `snapshot.${p.key}` : `[...snapshot.${p.key}]`}`);
  if (t) out.push(`    .filter((${v}) => ${t.match})`);
  out.push(`    .sort((a, b) => ${cmp});`, '');
  if (t) {
    out.push('  const tab = (value, label) => {');
    out.push(`    const current = value === ${t.param} ? ' aria-current="page"' : '';`);
    out.push(`    return \`<a href="/${p.name}?${t.param}=\${value}"\${current}>\${label}</a>\`;`);
    out.push('  };', '');
  }
  const meta = p.meta.map(([m, prefix]) => `${prefix}\${escapeHtml(${v}.${m})}`).join(', ');
  out.push(`  const items = ${arr}`, `    .map((${v}) => {`);
  if (p.link) out.push(`      const link = button({ label: '${p.link.label}', href: ${v}.${p.link.field}, variant: 'link', size: 'sm' });`);
  out.push('      return `<li class="list-item">', `  ${pillCell(v, p.pill.field)}`, `  <strong>\${escapeHtml(${v}.${p.titleField})}</strong>`, `  <span class="muted">${meta}</span>`);
  if (p.link) out.push('  ${link}');
  out.push('</li>`;', '    })', "    .join('\\n');", '');
  out.push('  const list =', `    ${arr}.length === 0`, `      ? '<p class="muted">${p.empty}</p>'`, '      : `<ul class="list">', '${items}', '</ul>`;', '');
  out.push(`  return \`<h1>${p.title}</h1>`);
  if (t) out.push(`<nav class="subnav">\${tab('${o0}', '${t.options[0][1]}')}\${tab('${o1}', '${t.options[1][1]}')}</nav>`);
  out.push('${list}`;', '}', '', pillSource(p.pill));
  return out.join('\n');
}

function panelsSource(p) {
  const v = p.key[0];
  const arr = camel(p.key);
  const [one, many] = p.group;
  const out = [];
  if (p.footer) out.push("import { button } from '#kit/button';");
  out.push("import { escapeHtml } from '../html.js';", '', ...p.comment.map((l) => `// ${l}`));
  out.push(`export function render${pascal(p.name)}(snapshot) {`);
  out.push(`  const ${many} = [...new Set(snapshot.${p.key}.map((${v}) => ${v}.${one}))].sort();`);
  out.push(`  const panels = ${many}.map((${one}) => {`);
  out.push(`    const ${arr} = snapshot.${p.key}.filter((${v}) => ${v}.${one} === ${one});`);
  const detail = p.detail ? ` <span class="muted">\${escapeHtml(${v}.${p.detail})}</span>` : '';
  out.push(`    const items = ${arr}`);
  out.push(`      .map((${v}) => \`<li>\${escapeHtml(${v}.${p.item})}${detail} ${pillCell(v, p.pill.field)}</li>\`)`);
  out.push("      .join('');");
  if (p.footer) out.push(`    const link = button({ label: '${p.footer.label}', href: ${p.footer.href}, variant: 'secondary', size: 'sm' });`);
  out.push('    return `<section class="panel">', `  <h2>\${escapeHtml(${one})}</h2>`, `  <p>\${${arr}.length} ${p.noun}</p>`, '  <ul class="panel-list">${items}</ul>');
  if (p.footer) out.push('  <footer>${link}</footer>');
  out.push('</section>`;', '  });');
  out.push(`  return \`<h1>${p.title}</h1>`, '<div class="panels">', "${panels.join('\\n')}", '</div>`;', '}', '', pillSource(p.pill));
  return out.join('\n');
}

function snapshotLiteral(key, rows) {
  return `const snapshot = {\n  generatedAt: '${GENERATED_AT}',\n  ${camel(key) === key ? key : `'${key}'`}: [\n${rows.map((r) => `    ${lit(r)},`).join('\n')}\n  ],\n};`;
}

const includes = (html, text) => `assert.ok(${html}.includes(${lit(text)}));`;
const excludes = (html, text) => `assert.ok(!${html}.includes(${lit(text)}));`;

function compare(type, key) {
  return type === 'number' ? (a, b) => a[key] - b[key] : (a, b) => String(a[key]).localeCompare(String(b[key]));
}

function pageTest(p, mini) {
  const fn = `render${pascal(p.name)}`;
  const tests = [];
  const add = (title, body) => tests.push(`test(${lit(title)}, () => {\n${body.map((l) => `  ${l}`).join('\n')}\n});`);
  const args = p.kind === 'panels' || (!p.filter && !p.sorts && !p.tabs) ? '' : ', {}';
  const call = (q) => `${fn}(snapshot${q === undefined ? args : `, ${lit(q)}`})`;
  const pillRow = mini[0];
  const pill = `<span class="pill ${pillClassFor(p.pill, pillRow[p.pill.field])}">${pillRow[p.pill.field]}</span>`;

  if (p.kind === 'table') {
    const first = p.columns[0][0];
    const cell = (r) => `<td>${r[first]}</td>`;
    const noun = p.key === 'entries' ? 'entry' : p.key.replace(/s$/, '');
    add(`renders a row per ${noun}`, [`const html = ${call()};`, `for (const ${p.key[0]} of snapshot.${camel(p.key)}) assert.ok(html.includes(\`<td>\${${p.key[0]}.${first}}</td>\`), ${p.key[0]}.${first});`]);
    add(`colors ${words(p.pill.field)}`, [includes(call(), pill)]);
    if (p.filter) {
      const f = p.filter;
      const value = mini[0][f.field];
      const other = mini.find((r) => r[f.field] !== value);
      const body = [`const html = ${call({ [f.field]: value })};`, `assert.match(html, /<option value="${reEsc(value)}" selected>/);`, includes('html', cell(mini[0]))];
      if (other) body.push(excludes('html', cell(other)));
      add(`filters by ${words(f.field)}`, body);
      add('falls back to the defaults for unknown query values', [
        `const html = ${call({ [f.field]: 'moon', sort: 'constructor', dir: 'sideways' })};`,
        'assert.match(html, /<option value="all" selected>/);',
        `assert.match(html, /<input type="hidden" name="sort" value="${p.sorts[0][0]}">/);`,
        'assert.match(html, /<input type="hidden" name="dir" value="asc">/);',
      ]);
    }
    if (p.sorts) {
      const [key, type] = p.sorts[1];
      const sorted = [...mini].sort(compare(type, key));
      const lo = sorted[0];
      const hi = sorted[sorted.length - 1];
      add(`sorts by ${words(key)} both ways`, [
        `const desc = ${call({ sort: key, dir: 'desc' })};`,
        `assert.ok(desc.indexOf(${lit(cell(hi))}) < desc.indexOf(${lit(cell(lo))}));`,
        `const asc = ${call({ sort: key })};`,
        `assert.ok(asc.indexOf(${lit(cell(lo))}) < asc.indexOf(${lit(cell(hi))}));`,
      ]);
    }
    add('says when there are none', [includes(`${fn}({ ...snapshot, ${p.key}: [] }${args})`, `<p class="muted">${p.empty}</p>`)]);
  }

  if (p.kind === 'list') {
    const strong = (r) => `<strong>${r[p.titleField]}</strong>`;
    const t = p.tabs;
    if (t) {
      const [[o0], [o1, label1]] = t.options;
      const body = [`const html = ${call()};`];
      for (const r of mini) body.push(t.member(r, o0) ? includes('html', strong(r)) : excludes('html', strong(r)));
      body.push(includes('html', `<a href="/${p.name}?${t.param}=${o0}" aria-current="page">`));
      add(`shows ${t.options[0][1].toLowerCase()} by default`, body);
      const other = [`const html = ${call({ [t.param]: o1 })};`];
      for (const r of mini) other.push(t.member(r, o1) ? includes('html', strong(r)) : excludes('html', strong(r)));
      add(`shows ${label1.toLowerCase()} on request`, other);
    } else {
      const [field, order] = p.order;
      const sorted = [...mini].sort(compare('text', field));
      if (order === 'desc') sorted.reverse();
      add(`lists ${words(p.key)} ${order === 'desc' ? 'newest first' : `by ${words(field)}`}`, [
        `const html = ${call()};`,
        `assert.ok(html.indexOf(${lit(strong(sorted[0]))}) < html.indexOf(${lit(strong(sorted[sorted.length - 1]))}));`,
      ]);
    }
    const shown = !t || t.member(pillRow, t.options[0][0]);
    add(`colors ${words(p.pill.field)}`, [includes(shown ? call() : call({ [t.param]: t.options[1][0] }), pill)]);
    if (p.link) add('links each one', [includes(call(), `href="${mini[0][p.link.field]}">${p.link.label}<`)]);
    add('says when there are none', [includes(`${fn}({ ...snapshot, ${p.key}: [] }${args})`, `<p class="muted">${p.empty}</p>`)]);
  }

  if (p.kind === 'panels') {
    const [one] = p.group;
    const groups = [...new Set(mini.map((r) => r[one]))].sort();
    const count = mini.filter((r) => r[one] === groups[0]).length;
    add(`groups ${words(p.key)} by ${words(one)}`, [
      `const html = ${call()};`,
      `assert.ok(html.indexOf(${lit(`<h2>${groups[0]}</h2>`)}) < html.indexOf(${lit(`<h2>${groups[groups.length - 1]}</h2>`)}));`,
      includes('html', `<p>${count} ${p.noun}</p>`),
    ]);
    add(`colors ${words(p.pill.field)}`, [includes(call(), pill)]);
    if (p.footer) add('links each panel', [includes(call(), `href="${p.footer.test(groups[0])}">${p.footer.label}<`)]);
  }

  return `import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ${fn} } from '../../src/pages/${p.name}.js';

${snapshotLiteral(p.key, mini)}

${tests.join('\n\n')}
`;
}

// Snapshot rows by data file name, kept for the pipeline fixtures.
const ROWS = {};

function genPages() {
  for (const p of PAGES) {
    const rows = Array.from({ length: p.count }, (_, i) => p.row(i));
    ROWS[p.name] = rows;
    const mini = p.mini.map((fix, i) => ({ ...p.row(i), ...fix }));
    const source = { table: tableSource, list: listSource, panels: panelsSource }[p.kind](p);
    write(`src/pages/${p.name}.js`, source);
    write(`data/${p.name}.json`, snapshotJson(p.key, rows));
    write(`test/pages/${p.name}.test.js`, pageTest(p, mini));
  }
}

// --- Snapshot schemas -------------------------------------------------------
//
// One spec per snapshot the pipeline writes. `source` names the client and
// method a job reads from; `derive` lists fields a job computes through an
// analysis module rather than copying, with `raw` supplying the source
// fields those computations read.

import { readFileSync } from 'node:fs';

const snake = (s) => s.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
const cents = (dollars) => Number(dollars.slice(1)) * 100;

const SNAPSHOTS = [
  {
    name: 'services', key: 'services', source: ['kubernetes', 'deployments'],
    doc: 'Deployed services and their health checks, one row per service and environment.',
    derive: { health: { mod: 'health', fn: 'healthFromChecks', expr: 'healthFromChecks(r.checks_passed, r.checks_total)' } },
    raw: (row) => ({ checks_passed: { passing: 3, degraded: 2, failing: 0 }[row.health], checks_total: 3 }),
  },
  {
    name: 'incidents', key: 'incidents', source: ['pagerduty', 'incidents'],
    doc: 'Open and recently resolved incidents, newest first.',
    derive: { severity: { mod: 'severity', fn: 'severityFromPriority', expr: 'severityFromPriority(r.priority)' } },
    raw: (row) => ({ priority: { sev1: 'P1', sev2: 'P2', sev3: 'P3' }[row.severity] }),
  },
  { name: 'oncall', key: 'rotations', source: ['pagerduty', 'rotations'], extra: ['escalation', 'escalationSteps'], doc: 'Who is on call for each team, plus the escalation policy.' },
  { name: 'runbooks', key: 'runbooks', source: ['wiki', 'runbooks'], doc: 'Runbooks from the wiki, by label.' },
  { name: 'alerts', source: ['alertmanager', 'alerts'], doc: 'Firing and recently resolved alerts.' },
  {
    name: 'hosts', source: ['inventory', 'hosts'], doc: 'Every host in the inventory with its load average.',
    derive: { status: { mod: 'host-status', fn: 'hostStatus', expr: 'hostStatus(r.state)' } },
    raw: (row) => ({ state: { up: 'running', draining: 'stopping', down: 'stopped' }[row.status] }),
  },
  { name: 'clusters', source: ['kubernetes', 'clusters'], doc: 'Kubernetes clusters and their control-plane versions.' },
  { name: 'databases', source: ['postgres', 'instances'], doc: 'Database instances from the fleet API.' },
  { name: 'queues', source: ['rabbitmq', 'queues'], doc: 'Queue depths and consumer counts from the broker.' },
  { name: 'jobs', source: ['kubernetes', 'cronJobs'], doc: 'Scheduled jobs and the state of their last run.' },
  {
    name: 'certificates', source: ['cert-scanner', 'certificates'], doc: 'Certificates found by the last scan, with their expiry.',
    derive: { status: { mod: 'expiry', fn: 'certStatus', expr: 'certStatus(r.expires_at, now)', now: true } },
  },
  { name: 'domains', source: ['dns', 'domains'], doc: 'Registered domains and whether their records resolve.' },
  {
    name: 'costs', source: ['billing', 'budgets'], doc: 'Month-to-date spend against each service budget.',
    derive: {
      budget: { mod: 'spend', fn: 'dollars', expr: 'dollars(r.budget_cents)' },
      spent: { mod: 'spend', fn: 'dollars', expr: 'dollars(r.spent_cents)' },
      status: { mod: 'spend', fn: 'spendStatus', expr: 'spendStatus(r.spent_cents, r.budget_cents)' },
    },
    raw: (row) => ({ budget_cents: cents(row.budget), spent_cents: cents(row.spent) }),
  },
  {
    name: 'capacity', source: ['aws', 'quotas'], doc: 'Quota usage for each resource pool.',
    derive: { status: { mod: 'capacity', fn: 'capacityStatus', expr: 'capacityStatus(r.used, r.total)' } },
  },
  {
    name: 'slos', source: ['prometheus', 'slos'], doc: 'Objectives and their remaining error budget this month.',
    derive: { status: { mod: 'budget', fn: 'sloStatus', expr: 'sloStatus(r.budget_left)' } },
  },
  { name: 'maintenance', source: ['statuspage', 'maintenances'], doc: 'Scheduled maintenance windows from the status page.' },
  {
    name: 'changes', source: ['github', 'changeRequests'], doc: 'Change requests: pull requests on the infra repository labeled "change".',
    derive: { risk: { mod: 'risk', fn: 'riskFromLabels', expr: 'riskFromLabels(r.labels)' } },
    raw: (row) => ({ labels: ['change', `risk:${row.risk}`] }),
  },
  { name: 'flags', source: ['launchdarkly', 'flags'], doc: 'Feature flags and their rollout in each environment.' },
  {
    name: 'backups', source: ['postgres', 'backups'], doc: 'The latest backup of each database.',
    derive: { status: { mod: 'backup-status', fn: 'backupStatus', expr: 'backupStatus(r.state)' } },
    raw: (row) => ({ state: { ok: 'COMPLETED', failed: 'FAILED', running: 'RUNNING' }[row.status] }),
  },
  { name: 'tokens', source: ['vault', 'tokens'], doc: 'API tokens and when they were last used.' },
  {
    name: 'teams', source: ['github', 'teams'], doc: 'Teams, their leads and their on-call rotation size.',
    derive: { staffing: { mod: 'staffing', fn: 'staffingFor', expr: 'staffingFor(r.rotation_size)' } },
    raw: (row) => ({ rotation_size: row.staffing === 'staffed' ? 5 : 2 }),
  },
  { name: 'audit', source: ['ci', 'auditLog'], doc: 'The audit trail of deploys, rollbacks, config changes and access grants.' },
  { name: 'endpoints', source: ['prometheus', 'endpoints'], doc: 'Latency and error rate per public endpoint over the last hour.' },
  { name: 'regions', source: ['inventory', 'regions'], doc: 'Cloud regions and the provider status for each.' },
  { name: 'vendors', source: ['statuspage', 'vendors'], doc: 'Third-party status, polled from each vendor page.' },
  { name: 'status', source: ['statuspage', 'components'], doc: 'Our public status page components.' },
  { name: 'reports', source: ['wiki', 'reports'], doc: 'Operations reports from the wiki, newest first.' },
  { name: 'secrets', source: ['vault', 'secrets'], doc: 'Secret rotation dates. Values never leave Vault.' },
  { name: 'webhooks', source: ['inventory', 'webhooks'], doc: 'Outgoing webhook subscriptions and their last delivery.' },
];

const DEPLOYS = { name: 'deploys', key: 'deploys', source: ['ci', 'deploys'], doc: 'The last 50 deploys from the CI system, newest first.' };

for (const s of SNAPSHOTS) s.key ??= PAGES.find((p) => p.name === s.name).key;

const TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;

function snapshotRows(s) {
  if (ROWS[s.name]) return ROWS[s.name];
  return JSON.parse(readFileSync(`data/${s.name}.json`, 'utf8'))[s.key];
}

function typeOf(value) {
  if (Array.isArray(value)) return 'array';
  if (typeof value === 'number') return 'number';
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'string' && TIMESTAMP.test(value)) return 'timestamp';
  return 'string';
}

// Field types from the rows themselves: a field that is ever null is optional.
function inferFields(rows) {
  const fields = {};
  for (const row of rows) {
    for (const [field, value] of Object.entries(row)) {
      const entry = (fields[field] ??= { type: null, optional: false });
      if (value === null) entry.optional = true;
      else entry.type ??= typeOf(value);
    }
  }
  return Object.fromEntries(Object.entries(fields).map(([f, { type, optional }]) => [f, `${type ?? 'string'}${optional ? '?' : ''}`]));
}

function schemaSource(s, fields) {
  const lines = Object.entries(fields).map(([f, t]) => `  ${f}: '${t}',`);
  return `// data/${s.name}.json: ${s.doc}
// Checked by the pipeline before it writes the file, and by tools/verify.
export const key = '${s.key}';

export const fields = {
${lines.join('\n')}
};
`;
}

function schemaIndex(list) {
  const names = list.map((s) => s.name).sort();
  return `${names.map((n) => `import * as ${camel(n)} from './${n}.js';`).join('\n')}

export const SCHEMAS = {
${names.map((n) => `  ${camel(n)},`).join('\n')}
};
`;
}

const FIELDS = {};

function genSchema(s) {
  FIELDS[s.name] = inferFields(snapshotRows(s));
  write(`src/shared/schemas/${s.name}.js`, schemaSource(s, FIELDS[s.name]));
}

function genSchemas() {
  for (const s of SNAPSHOTS) genSchema(s);
  write('src/shared/schemas/index.js', schemaIndex(SNAPSHOTS));
}

// --- Pipeline jobs, sources, migrations ------------------------------------

// Base path of each upstream API, as its client calls it.
const SOURCE_PATHS = {
  alertmanager: '/api/v2',
  aws: '/quotas/v1',
  billing: '/v1',
  'cert-scanner': '/api',
  ci: '/api/v4',
  dns: '/v2',
  github: '/api/v3/orgs/harbor',
  inventory: '/api',
  kubernetes: '/apis/harbor/v1',
  launchdarkly: '/api/v2/projects/harbor',
  pagerduty: '',
  postgres: '/fleet/v1',
  prometheus: '/api/v1/harbor',
  rabbitmq: '/api',
  statuspage: '/v1/pages/harbor',
  vault: '/v1/sys/harbor',
  wiki: '/rest/api/space/OPS',
};

const SOURCE_LABELS = {
  alertmanager: 'Alertmanager',
  aws: 'the AWS service quotas API',
  billing: 'the billing export',
  'cert-scanner': 'the certificate scanner',
  ci: 'the CI system',
  dns: 'the DNS provider',
  github: 'GitHub',
  inventory: 'the host inventory',
  kubernetes: 'the Kubernetes API',
  launchdarkly: 'LaunchDarkly',
  pagerduty: 'PagerDuty',
  postgres: 'the database fleet API',
  prometheus: 'Prometheus',
  rabbitmq: 'the RabbitMQ management API',
  statuspage: 'Statuspage',
  vault: 'Vault',
  wiki: 'the wiki',
};

const kebab = (s) => s.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
const envName = (source) => `${source.toUpperCase().replace(/-/g, '_')}_URL`;

// Source record for a snapshot row: the copied fields in snake case, plus the
// raw inputs of every derived field.
function rawRecord(s, row) {
  const raw = {};
  for (const [field, value] of Object.entries(row)) {
    if (!s.derive?.[field]) raw[snake(field)] = value;
  }
  return { ...raw, ...(s.raw ? s.raw(row) : {}) };
}

function jobSource(s) {
  const [source, method] = s.source;
  const fns = new Map();
  for (const d of Object.values(s.derive ?? {})) {
    if (!fns.has(d.mod)) fns.set(d.mod, new Set());
    fns.get(d.mod).add(d.fn);
  }
  const imports = [...fns.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([mod, names]) => `import { ${[...names].sort().join(', ')} } from '../analysis/${mod}.js';`);
  const usesNow = Object.values(s.derive ?? {}).some((d) => d.now);
  const fields = Object.keys(FIELDS[s.name]).map((field) => {
    const d = s.derive?.[field];
    return `    ${field}: ${d ? d.expr : `r.${snake(field)}`},`;
  });
  const out = [`// Builds data/${s.name}.json. ${s.doc}`];
  if (imports.length) out.push(...imports);
  if (imports.length) out.push('');
  out.push(`export const snapshot = '${s.name}';`, '');
  out.push(`export async function collect(sources${usesNow ? ', { now }' : ''}) {`);
  out.push(`  const records = await sources.${camel(source)}.${method}();`);
  out.push('  return records.map((r) => ({', ...fields, '  }));', '}');
  if (s.extra) {
    const [field, call] = s.extra;
    out.push('', '// Written next to the rows; the page reads it as-is.');
    out.push('export async function extras(sources) {');
    out.push(`  return { ${field}: await sources.${camel(source)}.${call}() };`, '}');
  }
  return out.join('\n');
}

// The first copied field the schema requires; the invalid fixture drops it.
const requiredField = (s) => Object.entries(FIELDS[s.name]).find(([field, type]) => !type.endsWith('?') && !s.derive?.[field])[0];

function jobTest(s) {
  const [source, method] = s.source;
  const usesNow = Object.values(s.derive ?? {}).some((d) => d.now);
  const call = (from) => (usesNow ? `collect(${from}, { now: Date.parse('${GENERATED_AT}') })` : `collect(${from})`);
  const field = requiredField(s);
  return `import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { checkShape } from '../../src/core/validate/shape.js';
import { fields } from '../../src/shared/schemas/${s.name}.js';
import { collect } from './${s.name}.js';

const fixture = (file) => JSON.parse(readFileSync(new URL(\`./fixtures/\${file}\`, import.meta.url), 'utf8'));
const sources = { ${camel(source)}: { ${method}: async () => fixture('${s.name}.json') } };
const invalid = { ${camel(source)}: { ${method}: async () => fixture('${s.name}.invalid.json') } };

test('${s.name}: maps ${SOURCE_LABELS[source].replace(/^the /, '')} records to snapshot rows', async () => {
  assert.deepEqual(await ${call('sources')}, fixture('${s.name}.expected.json'));
});

test('${s.name}: every row matches the schema', async () => {
  for (const row of await ${call('sources')}) assert.deepEqual(checkShape(row, fields), []);
});

test('${s.name}: leaves a missing ${field} for validation to catch', async () => {
  const [row] = await ${call('invalid')};
  assert.deepEqual(checkShape(row, fields), ['missing ${field}']);
});
`;
}

const json = (value) => `${JSON.stringify(value, null, 2)}\n`;

function genJob(s) {
  const rows = snapshotRows(s).slice(0, 3);
  const { [requiredField(s)]: _, ...missing } = rows[0];
  write(`pipeline/jobs/${s.name}.js`, jobSource(s));
  write(`pipeline/jobs/${s.name}.test.js`, jobTest(s));
  write(`pipeline/jobs/fixtures/${s.name}.json`, json(rows.map((row) => rawRecord(s, row))));
  write(`pipeline/jobs/fixtures/${s.name}.expected.json`, json(rows));
  write(`pipeline/jobs/fixtures/${s.name}.invalid.json`, json([rawRecord(s, missing)]));
  genRecordings(s);
}

// What each upstream answered during the run that wrote the checked-in
// snapshot: every record, where the job fixtures keep three.
function genRecordings(s) {
  const [source, method] = s.source;
  const stored = JSON.parse(readFileSync(`data/${s.name}.json`, 'utf8'));
  const records = stored[s.key].map((row) => rawRecord(s, row));
  write(`pipeline/sources/recordings/${source}/${kebab(method)}.json`, json(records));
  write(`pipeline/sources/contracts/${source}/${kebab(method)}.json`, json(inferFields(records)));
  if (s.extra) write(`pipeline/sources/recordings/${source}/${kebab(s.extra[1])}.json`, json(stored[s.extra[0]]));
}

function jobIndex(list) {
  const names = list.map((s) => s.name).sort();
  return `// Every snapshot job, by snapshot name. run.js runs them all unless given names.
${names.map((n) => `import * as ${camel(n)} from './${n}.js';`).join('\n')}

export const JOBS = {
${names.map((n) => `  ${camel(n)},`).join('\n')}
};
`;
}

function genJobs() {
  for (const s of SNAPSHOTS) genJob(s);
  write('pipeline/jobs/index.js', jobIndex(SNAPSHOTS));
}

function sourceMethods(list) {
  const methods = {};
  for (const s of list) {
    const [source, method] = s.source;
    (methods[source] ??= new Set()).add(method);
    if (s.extra) methods[source].add(s.extra[1]);
  }
  return methods;
}

function genSource(source, methods) {
  const fn = `${camel(source)}Source`;
  const base = SOURCE_PATHS[source];
  const names = [...methods].sort();
  const url = (m) => `\${baseUrl}${base}/${kebab(m)}`;
  write(`pipeline/sources/${source}.js`, `// Client for ${SOURCE_LABELS[source]}. Each method resolves to the parsed JSON body.
import { createHttpClient } from '../lib/http.js';

export function ${fn}({ baseUrl = process.env.${envName(source)}, http = createHttpClient() } = {}) {
  return {
${names.map((m) => `    ${m}: () => http.getJson(\`${url(m)}\`),`).join('\n')}
  };
}
`);
  const host = `https://${source}.test`;
  write(`pipeline/sources/${source}.test.js`, `import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ${fn} } from './${source}.js';

test('${source}: requests each collection under the base URL', async () => {
  const seen = [];
  const http = { getJson: async (url) => (seen.push(url), []) };
  const source = ${fn}({ baseUrl: '${host}', http });
${names.map((m) => `  await source.${m}();`).join('\n')}
  assert.deepEqual(seen, [
${names.map((m) => `    '${host}${base}/${kebab(m)}',`).join('\n')}
  ]);
});
`);
}

function genSources(list) {
  const methods = sourceMethods(list);
  const sources = Object.keys(methods).sort();
  for (const source of sources) genSource(source, methods[source]);
  write('pipeline/sources/index.js', `// One client per upstream system, configured from the environment.
${sources.map((s) => `import { ${camel(s)}Source } from './${s}.js';`).join('\n')}

export function createSources(options = {}) {
  return {
${sources.map((s) => `    ${camel(s)}: ${camel(s)}Source(options),`).join('\n')}
  };
}
`);
}

const SQL_TYPES = { string: 'TEXT', timestamp: 'TEXT', number: 'REAL', boolean: 'INTEGER' };
// Field names that are SQL keywords, quoted where they become columns.
const SQL_RESERVED = new Set(['group', 'order', 'primary', 'references', 'default', 'check', 'key', 'from', 'to', 'index', 'values', 'when', 'where', 'table']);
const sqlColumn = (field) => (SQL_RESERVED.has(snake(field)) ? `"${snake(field)}"` : snake(field));

function historyMigration(s) {
  const cols = Object.entries(FIELDS[s.name]).map(([field, type]) => {
    const optional = type.endsWith('?');
    return `  ${sqlColumn(field)} ${SQL_TYPES[type.replace('?', '')]}${optional ? '' : ' NOT NULL'}`;
  });
  return `-- Rows of data/${s.name}.json from every run, for the history views.
CREATE TABLE ${s.name}_history (
  run_id INTEGER NOT NULL REFERENCES runs (id),
${cols.join(',\n')}
);

CREATE INDEX ${s.name}_history_run ON ${s.name}_history (run_id);
`;
}

const downMigration = (file, statements) => `-- Undoes ${file}.\n${statements.map((s) => `${s};\n`).join('')}`;
const historyDown = (file, s) => downMigration(file, [`DROP INDEX ${s.name}_history_run`, `DROP TABLE ${s.name}_history`]);

const BASE_MIGRATIONS = [
  ['0001_runs.sql', `-- One row per pipeline run.
CREATE TABLE runs (
  id INTEGER PRIMARY KEY,
  started_at TEXT NOT NULL,
  finished_at TEXT,
  jobs INTEGER NOT NULL DEFAULT 0,
  failed INTEGER NOT NULL DEFAULT 0
);
`],
  ['0002_job_failures.sql', `-- Why a job failed, so the next run's log can say "still failing since".
CREATE TABLE job_failures (
  run_id INTEGER NOT NULL REFERENCES runs (id),
  snapshot TEXT NOT NULL,
  message TEXT NOT NULL,
  problems TEXT
);

CREATE INDEX job_failures_snapshot ON job_failures (snapshot, run_id);
`],
  ['0003_retention.sql', `-- How long history is kept, per snapshot. Missing rows use the default.
CREATE TABLE retention (
  snapshot TEXT PRIMARY KEY,
  days INTEGER NOT NULL
);

INSERT INTO retention (snapshot, days) VALUES ('audit', 365), ('incidents', 180);
`],
];

const BASE_DOWN = {
  '0001_runs.sql': ['DROP TABLE runs'],
  '0002_job_failures.sql': ['DROP INDEX job_failures_snapshot', 'DROP TABLE job_failures'],
  '0003_retention.sql': ['DROP TABLE retention'],
};

const migrationName = (n, s) => `${String(n).padStart(4, '0')}_${s.name}_history.sql`;

function genHistoryMigration(n, s) {
  const file = migrationName(n, s);
  write(`pipeline/db/migrations/${file}`, historyMigration(s));
  write(`pipeline/db/migrations/down/${file}`, historyDown(file, s));
}

function genMigrations() {
  for (const [file, sql] of BASE_MIGRATIONS) {
    write(`pipeline/db/migrations/${file}`, sql);
    write(`pipeline/db/migrations/down/${file}`, downMigration(file, BASE_DOWN[file]));
  }
  SNAPSHOTS.forEach((s, i) => genHistoryMigration(BASE_MIGRATIONS.length + 1 + i, s));
}

// Empty and one-row snapshots, for the end-to-end tests of every page's edge
// cases.
function genE2eFixtures() {
  for (const s of SNAPSHOTS) {
    const stored = JSON.parse(readFileSync(`data/${s.name}.json`, 'utf8'));
    write(`test/e2e/fixtures/empty/${s.name}.json`, snapshotJson(s.key, [], s.extra ? { [s.extra[0]]: [] } : {}));
    write(`test/e2e/fixtures/single/${s.name}.json`, snapshotJson(s.key, stored[s.key].slice(0, 1), s.extra ? { [s.extra[0]]: stored[s.extra[0]] } : {}));
  }
}

// The deploys snapshot arrives in its own commit, after the pages.
function genDeploys() {
  genSchema(DEPLOYS);
  write('src/shared/schemas/index.js', schemaIndex([...SNAPSHOTS, DEPLOYS]));
  genJob(DEPLOYS);
  write('pipeline/jobs/index.js', jobIndex([...SNAPSHOTS, DEPLOYS]));
  genSources([...SNAPSHOTS, DEPLOYS]);
  genHistoryMigration(BASE_MIGRATIONS.length + 1 + SNAPSHOTS.length, DEPLOYS);
}

const PHASES = {
  kit: [genKit],
  app: [genPages, genSchemas, genJobs, () => genSources(SNAPSHOTS), genMigrations, genE2eFixtures],
  deploys: [genDeploys],
};
const phase = PHASES[process.argv[2]];
if (!phase) {
  console.error(`usage: node gen.mjs ${Object.keys(PHASES).join('|')}`);
  process.exit(2);
}
for (const step of phase) step();
GEN

git rm -q src/index.js src/utils.js
for c in utils alert badge button card dialog empty filter-bar page-header select table tabs toggle-group; do
  mkdir -p "vendor/kit/$c/src/lib"
done
mkdir -p public

# --- The template's kit ----------------------------------------------------

cat > vendor/kit/utils/src/index.js <<'JS'
export { attrs, cx, esc } from './lib/utils.js';
JS

cat > vendor/kit/utils/src/lib/utils.js <<'JS'
// Escapes text for HTML element content and quoted attribute values.
export function esc(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

// Joins class names, skipping falsy ones.
export function cx(...names) {
  return names.filter(Boolean).join(' ');
}

// Renders an attribute map as ` name="value"` pairs. true renders the bare
// attribute; false, null and undefined are left out.
export function attrs(map = {}) {
  return Object.entries(map)
    .filter(([, v]) => v !== false && v !== null && v !== undefined)
    .map(([k, v]) => (v === true ? ` ${esc(k)}` : ` ${esc(k)}="${esc(v)}"`))
    .join('');
}
JS

cat > vendor/kit/alert/src/index.js <<'JS'
export { alert } from './lib/alert.js';
JS

cat > vendor/kit/alert/src/lib/alert.js <<'JS'
import { esc } from '#kit/utils';

const TONES = new Set(['info', 'ok', 'warn', 'bad']);

/**
 * Inline alert.
 *
 * @param {{title: string, body?: string, tone?: 'info' | 'ok' | 'warn' | 'bad'}} opts
 *   `body` is trusted HTML.
 * @returns {string}
 */
export function alert({ title, body = '', tone = 'info' }) {
  const t = TONES.has(tone) ? tone : 'info';
  const more = body ? `<div class="kit-alert__body">${body}</div>` : '';
  const role = t === 'bad' ? 'alert' : 'status';
  return `<div class="kit-alert kit-alert--${t}" role="${role}"><p class="kit-alert__title">${esc(title)}</p>${more}</div>`;
}
JS

cat > vendor/kit/badge/src/index.js <<'JS'
export { badge } from './lib/badge.js';
JS

cat > vendor/kit/badge/src/lib/badge.js <<'JS'
import { esc } from '#kit/utils';

const TONES = new Set(['ok', 'warn', 'bad', 'info', 'muted']);

/**
 * Status badge. Map your domain's states to a tone at the call site.
 *
 * @param {string} label
 * @param {'ok' | 'warn' | 'bad' | 'info' | 'muted'} [tone]
 * @returns {string}
 */
export function badge(label, tone = 'muted') {
  const t = TONES.has(tone) ? tone : 'muted';
  return `<span class="kit-badge kit-badge--${t}">${esc(label)}</span>`;
}
JS

cat > vendor/kit/button/src/index.js <<'JS'
export { button } from './lib/button.js';
JS

cat > vendor/kit/button/src/lib/button.js <<'JS'
import { attrs, cx, esc } from '#kit/utils';

const VARIANTS = new Set(['primary', 'secondary', 'ghost', 'link']);

/**
 * Button, or a link styled as one when `href` is given.
 *
 * @param {object} opts
 * @param {string} opts.label
 * @param {string} [opts.href]
 * @param {'primary' | 'secondary' | 'ghost' | 'link'} [opts.variant]
 * @param {'sm' | 'md'} [opts.size]
 * @param {'button' | 'submit'} [opts.type] For a `<button>` only.
 * @param {Record<string, string | boolean>} [opts.attrs] Extra attributes,
 *   such as `data-dialog-open`.
 * @returns {string}
 */
export function button({
  label,
  href,
  variant = 'primary',
  size = 'md',
  type = 'button',
  attrs: extra = {},
}) {
  const v = VARIANTS.has(variant) ? variant : 'primary';
  const cls = cx('kit-btn', `kit-btn--${v}`, size === 'sm' && 'kit-btn--sm');
  if (href) return `<a class="${cls}" href="${esc(href)}"${attrs(extra)}>${esc(label)}</a>`;
  const t = type === 'submit' ? 'submit' : 'button';
  return `<button class="${cls}" type="${t}"${attrs(extra)}>${esc(label)}</button>`;
}
JS

cat > vendor/kit/card/src/index.js <<'JS'
export { card } from './lib/card.js';
JS

cat > vendor/kit/card/src/lib/card.js <<'JS'
import { esc } from '#kit/utils';

/**
 * Content card.
 *
 * @param {{title: string, body: string, footer?: string}} opts `body` and
 *   `footer` are trusted HTML.
 * @returns {string}
 */
export function card({ title, body, footer = '' }) {
  const foot = footer ? `<footer class="kit-card__footer">${footer}</footer>` : '';
  return `<section class="kit-card"><h2 class="kit-card__title">${esc(title)}</h2><div class="kit-card__body">${body}</div>${foot}</section>`;
}
JS

cat > vendor/kit/dialog/src/index.js <<'JS'
export { dialog } from './lib/dialog.js';
JS

cat > vendor/kit/dialog/src/lib/dialog.js <<'JS'
import { esc } from '#kit/utils';

/**
 * Modal dialog. It stays closed until a control carrying
 * `data-dialog-open="<id>"` is clicked; public/kit.js opens it.
 *
 * @param {{id: string, title: string, body: string, actions?: string}} opts
 *   `body` and `actions` are trusted HTML.
 * @returns {string}
 */
export function dialog({ id, title, body, actions = '' }) {
  const foot = actions ? `<footer class="kit-dialog__actions">${actions}</footer>` : '';
  return `<dialog class="kit-dialog" id="${esc(id)}" aria-labelledby="${esc(id)}-title"><h2 class="kit-dialog__title" id="${esc(id)}-title">${esc(title)}</h2><div class="kit-dialog__body">${body}</div>${foot}<form method="dialog" class="kit-dialog__close"><button class="kit-btn kit-btn--ghost kit-btn--sm">Close</button></form></dialog>`;
}
JS

cat > vendor/kit/empty/src/index.js <<'JS'
export { emptyState } from './lib/empty.js';
JS

cat > vendor/kit/empty/src/lib/empty.js <<'JS'
import { esc } from '#kit/utils';

/**
 * Placeholder for a list or panel with nothing to show.
 *
 * @param {{title: string, body?: string}} opts `body` is trusted HTML.
 * @returns {string}
 */
export function emptyState({ title, body = '' }) {
  const more = body ? `<div class="kit-empty__body">${body}</div>` : '';
  return `<div class="kit-empty"><p class="kit-empty__title">${esc(title)}</p>${more}</div>`;
}
JS

cat > vendor/kit/filter-bar/src/index.js <<'JS'
export { filterBar } from './lib/filter-bar.js';
JS

cat > vendor/kit/filter-bar/src/lib/filter-bar.js <<'JS'
import { esc } from '#kit/utils';

/**
 * A GET form for a page's filters. `fields` is trusted HTML, usually
 * `selectField` output; public/kit.js submits the form when a field marked
 * `data-autosubmit` changes. `keep` carries query state the bar should not
 * drop, such as the current sort.
 *
 * @param {object} opts
 * @param {string} opts.action
 * @param {string[]} opts.fields
 * @param {Record<string, string | undefined>} [opts.keep]
 * @returns {string}
 */
export function filterBar({ action, fields, keep = {} }) {
  const hidden = Object.entries(keep)
    .filter(([, v]) => v !== undefined && v !== '')
    .map(([k, v]) => `<input type="hidden" name="${esc(k)}" value="${esc(v)}">`)
    .join('');
  return `<form class="kit-filter-bar" method="get" action="${esc(action)}">${fields.join('')}${hidden}</form>`;
}
JS

cat > vendor/kit/page-header/src/index.js <<'JS'
export { pageHeader } from './lib/page-header.js';
JS

cat > vendor/kit/page-header/src/lib/page-header.js <<'JS'
import { esc } from '#kit/utils';

/**
 * Page title row.
 *
 * @param {{title: string, subtitle?: string, actions?: string}} opts
 *   `actions` is trusted HTML.
 * @returns {string}
 */
export function pageHeader({ title, subtitle = '', actions = '' }) {
  const sub = subtitle ? `<p class="kit-muted">${esc(subtitle)}</p>` : '';
  const act = actions ? `<div class="kit-page-header__actions">${actions}</div>` : '';
  return `<header class="kit-page-header"><div><h1>${esc(title)}</h1>${sub}</div>${act}</header>`;
}
JS

cat > vendor/kit/select/src/index.js <<'JS'
export { selectField } from './lib/select.js';
JS

cat > vendor/kit/select/src/lib/select.js <<'JS'
import { esc } from '#kit/utils';

/**
 * Labeled select. Inside a `filterBar`, changing it submits the bar's form.
 *
 * @param {object} opts
 * @param {string} opts.name Query parameter name.
 * @param {string} opts.label
 * @param {Array<{value: string, label: string}>} opts.options
 * @param {string} [opts.value] The selected value.
 * @returns {string}
 */
export function selectField({ name, label, options, value }) {
  const items = options
    .map((o) => {
      const selected = o.value === value ? ' selected' : '';
      return `<option value="${esc(o.value)}"${selected}>${esc(o.label)}</option>`;
    })
    .join('');
  return `<label class="kit-field"><span class="kit-field__label">${esc(label)}</span><select name="${esc(name)}" class="kit-select" data-autosubmit>${items}</select></label>`;
}
JS

cat > vendor/kit/table/src/index.js <<'JS'
export { dataTable } from './lib/table.js';
JS

cat > vendor/kit/table/src/lib/table.js <<'JS'
import { esc } from '#kit/utils';

/**
 * Data table.
 *
 * @param {object} opts
 * @param {Array<{key: string, label: string, sortable?: boolean,
 *   render?: (row: object) => string, value?: (row: object) => unknown}>} opts.columns
 *   `render` returns trusted HTML for the cell; without it the cell shows the
 *   escaped `row[key]`. `value` is what sorting compares (default `row[key]`).
 * @param {object[]} opts.rows
 * @param {{key: string, dir: 'asc' | 'desc'}} [opts.sort] The active sort; rows
 *   are sorted by it.
 * @param {(key: string, dir: 'asc' | 'desc') => string} [opts.sortHref] Link for
 *   a sortable header. Without it, headers are plain text.
 * @param {string} [opts.empty] Trusted HTML shown instead of the table when
 *   there are no rows.
 * @returns {string}
 */
export function dataTable({
  columns,
  rows,
  sort,
  sortHref,
  empty = '<p class="kit-muted">Nothing to show.</p>',
}) {
  if (rows.length === 0) return empty;
  const sorted = sort ? sortRows(rows, columns, sort) : rows;
  const head = columns.map((col) => headerCell(col, sort, sortHref)).join('');
  const body = sorted
    .map((row) => {
      const cells = columns
        .map((col) => `<td>${col.render ? col.render(row) : esc(row[col.key])}</td>`)
        .join('');
      return `<tr>${cells}</tr>`;
    })
    .join('\n');
  return `<table class="kit-table">
<thead><tr>${head}</tr></thead>
<tbody>
${body}
</tbody>
</table>`;
}

function headerCell(col, sort, sortHref) {
  const label = esc(col.label);
  if (!col.sortable || !sortHref) return `<th>${label}</th>`;
  const active = sort?.key === col.key;
  const next = active && sort.dir === 'asc' ? 'desc' : 'asc';
  const arrow = active ? (sort.dir === 'asc' ? ' ▲' : ' ▼') : '';
  const aria = active
    ? ` aria-sort="${sort.dir === 'asc' ? 'ascending' : 'descending'}"`
    : '';
  return `<th${aria}><a href="${esc(sortHref(col.key, next))}">${label}${arrow}</a></th>`;
}

function sortRows(rows, columns, sort) {
  const col = columns.find((c) => c.key === sort.key);
  if (!col) return rows;
  const get = col.value ?? ((row) => row[col.key]);
  const factor = sort.dir === 'desc' ? -1 : 1;
  return [...rows].sort((a, b) => factor * compare(get(a), get(b)));
}

function compare(a, b) {
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a ?? '').localeCompare(String(b ?? ''));
}
JS

cat > vendor/kit/tabs/src/index.js <<'JS'
export { tabs } from './lib/tabs.js';
JS

cat > vendor/kit/tabs/src/lib/tabs.js <<'JS'
import { esc } from '#kit/utils';

/**
 * A strip of tab links. The active tab gets `aria-current="page"`.
 *
 * @param {{label: string, items: Array<{href: string, label: string, active?: boolean}>}} opts
 * @returns {string}
 */
export function tabs({ label, items }) {
  const links = items
    .map((item) => {
      const current = item.active ? ' aria-current="page"' : '';
      return `<a class="kit-tabs__tab" href="${esc(item.href)}"${current}>${esc(item.label)}</a>`;
    })
    .join('');
  return `<nav class="kit-tabs" aria-label="${esc(label)}">${links}</nav>`;
}
JS

cat > vendor/kit/toggle-group/src/index.js <<'JS'
export { toggleGroup } from './lib/toggle-group.js';
JS

cat > vendor/kit/toggle-group/src/lib/toggle-group.js <<'JS'
import { esc } from '#kit/utils';

/**
 * A row of mutually exclusive link toggles, such as a view switch. The pressed
 * item gets `aria-pressed="true"`.
 *
 * @param {{label: string, items: Array<{href: string, label: string, pressed?: boolean}>}} opts
 * @returns {string}
 */
export function toggleGroup({ label, items }) {
  const links = items
    .map((item) => {
      const pressed = item.pressed ? 'true' : 'false';
      return `<a class="kit-toggle" role="button" href="${esc(item.href)}" aria-pressed="${pressed}">${esc(item.label)}</a>`;
    })
    .join('');
  return `<div class="kit-toggle-group" role="group" aria-label="${esc(label)}">${links}</div>`;
}
JS

cat > public/kit.js <<'JS'
// Opens a kit dialog from its trigger, and submits a filter bar's form when
// one of its auto-submit fields changes.
document.addEventListener('click', (event) => {
  const opener = event.target.closest('[data-dialog-open]');
  if (opener) document.getElementById(opener.dataset.dialogOpen)?.showModal();
});
document.addEventListener('change', (event) => {
  const field = event.target.closest('[data-autosubmit]');
  if (field && field.form) field.form.submit();
});
JS

cat > public/kit.css <<'CSS'
/* Keel admin template */
:root { --kit-ok: #1a7f37; --kit-warn: #9a6700; --kit-bad: #cf222e; --kit-info: #0969da; --kit-muted: #57606a; --kit-border: #d0d7de; }
.kit-muted { color: var(--kit-muted); margin: 0; }
.kit-btn { display: inline-block; padding: .35rem .8rem; border: 1px solid transparent; border-radius: 6px; font: inherit; text-decoration: none; cursor: pointer; }
.kit-btn--sm { padding: .15rem .5rem; font-size: .8rem; }
.kit-btn--primary { background: var(--kit-info); color: #fff; }
.kit-btn--secondary { background: #f6f8fa; border-color: var(--kit-border); color: #1f2328; }
.kit-btn--ghost { background: transparent; color: var(--kit-info); }
.kit-btn--link { background: none; padding: 0; color: var(--kit-info); text-decoration: underline; }
.kit-dialog { border: 1px solid var(--kit-border); border-radius: 8px; padding: 1.25rem; max-width: 32rem; }
.kit-dialog::backdrop { background: rgb(0 0 0 / .35); }
.kit-dialog__title { margin: 0 0 .75rem; font-size: 1.1rem; }
.kit-dialog__actions, .kit-dialog__close { display: flex; justify-content: flex-end; gap: .5rem; margin-top: 1rem; }
.kit-alert { border-left: 4px solid var(--kit-info); padding: .5rem .75rem; margin-bottom: 1rem; }
.kit-alert--ok { border-color: var(--kit-ok); }
.kit-alert--warn { border-color: var(--kit-warn); }
.kit-alert--bad { border-color: var(--kit-bad); }
.kit-alert__title { font-weight: 600; margin: 0; }
.kit-badge { display: inline-block; padding: 0 .5rem; border-radius: 1rem; font-size: .75rem; color: #fff; }
.kit-badge--ok { background: var(--kit-ok); }
.kit-badge--warn { background: var(--kit-warn); }
.kit-badge--bad { background: var(--kit-bad); }
.kit-badge--info { background: var(--kit-info); }
.kit-badge--muted { background: var(--kit-muted); }
.kit-card { border: 1px solid var(--kit-border); border-radius: 6px; padding: 1rem; }
.kit-card__title { margin: 0 0 .5rem; font-size: 1rem; }
.kit-card__footer { margin-top: .75rem; }
.kit-empty { padding: 2rem; text-align: center; color: var(--kit-muted); }
.kit-empty__title { font-weight: 600; margin: 0; }
.kit-filter-bar { display: flex; gap: 1rem; margin-bottom: 1rem; }
.kit-field { display: flex; flex-direction: column; gap: .25rem; }
.kit-field__label { font-size: .75rem; color: var(--kit-muted); }
.kit-select { padding: .25rem .5rem; }
.kit-page-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 1rem; }
.kit-page-header h1 { margin: 0; font-size: 1.5rem; }
.kit-table { width: 100%; border-collapse: collapse; }
.kit-table th, .kit-table td { text-align: left; padding: .4rem .6rem; border-bottom: 1px solid var(--kit-border); }
.kit-table th a { color: inherit; }
.kit-tabs { display: flex; gap: 1rem; border-bottom: 1px solid var(--kit-border); margin-bottom: 1rem; }
.kit-tabs__tab { padding: .4rem 0; color: inherit; text-decoration: none; }
.kit-tabs__tab[aria-current="page"] { border-bottom: 2px solid var(--kit-info); font-weight: 600; }
.kit-toggle-group { display: inline-flex; border: 1px solid var(--kit-border); border-radius: 6px; overflow: hidden; }
.kit-toggle { padding: .25rem .6rem; color: inherit; text-decoration: none; }
.kit-toggle[aria-pressed="true"] { background: #f6f8fa; font-weight: 600; }
CSS

node "$GEN_DIR/gen.mjs" kit

git add vendor public
git -c user.name='Drill Test' -c user.email='drill@example.com' \
  commit -q -m "Start from the Keel admin template"

# --- The dashboard ---------------------------------------------------------

mkdir -p src/pages data test/pages

cat > package.json <<'JSON'
{
  "name": "harbor",
  "version": "0.9.0",
  "description": "Ops dashboard for the services we run",
  "private": true,
  "type": "module",
  "imports": {
    "#kit/*": "./vendor/kit/*/src/index.js"
  },
  "engines": {
    "node": ">=20"
  },
  "scripts": {
    "start": "node src/server.js",
    "test": "node --test",
    "pipeline": "node pipeline/run.js",
    "verify": "node tools/harbor.js verify"
  }
}
JSON

cat > README.md <<'MD'
# Harbor

Ops dashboard for the services we run. It renders pages on the server from
the snapshots the pipeline writes to `data/` every minute; it never talks to
the services itself.

## Running

    npm start        # http://localhost:3000
    npm test
    npm run pipeline # one run against the real upstreams

No dependencies; Node 20 or later (22.5 for the optional history database).

## Pages

One module per page in `src/pages/`: Overview, Services, Incidents, On-call
and Runbooks, then the estate pages from Alerts to Webhooks. `src/server.js`
routes requests and wraps each page in `src/layout.js`; `public/app.css`
holds the dashboard's styles.

## Pipeline

`pipeline/run.js` runs one job per snapshot (`pipeline/jobs/`). Each job reads
an upstream through its client in `pipeline/sources/` and validates its rows
against `src/shared/schemas/` before it writes. `node tools/harbor.js verify`
checks a data directory the same way.
MD

cat > .gitignore <<'TXT'
node_modules/
docs/hyperpowers/
TXT

cat > src/data.js <<'JS'
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const DATA_DIR = fileURLToPath(new URL('../data/', import.meta.url));

// The deploy pipeline writes these snapshots every minute; the dashboard only
// reads them.
export async function readSnapshot(name, dir = DATA_DIR) {
  return JSON.parse(await readFile(join(dir, `${name}.json`), 'utf8'));
}
JS

cat > src/html.js <<'JS'
// Escapes text for HTML element content and quoted attribute values.
export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
JS

cat > src/layout.js <<'JS'
import { escapeHtml } from './html.js';

const NAV = [
  { href: '/', label: 'Overview' },
  { href: '/services', label: 'Services' },
  { href: '/incidents', label: 'Incidents' },
  { href: '/oncall', label: 'On-call' },
  { href: '/runbooks', label: 'Runbooks' },
  { href: '/alerts', label: 'Alerts' },
  { href: '/hosts', label: 'Hosts' },
  { href: '/clusters', label: 'Clusters' },
  { href: '/databases', label: 'Databases' },
  { href: '/queues', label: 'Queues' },
  { href: '/jobs', label: 'Jobs' },
  { href: '/certificates', label: 'Certificates' },
  { href: '/domains', label: 'Domains' },
  { href: '/costs', label: 'Costs' },
  { href: '/capacity', label: 'Capacity' },
  { href: '/slos', label: 'SLOs' },
  { href: '/maintenance', label: 'Maintenance' },
  { href: '/changes', label: 'Changes' },
  { href: '/flags', label: 'Flags' },
  { href: '/backups', label: 'Backups' },
  { href: '/tokens', label: 'Tokens' },
  { href: '/teams', label: 'Teams' },
  { href: '/audit', label: 'Audit log' },
  { href: '/endpoints', label: 'Endpoints' },
  { href: '/regions', label: 'Regions' },
  { href: '/vendors', label: 'Vendors' },
  { href: '/status', label: 'Status' },
  { href: '/reports', label: 'Reports' },
  { href: '/secrets', label: 'Secrets' },
  { href: '/webhooks', label: 'Webhooks' },
];

export function layout({ title, active, body }) {
  const nav = NAV.map((item) => {
    const current = item.href === active ? ' aria-current="page"' : '';
    return `<a href="${item.href}"${current}>${escapeHtml(item.label)}</a>`;
  }).join('');
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<link rel="icon" href="/public/img/favicon.svg">
<title>${escapeHtml(title)} · Harbor</title>
<link rel="stylesheet" href="/public/kit.css">
<link rel="stylesheet" href="/public/app.css">
<script src="/public/kit.js" defer></script>
</head>
<body>
<nav class="topnav">${nav}</nav>
<main>
${body}
</main>
</body>
</html>`;
}
JS

cat > src/pages/overview.js <<'JS'
import { button } from '#kit/button';
import { escapeHtml } from '../html.js';

// One panel per environment, counting the services that are not passing
// their health checks.
export function renderOverview(snapshot) {
  const environments = [...new Set(snapshot.services.map((s) => s.environment))].sort();
  const panels = environments.map((env) => {
    const services = snapshot.services.filter((s) => s.environment === env);
    const unhealthy = services.filter((s) => s.health !== 'passing').length;
    const pill =
      unhealthy === 0
        ? '<span class="pill pill-green">all passing</span>'
        : `<span class="pill pill-red">${unhealthy} not passing</span>`;
    const link = button({
      label: 'View services',
      href: `/services?env=${encodeURIComponent(env)}`,
      variant: 'secondary',
      size: 'sm',
    });
    return `<section class="panel">
  <h2>${escapeHtml(env)}</h2>
  <p>${services.length} services</p>
  ${pill}
  <footer>${link}</footer>
</section>`;
  });
  return `<h1>Overview</h1>
<p class="muted">Snapshot ${escapeHtml(snapshot.generatedAt)}</p>
<div class="panels">
${panels.join('\n')}
</div>`;
}
JS

cat > src/pages/services.js <<'JS'
import { button } from '#kit/button';
import { dialog } from '#kit/dialog';
import { escapeHtml } from '../html.js';

// Services list. Filter with ?env=production|staging; sort with
// ?sort=name|deployedAt and ?dir=asc|desc (default: name, ascending).
const ENVIRONMENTS = ['production', 'staging'];
const SORTS = {
  name: (a, b) => a.name.localeCompare(b.name) || a.environment.localeCompare(b.environment),
  deployedAt: (a, b) => a.deployedAt.localeCompare(b.deployedAt),
};

export function renderServices(snapshot, query) {
  const env = ENVIRONMENTS.includes(query.env) ? query.env : 'all';
  const sort = Object.hasOwn(SORTS, query.sort ?? '') ? query.sort : 'name';
  const dir = query.dir === 'desc' ? 'desc' : 'asc';

  let services = snapshot.services;
  if (env !== 'all') services = services.filter((s) => s.environment === env);
  const factor = dir === 'desc' ? -1 : 1;
  services = [...services].sort((a, b) => factor * SORTS[sort](a, b));

  const options = ['all', ...ENVIRONMENTS]
    .map((e) => {
      const selected = e === env ? ' selected' : '';
      return `<option value="${e}"${selected}>${e === 'all' ? 'All environments' : e}</option>`;
    })
    .join('');

  // Clicking the active column flips its direction; any other column starts
  // ascending. The links carry the filter so sorting keeps it.
  const sortHeader = (key, label) => {
    const active = key === sort;
    const next = active && dir === 'asc' ? 'desc' : 'asc';
    const arrow = active ? (dir === 'asc' ? ' ▲' : ' ▼') : '';
    const ariaSort = active ? ` aria-sort="${dir === 'asc' ? 'ascending' : 'descending'}"` : '';
    return `<th${ariaSort}><a href="?env=${env}&amp;sort=${key}&amp;dir=${next}">${label}${arrow}</a></th>`;
  };

  const rows = services
    .map(
      (s) => `<tr>
  <td>${escapeHtml(s.name)}</td>
  <td>${escapeHtml(s.version)}</td>
  <td>${escapeHtml(s.environment)}</td>
  <td><span class="pill ${healthClass(s.health)}">${escapeHtml(s.health)}</span></td>
  <td>${escapeHtml(s.deployedAt)}</td>
</tr>`,
    )
    .join('\n');

  const list =
    services.length === 0
      ? '<p class="muted">No services in this environment.</p>'
      : `<table class="services">
<thead><tr>
  ${sortHeader('name', 'Name')}
  <th>Version</th>
  <th>Environment</th>
  <th>Health</th>
  ${sortHeader('deployedAt', 'Deployed')}
</tr></thead>
<tbody>
${rows}
</tbody>
</table>`;

  const legend = dialog({
    id: 'health-legend',
    title: 'Health checks',
    body: `<ul class="legend">
  <li><span class="pill pill-green">passing</span> every check passed in the last minute</li>
  <li><span class="pill pill-amber">degraded</span> some checks failed</li>
  <li><span class="pill pill-red">failing</span> most or all checks failed</li>
</ul>`,
  });
  const legendButton = button({
    label: 'Health legend',
    variant: 'ghost',
    size: 'sm',
    attrs: { 'data-dialog-open': 'health-legend' },
  });

  return `<div class="title-row">
  <h1>Services</h1>
  ${legendButton}
</div>
<form method="get" action="/services" class="filters">
  <label>Environment
    <select name="env" onchange="this.form.submit()">${options}</select>
  </label>
  <input type="hidden" name="sort" value="${sort}">
  <input type="hidden" name="dir" value="${dir}">
</form>
${list}
${legend}`;
}

function healthClass(health) {
  if (health === 'passing') return 'pill-green';
  if (health === 'degraded') return 'pill-amber';
  return 'pill-red';
}
JS

cat > src/pages/incidents.js <<'JS'
import { button } from '#kit/button';
import { escapeHtml } from '../html.js';

// Incidents, newest first. Open ones by default; ?state=resolved shows the
// resolved ones instead.
export function renderIncidents(snapshot, query) {
  const state = query.state === 'resolved' ? 'resolved' : 'open';
  const incidents = snapshot.incidents
    .filter((i) => (state === 'open' ? i.resolvedAt === null : i.resolvedAt !== null))
    .sort((a, b) => b.openedAt.localeCompare(a.openedAt));

  const tab = (value, label) => {
    const current = value === state ? ' aria-current="page"' : '';
    return `<a href="/incidents?state=${value}"${current}>${label}</a>`;
  };

  const items = incidents
    .map((i) => {
      const runbook = button({
        label: 'Runbook',
        href: `/runbooks#${encodeURIComponent(i.runbook)}`,
        variant: 'link',
        size: 'sm',
      });
      return `<li class="incident">
  <span class="pill ${severityClass(i.severity)}">${escapeHtml(i.severity)}</span>
  <strong>${escapeHtml(i.title)}</strong>
  <span class="muted">${escapeHtml(i.service)}, opened ${escapeHtml(i.openedAt)}</span>
  ${runbook}
</li>`;
    })
    .join('\n');

  const list =
    incidents.length === 0
      ? `<p class="muted">No ${state} incidents.</p>`
      : `<ul class="incidents">
${items}
</ul>`;

  return `<h1>Incidents</h1>
<nav class="subnav">${tab('open', 'Open')}${tab('resolved', 'Resolved')}</nav>
${list}`;
}

function severityClass(severity) {
  if (severity === 'sev1') return 'pill-red';
  if (severity === 'sev2') return 'pill-amber';
  return 'pill-grey';
}
JS

cat > src/pages/oncall.js <<'JS'
import { button } from '#kit/button';
import { dialog } from '#kit/dialog';
import { escapeHtml } from '../html.js';

// Who is on call for each team this week, and how pages escalate.
export function renderOncall(snapshot) {
  const rows = [...snapshot.rotations]
    .sort((a, b) => a.team.localeCompare(b.team))
    .map(
      (r) => `<tr>
  <td>${escapeHtml(r.team)}</td>
  <td>${escapeHtml(r.primary)}</td>
  <td>${escapeHtml(r.secondary)}</td>
  <td>${escapeHtml(r.until)}</td>
</tr>`,
    )
    .join('\n');

  const policy = dialog({
    id: 'escalation',
    title: 'Escalation policy',
    body: `<ol>${snapshot.escalation.map((step) => `<li>${escapeHtml(step)}</li>`).join('')}</ol>`,
  });
  const policyButton = button({
    label: 'Escalation policy',
    variant: 'secondary',
    size: 'sm',
    attrs: { 'data-dialog-open': 'escalation' },
  });

  return `<div class="title-row">
  <h1>On-call</h1>
  ${policyButton}
</div>
<table class="oncall">
<thead><tr><th>Team</th><th>Primary</th><th>Secondary</th><th>Until</th></tr></thead>
<tbody>
${rows}
</tbody>
</table>
${policy}`;
}
JS

cat > src/pages/runbooks.js <<'JS'
import { button } from '#kit/button';
import { escapeHtml } from '../html.js';

// The runbook index. Each panel links to the runbook in the wiki and carries
// an anchor the Incidents page links to.
export function renderRunbooks(snapshot) {
  const panels = [...snapshot.runbooks]
    .sort((a, b) => a.title.localeCompare(b.title))
    .map((rb) => {
      const open = button({ label: 'Open runbook', href: rb.url, variant: 'secondary', size: 'sm' });
      return `<section class="panel" id="${escapeHtml(rb.id)}">
  <h2>${escapeHtml(rb.title)}</h2>
  <p>${escapeHtml(rb.summary)}</p>
  <footer>${open}</footer>
</section>`;
    })
    .join('\n');
  return `<h1>Runbooks</h1>
<div class="panels">
${panels}
</div>`;
}
JS

cat > src/server.js <<'JS'
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfig } from './core/config/load.js';
import { readSnapshot } from './data.js';
import { escapeHtml } from './html.js';
import { layout } from './layout.js';
import { renderAlerts } from './pages/alerts.js';
import { renderAudit } from './pages/audit.js';
import { renderBackups } from './pages/backups.js';
import { renderCapacity } from './pages/capacity.js';
import { renderCertificates } from './pages/certificates.js';
import { renderChanges } from './pages/changes.js';
import { renderClusters } from './pages/clusters.js';
import { renderCosts } from './pages/costs.js';
import { renderDatabases } from './pages/databases.js';
import { renderDomains } from './pages/domains.js';
import { renderEndpoints } from './pages/endpoints.js';
import { renderFlags } from './pages/flags.js';
import { renderHosts } from './pages/hosts.js';
import { renderIncidents } from './pages/incidents.js';
import { renderJobs } from './pages/jobs.js';
import { renderMaintenance } from './pages/maintenance.js';
import { renderOncall } from './pages/oncall.js';
import { renderOverview } from './pages/overview.js';
import { renderQueues } from './pages/queues.js';
import { renderRegions } from './pages/regions.js';
import { renderReports } from './pages/reports.js';
import { renderRunbooks } from './pages/runbooks.js';
import { renderSecrets } from './pages/secrets.js';
import { renderServices } from './pages/services.js';
import { renderSlos } from './pages/slos.js';
import { renderStatus } from './pages/status.js';
import { renderTeams } from './pages/teams.js';
import { renderTokens } from './pages/tokens.js';
import { renderVendors } from './pages/vendors.js';
import { renderWebhooks } from './pages/webhooks.js';

const PUBLIC_DIR = fileURLToPath(new URL('../public/', import.meta.url));
const TYPES = { '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml' };

const ROUTES = {
  '/': { title: 'Overview', snapshot: 'services', render: renderOverview },
  '/services': { title: 'Services', snapshot: 'services', render: renderServices },
  '/incidents': { title: 'Incidents', snapshot: 'incidents', render: renderIncidents },
  '/oncall': { title: 'On-call', snapshot: 'oncall', render: renderOncall },
  '/runbooks': { title: 'Runbooks', snapshot: 'runbooks', render: renderRunbooks },
  '/alerts': { title: 'Alerts', snapshot: 'alerts', render: renderAlerts },
  '/hosts': { title: 'Hosts', snapshot: 'hosts', render: renderHosts },
  '/clusters': { title: 'Clusters', snapshot: 'clusters', render: renderClusters },
  '/databases': { title: 'Databases', snapshot: 'databases', render: renderDatabases },
  '/queues': { title: 'Queues', snapshot: 'queues', render: renderQueues },
  '/jobs': { title: 'Jobs', snapshot: 'jobs', render: renderJobs },
  '/certificates': { title: 'Certificates', snapshot: 'certificates', render: renderCertificates },
  '/domains': { title: 'Domains', snapshot: 'domains', render: renderDomains },
  '/costs': { title: 'Costs', snapshot: 'costs', render: renderCosts },
  '/capacity': { title: 'Capacity', snapshot: 'capacity', render: renderCapacity },
  '/slos': { title: 'SLOs', snapshot: 'slos', render: renderSlos },
  '/maintenance': { title: 'Maintenance', snapshot: 'maintenance', render: renderMaintenance },
  '/changes': { title: 'Changes', snapshot: 'changes', render: renderChanges },
  '/flags': { title: 'Flags', snapshot: 'flags', render: renderFlags },
  '/backups': { title: 'Backups', snapshot: 'backups', render: renderBackups },
  '/tokens': { title: 'Tokens', snapshot: 'tokens', render: renderTokens },
  '/teams': { title: 'Teams', snapshot: 'teams', render: renderTeams },
  '/audit': { title: 'Audit log', snapshot: 'audit', render: renderAudit },
  '/endpoints': { title: 'Endpoints', snapshot: 'endpoints', render: renderEndpoints },
  '/regions': { title: 'Regions', snapshot: 'regions', render: renderRegions },
  '/vendors': { title: 'Vendors', snapshot: 'vendors', render: renderVendors },
  '/status': { title: 'Status', snapshot: 'status', render: renderStatus },
  '/reports': { title: 'Reports', snapshot: 'reports', render: renderReports },
  '/secrets': { title: 'Secrets', snapshot: 'secrets', render: renderSecrets },
  '/webhooks': { title: 'Webhooks', snapshot: 'webhooks', render: renderWebhooks },
};

// Resolves one request to a response. Kept apart from the http server so
// tests can call it directly.
export async function handle(url, { dataDir } = {}) {
  const { pathname, searchParams } = new URL(url, 'http://harbor.local');
  if (pathname.startsWith('/public/')) return serveStatic(pathname.slice('/public/'.length));
  const route = ROUTES[pathname];
  if (!route) return page(404, 'Not found', '<h1>Not found</h1>', pathname);
  let snapshot;
  try {
    snapshot = await readSnapshot(route.snapshot, dataDir);
  } catch {
    // The pipeline rewrites snapshots in place, so a read can fail for a
    // moment. Say so instead of crashing; the next refresh usually works.
    const body = `<h1>${escapeHtml(route.title)}</h1>
<p class="muted">Snapshot unavailable, try again in a minute.</p>`;
    return page(503, route.title, body, pathname);
  }
  return page(200, route.title, route.render(snapshot, Object.fromEntries(searchParams)), pathname);
}

function page(status, title, body, active) {
  return { status, type: 'text/html; charset=utf-8', body: layout({ title, active, body }) };
}

async function serveStatic(name) {
  const type = TYPES[extname(name)];
  if (name.includes('..') || !type) return { status: 404, type: 'text/plain', body: 'Not found' };
  try {
    return { status: 200, type, body: await readFile(join(PUBLIC_DIR, name), 'utf8') };
  } catch {
    return { status: 404, type: 'text/plain', body: 'Not found' };
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { port, dataDir } = loadConfig();
  createServer(async (req, res) => {
    const out = await handle(req.url, { dataDir });
    res.writeHead(out.status, { 'content-type': out.type });
    res.end(out.body);
  }).listen(port, () => console.log(`harbor on http://localhost:${port}`));
}
JS

cat > public/app.css <<'CSS'
/* Harbor dashboard styles */
body { margin: 0; font: 14px/1.5 system-ui, sans-serif; color: #1f2328; }
.topnav { display: flex; gap: 1rem; padding: .75rem 1.5rem; background: #24292f; }
.topnav a { color: #f6f8fa; text-decoration: none; }
.topnav a[aria-current="page"] { font-weight: 600; text-decoration: underline; }
main { padding: 1.5rem; }
h1 { margin: 0 0 1rem; font-size: 1.5rem; }
.title-row { display: flex; justify-content: space-between; align-items: center; }
.muted { color: #6e7781; }
.panels { display: grid; grid-template-columns: repeat(auto-fill, minmax(16rem, 1fr)); gap: 1rem; }
.panel { border: 1px solid #d0d7de; border-radius: 6px; padding: 1rem; }
.panel h2 { margin: 0 0 .5rem; font-size: 1rem; text-transform: capitalize; }
.panel footer { margin-top: .75rem; }
.filters { margin-bottom: 1rem; }
.filters select { margin-left: .5rem; }
.services, .oncall { width: 100%; border-collapse: collapse; }
.services th, .services td, .oncall th, .oncall td { text-align: left; padding: .4rem .6rem; border-bottom: 1px solid #ddd; }
.services th a { color: inherit; }
.pill { display: inline-block; padding: 0 .5rem; border-radius: 1rem; font-size: .75rem; color: #fff; }
.pill-green { background: #2da44e; }
.pill-amber { background: #bf8700; }
.pill-red { background: #cf222e; }
.pill-grey { background: #6e7781; }
.subnav { display: flex; gap: 1rem; margin-bottom: 1rem; }
.subnav a[aria-current="page"] { font-weight: 600; }
.incidents { list-style: none; padding: 0; }
.incident { display: flex; gap: .75rem; align-items: center; padding: .5rem 0; border-bottom: 1px solid #ddd; }
.legend { padding-left: 1rem; }
.list-table { width: 100%; border-collapse: collapse; }
.list-table th, .list-table td { text-align: left; padding: .4rem .6rem; border-bottom: 1px solid #ddd; }
.list-table th a { color: inherit; }
.list { list-style: none; padding: 0; }
.list-item { display: flex; gap: .75rem; align-items: center; padding: .5rem 0; border-bottom: 1px solid #ddd; }
.panel-list { margin: 0; padding-left: 1rem; }
CSS

cat > data/services.json <<'JSON'
{
  "generatedAt": "2026-10-01T09:30:00Z",
  "services": [
    { "name": "api-gateway", "version": "3.14.2", "environment": "production", "health": "passing", "deployedAt": "2026-09-30T16:05:00Z" },
    { "name": "billing", "version": "2.8.0", "environment": "production", "health": "degraded", "deployedAt": "2026-09-29T11:40:00Z" },
    { "name": "notifications", "version": "0.9.4", "environment": "production", "health": "failing", "deployedAt": "2026-10-01T08:50:00Z" },
    { "name": "search", "version": "1.22.1", "environment": "production", "health": "passing", "deployedAt": "2026-09-28T09:15:00Z" },
    { "name": "api-gateway", "version": "3.15.0-rc.1", "environment": "staging", "health": "passing", "deployedAt": "2026-10-01T07:20:00Z" },
    { "name": "billing", "version": "2.9.0-rc.2", "environment": "staging", "health": "passing", "deployedAt": "2026-09-30T14:00:00Z" },
    { "name": "search", "version": "1.23.0-rc.1", "environment": "staging", "health": "failing", "deployedAt": "2026-10-01T09:05:00Z" }
  ]
}
JSON

cat > data/incidents.json <<'JSON'
{
  "generatedAt": "2026-10-01T09:30:00Z",
  "incidents": [
    { "id": "inc-311", "title": "Notification emails delayed", "service": "notifications", "severity": "sev2", "openedAt": "2026-10-01T08:40:00Z", "resolvedAt": null, "runbook": "queue-backlog" },
    { "id": "inc-310", "title": "Invoices slow to render", "service": "billing", "severity": "sev3", "openedAt": "2026-09-29T12:05:00Z", "resolvedAt": null, "runbook": "slow-queries" },
    { "id": "inc-309", "title": "Search returning stale results", "service": "search", "severity": "sev2", "openedAt": "2026-09-30T10:35:00Z", "resolvedAt": "2026-09-30T11:20:00Z", "runbook": "reindex" },
    { "id": "inc-308", "title": "Gateway 502s in eu-west", "service": "api-gateway", "severity": "sev1", "openedAt": "2026-09-27T21:10:00Z", "resolvedAt": "2026-09-27T21:48:00Z", "runbook": "gateway-errors" }
  ]
}
JSON

cat > data/oncall.json <<'JSON'
{
  "generatedAt": "2026-10-01T09:30:00Z",
  "rotations": [
    { "team": "platform", "primary": "dana", "secondary": "marco", "until": "2026-10-05T09:00:00Z" },
    { "team": "payments", "primary": "sam", "secondary": "priya", "until": "2026-10-05T09:00:00Z" },
    { "team": "messaging", "primary": "marco", "secondary": "dana", "until": "2026-10-03T09:00:00Z" }
  ],
  "escalation": [
    "Page the team's primary.",
    "After 10 minutes without an acknowledgement, page the secondary.",
    "After 20 minutes, page the engineering manager on duty."
  ]
}
JSON

cat > data/runbooks.json <<'JSON'
{
  "generatedAt": "2026-10-01T09:30:00Z",
  "runbooks": [
    { "id": "gateway-errors", "title": "Gateway errors", "summary": "5xx spikes at the edge: check upstream health, then shed load.", "url": "https://wiki.example.com/runbooks/gateway-errors" },
    { "id": "queue-backlog", "title": "Queue backlog", "summary": "Consumers falling behind: scale the workers, then find the slow handler.", "url": "https://wiki.example.com/runbooks/queue-backlog" },
    { "id": "reindex", "title": "Search reindex", "summary": "Stale or missing results: rebuild the index from the primary store.", "url": "https://wiki.example.com/runbooks/reindex" },
    { "id": "slow-queries", "title": "Slow queries", "summary": "Latency from the database: find the query, then add the index or the cache.", "url": "https://wiki.example.com/runbooks/slow-queries" }
  ]
}
JSON

cat > test/pages/overview.test.js <<'JS'
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { renderOverview } from '../../src/pages/overview.js';

const snapshot = {
  generatedAt: '2026-10-01T09:30:00Z',
  services: [
    { name: 'a', version: '1', environment: 'production', health: 'failing', deployedAt: '2026-09-01T00:00:00Z' },
    { name: 'b', version: '1', environment: 'production', health: 'passing', deployedAt: '2026-09-01T00:00:00Z' },
    { name: 'a', version: '2', environment: 'staging', health: 'passing', deployedAt: '2026-09-02T00:00:00Z' },
  ],
};

test('counts the services not passing in each environment', () => {
  const html = renderOverview(snapshot);
  assert.match(html, /<span class="pill pill-red">1 not passing<\/span>/);
  assert.match(html, /<span class="pill pill-green">all passing<\/span>/);
  assert.match(html, /href="\/services\?env=staging">View services</);
});
JS

cat > test/pages/services.test.js <<'JS'
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { renderServices } from '../../src/pages/services.js';

const snapshot = {
  generatedAt: '2026-10-01T09:30:00Z',
  services: [
    { name: 'billing', version: '2.8.0', environment: 'production', health: 'failing', deployedAt: '2026-09-29T11:40:00Z' },
    { name: 'api', version: '3.1.0', environment: 'production', health: 'passing', deployedAt: '2026-09-30T16:05:00Z' },
  ],
};

test('lists services by name by default', () => {
  const html = renderServices(snapshot, {});
  assert.ok(html.indexOf('<td>api</td>') < html.indexOf('<td>billing</td>'));
  assert.match(html, /<th aria-sort="ascending"><a href="\?env=all&amp;sort=name&amp;dir=desc">Name ▲<\/a><\/th>/);
});

test('sorts by deploy time both ways and keeps the sort in the filter form', () => {
  const newest = renderServices(snapshot, { sort: 'deployedAt', dir: 'desc' });
  assert.ok(newest.indexOf('<td>api</td>') < newest.indexOf('<td>billing</td>'));
  assert.match(newest, /<th aria-sort="descending"><a href="\?env=all&amp;sort=deployedAt&amp;dir=asc">Deployed ▼<\/a><\/th>/);
  assert.match(newest, /<input type="hidden" name="sort" value="deployedAt">/);
  assert.match(newest, /<input type="hidden" name="dir" value="desc">/);
  const oldest = renderServices(snapshot, { sort: 'deployedAt' });
  assert.ok(oldest.indexOf('<td>billing</td>') < oldest.indexOf('<td>api</td>'));
});

test('colors health', () => {
  assert.match(renderServices(snapshot, {}), /<span class="pill pill-red">failing<\/span>/);
});

test('filters by environment, keeps it when sorting, and says when none match', () => {
  const production = renderServices(snapshot, { env: 'production' });
  assert.match(production, /href="\?env=production&amp;sort=deployedAt&amp;dir=asc"/);
  const staging = renderServices(snapshot, { env: 'staging' });
  assert.match(staging, /<option value="staging" selected>/);
  assert.match(staging, /No services in this environment\./);
  assert.doesNotMatch(staging, /<table/);
});

test('falls back to the defaults for unknown query values', () => {
  const html = renderServices(snapshot, { env: 'moon', sort: 'constructor', dir: 'sideways' });
  assert.match(html, /<option value="all" selected>/);
  assert.match(html, /<input type="hidden" name="sort" value="name">/);
  assert.match(html, /<input type="hidden" name="dir" value="asc">/);
});

test('explains the health states in a dialog', () => {
  const html = renderServices(snapshot, {});
  assert.match(html, /data-dialog-open="health-legend"/);
  assert.match(html, /<dialog class="kit-dialog" id="health-legend"/);
});
JS

cat > test/pages/incidents.test.js <<'JS'
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { renderIncidents } from '../../src/pages/incidents.js';

const snapshot = {
  generatedAt: '2026-10-01T09:30:00Z',
  incidents: [
    { id: 'inc-2', title: 'Emails delayed', service: 'notifications', severity: 'sev2', openedAt: '2026-10-01T08:40:00Z', resolvedAt: null, runbook: 'queue-backlog' },
    { id: 'inc-1', title: 'Gateway 502s', service: 'api-gateway', severity: 'sev1', openedAt: '2026-09-27T21:10:00Z', resolvedAt: '2026-09-27T21:48:00Z', runbook: 'gateway-errors' },
  ],
};

test('shows open incidents by default, each with its runbook', () => {
  const html = renderIncidents(snapshot, {});
  assert.match(html, /Emails delayed/);
  assert.doesNotMatch(html, /Gateway 502s/);
  assert.match(html, /<span class="pill pill-amber">sev2<\/span>/);
  assert.match(html, /href="\/runbooks#queue-backlog">Runbook</);
  assert.match(html, /<a href="\/incidents\?state=open" aria-current="page">Open<\/a>/);
});

test('shows resolved incidents on request', () => {
  const html = renderIncidents(snapshot, { state: 'resolved' });
  assert.match(html, /Gateway 502s/);
  assert.match(html, /<span class="pill pill-red">sev1<\/span>/);
});

test('says when there are none', () => {
  assert.match(renderIncidents({ ...snapshot, incidents: [] }, {}), /No open incidents\./);
});
JS

cat > test/pages/oncall.test.js <<'JS'
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { renderOncall } from '../../src/pages/oncall.js';

const snapshot = {
  generatedAt: '2026-10-01T09:30:00Z',
  rotations: [
    { team: 'platform', primary: 'dana', secondary: 'marco', until: '2026-10-05T09:00:00Z' },
    { team: 'messaging', primary: 'marco', secondary: 'dana', until: '2026-10-03T09:00:00Z' },
  ],
  escalation: ['Page the primary.', 'Then the secondary.'],
};

test('lists rotations by team', () => {
  const html = renderOncall(snapshot);
  assert.ok(html.indexOf('<td>messaging</td>') < html.indexOf('<td>platform</td>'));
});

test('shows the escalation policy in a dialog', () => {
  const html = renderOncall(snapshot);
  assert.match(html, /data-dialog-open="escalation"/);
  assert.match(html, /<li>Page the primary\.<\/li><li>Then the secondary\.<\/li>/);
});
JS

cat > test/pages/runbooks.test.js <<'JS'
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { renderRunbooks } from '../../src/pages/runbooks.js';

const snapshot = {
  generatedAt: '2026-10-01T09:30:00Z',
  runbooks: [
    { id: 'queue-backlog', title: 'Queue backlog', summary: 'Scale the workers.', url: 'https://wiki.example.com/runbooks/queue-backlog' },
    { id: 'gateway-errors', title: 'Gateway errors', summary: 'Shed load.', url: 'https://wiki.example.com/runbooks/gateway-errors' },
  ],
};

test('lists runbooks by title, each with an anchor and a link', () => {
  const html = renderRunbooks(snapshot);
  assert.ok(html.indexOf('Gateway errors') < html.indexOf('Queue backlog'));
  assert.match(html, /<section class="panel" id="queue-backlog">/);
  assert.match(html, /href="https:\/\/wiki\.example\.com\/runbooks\/queue-backlog">Open runbook</);
});
JS

cat > test/server.test.js <<'JS'
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { handle } from '../src/server.js';

test('renders the services page inside the layout', async () => {
  const res = await handle('/services?env=production');
  assert.equal(res.status, 200);
  assert.match(res.body, /<title>Services · Harbor<\/title>/);
  assert.match(res.body, /aria-current="page">Services</);
  assert.match(res.body, /<td>notifications<\/td>/);
});

test('serves every page in the nav', async () => {
  const paths = [
    '/', '/services', '/incidents', '/oncall', '/runbooks', '/alerts', '/hosts',
    '/clusters', '/databases', '/queues', '/jobs', '/certificates', '/domains',
    '/costs', '/capacity', '/slos', '/maintenance', '/changes', '/flags',
    '/backups', '/tokens', '/teams', '/audit', '/endpoints', '/regions',
    '/vendors', '/status', '/reports', '/secrets', '/webhooks',
  ];
  for (const path of paths) {
    assert.equal((await handle(path)).status, 200, path);
  }
});

test('answers 503 when the snapshot cannot be read', async () => {
  const dataDir = fileURLToPath(new URL('./no-such-dir/', import.meta.url));
  const res = await handle('/', { dataDir });
  assert.equal(res.status, 503);
  assert.match(res.body, /Snapshot unavailable/);
});

test('answers 404 for an unknown path', async () => {
  assert.equal((await handle('/nope')).status, 404);
});

test('serves the stylesheets and the script', async () => {
  for (const name of ['kit.css', 'app.css', 'kit.js']) {
    assert.equal((await handle(`/public/${name}`)).status, 200, name);
  }
});
JS


# --- Core: small dependency-free helpers the server and the pipeline share ---

mkdir -p src/core/{cache,collections,config,errors,events,format,hash,http,ids,json,log,math,metrics,paths,rate,retry,semver,strings,time,validate} test/core

cat > src/core/cache/lru.js <<'JS'
// A bounded cache that evicts the least recently used entry. Map keeps
// insertion order, so re-inserting on every hit is enough to track recency.
export class LruCache {
  constructor(limit = 100) {
    this.limit = limit;
    this.map = new Map();
  }

  get(key) {
    if (!this.map.has(key)) return undefined;
    const value = this.map.get(key);
    this.map.delete(key);
    this.map.set(key, value);
    return value;
  }

  set(key, value) {
    this.map.delete(key);
    this.map.set(key, value);
    if (this.map.size > this.limit) this.map.delete(this.map.keys().next().value);
    return this;
  }

  has(key) {
    return this.map.has(key);
  }

  get size() {
    return this.map.size;
  }
}
JS

cat > src/core/cache/ttl.js <<'JS'
import { systemClock } from '../time/clock.js';

// Entries expire after `ttlMs`. Expired entries are dropped lazily on read.
export function ttlCache(ttlMs, clock = systemClock) {
  const entries = new Map();
  return {
    get(key) {
      const entry = entries.get(key);
      if (!entry) return undefined;
      if (clock.now() >= entry.expiresAt) {
        entries.delete(key);
        return undefined;
      }
      return entry.value;
    },
    set(key, value) {
      entries.set(key, { value, expiresAt: clock.now() + ttlMs });
    },
    clear() {
      entries.clear();
    },
  };
}
JS

cat > src/core/cache/memo.js <<'JS'
// Memoizes a one-argument function. Pass `key` when the argument is an object
// whose identity changes between equal calls.
export function memoize(fn, key = (arg) => arg) {
  const cache = new Map();
  return (arg) => {
    const k = key(arg);
    if (!cache.has(k)) cache.set(k, fn(arg));
    return cache.get(k);
  };
}
JS

cat > src/core/collections/chunk.js <<'JS'
export function chunk(list, size) {
  if (!Number.isInteger(size) || size < 1) throw new RangeError(`chunk size must be a positive integer, got ${size}`);
  const out = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}
JS

cat > src/core/collections/unique.js <<'JS'
// Keeps the first item for each key, in input order.
export function uniqueBy(list, key = (item) => item) {
  const seen = new Set();
  return list.filter((item) => {
    const k = key(item);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}
JS

cat > src/core/collections/key-by.js <<'JS'
// Later items win when two share a key.
export function keyBy(list, key) {
  const out = {};
  for (const item of list) out[key(item)] = item;
  return out;
}
JS

cat > src/core/collections/group-by.js <<'JS'
// Groups in first-seen order of the keys.
export function groupBy(list, key) {
  const groups = new Map();
  for (const item of list) {
    const k = key(item);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(item);
  }
  return groups;
}
JS

cat > src/core/collections/range.js <<'JS'
export function range(start, end, step = 1) {
  const out = [];
  for (let i = start; step > 0 ? i < end : i > end; i += step) out.push(i);
  return out;
}
JS

cat > src/core/collections/zip.js <<'JS'
// Stops at the shorter list.
export function zip(a, b) {
  return a.slice(0, Math.min(a.length, b.length)).map((item, i) => [item, b[i]]);
}
JS

cat > src/core/config/env.js <<'JS'
// Reads one environment variable, with a default and an optional parser.
// A parser that returns NaN or undefined counts as a bad value.
export function readEnv(name, { fallback, parse = (v) => v, env = process.env } = {}) {
  const raw = env[name];
  if (raw === undefined || raw === '') return fallback;
  const value = parse(raw);
  if (value === undefined || Number.isNaN(value)) throw new Error(`${name} has an invalid value: ${raw}`);
  return value;
}
JS

cat > src/core/config/load.js <<'JS'
import { fileURLToPath } from 'node:url';
import { readEnv } from './env.js';

const ROOT = fileURLToPath(new URL('../../../', import.meta.url));

export function loadConfig(env = process.env) {
  return {
    port: readEnv('PORT', { fallback: 3000, parse: Number, env }),
    dataDir: readEnv('HARBOR_DATA_DIR', { fallback: `${ROOT}data/`, env }),
    logLevel: readEnv('LOG_LEVEL', { fallback: 'info', env }),
  };
}
JS

cat > src/core/errors/http-error.js <<'JS'
export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
  }
}
JS

cat > src/core/errors/snapshot-error.js <<'JS'
// Raised by the pipeline when a snapshot fails validation, so the old file
// stays in place rather than being replaced with a broken one.
export class SnapshotError extends Error {
  constructor(name, problems) {
    super(`${name}: ${problems.length} problem(s): ${problems.join('; ')}`);
    this.name = 'SnapshotError';
    this.snapshot = name;
    this.problems = problems;
  }
}
JS

cat > src/core/events/emitter.js <<'JS'
export class Emitter {
  constructor() {
    this.handlers = new Map();
  }

  on(event, handler) {
    if (!this.handlers.has(event)) this.handlers.set(event, new Set());
    this.handlers.get(event).add(handler);
    return () => this.handlers.get(event).delete(handler);
  }

  emit(event, payload) {
    for (const handler of this.handlers.get(event) ?? []) handler(payload);
  }
}
JS

cat > src/core/format/bytes.js <<'JS'
const UNITS = ['B', 'KB', 'MB', 'GB', 'TB'];

// Binary multiples, labeled the way the storage dashboards we copy from do.
export function formatBytes(bytes) {
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < UNITS.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${unit === 0 ? value : value.toFixed(1)} ${UNITS[unit]}`;
}
JS

cat > src/core/format/number.js <<'JS'
const FORMAT = new Intl.NumberFormat('en-US');

export function formatNumber(n) {
  return FORMAT.format(n);
}
JS

cat > src/core/format/percent.js <<'JS'
export function formatPercent(ratio, digits = 1) {
  return `${(ratio * 100).toFixed(digits)}%`;
}
JS

cat > src/core/format/plural.js <<'JS'
export function plural(count, one, many = `${one}s`) {
  return `${count} ${count === 1 ? one : many}`;
}
JS

cat > src/core/format/timestamp.js <<'JS'
// Snapshot times are UTC; showing them in UTC keeps the on-call handoff notes
// and the dashboard in agreement.
export function formatTimestamp(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.toISOString().slice(0, 10)} ${d.toISOString().slice(11, 16)} UTC`;
}
JS

cat > src/core/hash/fnv1a.js <<'JS'
// 32-bit FNV-1a. Fast and stable; not for anything security-sensitive.
export function fnv1a(text) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}
JS

cat > src/core/hash/etag.js <<'JS'
import { fnv1a } from './fnv1a.js';

export function weakEtag(body) {
  return `W/"${body.length.toString(16)}-${fnv1a(body).toString(16)}"`;
}
JS

cat > src/core/http/content-type.js <<'JS'
const TYPES = {
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.html': 'text/html; charset=utf-8',
};

export function contentType(extension) {
  return TYPES[extension] ?? 'application/octet-stream';
}
JS

cat > src/core/http/cache-control.js <<'JS'
// Snapshots change every minute, so pages must not be cached; static assets
// change only on deploy.
export const NO_STORE = 'no-store';
export const STATIC = 'public, max-age=3600';
JS

cat > src/core/http/status-text.js <<'JS'
const TEXT = {
  200: 'OK',
  304: 'Not Modified',
  400: 'Bad Request',
  404: 'Not Found',
  500: 'Internal Server Error',
  503: 'Service Unavailable',
};

export function statusText(status) {
  return TEXT[status] ?? 'Unknown';
}
JS

cat > src/core/http/query-string.js <<'JS'
// Builds "?a=1&b=2" from an object, skipping null and undefined values.
export function buildQuery(params) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== null && value !== undefined) search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : '';
}
JS

cat > src/core/ids/short-id.js <<'JS'
import { randomBytes } from 'node:crypto';

const ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyz';

export function shortId(length = 8) {
  const bytes = randomBytes(length);
  let id = '';
  for (const byte of bytes) id += ALPHABET[byte % ALPHABET.length];
  return id;
}
JS

cat > src/core/json/safe-parse.js <<'JS'
// Returns `{ ok: false, error }` in place of throwing, for the places that
// would otherwise wrap every parse in try/catch.
export function safeParse(text) {
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch (error) {
    return { ok: false, error };
  }
}
JS

cat > src/core/json/stable-stringify.js <<'JS'
// Sorts object keys so equal values always serialize to the same text; the
// pipeline compares snapshots by their serialized form.
export function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    const keys = Object.keys(value).sort();
    return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}
JS

cat > src/core/log/levels.js <<'JS'
export const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 };
JS

cat > src/core/log/logger.js <<'JS'
import { LEVELS } from './levels.js';

// One JSON line per entry, which is what the log shipper expects.
export function createLogger({ level = 'info', sink = (line) => process.stderr.write(`${line}\n`), base = {} } = {}) {
  const threshold = LEVELS[level] ?? LEVELS.info;
  const log = (lvl, msg, fields = {}) => {
    if (LEVELS[lvl] < threshold) return;
    sink(JSON.stringify({ level: lvl, msg, ...base, ...fields }));
  };
  return {
    debug: (msg, fields) => log('debug', msg, fields),
    info: (msg, fields) => log('info', msg, fields),
    warn: (msg, fields) => log('warn', msg, fields),
    error: (msg, fields) => log('error', msg, fields),
    child: (fields) => createLogger({ level, sink, base: { ...base, ...fields } }),
  };
}
JS

cat > src/core/math/stats.js <<'JS'
export function mean(values) {
  return values.length === 0 ? NaN : values.reduce((a, b) => a + b, 0) / values.length;
}

// Nearest-rank percentile, the definition the latency SLOs are written in.
export function percentile(values, p) {
  if (values.length === 0) return NaN;
  const ordered = [...values].sort((a, b) => a - b);
  const rank = Math.ceil((p / 100) * ordered.length);
  return ordered[Math.min(Math.max(rank, 1), ordered.length) - 1];
}

export function median(values) {
  return percentile(values, 50);
}
JS

cat > src/core/math/clamp.js <<'JS'
export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}
JS

cat > src/core/metrics/counter.js <<'JS'
export class Counter {
  constructor(name) {
    this.name = name;
    this.value = 0;
  }

  inc(by = 1) {
    this.value += by;
  }
}
JS

cat > src/core/metrics/histogram.js <<'JS'
// Fixed buckets, cumulative like Prometheus. Upper bounds in milliseconds.
export class Histogram {
  constructor(name, bounds = [5, 10, 25, 50, 100, 250, 500, 1000]) {
    this.name = name;
    this.bounds = bounds;
    this.counts = new Array(bounds.length + 1).fill(0);
    this.sum = 0;
  }

  observe(value) {
    this.sum += value;
    const i = this.bounds.findIndex((bound) => value <= bound);
    this.counts[i === -1 ? this.bounds.length : i] += 1;
  }
}
JS

cat > src/core/metrics/registry.js <<'JS'
import { Counter } from './counter.js';
import { Histogram } from './histogram.js';

export function createRegistry() {
  const metrics = new Map();
  const get = (name, Make) => {
    if (!metrics.has(name)) metrics.set(name, new Make(name));
    return metrics.get(name);
  };
  return {
    counter: (name) => get(name, Counter),
    histogram: (name) => get(name, Histogram),
    all: () => [...metrics.values()],
  };
}
JS

cat > src/core/paths/safe-join.js <<'JS'
import { normalize, resolve, sep } from 'node:path';

// Joins a request path under `root` and refuses anything that climbs out of
// it, such as "../../etc/passwd".
export function safeJoin(root, requested) {
  const base = resolve(root);
  const full = resolve(base, normalize(requested).replace(/^([/\\])+/, ''));
  return full === base || full.startsWith(base + sep) ? full : null;
}
JS

cat > src/core/rate/token-bucket.js <<'JS'
import { systemClock } from '../time/clock.js';

// Allows bursts up to `capacity`, refilling `perSecond` tokens a second.
export function tokenBucket({ capacity, perSecond, clock = systemClock }) {
  let tokens = capacity;
  let last = clock.now();
  return {
    take() {
      const now = clock.now();
      tokens = Math.min(capacity, tokens + ((now - last) / 1000) * perSecond);
      last = now;
      if (tokens < 1) return false;
      tokens -= 1;
      return true;
    },
  };
}
JS

cat > src/core/retry/backoff.js <<'JS'
// Exponential backoff with full jitter. `random` is injectable for tests.
export function backoff(attempt, { baseMs = 200, maxMs = 10_000, random = Math.random } = {}) {
  const ceiling = Math.min(maxMs, baseMs * 2 ** attempt);
  return Math.floor(random() * ceiling);
}
JS

cat > src/core/retry/retry.js <<'JS'
import { setTimeout as sleep } from 'node:timers/promises';
import { backoff } from './backoff.js';

export async function retry(fn, { attempts = 3, delay = (n) => backoff(n), wait = sleep } = {}) {
  let lastError;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await fn(attempt);
    } catch (error) {
      lastError = error;
      if (attempt < attempts - 1) await wait(delay(attempt));
    }
  }
  throw lastError;
}
JS

cat > src/core/semver/compare.js <<'JS'
// Compares "1.23.0" style versions. A pre-release sorts before its release,
// so 1.23.0-rc.1 < 1.23.0; pre-release tags compare as plain strings.
export function compareVersions(a, b) {
  const [coreA, preA] = a.split('-', 2);
  const [coreB, preB] = b.split('-', 2);
  const partsA = coreA.split('.').map(Number);
  const partsB = coreB.split('.').map(Number);
  for (let i = 0; i < 3; i += 1) {
    if ((partsA[i] ?? 0) !== (partsB[i] ?? 0)) return (partsA[i] ?? 0) < (partsB[i] ?? 0) ? -1 : 1;
  }
  if (preA === preB) return 0;
  if (preA === undefined) return 1;
  if (preB === undefined) return -1;
  return preA < preB ? -1 : 1;
}
JS

cat > src/core/strings/truncate.js <<'JS'
export function truncate(text, max) {
  return text.length <= max ? text : `${text.slice(0, Math.max(0, max - 1))}…`;
}
JS

cat > src/core/strings/slugify.js <<'JS'
export function slugify(text) {
  return text
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
JS

cat > src/core/strings/title-case.js <<'JS'
const SMALL = new Set(['a', 'an', 'and', 'for', 'in', 'of', 'on', 'or', 'the', 'to']);

export function titleCase(text) {
  return text
    .split(/\s+/)
    .map((word, i) => (i > 0 && SMALL.has(word) ? word : word[0].toUpperCase() + word.slice(1)))
    .join(' ');
}
JS

cat > src/core/time/clock.js <<'JS'
// Code that needs the time takes a clock, so tests can pin it.
export const systemClock = { now: () => Date.now() };

export function fixedClock(ms) {
  let now = ms;
  return {
    now: () => now,
    advance: (by) => {
      now += by;
    },
  };
}
JS

cat > src/core/time/parse-iso.js <<'JS'
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?Z$/;

// Accepts only UTC timestamps in the form the pipeline writes; Date.parse on
// its own also takes local times and RFC 2822 dates.
export function parseIso(text) {
  if (typeof text !== 'string' || !ISO.test(text)) return null;
  const ms = Date.parse(text);
  return Number.isNaN(ms) ? null : ms;
}
JS

cat > src/core/validate/is-iso-date.js <<'JS'
import { parseIso } from '../time/parse-iso.js';

export function isIsoDate(value) {
  return parseIso(value) !== null;
}
JS

cat > src/core/validate/shape.js <<'JS'
import { isIsoDate } from './is-iso-date.js';

const CHECKS = {
  string: (v) => typeof v === 'string',
  number: (v) => typeof v === 'number' && Number.isFinite(v),
  boolean: (v) => typeof v === 'boolean',
  timestamp: isIsoDate,
  array: Array.isArray,
};

// Checks one record against `{ field: type }`, where a type ending in "?"
// also allows null. Returns the problems found; an empty list means valid.
export function checkShape(record, spec) {
  const problems = [];
  for (const [field, type] of Object.entries(spec)) {
    const optional = type.endsWith('?');
    const base = optional ? type.slice(0, -1) : type;
    const value = record[field];
    if (value === null && optional) continue;
    if (value === undefined) problems.push(`missing ${field}`);
    else if (!CHECKS[base](value)) problems.push(`${field} is not a ${base}`);
  }
  return problems;
}
JS

# Tests for the helpers the pipeline leans on.

cat > test/core/lru.test.js <<'JS'
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { LruCache } from '../../src/core/cache/lru.js';

test('evicts the least recently used entry', () => {
  const cache = new LruCache(2);
  cache.set('a', 1).set('b', 2);
  cache.get('a');
  cache.set('c', 3);
  assert.equal(cache.has('b'), false);
  assert.equal(cache.get('a'), 1);
  assert.equal(cache.size, 2);
});
JS

cat > test/core/ttl.test.js <<'JS'
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ttlCache } from '../../src/core/cache/ttl.js';
import { fixedClock } from '../../src/core/time/clock.js';

test('expires entries after the ttl', () => {
  const clock = fixedClock(0);
  const cache = ttlCache(1000, clock);
  cache.set('k', 'v');
  clock.advance(999);
  assert.equal(cache.get('k'), 'v');
  clock.advance(1);
  assert.equal(cache.get('k'), undefined);
});
JS

cat > test/core/memo.test.js <<'JS'
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { memoize } from '../../src/core/cache/memo.js';

test('calls the function once per key', () => {
  let calls = 0;
  const square = memoize((n) => {
    calls += 1;
    return n * n;
  });
  assert.equal(square(4), 16);
  assert.equal(square(4), 16);
  assert.equal(calls, 1);
});
JS

cat > test/core/chunk.test.js <<'JS'
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { chunk } from '../../src/core/collections/chunk.js';

test('splits into fixed-size chunks with a short tail', () => {
  assert.deepEqual(chunk([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]]);
});

test('rejects a zero size', () => {
  assert.throws(() => chunk([1], 0), RangeError);
});
JS

cat > test/core/group-by.test.js <<'JS'
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { groupBy } from '../../src/core/collections/group-by.js';

test('groups in first-seen key order', () => {
  const groups = groupBy(['b1', 'a1', 'b2'], (s) => s[0]);
  assert.deepEqual([...groups.keys()], ['b', 'a']);
  assert.deepEqual(groups.get('b'), ['b1', 'b2']);
});
JS

cat > test/core/bytes.test.js <<'JS'
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatBytes } from '../../src/core/format/bytes.js';

test('formats binary multiples', () => {
  assert.equal(formatBytes(512), '512 B');
  assert.equal(formatBytes(1536), '1.5 KB');
  assert.equal(formatBytes(5 * 1024 ** 3), '5.0 GB');
});
JS

cat > test/core/plural.test.js <<'JS'
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { plural } from '../../src/core/format/plural.js';

test('uses the singular only for one', () => {
  assert.equal(plural(1, 'host'), '1 host');
  assert.equal(plural(0, 'host'), '0 hosts');
  assert.equal(plural(2, 'entry', 'entries'), '2 entries');
});
JS

cat > test/core/timestamp.test.js <<'JS'
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatTimestamp } from '../../src/core/format/timestamp.js';

test('formats in UTC to the minute', () => {
  assert.equal(formatTimestamp('2026-10-01T09:30:42Z'), '2026-10-01 09:30 UTC');
});

test('returns an empty string for junk', () => {
  assert.equal(formatTimestamp('yesterday'), '');
});
JS

cat > test/core/fnv1a.test.js <<'JS'
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fnv1a } from '../../src/core/hash/fnv1a.js';

test('matches the published FNV-1a vectors', () => {
  assert.equal(fnv1a(''), 0x811c9dc5);
  assert.equal(fnv1a('a'), 0xe40c292c);
});
JS

cat > test/core/query-string.test.js <<'JS'
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildQuery } from '../../src/core/http/query-string.js';

test('skips null and undefined values', () => {
  assert.equal(buildQuery({ region: 'eu-west-1', page: null, q: undefined }), '?region=eu-west-1');
});

test('returns an empty string when nothing is left', () => {
  assert.equal(buildQuery({}), '');
});
JS

cat > test/core/safe-parse.test.js <<'JS'
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { safeParse } from '../../src/core/json/safe-parse.js';

test('reports bad JSON without throwing', () => {
  assert.equal(safeParse('{"a":1}').value.a, 1);
  assert.equal(safeParse('{').ok, false);
});
JS

cat > test/core/stable-stringify.test.js <<'JS'
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { stableStringify } from '../../src/core/json/stable-stringify.js';

test('ignores key order', () => {
  assert.equal(stableStringify({ b: 1, a: [{ d: 2, c: 3 }] }), stableStringify({ a: [{ c: 3, d: 2 }], b: 1 }));
});
JS

cat > test/core/stats.test.js <<'JS'
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mean, median, percentile } from '../../src/core/math/stats.js';

test('computes nearest-rank percentiles', () => {
  const values = [15, 20, 35, 40, 50];
  assert.equal(percentile(values, 30), 20);
  assert.equal(percentile(values, 100), 50);
  assert.equal(median(values), 35);
  assert.equal(mean(values), 32);
});
JS

cat > test/core/safe-join.test.js <<'JS'
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { safeJoin } from '../../src/core/paths/safe-join.js';

test('keeps paths under the root', () => {
  assert.ok(safeJoin('/srv/public', 'img/logo.svg').endsWith('/srv/public/img/logo.svg'));
});

test('refuses to climb out of the root', () => {
  assert.equal(safeJoin('/srv/public', '../../etc/passwd'), null);
});
JS

cat > test/core/retry.test.js <<'JS'
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { retry } from '../../src/core/retry/retry.js';

test('retries until the function succeeds', async () => {
  let calls = 0;
  const result = await retry(
    async () => {
      calls += 1;
      if (calls < 3) throw new Error('flaky');
      return 'ok';
    },
    { wait: async () => {} },
  );
  assert.equal(result, 'ok');
  assert.equal(calls, 3);
});

test('rethrows the last error', async () => {
  await assert.rejects(retry(async (n) => Promise.reject(new Error(`try ${n}`)), { attempts: 2, wait: async () => {} }), /try 1/);
});
JS

cat > test/core/slugify.test.js <<'JS'
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { slugify } from '../../src/core/strings/slugify.js';

test('makes url-safe slugs', () => {
  assert.equal(slugify('  Café Ops: Weekly Review! '), 'cafe-ops-weekly-review');
});
JS

cat > test/core/compare.test.js <<'JS'
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { compareVersions } from '../../src/core/semver/compare.js';

test('orders releases numerically', () => {
  assert.equal(compareVersions('1.10.0', '1.9.3'), 1);
  assert.equal(compareVersions('2.0.0', '2.0.0'), 0);
});

test('puts a pre-release before its release', () => {
  assert.equal(compareVersions('1.23.0-rc.1', '1.23.0'), -1);
  assert.equal(compareVersions('1.23.0-rc.1', '1.23.0-rc.2'), -1);
});
JS

cat > test/core/shape.test.js <<'JS'
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { checkShape } from '../../src/core/validate/shape.js';

const SPEC = { id: 'string', count: 'number', finishedAt: 'timestamp?' };

test('accepts a valid record, with null for an optional field', () => {
  assert.deepEqual(checkShape({ id: 'a', count: 2, finishedAt: null }, SPEC), []);
});

test('lists every problem', () => {
  assert.deepEqual(checkShape({ id: 3, finishedAt: 'soon' }, SPEC), ['id is not a string', 'missing count', 'finishedAt is not a timestamp']);
});
JS

cat > test/core/token-bucket.test.js <<'JS'
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { tokenBucket } from '../../src/core/rate/token-bucket.js';
import { fixedClock } from '../../src/core/time/clock.js';

test('allows a burst, then refills over time', () => {
  const clock = fixedClock(0);
  const bucket = tokenBucket({ capacity: 2, perSecond: 1, clock });
  assert.equal(bucket.take(), true);
  assert.equal(bucket.take(), true);
  assert.equal(bucket.take(), false);
  clock.advance(1000);
  assert.equal(bucket.take(), true);
});
JS

# --- Shared: facts about our estate that the pages and the pipeline agree on --
#
# src/shared/schemas/ comes from the generator.

mkdir -p src/shared test/shared

cat > src/shared/catalog.js <<'JS'
// Which team owns each service. The pipeline stamps it on incidents and
// costs; on-call uses it to page the right rotation.
export const OWNERS = {
  'api-gateway': 'platform',
  auth: 'identity',
  billing: 'payments',
  catalog: 'search',
  checkout: 'payments',
  ledger: 'payments',
  media: 'messaging',
  notifications: 'messaging',
  reports: 'data',
  scheduler: 'platform',
  search: 'search',
  webhooks: 'platform',
};

export function ownerOf(service) {
  return OWNERS[service] ?? 'platform';
}
JS

cat > src/shared/regions.js <<'JS'
// Display names for the cloud regions we run in.
export const REGION_NAMES = {
  'eu-west-1': 'Ireland',
  'eu-central-1': 'Frankfurt',
  'us-east-1': 'N. Virginia',
  'us-west-2': 'Oregon',
  'ap-southeast-1': 'Singapore',
};

export function regionName(code) {
  return REGION_NAMES[code] ?? code;
}
JS

cat > src/shared/links.js <<'JS'
const WIKI = 'https://wiki.example.com';

// Runbook ids are wiki page slugs.
export function runbookUrl(id) {
  return `${WIKI}/runbooks/${encodeURIComponent(id)}`;
}

export function serviceDocsUrl(service) {
  return `${WIKI}/services/${encodeURIComponent(service)}`;
}
JS

cat > src/shared/freshness.js <<'JS'
// The pipeline writes every snapshot each minute. Five minutes without a new
// one means a job is failing, which tools/verify and the overview report.
export const STALE_AFTER_MS = 5 * 60_000;

export function isStale(generatedAt, now, staleAfterMs = STALE_AFTER_MS) {
  const written = Date.parse(generatedAt);
  return Number.isNaN(written) || now - written > staleAfterMs;
}
JS

cat > src/shared/teams.js <<'JS'
// Slack channels per team, for the "ask in" hints on incident pages.
export const CHANNELS = {
  data: '#team-data',
  identity: '#team-identity',
  messaging: '#team-messaging',
  payments: '#team-payments',
  platform: '#team-platform',
  search: '#team-search',
};

export function channelFor(team) {
  return CHANNELS[team] ?? '#ops';
}
JS

cat > test/shared/schemas.test.js <<'JS'
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import { checkShape } from '../../src/core/validate/shape.js';
import { SCHEMAS } from '../../src/shared/schemas/index.js';

const DATA = new URL('../../data/', import.meta.url);

// Every checked-in snapshot must match the schema the pipeline validates
// against, or the dashboard is tested against data the pipeline cannot write.
for (const file of readdirSync(DATA).filter((f) => f.endsWith('.json'))) {
  const name = file.replace(/\.json$/, '');
  test(`data/${file} matches its schema`, () => {
    const schema = SCHEMAS[name];
    assert.ok(schema, `no schema for ${name}`);
    const snapshot = JSON.parse(readFileSync(new URL(file, DATA), 'utf8'));
    assert.ok(Array.isArray(snapshot[schema.key]), `${file} has no "${schema.key}" list`);
    for (const row of snapshot[schema.key]) assert.deepEqual(checkShape(row, schema.fields), []);
  });
}
JS

cat > test/shared/freshness.test.js <<'JS'
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isStale } from '../../src/shared/freshness.js';

const now = Date.parse('2026-10-01T09:30:00Z');

test('stale after five minutes, or when the time is unreadable', () => {
  assert.equal(isStale('2026-10-01T09:25:00Z', now), false);
  assert.equal(isStale('2026-10-01T09:24:59Z', now), true);
  assert.equal(isStale('yesterday', now), true);
});
JS

cat > test/shared/links.test.js <<'JS'
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ownerOf } from '../../src/shared/catalog.js';
import { runbookUrl } from '../../src/shared/links.js';

test('runbook links are wiki slugs', () => {
  assert.equal(runbookUrl('queue-backlog'), 'https://wiki.example.com/runbooks/queue-backlog');
});

test('unknown services fall back to platform', () => {
  assert.equal(ownerOf('billing'), 'payments');
  assert.equal(ownerOf('new-thing'), 'platform');
});
JS

# --- Pipeline: the jobs that write data/*.json every minute -----------------
#
# The jobs, sources, fixtures and migrations come from the generator; this
# part holds the runner, its library, the analysis helpers the jobs derive
# fields with, and the history database.

mkdir -p pipeline/lib pipeline/analysis pipeline/db pipeline/sources

cat > pipeline/run.js <<'JS'
// Runs the snapshot jobs once: `node pipeline/run.js [snapshot ...]`. Cron
// starts it every minute; a run that overlaps the previous one exits at once.
import { join } from 'node:path';
import { loadConfig } from '../src/core/config/load.js';
import { createLogger } from '../src/core/log/logger.js';
import { systemClock } from '../src/core/time/clock.js';
import { JOBS } from './jobs/index.js';
import { withLock } from './lib/lock.js';
import { runJob } from './lib/run-job.js';
import { createSources } from './sources/index.js';

const config = loadConfig();
const log = createLogger({ level: config.logLevel, base: { app: 'harbor-pipeline' } });
const wanted = process.argv.slice(2);
const jobs = Object.values(JOBS).filter((job) => wanted.length === 0 || wanted.includes(job.snapshot));

const outcome = await withLock(join(config.dataDir, '.pipeline.lock'), async () => {
  const sources = createSources();
  let failed = 0;
  // Sequential on purpose: several jobs share an upstream, and the rate
  // limits are per client.
  for (const job of jobs) {
    const result = await runJob(job, { sources, clock: systemClock, dataDir: config.dataDir, log });
    if (!result.ok) failed += 1;
  }
  return { failed };
});

if (outcome.skipped) log.warn('previous run still holding the lock; skipping');
else process.exitCode = outcome.value.failed > 0 ? 1 : 0;
JS

cat > pipeline/lib/http.js <<'JS'
import { HttpError } from '../../src/core/errors/http-error.js';
import { retry } from '../../src/core/retry/retry.js';

// GETs JSON with a timeout and a few retries. Upstream APIs flake often
// enough that one failed request should not cost a snapshot its minute.
export function createHttpClient({ fetch = globalThis.fetch, timeoutMs = 10_000, attempts = 3, wait } = {}) {
  return {
    getJson: (url) =>
      retry(
        async () => {
          const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs), headers: { accept: 'application/json' } });
          if (!res.ok) throw new HttpError(res.status, `GET ${url}: ${res.status}`);
          return res.json();
        },
        { attempts, wait },
      ),
  };
}
JS

cat > pipeline/lib/validate.js <<'JS'
import { SnapshotError } from '../../src/core/errors/snapshot-error.js';
import { checkShape } from '../../src/core/validate/shape.js';

// Throws before anything is written, so a bad upstream response leaves the
// previous snapshot in place.
export function validateRows(name, rows, fields) {
  if (!Array.isArray(rows)) throw new SnapshotError(name, ['rows is not a list']);
  const problems = rows.flatMap((row, i) => checkShape(row, fields).map((p) => `row ${i}: ${p}`));
  if (problems.length > 0) throw new SnapshotError(name, problems);
}
JS

cat > pipeline/lib/format-snapshot.js <<'JS'
// One row per line, so a snapshot diff shows which rows changed.
export function formatSnapshot({ generatedAt, key, rows, extra = {} }) {
  const row = (r) =>
    `    ${JSON.stringify(r).replace(/":/g, '": ').replace(/,"/g, ', "').replace(/^\{/, '{ ').replace(/\}$/, ' }')}`;
  const more = Object.entries(extra)
    .map(([k, v]) => `  "${k}": ${JSON.stringify(v)},\n`)
    .join('');
  return `{\n  "generatedAt": "${generatedAt}",\n${more}  "${key}": [\n${rows.map(row).join(',\n')}\n  ]\n}\n`;
}

export function snapshotTime(ms) {
  return new Date(ms).toISOString().replace(/\.\d{3}Z$/, 'Z');
}
JS

cat > pipeline/lib/write-snapshot.js <<'JS'
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

// Written in place, not renamed over: the data directory is a mounted volume
// where rename is not atomic anyway, and the dashboard answers a torn read
// with a 503 that the next refresh clears.
export async function writeSnapshot(dir, name, text) {
  await writeFile(join(dir, `${name}.json`), text);
}
JS

cat > pipeline/lib/lock.js <<'JS'
import { open, unlink } from 'node:fs/promises';

// Runs `fn` while holding a lock file. Returns { skipped: true } without
// running it when another run holds the lock.
export async function withLock(path, fn) {
  let handle;
  try {
    handle = await open(path, 'wx');
  } catch (error) {
    if (error.code === 'EEXIST') return { skipped: true };
    throw error;
  }
  try {
    return { skipped: false, value: await fn() };
  } finally {
    await handle.close();
    await unlink(path);
  }
}
JS

cat > pipeline/lib/schedule.js <<'JS'
const UNITS = { s: 1000, m: 60_000, h: 3_600_000 };

// "30s", "1m", "6h" to milliseconds.
export function parseInterval(text) {
  const match = /^(\d+)([smh])$/.exec(text);
  if (!match) throw new Error(`bad interval: ${text}`);
  return Number(match[1]) * UNITS[match[2]];
}

// Jobs run every minute unless they export `every`; slow upstreams such as
// the billing export only change a few times a day.
export function isDue(job, lastRunMs, now) {
  if (lastRunMs === undefined) return true;
  return now - lastRunMs >= parseInterval(job.every ?? '1m');
}
JS

cat > pipeline/lib/run-job.js <<'JS'
import { SCHEMAS } from '../../src/shared/schemas/index.js';
import { formatSnapshot, snapshotTime } from './format-snapshot.js';
import { validateRows } from './validate.js';
import { writeSnapshot } from './write-snapshot.js';

// Collects, validates and writes one snapshot. Never throws: a failed job is
// logged and reported, and the other jobs still run.
export async function runJob(job, { sources, clock, dataDir, log, write = writeSnapshot }) {
  const started = clock.now();
  const { key, fields } = SCHEMAS[job.snapshot];
  try {
    const rows = await job.collect(sources, { now: started });
    validateRows(job.snapshot, rows, fields);
    const extra = job.extras ? await job.extras(sources) : {};
    await write(dataDir, job.snapshot, formatSnapshot({ generatedAt: snapshotTime(started), key, rows, extra }));
    log.info('snapshot written', { snapshot: job.snapshot, rows: rows.length, ms: clock.now() - started });
    return { ok: true, rows: rows.length };
  } catch (error) {
    log.error('snapshot failed', { snapshot: job.snapshot, error: error.message, problems: error.problems });
    return { ok: false, error };
  }
}
JS

cat > pipeline/lib/http.test.js <<'JS'
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createHttpClient } from './http.js';

const response = (status, body) => ({ ok: status < 400, status, json: async () => body });

test('retries a failed request, then returns the body', async () => {
  const replies = [response(503), response(200, [{ name: 'billing' }])];
  const http = createHttpClient({ fetch: async () => replies.shift(), wait: async () => {} });
  assert.deepEqual(await http.getJson('https://upstream.test/x'), [{ name: 'billing' }]);
});

test('gives up after the last attempt with the status', async () => {
  const http = createHttpClient({ fetch: async () => response(500), attempts: 2, wait: async () => {} });
  await assert.rejects(http.getJson('https://upstream.test/x'), { name: 'HttpError', status: 500 });
});
JS

cat > pipeline/lib/validate.test.js <<'JS'
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { validateRows } from './validate.js';

const fields = { name: 'string', count: 'number', seenAt: 'timestamp?' };

test('accepts rows that match the fields', () => {
  validateRows('queues', [{ name: 'mail', count: 3, seenAt: null }], fields);
});

test('reports every problem with its row', () => {
  assert.throws(() => validateRows('queues', [{ name: 'mail', count: 3, seenAt: null }, { name: 7 }], fields), {
    name: 'SnapshotError',
    problems: ['row 1: name is not a string', 'row 1: missing count', 'row 1: missing seenAt'],
  });
});
JS

cat > pipeline/lib/format-snapshot.test.js <<'JS'
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatSnapshot, snapshotTime } from './format-snapshot.js';

test('writes one row per line with extras before the rows', () => {
  const text = formatSnapshot({
    generatedAt: '2026-10-01T09:30:00Z',
    key: 'rotations',
    rows: [{ team: 'platform', primary: 'dana' }],
    extra: { escalation: ['Page the primary.'] },
  });
  assert.equal(
    text,
    '{\n  "generatedAt": "2026-10-01T09:30:00Z",\n  "escalation": ["Page the primary."],\n  "rotations": [\n    { "team": "platform", "primary": "dana" }\n  ]\n}\n',
  );
});

test('drops milliseconds from the snapshot time', () => {
  assert.equal(snapshotTime(Date.parse('2026-10-01T09:30:00.250Z')), '2026-10-01T09:30:00Z');
});
JS

cat > pipeline/lib/lock.test.js <<'JS'
import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { withLock } from './lock.js';

test('a second run skips while the first holds the lock', async () => {
  const path = join(await mkdtemp(join(tmpdir(), 'harbor-lock-')), 'run.lock');
  const outer = await withLock(path, async () => withLock(path, async () => 'inner ran'));
  assert.deepEqual(outer, { skipped: false, value: { skipped: true } });
  assert.deepEqual(await withLock(path, async () => 'again'), { skipped: false, value: 'again' });
});
JS

cat > pipeline/lib/schedule.test.js <<'JS'
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isDue, parseInterval } from './schedule.js';

test('parses intervals', () => {
  assert.equal(parseInterval('30s'), 30_000);
  assert.equal(parseInterval('6h'), 21_600_000);
  assert.throws(() => parseInterval('1d'), /bad interval/);
});

test('a job is due once its interval has passed', () => {
  assert.equal(isDue({}, undefined, 0), true);
  assert.equal(isDue({}, 0, 59_999), false);
  assert.equal(isDue({ every: '6h' }, 0, 21_600_000), true);
});
JS

cat > pipeline/lib/run-job.test.js <<'JS'
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fixedClock } from '../../src/core/time/clock.js';
import { runJob } from './run-job.js';

const quiet = { info() {}, error() {} };
const clock = fixedClock(Date.parse('2026-10-01T09:30:00Z'));

test('writes a valid snapshot', async () => {
  const written = [];
  const job = { snapshot: 'runbooks', collect: async () => [{ id: 'reindex', title: 'Search reindex', summary: 'Rebuild it.', url: 'https://wiki.example.com/runbooks/reindex' }] };
  const result = await runJob(job, { sources: {}, clock, dataDir: '/data', log: quiet, write: async (...args) => written.push(args) });
  assert.deepEqual(result, { ok: true, rows: 1 });
  assert.equal(written[0][1], 'runbooks');
  assert.match(written[0][2], /"generatedAt": "2026-10-01T09:30:00Z"/);
});

test('keeps the old snapshot when the rows are invalid', async () => {
  const written = [];
  const job = { snapshot: 'runbooks', collect: async () => [{ id: 'reindex' }] };
  const result = await runJob(job, { sources: {}, clock, dataDir: '/data', log: quiet, write: async (...args) => written.push(args) });
  assert.equal(result.ok, false);
  assert.equal(written.length, 0);
});
JS

# Analysis: the fields a job derives instead of copying.

cat > pipeline/analysis/expiry.js <<'JS'
const DAY_MS = 86_400_000;

// Certificates within 30 days of expiry need renewing this sprint.
export function certStatus(expiresAt, now) {
  const left = Date.parse(expiresAt) - now;
  if (left < 0) return 'expired';
  return left < 30 * DAY_MS ? 'expiring' : 'valid';
}
JS

cat > pipeline/analysis/budget.js <<'JS'
// Error budget left, in percent of the month's budget. Below a quarter the
// owning team stops risky deploys.
export function sloStatus(budgetLeft) {
  if (budgetLeft < 0) return 'breached';
  return budgetLeft < 25 ? 'at-risk' : 'met';
}
JS

cat > pipeline/analysis/capacity.js <<'JS'
// Above 80% we file a quota request; above 95% autoscaling starts failing.
export function capacityStatus(used, total) {
  if (used > total * 0.95) return 'full';
  return used > total * 0.8 ? 'tight' : 'ok';
}
JS

cat > pipeline/analysis/spend.js <<'JS'
// The billing export reports cents; the costs page shows whole dollars.
export function dollars(cents) {
  return `$${Math.round(cents / 100)}`;
}

export function spendStatus(spentCents, budgetCents) {
  if (spentCents > budgetCents) return 'over';
  return spentCents > budgetCents * 0.9 ? 'near' : 'under';
}
JS

cat > pipeline/analysis/health.js <<'JS'
// Any failing check degrades a service; all of them failing means it is down.
export function healthFromChecks(passed, total) {
  if (passed === total) return 'passing';
  return passed === 0 ? 'failing' : 'degraded';
}
JS

cat > pipeline/analysis/severity.js <<'JS'
// PagerDuty priorities to our severities. P4 and P5 page nobody, so they
// count as sev3 here.
export function severityFromPriority(priority) {
  const level = Number(/^P(\d)$/.exec(priority)?.[1]);
  if (!level) throw new Error(`unknown priority: ${priority}`);
  return `sev${Math.min(level, 3)}`;
}
JS

cat > pipeline/analysis/staffing.js <<'JS'
// A rotation needs four people for nobody to be on call more than one week
// in four.
export function staffingFor(rotationSize) {
  return rotationSize >= 4 ? 'staffed' : 'short';
}
JS

cat > pipeline/analysis/risk.js <<'JS'
// Change requests carry a "risk:<level>" label. Unlabeled ones are reviewed
// as medium until someone labels them.
export function riskFromLabels(labels) {
  const label = labels.find((l) => l.startsWith('risk:'));
  return label ? label.slice('risk:'.length) : 'medium';
}
JS

cat > pipeline/analysis/backup-status.js <<'JS'
const STATES = { COMPLETED: 'ok', FAILED: 'failed', RUNNING: 'running', PENDING: 'running' };

// Anything the fleet API adds later shows as failed until we map it.
export function backupStatus(state) {
  return STATES[state] ?? 'failed';
}
JS

cat > pipeline/analysis/host-status.js <<'JS'
const STATES = { running: 'up', stopping: 'draining', stopped: 'down', terminated: 'down' };

export function hostStatus(state) {
  return STATES[state] ?? 'down';
}
JS

cat > pipeline/analysis/expiry.test.js <<'JS'
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { certStatus } from './expiry.js';

const now = Date.parse('2026-10-01T00:00:00Z');

test('expired, expiring within 30 days, then valid', () => {
  assert.equal(certStatus('2026-09-30T23:59:00Z', now), 'expired');
  assert.equal(certStatus('2026-10-30T23:59:00Z', now), 'expiring');
  assert.equal(certStatus('2026-10-31T00:00:00Z', now), 'valid');
});
JS

cat > pipeline/analysis/budget.test.js <<'JS'
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { sloStatus } from './budget.js';

test('breached below zero, at risk below a quarter', () => {
  assert.equal(sloStatus(-1), 'breached');
  assert.equal(sloStatus(0), 'at-risk');
  assert.equal(sloStatus(24), 'at-risk');
  assert.equal(sloStatus(25), 'met');
});
JS

cat > pipeline/analysis/capacity.test.js <<'JS'
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { capacityStatus } from './capacity.js';

test('ok up to 80%, tight up to 95%, then full', () => {
  assert.equal(capacityStatus(80, 100), 'ok');
  assert.equal(capacityStatus(81, 100), 'tight');
  assert.equal(capacityStatus(95, 100), 'tight');
  assert.equal(capacityStatus(96, 100), 'full');
});
JS

cat > pipeline/analysis/spend.test.js <<'JS'
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { dollars, spendStatus } from './spend.js';

test('rounds cents to whole dollars', () => {
  assert.equal(dollars(420_049), '$4200');
  assert.equal(dollars(420_050), '$4201');
});

test('near above 90% of the budget, over above it', () => {
  assert.equal(spendStatus(90_000, 100_000), 'under');
  assert.equal(spendStatus(90_001, 100_000), 'near');
  assert.equal(spendStatus(100_001, 100_000), 'over');
});
JS

cat > pipeline/analysis/health.test.js <<'JS'
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { healthFromChecks } from './health.js';

test('passing, degraded, failing', () => {
  assert.equal(healthFromChecks(3, 3), 'passing');
  assert.equal(healthFromChecks(1, 3), 'degraded');
  assert.equal(healthFromChecks(0, 3), 'failing');
});
JS

cat > pipeline/analysis/severity.test.js <<'JS'
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { severityFromPriority } from './severity.js';

test('maps priorities, folding P4 and P5 into sev3', () => {
  assert.equal(severityFromPriority('P1'), 'sev1');
  assert.equal(severityFromPriority('P5'), 'sev3');
  assert.throws(() => severityFromPriority('high'), /unknown priority/);
});
JS

cat > pipeline/analysis/staffing.test.js <<'JS'
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { staffingFor } from './staffing.js';

test('four people staff a rotation', () => {
  assert.equal(staffingFor(3), 'short');
  assert.equal(staffingFor(4), 'staffed');
});
JS

cat > pipeline/analysis/risk.test.js <<'JS'
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { riskFromLabels } from './risk.js';

test('reads the risk label, defaulting to medium', () => {
  assert.equal(riskFromLabels(['change', 'risk:high']), 'high');
  assert.equal(riskFromLabels(['change']), 'medium');
});
JS

cat > pipeline/analysis/backup-status.test.js <<'JS'
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { backupStatus } from './backup-status.js';

test('maps fleet states, unknown ones to failed', () => {
  assert.equal(backupStatus('COMPLETED'), 'ok');
  assert.equal(backupStatus('PENDING'), 'running');
  assert.equal(backupStatus('EXPIRED'), 'failed');
});
JS

cat > pipeline/analysis/host-status.test.js <<'JS'
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { hostStatus } from './host-status.js';

test('maps instance states', () => {
  assert.equal(hostStatus('running'), 'up');
  assert.equal(hostStatus('stopping'), 'draining');
  assert.equal(hostStatus('pending'), 'down');
});
JS

# History database: optional, enabled with HARBOR_HISTORY_DB.

cat > pipeline/db/client.js <<'JS'
// node:sqlite needs Node 22.5 or later, so it is imported only when the
// history database is configured; the dashboard and the jobs never load it.
export async function openDatabase(path) {
  const { DatabaseSync } = await import('node:sqlite');
  return new DatabaseSync(path);
}
JS

cat > pipeline/db/migrate.js <<'JS'
import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const MIGRATIONS = fileURLToPath(new URL('./migrations/', import.meta.url));

export async function migrationFiles(dir = MIGRATIONS) {
  return (await readdir(dir)).filter((f) => f.endsWith('.sql')).sort();
}

function inTransaction(db, fn) {
  db.exec('BEGIN');
  try {
    fn();
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

const ensureTable = (db) => db.exec('CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY)');

// Applies the migrations not yet recorded, in file order, each in its own
// transaction.
export async function migrate(db, dir = MIGRATIONS) {
  ensureTable(db);
  const done = new Set(db.prepare('SELECT name FROM schema_migrations').all().map((r) => r.name));
  const applied = [];
  for (const name of await migrationFiles(dir)) {
    if (done.has(name)) continue;
    const sql = await readFile(`${dir}${name}`, 'utf8');
    inTransaction(db, () => {
      db.exec(sql);
      db.prepare('INSERT INTO schema_migrations (name) VALUES (?)').run(name);
    });
    applied.push(name);
  }
  return applied;
}

// Undoes the latest applied migration with its twin in down/, for a release
// that has to be rolled back. Returns its name, or null when none is applied.
export async function rollback(db, dir = MIGRATIONS) {
  ensureTable(db);
  const last = db.prepare('SELECT name FROM schema_migrations ORDER BY name DESC LIMIT 1').get();
  if (!last) return null;
  const sql = await readFile(`${dir}down/${last.name}`, 'utf8');
  inTransaction(db, () => {
    db.exec(sql);
    db.prepare('DELETE FROM schema_migrations WHERE name = ?').run(last.name);
  });
  return last.name;
}
JS

cat > pipeline/db/history.js <<'JS'
// Quoted, because some fields (group, primary) are SQL keywords.
const column = (field) => `"${field.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`)}"`;

export function startRun(db, startedAt) {
  return db.prepare('INSERT INTO runs (started_at) VALUES (?)').run(startedAt).lastInsertRowid;
}

export function finishRun(db, runId, { finishedAt, jobs, failed }) {
  db.prepare('UPDATE runs SET finished_at = ?, jobs = ?, failed = ? WHERE id = ?').run(finishedAt, jobs, failed, runId);
}

// One history row per snapshot row. Booleans are stored as 0 and 1.
export function appendHistory(db, snapshot, runId, rows, fields) {
  const names = Object.keys(fields);
  const sql = `INSERT INTO ${snapshot}_history (run_id, ${names.map(column).join(', ')}) VALUES (?${', ?'.repeat(names.length)})`;
  const insert = db.prepare(sql);
  for (const row of rows) {
    insert.run(runId, ...names.map((n) => (typeof row[n] === 'boolean' ? Number(row[n]) : row[n])));
  }
}
JS

cat > pipeline/db/migrations.test.js <<'JS'
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { openDatabase } from './client.js';
import { migrate, migrationFiles, rollback } from './migrate.js';

const DOWN = fileURLToPath(new URL('./migrations/down/', import.meta.url));

test('migrations are numbered in sequence with unique names', async () => {
  const files = await migrationFiles();
  files.forEach((file, i) => {
    assert.match(file, /^\d{4}_[a-z_]+\.sql$/);
    assert.equal(Number(file.slice(0, 4)), i + 1, `${file} is out of sequence`);
  });
  assert.equal(new Set(files.map((f) => f.slice(5))).size, files.length);
});

test('every migration has a down migration', async () => {
  assert.deepEqual(await migrationFiles(DOWN), await migrationFiles());
});

test('migrates up and all the way back down', async () => {
  const db = await openDatabase(':memory:');
  const applied = await migrate(db);
  for (const name of applied.reverse()) assert.equal(await rollback(db), name);
  assert.equal(await rollback(db), null);
  assert.deepEqual(db.prepare("SELECT name FROM sqlite_master WHERE tbl_name != 'schema_migrations'").all(), []);
});
JS

# Replay: the checked-in snapshots against the responses they were built from.

cat > pipeline/replay.test.js <<'JS'
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { SCHEMAS } from '../src/shared/schemas/index.js';
import { JOBS } from './jobs/index.js';

const read = (path) => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
const kebab = (s) => s.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
const now = Date.parse('2026-10-01T09:30:00Z');

// Every client method answers with what its upstream sent during the run that
// wrote data/: sources/recordings/<source>/<method>.json, named like the URLs.
const sources = new Proxy({}, {
  get: (_, source) => new Proxy({}, {
    get: (_, method) => async () => read(`./sources/recordings/${kebab(source)}/${kebab(method)}.json`),
  }),
});

// A job change that would rewrite a checked-in snapshot fails here first.
for (const [name, job] of Object.entries(JOBS)) {
  test(`${job.snapshot}: the recorded responses replay to data/${job.snapshot}.json`, async () => {
    const { generatedAt, ...stored } = read(`../data/${job.snapshot}.json`);
    const extras = job.extras ? await job.extras(sources) : {};
    assert.deepEqual({ [SCHEMAS[name].key]: await job.collect(sources, { now }), ...extras }, stored);
  });
}
JS

cat > pipeline/sources/contracts.test.js <<'JS'
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import { checkShape } from '../../src/core/validate/shape.js';

const read = (path) => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
const files = readdirSync(new URL('./contracts/', import.meta.url), { recursive: true }).filter((f) => f.endsWith('.json'));

// A contract lists the fields a job reads from one upstream collection. A
// recording that stops matching means the upstream changed shape, and the job
// has to follow before the next real run fails validation.
for (const file of files.sort()) {
  test(`${file.replace(/\.json$/, '')}: the recording matches its contract`, () => {
    const contract = read(`./contracts/${file}`);
    read(`./recordings/${file}`).forEach((record, i) => assert.deepEqual(checkShape(record, contract), [], `record ${i}`));
  });
}
JS

cat > pipeline/db/history.test.js <<'JS'
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { SCHEMAS } from '../../src/shared/schemas/index.js';
import { openDatabase } from './client.js';
import { appendHistory, finishRun, startRun } from './history.js';
import { migrate } from './migrate.js';

test('stores one run of every checked-in snapshot', async () => {
  const db = await openDatabase(':memory:');
  await migrate(db);
  const runId = startRun(db, '2026-10-01T09:30:00Z');
  for (const [name, { key, fields }] of Object.entries(SCHEMAS)) {
    const rows = JSON.parse(readFileSync(new URL(`../../data/${name}.json`, import.meta.url), 'utf8'))[key];
    appendHistory(db, name, runId, rows, fields);
    assert.equal(db.prepare(`SELECT count(*) AS n FROM ${name}_history WHERE run_id = ?`).get(runId).n, rows.length, name);
  }
  finishRun(db, runId, { finishedAt: '2026-10-01T09:30:04Z', jobs: Object.keys(SCHEMAS).length, failed: 0 });
  assert.equal(db.prepare('SELECT jobs FROM runs WHERE id = ?').get(runId).jobs, Object.keys(SCHEMAS).length);
});
JS

# --- Tools: maintenance commands, run as `node tools/harbor.js <command>` ---

mkdir -p tools/lib tools/verify/rules tools/scaffold/templates tools/release

cat > tools/harbor.js <<'JS'
// Maintenance commands for Harbor:
//
//   node tools/harbor.js verify [--data=dir] [--now=iso]
//   node tools/harbor.js scaffold job <snapshot> --source=<client>.<method>
//   node tools/harbor.js scaffold migration <slug>
//   node tools/harbor.js release <major|minor|patch> [--dry-run]
import { parseArgs } from './lib/args.js';
import { createToolLog } from './lib/log.js';

const COMMANDS = {
  verify: () => import('./verify/index.js'),
  scaffold: () => import('./scaffold/index.js'),
  release: () => import('./release/index.js'),
};

const [name, ...rest] = process.argv.slice(2);
const log = createToolLog();
if (!COMMANDS[name]) {
  log.fail(`usage: node tools/harbor.js <${Object.keys(COMMANDS).join('|')}> [args]`);
  process.exitCode = 2;
} else {
  const { run } = await COMMANDS[name]();
  process.exitCode = await run(parseArgs(rest), { log });
}
JS

cat > tools/lib/args.js <<'JS'
// `--key=value` and bare `--flag` options; everything else is positional.
export function parseArgs(argv) {
  const out = { _: [], flags: {} };
  for (const arg of argv) {
    const match = /^--([a-z][a-z-]*)(?:=(.*))?$/.exec(arg);
    if (match) out.flags[match[1]] = match[2] ?? true;
    else out._.push(arg);
  }
  return out;
}
JS

cat > tools/lib/fs.js <<'JS'
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = fileURLToPath(new URL('../../', import.meta.url));

export async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

export async function listFiles(dir, extension) {
  return (await readdir(dir)).filter((f) => f.endsWith(extension)).sort().map((f) => join(dir, f));
}
JS

cat > tools/lib/git.js <<'JS'
import { execFileSync } from 'node:child_process';
import { ROOT } from './fs.js';

export function git(...args) {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim();
}

export function lastTag() {
  try {
    return git('describe', '--tags', '--abbrev=0');
  } catch {
    return null;
  }
}

// Commit subjects since `tag`, oldest first; every commit when there is none.
export function subjectsSince(tag) {
  const range = tag ? [`${tag}..HEAD`] : [];
  const out = git('log', '--reverse', '--format=%s', ...range);
  return out ? out.split('\n') : [];
}
JS

cat > tools/lib/log.js <<'JS'
// Plain prefixes instead of colors: these commands mostly run in CI logs.
export function createToolLog({ out = console.log, err = console.error } = {}) {
  return {
    ok: (msg) => out(`ok    ${msg}`),
    info: (msg) => out(`      ${msg}`),
    warn: (msg) => err(`warn  ${msg}`),
    fail: (msg) => err(`FAIL  ${msg}`),
  };
}
JS

cat > tools/lib/args.test.js <<'JS'
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseArgs } from './args.js';

test('splits flags from positional arguments', () => {
  assert.deepEqual(parseArgs(['job', 'queues', '--source=rabbitmq.queues', '--dry-run']), {
    _: ['job', 'queues'],
    flags: { source: 'rabbitmq.queues', 'dry-run': true },
  });
});
JS

# verify: checks a data directory the way the on-call bot does before it
# trusts the dashboard.

cat > tools/verify/index.js <<'JS'
import { basename, join } from 'node:path';
import { stat } from 'node:fs/promises';
import { listFiles, readJson, ROOT } from '../lib/fs.js';
import { duplicates } from './rules/duplicates.js';
import { freshness } from './rules/freshness.js';
import { nulls } from './rules/nulls.js';
import { schema } from './rules/schema.js';
import { size } from './rules/size.js';
import { timestamps } from './rules/timestamps.js';

// Each rule takes one snapshot and returns its problems as strings.
export const RULES = [schema, timestamps, freshness, duplicates, nulls, size];

export async function verifyDir(dir, { now }) {
  const report = [];
  for (const path of await listFiles(dir, '.json')) {
    const name = basename(path, '.json');
    const snapshot = await readJson(path);
    const ctx = { name, now, bytes: (await stat(path)).size };
    const problems = RULES.flatMap((rule) => rule(snapshot, ctx));
    report.push({ name, problems });
  }
  return report;
}

export async function run({ flags }, { log }) {
  const dir = flags.data ?? join(ROOT, 'data');
  const now = flags.now ? Date.parse(flags.now) : Date.now();
  const report = await verifyDir(dir, { now });
  for (const { name, problems } of report) {
    if (problems.length === 0) log.ok(name);
    for (const p of problems) log.fail(`${name}: ${p}`);
  }
  return report.some((r) => r.problems.length > 0) ? 1 : 0;
}
JS

cat > tools/verify/rules/schema.js <<'JS'
import { checkShape } from '../../../src/core/validate/shape.js';
import { SCHEMAS } from '../../../src/shared/schemas/index.js';

export function schema(snapshot, { name }) {
  const spec = SCHEMAS[name];
  if (!spec) return [`no schema for ${name}`];
  const rows = snapshot[spec.key];
  if (!Array.isArray(rows)) return [`no "${spec.key}" list`];
  return rows.flatMap((row, i) => checkShape(row, spec.fields).map((p) => `row ${i}: ${p}`));
}
JS

cat > tools/verify/rules/timestamps.js <<'JS'
import { isIsoDate } from '../../../src/core/validate/is-iso-date.js';

export function timestamps(snapshot) {
  return isIsoDate(snapshot.generatedAt) ? [] : ['generatedAt is missing or not an ISO timestamp'];
}
JS

cat > tools/verify/rules/freshness.js <<'JS'
import { isStale, STALE_AFTER_MS } from '../../../src/shared/freshness.js';

export function freshness(snapshot, { now }) {
  if (!isStale(snapshot.generatedAt, now)) return [];
  return [`older than ${STALE_AFTER_MS / 60_000} minutes: is its job failing?`];
}
JS

cat > tools/verify/rules/duplicates.js <<'JS'
import { SCHEMAS } from '../../../src/shared/schemas/index.js';

// Only snapshots with an `id` field have a natural key; services, say, repeat
// a name once per environment on purpose.
export function duplicates(snapshot, { name }) {
  const spec = SCHEMAS[name];
  if (!spec || !('id' in spec.fields)) return [];
  const seen = new Set();
  const problems = [];
  for (const row of snapshot[spec.key] ?? []) {
    if (seen.has(row.id)) problems.push(`duplicate id ${row.id}`);
    seen.add(row.id);
  }
  return problems;
}
JS

cat > tools/verify/rules/nulls.js <<'JS'
import { SCHEMAS } from '../../../src/shared/schemas/index.js';

// A field that is null in every row usually means the upstream renamed it.
export function nulls(snapshot, { name }) {
  const spec = SCHEMAS[name];
  const rows = spec ? snapshot[spec.key] ?? [] : [];
  if (rows.length < 2) return [];
  return Object.keys(spec.fields)
    .filter((field) => rows.every((row) => row[field] === null))
    .map((field) => `${field} is null in every row`);
}
JS

cat > tools/verify/rules/size.js <<'JS'
import { formatBytes } from '../../../src/core/format/bytes.js';

const LIMIT = 1024 * 1024;

// The dashboard parses every snapshot on every request.
export function size(snapshot, { bytes }) {
  return bytes > LIMIT ? [`${formatBytes(bytes)} is over the ${formatBytes(LIMIT)} limit`] : [];
}
JS

cat > tools/verify/rules/duplicates.test.js <<'JS'
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { duplicates } from './duplicates.js';

test('flags repeated ids', () => {
  const snapshot = { incidents: [{ id: 'inc-1' }, { id: 'inc-2' }, { id: 'inc-1' }] };
  assert.deepEqual(duplicates(snapshot, { name: 'incidents' }), ['duplicate id inc-1']);
});

test('ignores snapshots without an id field', () => {
  const snapshot = { services: [{ name: 'billing' }, { name: 'billing' }] };
  assert.deepEqual(duplicates(snapshot, { name: 'services' }), []);
});
JS

cat > tools/verify/rules/nulls.test.js <<'JS'
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { nulls } from './nulls.js';

test('flags a field that is null everywhere', () => {
  const row = { id: 'inc-1', title: 't', service: 's', severity: 'sev1', openedAt: '2026-10-01T00:00:00Z', resolvedAt: null, runbook: 'r' };
  const snapshot = { incidents: [row, { ...row, id: 'inc-2' }] };
  assert.deepEqual(nulls(snapshot, { name: 'incidents' }), ['resolvedAt is null in every row']);
});
JS

cat > tools/verify/rules/schema.test.js <<'JS'
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { schema } from './schema.js';

test('reports rows that do not match the schema', () => {
  const snapshot = { runbooks: [{ id: 'reindex', title: 'Search reindex', summary: 's', url: 7 }] };
  assert.deepEqual(schema(snapshot, { name: 'runbooks' }), ['row 0: url is not a string']);
});

test('reports a snapshot nobody declared', () => {
  assert.deepEqual(schema({}, { name: 'mystery' }), ['no schema for mystery']);
});
JS

# scaffold: new jobs and migrations start from these templates.

cat > tools/scaffold/index.js <<'JS'
import { scaffoldJob } from './job.js';
import { scaffoldMigration } from './migration.js';

export async function run({ _: [kind, name], flags }, { log }) {
  if (kind === 'job' && name && typeof flags.source === 'string') {
    for (const path of await scaffoldJob(name, flags.source)) log.ok(`wrote ${path}`);
    return 0;
  }
  if (kind === 'migration' && name) {
    log.ok(`wrote ${await scaffoldMigration(name)}`);
    return 0;
  }
  log.fail('usage: scaffold job <snapshot> --source=<client>.<method> | scaffold migration <slug>');
  return 2;
}
JS

cat > tools/scaffold/render.js <<'JS'
import { readFile } from 'node:fs/promises';

// Replaces {{name}} placeholders; an unknown placeholder is an error rather
// than an empty string in generated code.
export async function renderTemplate(path, values) {
  const text = await readFile(path, 'utf8');
  return text.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    if (!(key in values)) throw new Error(`${path}: no value for {{${key}}}`);
    return values[key];
  });
}
JS

cat > tools/scaffold/job.js <<'JS'
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ROOT } from '../lib/fs.js';
import { renderTemplate } from './render.js';

const TEMPLATES = new URL('./templates/', import.meta.url);
const camel = (s) => s.replace(/-(\w)/g, (_, c) => c.toUpperCase());

// Writes the job, its test and an empty fixture. Register the job in
// pipeline/jobs/index.js and add its schema by hand.
export async function scaffoldJob(snapshot, source) {
  const [client, method] = source.split('.');
  const values = { snapshot, client: camel(client), method };
  const files = [
    [`pipeline/jobs/${snapshot}.js`, 'job.js.tpl'],
    [`pipeline/jobs/${snapshot}.test.js`, 'job.test.js.tpl'],
  ];
  const written = [];
  for (const [target, template] of files) {
    await writeFile(join(ROOT, target), await renderTemplate(new URL(template, TEMPLATES), values), { flag: 'wx' });
    written.push(target);
  }
  const fixture = `pipeline/jobs/fixtures/${snapshot}.json`;
  await writeFile(join(ROOT, fixture), '[]\n', { flag: 'wx' });
  return [...written, fixture];
}
JS

cat > tools/scaffold/migration.js <<'JS'
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { migrationFiles } from '../../pipeline/db/migrate.js';
import { ROOT } from '../lib/fs.js';
import { renderTemplate } from './render.js';

export async function scaffoldMigration(slug) {
  const files = await migrationFiles();
  const next = String(files.length + 1).padStart(4, '0');
  const target = `pipeline/db/migrations/${next}_${slug.replace(/-/g, '_')}.sql`;
  const sql = await renderTemplate(new URL('./templates/migration.sql.tpl', import.meta.url), { slug });
  await writeFile(join(ROOT, target), sql, { flag: 'wx' });
  return target;
}
JS

cat > tools/scaffold/templates/job.js.tpl <<'TPL'
// Builds data/{{snapshot}}.json.
export const snapshot = '{{snapshot}}';

export async function collect(sources) {
  const records = await sources.{{client}}.{{method}}();
  return records.map((r) => ({
    // Map each source field to its camelCase snapshot field here.
  }));
}
TPL

cat > tools/scaffold/templates/job.test.js.tpl <<'TPL'
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { collect } from './{{snapshot}}.js';

const fixture = (file) => JSON.parse(readFileSync(new URL(`./fixtures/${file}`, import.meta.url), 'utf8'));
const sources = { {{client}}: { {{method}}: async () => fixture('{{snapshot}}.json') } };

test('{{snapshot}}: maps source records to snapshot rows', async () => {
  assert.deepEqual(await collect(sources), fixture('{{snapshot}}.expected.json'));
});
TPL

cat > tools/scaffold/templates/migration.sql.tpl <<'TPL'
-- {{slug}}: say what this changes and why.
TPL

cat > tools/scaffold/render.test.js <<'JS'
import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { renderTemplate } from './render.js';

test('fills placeholders and refuses unknown ones', async () => {
  const path = join(await mkdtemp(join(tmpdir(), 'harbor-tpl-')), 't.tpl');
  await writeFile(path, 'job {{snapshot}} reads {{client}}');
  assert.equal(await renderTemplate(path, { snapshot: 'queues', client: 'rabbitmq' }), 'job queues reads rabbitmq');
  await assert.rejects(renderTemplate(path, { snapshot: 'queues' }), /no value for \{\{client\}\}/);
});
JS

# release: bumps package.json and prepends a changelog section.

cat > tools/release/version.js <<'JS'
export function bumpVersion(version, part) {
  const [major, minor, patch] = version.split('-')[0].split('.').map(Number);
  if (part === 'major') return `${major + 1}.0.0`;
  if (part === 'minor') return `${major}.${minor + 1}.0`;
  if (part === 'patch') return `${major}.${minor}.${patch + 1}`;
  throw new Error(`unknown part: ${part}`);
}
JS

cat > tools/release/changelog.js <<'JS'
// Groups commit subjects by their "Area: " prefix; unprefixed ones go under
// Dashboard, where most of them land.
export function changelogSection(version, date, subjects) {
  const groups = new Map();
  for (const subject of subjects) {
    const match = /^([A-Z][a-z]+): (.+)$/.exec(subject);
    const [area, text] = match ? [match[1], match[2]] : ['Dashboard', subject];
    if (!groups.has(area)) groups.set(area, []);
    groups.get(area).push(text);
  }
  const body = [...groups].map(([area, items]) => `### ${area}\n\n${items.map((i) => `- ${i}`).join('\n')}\n`);
  return `## ${version} (${date})\n\n${body.join('\n')}`;
}
JS

cat > tools/release/index.js <<'JS'
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { lastTag, subjectsSince } from '../lib/git.js';
import { readJson, ROOT } from '../lib/fs.js';
import { changelogSection } from './changelog.js';
import { bumpVersion } from './version.js';

export async function run({ _: [part], flags }, { log }) {
  const pkgPath = join(ROOT, 'package.json');
  const pkg = await readJson(pkgPath);
  const version = bumpVersion(pkg.version, part);
  const section = changelogSection(version, new Date().toISOString().slice(0, 10), subjectsSince(lastTag()));
  if (flags['dry-run']) {
    log.info(section);
    return 0;
  }
  const changelogPath = join(ROOT, 'CHANGELOG.md');
  const previous = await readFile(changelogPath, 'utf8').catch(() => '# Changelog\n\n');
  const [heading, ...rest] = previous.split('\n\n');
  await writeFile(changelogPath, [heading, section.trimEnd(), ...rest].join('\n\n'));
  await writeFile(pkgPath, `${JSON.stringify({ ...pkg, version }, null, 2)}\n`);
  log.ok(`${pkg.version} -> ${version}; tag it with git tag v${version}`);
  return 0;
}
JS

cat > tools/release/version.test.js <<'JS'
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { changelogSection } from './changelog.js';
import { bumpVersion } from './version.js';

test('bumps each part and drops a pre-release tag', () => {
  assert.equal(bumpVersion('0.9.0', 'patch'), '0.9.1');
  assert.equal(bumpVersion('0.9.3', 'minor'), '0.10.0');
  assert.equal(bumpVersion('1.0.0-rc.2', 'major'), '2.0.0');
});

test('groups changelog entries by area', () => {
  assert.equal(
    changelogSection('0.9.1', '2026-10-01', ['Pipeline: add the deploys snapshot', 'Fix the oncall table']),
    '## 0.9.1 (2026-10-01)\n\n### Pipeline\n\n- add the deploys snapshot\n\n### Dashboard\n\n- Fix the oncall table\n',
  );
});
JS

# --- Scripts, icons and editor settings ---

mkdir -p scripts public/img

cat > scripts/dev.sh <<'SH'
#!/usr/bin/env bash
# Serves the dashboard against a scratch copy of the checked-in snapshots, so
# a local pipeline run cannot overwrite the fixtures the tests use.
set -euo pipefail
cd "$(dirname "$0")/.."
scratch=$(mktemp -d)
trap 'rm -rf "$scratch"' EXIT
cp data/*.json "$scratch/"
HARBOR_DATA_DIR="$scratch/" PORT="${PORT:-3000}" node src/server.js
SH

cat > scripts/check-data.sh <<'SH'
#!/usr/bin/env bash
# CI gate for snapshot changes. --now is pinned to the snapshot time because
# the checked-in snapshots are stale by design.
set -euo pipefail
cd "$(dirname "$0")/.."
node tools/harbor.js verify --now=2026-10-01T09:30:00Z
SH

cat > scripts/seed-data.sh <<'SH'
#!/usr/bin/env bash
# Copies the checked-in snapshots into a data directory for a fresh
# environment, without overwriting anything the pipeline already wrote.
set -euo pipefail
target="${1:?usage: seed-data.sh <data-dir>}"
cd "$(dirname "$0")/.."
mkdir -p "$target"
for f in data/*.json; do
  [ -e "$target/$(basename "$f")" ] || cp "$f" "$target/"
done
SH

chmod +x scripts/dev.sh scripts/check-data.sh scripts/seed-data.sh

svg() {
  printf '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">%s</svg>\n' "$2" > "public/img/$1.svg"
}

svg favicon '<path d="M12 2v20M5 9h14M7 22a7 7 0 0 1-5-7m20 0a7 7 0 0 1-5 7"/><circle cx="12" cy="4" r="2"/>'
svg logo '<path d="M12 3v18M6 9h12M8 21a8 8 0 0 1-6-7m20 0a8 8 0 0 1-6 7"/><circle cx="12" cy="5" r="2"/>'
svg alert '<path d="M12 3 2 21h20L12 3z"/><path d="M12 10v5M12 18h.01"/>'
svg check '<path d="M4 12l5 5L20 6"/>'
svg clock '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>'
svg database '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>'
svg server '<rect x="3" y="4" width="18" height="7" rx="1"/><rect x="3" y="13" width="18" height="7" rx="1"/><path d="M7 7.5h.01M7 16.5h.01"/>'
svg shield '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z"/>'
svg users '<circle cx="9" cy="8" r="3"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M16 5a3 3 0 0 1 0 6M21 20c0-2.6-1.7-4.9-4-5.7"/>'
svg globe '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3z"/>'

cat > .editorconfig <<'TXT'
root = true

[*]
charset = utf-8
end_of_line = lf
indent_style = space
indent_size = 2
insert_final_newline = true
trim_trailing_whitespace = true

[*.md]
trim_trailing_whitespace = false
TXT

printf '22\n' > .nvmrc

cat > justfile <<'TXT'
# Shortcuts for the commands in the README.

default: test

test:
    node --test

serve:
    scripts/dev.sh

pipeline *snapshots:
    node pipeline/run.js {{snapshots}}

verify:
    scripts/check-data.sh
TXT

# --- End-to-end: every page through handle(), the way a browser sees it ---

mkdir -p test/e2e

cat > test/e2e/navigation.test.js <<'JS'
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { handle } from '../../src/server.js';

const navLinks = (html) => [...html.matchAll(/<a href="([^"]+)"(?: aria-current="page")?>([^<]+)<\/a>/g)].map((m) => [m[1], m[2]]);

test('every nav link renders and marks itself current', async () => {
  const links = navLinks((await handle('/')).body);
  assert.ok(links.length > 20, 'the nav lists every page');
  for (const [href, label] of links) {
    const res = await handle(href);
    assert.equal(res.status, 200, href);
    assert.ok(res.body.includes(`aria-current="page">${label}<`), `${href} marks ${label} current`);
  }
});
JS

cat > test/e2e/titles.test.js <<'JS'
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { handle } from '../../src/server.js';

test('each page title matches its nav label', async () => {
  const links = [...(await handle('/')).body.matchAll(/<a href="([^"]+)"[^>]*>([^<]+)<\/a>/g)];
  for (const [, href, label] of links) {
    assert.match((await handle(href)).body, new RegExp(`<title>${label} · Harbor</title>`), href);
  }
});
JS

cat > test/e2e/empty.test.js <<'JS'
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { handle } from '../../src/server.js';

const dataDir = fileURLToPath(new URL('./fixtures/empty/', import.meta.url));

// Every snapshot can legitimately be empty: a quiet night has no alerts.
test('every page renders an empty snapshot', async () => {
  const links = [...(await handle('/')).body.matchAll(/<a href="([^"]+)"/g)].map((m) => m[1]);
  for (const href of links) {
    const res = await handle(href, { dataDir });
    assert.equal(res.status, 200, href);
    assert.doesNotMatch(res.body, /undefined|NaN/, href);
  }
});
JS

cat > test/e2e/missing.test.js <<'JS'
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { handle } from '../../src/server.js';

const dataDir = fileURLToPath(new URL('./no-such-dir/', import.meta.url));

test('every page answers 503 without its snapshot', async () => {
  const links = [...(await handle('/')).body.matchAll(/<a href="([^"]+)"/g)].map((m) => m[1]);
  for (const href of links) {
    const res = await handle(href, { dataDir });
    assert.equal(res.status, 503, href);
    assert.match(res.body, /Snapshot unavailable/, href);
  }
});
JS

cat > test/e2e/queries.test.js <<'JS'
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { handle } from '../../src/server.js';

// Links get pasted into chat and edited by hand; a bad parameter falls back
// to the default instead of failing the page.
test('unknown query values fall back to the defaults', async () => {
  const links = [...(await handle('/')).body.matchAll(/<a href="([^"]+)"/g)].map((m) => m[1]);
  for (const href of links) {
    const res = await handle(`${href}?sort=bogus&dir=sideways&env=mars&region=moon&tab=nope`);
    assert.equal(res.status, 200, href);
  }
});
JS

cat > test/e2e/static.test.js <<'JS'
import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { test } from 'node:test';
import { handle } from '../../src/server.js';

const PUBLIC = new URL('../../public/', import.meta.url);
const TYPES = { css: 'text/css', js: 'text/javascript', svg: 'image/svg+xml' };

test('serves every public file with its content type', async () => {
  const files = readdirSync(PUBLIC, { recursive: true }).filter((f) => /\.(css|js|svg)$/.test(f));
  assert.ok(files.length > 10);
  for (const file of files) {
    const res = await handle(`/public/${file}`);
    assert.equal(res.status, 200, file);
    assert.equal(res.type, TYPES[file.split('.').pop()], file);
  }
});

test('refuses paths outside public/', async () => {
  assert.equal((await handle('/public/../package.json')).status, 404);
});
JS

cat > test/e2e/single.test.js <<'JS'
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { handle } from '../../src/server.js';

const dataDir = fileURLToPath(new URL('./fixtures/single/', import.meta.url));

// One row is where totals, groupings and plurals tend to break.
test('every page renders a one-row snapshot', async () => {
  const links = [...(await handle('/')).body.matchAll(/<a href="([^"]+)"/g)].map((m) => m[1]);
  for (const href of links) {
    const res = await handle(href, { dataDir });
    assert.equal(res.status, 200, href);
    assert.doesNotMatch(res.body, /undefined|NaN/, href);
  }
});
JS

node "$GEN_DIR/gen.mjs" app

git add package.json README.md .gitignore .editorconfig .nvmrc justfile \
  src public data test pipeline tools scripts
git -c user.name='Drill Test' -c user.email='drill@example.com' \
  commit -q -m "Add the dashboard pages"

cat > data/deploys.json <<'JSON'
{
  "generatedAt": "2026-10-01T09:30:00Z",
  "deploys": [
    { "id": "d-1042", "service": "search", "version": "1.23.0-rc.1", "environment": "staging", "status": "in-progress", "startedAt": "2026-10-01T09:05:00Z", "finishedAt": null, "author": "priya" },
    { "id": "d-1041", "service": "notifications", "version": "0.9.4", "environment": "production", "status": "succeeded", "startedAt": "2026-10-01T08:50:00Z", "finishedAt": "2026-10-01T08:54:12Z", "author": "marco" },
    { "id": "d-1040", "service": "notifications", "version": "0.9.3", "environment": "production", "status": "rolled-back", "startedAt": "2026-10-01T08:10:00Z", "finishedAt": "2026-10-01T08:31:40Z", "author": "marco" },
    { "id": "d-1039", "service": "api-gateway", "version": "3.15.0-rc.1", "environment": "staging", "status": "succeeded", "startedAt": "2026-10-01T07:20:00Z", "finishedAt": "2026-10-01T07:26:05Z", "author": "dana" },
    { "id": "d-1038", "service": "billing", "version": "2.9.0-rc.3", "environment": "staging", "status": "failed", "startedAt": "2026-10-01T06:45:00Z", "finishedAt": "2026-10-01T06:47:30Z", "author": "sam" },
    { "id": "d-1037", "service": "api-gateway", "version": "3.14.2", "environment": "production", "status": "succeeded", "startedAt": "2026-09-30T16:05:00Z", "finishedAt": "2026-09-30T16:12:48Z", "author": "dana" },
    { "id": "d-1036", "service": "billing", "version": "2.9.0-rc.2", "environment": "staging", "status": "succeeded", "startedAt": "2026-09-30T14:00:00Z", "finishedAt": "2026-09-30T14:04:21Z", "author": "sam" },
    { "id": "d-1035", "service": "search", "version": "1.22.2", "environment": "production", "status": "failed", "startedAt": "2026-09-30T10:30:00Z", "finishedAt": "2026-09-30T10:33:02Z", "author": "priya" },
    { "id": "d-1034", "service": "billing", "version": "2.8.0", "environment": "production", "status": "succeeded", "startedAt": "2026-09-29T11:40:00Z", "finishedAt": "2026-09-29T11:49:55Z", "author": "sam" },
    { "id": "d-1033", "service": "search", "version": "1.22.1", "environment": "production", "status": "succeeded", "startedAt": "2026-09-28T09:15:00Z", "finishedAt": "2026-09-28T09:19:37Z", "author": "priya" }
  ]
}
JSON

node "$GEN_DIR/gen.mjs" deploys

git add data/deploys.json src/shared pipeline
git -c user.name='Drill Test' -c user.email='drill@example.com' \
  commit -q -m "Pipeline: add the deploys snapshot"

git checkout -q -b feature/deploys-page

# The spec stays on disk and out of git: docs/hyperpowers/ is gitignored.
mkdir -p docs/hyperpowers/specs
cat > docs/hyperpowers/specs/2026-10-01-deploys-page-design.md <<'MD'
# Deploys Page Design

**Date:** 2026-10-01
**Status:** Approved

## Goal

Whoever is on call can see recent deploys on the dashboard and spot a failed
or rolled-back one without opening the pipeline.

## Scope

A new read-only page at `/deploys`, with a "Deploys" link in the nav after
"Services". Out of scope: a deploy details page, pagination (the snapshot
keeps the last 50 deploys), live refresh, and any action on a deploy.

## Data

The deploy pipeline already writes `data/deploys.json` every minute, next to
`services.json`:

```json
{
  "generatedAt": "2026-10-01T09:30:00Z",
  "deploys": [
    {
      "id": "d-1042",
      "service": "search",
      "version": "1.23.0-rc.1",
      "environment": "staging",
      "status": "in-progress",
      "startedAt": "2026-10-01T09:05:00Z",
      "finishedAt": null,
      "author": "priya"
    }
  ]
}
```

`status` is one of `succeeded`, `failed`, `rolled-back` or `in-progress`.
`finishedAt` is null while a deploy is in progress.

## Page

Sorting and the environment filter behave as on the Services page
(`src/pages/services.js`).

- **Header:** "Deploys", with the snapshot time under it.
- **Environment filter:** a dropdown with "All environments" (the default),
  "production" and "staging". Choosing one reloads the page with `?env=`,
  keeping the current sort.
- **Table:** one row per deploy, with the columns Service, Version,
  Environment, Status, Started, Duration and Author. Newest first by default.
  Service and Started can be sorted both ways through `?sort=` and `?dir=`;
  changing the sort keeps the filter.
- **Status:** a colored chip. Succeeded is green, failed red, rolled-back
  amber, in-progress blue.
- **Duration:** `finishedAt` minus `startedAt` in minutes and seconds, such
  as "4m 12s". An in-progress deploy shows "running".
- **Empty:** when the filter matches no deploys, the page says "No deploys in
  staging" (naming the chosen environment) in place of the table.

## Errors

A missing or unreadable `deploys.json` gets the same 503 "Snapshot
unavailable" page as the other pages. An unknown `env`, `sort` or `dir` value
falls back to the default.

## Testing

`node --test`, like the rest of the repository: rendering tests for the
filter, both sorts, the chips, the duration format, the empty state and the
fallback for unknown query values, plus a server test for the route and its
503.
MD
