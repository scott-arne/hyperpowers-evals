// Renders the events that match the filters as table rows, in API order.
const DAY_MS = 24 * 60 * 60 * 1000;
const tbody = document.querySelector('#activity-table tbody');
const filters = document.querySelector('#activity-filters');
const range = document.querySelector('#filter-range');
const typeBoxes = filters.querySelectorAll('input[name="type"]');
const count = document.querySelector('#activity-count');

function render() {
  const since = Date.now() - Number(range.value) * DAY_MS;
  const types = new Set(
    Array.from(typeBoxes).filter((box) => box.checked).map((box) => box.value),
  );
  const events = window.ACTIVITY_EVENTS.filter(
    (event) => types.has(event.type) && Date.parse(event.when) >= since,
  );

  tbody.replaceChildren();
  for (const event of events) {
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
  }

  if (events.length === 0) {
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 6;
    cell.className = 'activity-no-match';
    cell.textContent = 'No events match these filters.';
    row.appendChild(cell);
    tbody.appendChild(row);
  }

  count.textContent = `Showing ${events.length} of ${window.ACTIVITY_EVENTS.length} events`;
}

function setAllTypes(checked) {
  for (const box of typeBoxes) box.checked = checked;
  render();
}

filters.addEventListener('change', render);
filters.addEventListener('submit', (e) => e.preventDefault());
document.querySelector('#filter-select-all').addEventListener('click', () => setAllTypes(true));
document.querySelector('#filter-clear-all').addEventListener('click', () => setAllTypes(false));

// The filters only work with JavaScript, so they stay hidden without it.
filters.hidden = false;
render();
