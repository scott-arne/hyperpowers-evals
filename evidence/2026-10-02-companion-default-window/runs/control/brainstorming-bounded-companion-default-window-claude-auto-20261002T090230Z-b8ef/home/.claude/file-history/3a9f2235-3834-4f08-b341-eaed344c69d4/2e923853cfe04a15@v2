// The nine event types the API sends (Part 1 decision 4). Do not add
// client-side types; new types need a backend change.
const EVENT_TYPES = [
  'Sign-in',
  'Sign-in failed',
  'Sign-out',
  'Session expired',
  'Password changed',
  'Two-factor enabled',
  'Email change requested',
  'Settings updated',
  'API token used',
];

// Shortcuts in the Event filter: named groups of existing types.
const TYPE_SHORTCUTS = {
  'failed-sign-ins': { label: 'Failed sign-ins', types: ['Sign-in failed'] },
  'security-changes': {
    label: 'Security changes',
    types: ['Password changed', 'Two-factor enabled', 'Email change requested'],
  },
};

const RETENTION_DAYS = 90;

// filter is '' (all), a TYPE_SHORTCUTS key, or one of EVENT_TYPES.
function eventMatchesType(event, filter) {
  if (!filter) return true;
  const shortcut = TYPE_SHORTCUTS[filter];
  return shortcut ? shortcut.types.includes(event.type) : event.type === filter;
}

// First day of the week for a locale, 1 (Monday) to 7 (Sunday). Falls back
// to Monday where the browser does not expose week info.
function firstDayOfWeek(locale) {
  try {
    const loc = new Intl.Locale(locale);
    const info = loc.getWeekInfo ? loc.getWeekInfo() : loc.weekInfo;
    return (info && info.firstDay) || 1;
  } catch {
    return 1;
  }
}

// Local midnight at the start of the week containing date.
function startOfWeek(date, firstDay) {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const isoDay = start.getDay() || 7;
  start.setDate(start.getDate() - ((isoDay - firstDay + 7) % 7));
  return start;
}

// Weeks in the viewer's time zone that overlap the retention window, newest
// first. Each week is { start, end } with end exclusive.
function weeksInWindow(now, firstDay) {
  const windowStart = new Date(now);
  windowStart.setDate(windowStart.getDate() - RETENTION_DAYS);
  const weeks = [];
  let start = startOfWeek(now, firstDay);
  for (;;) {
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    weeks.push({ start, end });
    if (start <= windowStart) return weeks;
    start = new Date(start);
    start.setDate(start.getDate() - 7);
  }
}

function eventInWeek(event, week) {
  if (!week) return true;
  const when = new Date(event.when);
  return when >= week.start && when < week.end;
}

function formatWeek(week, locale) {
  const lastDay = new Date(week.end);
  lastDay.setDate(lastDay.getDate() - 1);
  return new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric', year: 'numeric' })
    .formatRange(week.start, lastDay);
}

function addOption(parent, value, label) {
  const option = document.createElement('option');
  option.value = value;
  option.textContent = label;
  parent.appendChild(option);
}

function addGroup(select, label) {
  const group = document.createElement('optgroup');
  group.label = label;
  select.appendChild(group);
  return group;
}

// Renders every event as one table row, in API order.
const tbody = document.querySelector('#activity-table tbody');
const rows = [];
for (const event of window.ACTIVITY_EVENTS) {
  const row = document.createElement('tr');
  for (const value of [
    new Date(event.when).toLocaleString(),
    event.type,
    event.device,
    event.location,
    event.ip,
    event.detail,
  ]) {
    const cell = document.createElement('td');
    cell.textContent = value;
    row.appendChild(cell);
  }
  tbody.appendChild(row);
  rows.push({ event, row });
}

const noResults = document.createElement('tr');
const noResultsCell = document.createElement('td');
noResultsCell.colSpan = 6;
noResultsCell.textContent = 'No events match these filters.';
noResults.appendChild(noResultsCell);
noResults.hidden = true;
tbody.appendChild(noResults);

// Filters. The form ships hidden so it never shows without JavaScript.
const locale = navigator.language;
const weeks = weeksInWindow(new Date(), firstDayOfWeek(locale));
const filters = document.querySelector('#activity-filters');
const typeSelect = document.querySelector('#filter-type');
const weekSelect = document.querySelector('#filter-week');
const status = document.querySelector('#activity-status');

const shortcutGroup = addGroup(typeSelect, 'Shortcuts');
for (const [value, shortcut] of Object.entries(TYPE_SHORTCUTS)) {
  addOption(shortcutGroup, value, shortcut.label);
}
const typeGroup = addGroup(typeSelect, 'Event types');
for (const type of EVENT_TYPES) addOption(typeGroup, type, type);
weeks.forEach((week, index) => addOption(weekSelect, String(index), formatWeek(week, locale)));

function applyFilters() {
  const week = weekSelect.value === '' ? null : weeks[Number(weekSelect.value)];
  let shown = 0;
  for (const { event, row } of rows) {
    const visible = eventMatchesType(event, typeSelect.value) && eventInWeek(event, week);
    row.hidden = !visible;
    if (visible) shown++;
  }
  noResults.hidden = shown > 0;
  status.textContent = shown === rows.length
    ? `Showing all ${rows.length.toLocaleString(locale)} events`
    : `Showing ${shown.toLocaleString(locale)} of ${rows.length.toLocaleString(locale)} events`;
}

typeSelect.addEventListener('change', applyFilters);
weekSelect.addEventListener('change', applyFilters);
filters.addEventListener('submit', (e) => e.preventDefault());
applyFilters();
filters.hidden = false;
