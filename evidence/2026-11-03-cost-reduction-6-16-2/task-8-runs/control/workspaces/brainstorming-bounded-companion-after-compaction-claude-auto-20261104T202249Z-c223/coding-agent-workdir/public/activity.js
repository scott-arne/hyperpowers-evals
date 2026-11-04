// Renders every event as one table row, in API order, then adds a filter bar
// above the table for narrowing the rows by event type and date range.
// The bar is built here so it is absent when JavaScript is off; the full table
// still renders from the same data.
(function () {
  const events = window.ACTIVITY_EVENTS;
  const table = document.getElementById('activity-table');
  const tbody = table.querySelector('tbody');

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
  const PRESETS = [
    { value: '7', label: 'Last 7 days' },
    { value: '30', label: 'Last 30 days' },
    { value: '90', label: 'Last 90 days' },
    { value: 'custom', label: 'Custom' },
  ];
  const DATE_ORDER_MESSAGE = 'The end date must be after the start date.';
  const EMPTY_MESSAGE =
    'No events match these filters. Choose Clear filters to see all events.';

  // The viewer's local calendar day as YYYY-MM-DD, the same format a date
  // input uses, so days compare as plain strings. "When" is shown in local
  // time, so filtering by local day matches what the viewer reads.
  function localDay(date) {
    const pad = (n) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }

  function el(tag, props, children) {
    const node = document.createElement(tag);
    Object.assign(node, props);
    for (const child of children || []) node.append(child);
    return node;
  }

  // Table rows, built once and shown or hidden by the filters.
  const rows = events.map((event) => {
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
    return { row, type: event.type, day: localDay(new Date(event.when)) };
  });

  const emptyRow = el('tr', { className: 'activity-empty', hidden: true }, [
    el('td', { colSpan: 6, textContent: EMPTY_MESSAGE }),
  ]);
  tbody.appendChild(emptyRow);

  // Filter bar.
  function field(id, labelText, control, extra) {
    control.id = id;
    control.classList.add('filter-control');
    return el('div', { className: 'filter-field' }, [
      el('label', { htmlFor: id, textContent: labelText }),
      control,
      ...(extra || []),
    ]);
  }

  const typeSelect = el('select', {}, [
    el('option', { value: '', textContent: 'All events' }),
    ...EVENT_TYPES.map((type) => el('option', { value: type, textContent: type })),
  ]);
  const fromInput = el('input', { type: 'date' });
  const toInput = el('input', { type: 'date' });
  const toMessage = el('p', { id: 'filter-to-message', className: 'filter-message' });
  toMessage.setAttribute('aria-live', 'polite');
  const presetSelect = el('select', {},
    PRESETS.map((p) => el('option', { value: p.value, textContent: p.label })));
  presetSelect.value = 'custom';
  const clearButton = el('button', {
    type: 'button',
    className: 'filter-control filter-clear',
    textContent: 'Clear filters',
  });

  const bar = el('div', { className: 'activity-filters' }, [
    field('filter-type', 'Event type', typeSelect),
    field('filter-from', 'From', fromInput),
    field('filter-to', 'To', toInput, [toMessage]),
    field('filter-preset', 'Presets', presetSelect),
    el('div', { className: 'filter-actions' }, [clearButton]),
  ]);
  bar.setAttribute('role', 'group');
  bar.setAttribute('aria-label', 'Filter events');

  const count = el('p', { className: 'activity-count' });
  count.setAttribute('role', 'status');

  table.before(bar, count);

  // Returns false, and marks To as invalid, when From is after To.
  // Equal dates are a valid one-day range.
  function checkDateOrder() {
    const outOfOrder = fromInput.value && toInput.value && fromInput.value > toInput.value;
    if (outOfOrder) {
      toInput.setAttribute('aria-invalid', 'true');
      toInput.setAttribute('aria-describedby', toMessage.id);
      toMessage.textContent = DATE_ORDER_MESSAGE;
    } else {
      toInput.removeAttribute('aria-invalid');
      toInput.removeAttribute('aria-describedby');
      toMessage.textContent = '';
    }
    return !outOfOrder;
  }

  // While the range is out of order the table keeps its last result; the
  // message under To says what to fix.
  function applyFilters() {
    if (!checkDateOrder()) return;
    const type = typeSelect.value;
    const from = fromInput.value;
    const to = toInput.value;
    let shown = 0;
    for (const r of rows) {
      const match = (!type || r.type === type)
        && (!from || r.day >= from)
        && (!to || r.day <= to);
      r.row.hidden = !match;
      if (match) shown += 1;
    }
    emptyRow.hidden = shown > 0;
    count.textContent = `Showing ${shown} of ${rows.length} events`;
  }

  presetSelect.addEventListener('change', () => {
    if (presetSelect.value !== 'custom') {
      const today = new Date();
      const start = new Date(today);
      start.setDate(today.getDate() - (Number(presetSelect.value) - 1));
      fromInput.value = localDay(start);
      toInput.value = localDay(today);
    }
    applyFilters();
  });

  for (const input of [fromInput, toInput]) {
    input.addEventListener('change', () => {
      presetSelect.value = 'custom';
      applyFilters();
    });
  }

  typeSelect.addEventListener('change', applyFilters);

  clearButton.addEventListener('click', () => {
    typeSelect.value = '';
    fromInput.value = '';
    toInput.value = '';
    presetSelect.value = 'custom';
    applyFilters();
  });

  applyFilters();
})();
