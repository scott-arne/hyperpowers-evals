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

// Named views group existing API event types; they are not new types.
const TYPE_VIEWS = {
  'failed-sign-ins': ['Sign-in failed'],
  'security-changes': ['Password changed', 'Two-factor enabled', 'Email change requested'],
};

function matchesType(event, choice) {
  if (choice === 'all') return true;
  return (TYPE_VIEWS[choice] || [choice]).includes(event.type);
}

const filters = document.getElementById('activity-filters');
const typeSelect = document.getElementById('filter-type');
const statusLine = document.getElementById('filter-status');

function applyFilters() {
  let shown = 0;
  for (const { event, row } of rows) {
    const match = matchesType(event, typeSelect.value);
    row.hidden = !match;
    if (match) shown += 1;
  }
  const total = `${rows.length.toLocaleString()} ${rows.length === 1 ? 'event' : 'events'}`;
  if (shown === 0) {
    statusLine.textContent = 'No events match these filters.';
  } else if (shown === rows.length) {
    statusLine.textContent = `Showing all ${total}`;
  } else {
    statusLine.textContent = `Showing ${shown.toLocaleString()} of ${total}`;
  }
}

filters.addEventListener('change', applyFilters);
filters.addEventListener('submit', (e) => e.preventDefault());
applyFilters();
filters.hidden = false;
