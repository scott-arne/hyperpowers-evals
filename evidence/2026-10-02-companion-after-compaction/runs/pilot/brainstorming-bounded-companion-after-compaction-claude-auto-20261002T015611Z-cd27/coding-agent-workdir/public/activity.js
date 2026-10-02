// Renders every event as one table row, in API order.
const tbody = document.querySelector('#activity-table tbody');
const rows = [];
for (const event of window.ACTIVITY_EVENTS) {
  const row = document.createElement('tr');
  for (const value of [
    new Date(event.when).toLocaleString(),
    event.type, event.device, event.location, event.ip, event.detail,
  ]) {
    const cell = document.createElement('td');
    cell.textContent = value;
    row.appendChild(cell);
  }
  tbody.appendChild(row);
  rows.push({ event, row, time: new Date(event.when) });
}

// Filters: quick views by event type, plus one week in the viewer's time zone.
const VIEWS = {
  all: null,
  failed: ['Sign-in failed'],
  security: ['Password changed', 'Two-factor enabled', 'Email change requested', 'Settings updated'],
};

// First day of the week per locale, as in the locale table in 04 Content and
// accessibility. Regions not listed there start on Monday.
const SUNDAY_REGIONS = ['US', 'CA', 'MX', 'BR', 'JP', 'KR'];
const locale = new Intl.Locale(navigator.language || 'en-US').maximize();
const firstDay = SUNDAY_REGIONS.includes(locale.region) ? 0 : 1;

function weekStart(date) {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  start.setDate(start.getDate() - ((start.getDay() - firstDay + 7) % 7));
  return start;
}

function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

const form = document.getElementById('activity-filters');
const weekSelect = document.getElementById('activity-week');
const count = document.getElementById('activity-count');
const table = document.getElementById('activity-table');
const empty = document.getElementById('activity-empty');
const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' });

// One option per week from the newest event back to the oldest, newest first.
if (rows.length > 0) {
  const oldest = weekStart(rows[rows.length - 1].time);
  for (let start = weekStart(rows[0].time); start >= oldest; start = addDays(start, -7)) {
    const option = document.createElement('option');
    option.value = start.getTime();
    option.textContent = `${dateFormat.format(start)} to ${dateFormat.format(addDays(start, 6))}`;
    weekSelect.appendChild(option);
  }
}

function applyFilters() {
  const types = VIEWS[form.elements.show.value];
  const start = weekSelect.value ? new Date(Number(weekSelect.value)) : null;
  const end = start && addDays(start, 7);
  let shown = 0;
  for (const { event, row, time } of rows) {
    const visible = (!types || types.includes(event.type))
      && (!start || (time >= start && time < end));
    row.hidden = !visible;
    if (visible) shown += 1;
  }
  count.textContent = `Showing ${shown} of ${rows.length} events`;
  table.hidden = shown === 0;
  empty.hidden = shown !== 0;
}

form.addEventListener('change', applyFilters);
form.addEventListener('submit', (e) => e.preventDefault());
// Reset fires before the fields change back, so apply on the next tick.
form.addEventListener('reset', () => setTimeout(applyFilters));
document.getElementById('activity-empty-clear').addEventListener('click', () => {
  form.reset();
  form.elements.show[0].focus();
});

form.hidden = false;
applyFilters();
