// Pure filtering helpers for the activity page. No DOM access, so the same
// functions can be checked outside the browser.
(function (exports) {
  // Shortcuts group existing event types; they never add new ones.
  const GROUPS = {
    failed: ['Sign-in failed'],
    security: ['Password changed', 'Two-factor enabled', 'Email change requested'],
  };

  const DAY_MS = 24 * 60 * 60 * 1000;

  // Locale's first day of the week as a Date#getDay() index (0 is Sunday).
  // Defaults to the locale dates are formatted in, so labels and weeks agree.
  // Falls back to Monday where the browser does not expose week info.
  function firstDayOfWeek(locale) {
    try {
      const loc = new Intl.Locale(locale || Intl.DateTimeFormat().resolvedOptions().locale);
      const info = loc.getWeekInfo ? loc.getWeekInfo() : loc.weekInfo;
      if (info && info.firstDay) return info.firstDay % 7;
    } catch (e) {
      // Unknown locale or no Intl.Locale; use the fallback below.
    }
    return 1;
  }

  // Local midnight at the start of the week containing `date`.
  function startOfWeek(date, firstDay) {
    const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    start.setDate(start.getDate() - ((start.getDay() - firstDay + 7) % 7));
    return start;
  }

  function addDays(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  // Local date as YYYY-MM-DD, used as the week option value.
  function weekKey(date) {
    const pad = (n) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }

  function parseWeekKey(key) {
    const [y, m, d] = key.split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  // Every week overlapping the retention window ending at `now`, newest first.
  function weeksInWindow(now, windowDays, firstDay) {
    const oldest = startOfWeek(new Date(now.getTime() - windowDays * DAY_MS), firstDay);
    const weeks = [];
    for (let start = startOfWeek(now, firstDay); start >= oldest; start = addDays(start, -7)) {
      weeks.push({ key: weekKey(start), start, end: addDays(start, 7) });
    }
    return weeks;
  }

  // `eventFilter` is 'all', 'group:<name>', or 'type:<event type>'.
  // `week` is 'any' or a week key from weeksInWindow.
  function matches(event, eventFilter, week) {
    if (eventFilter.startsWith('group:')) {
      if (!GROUPS[eventFilter.slice(6)].includes(event.type)) return false;
    } else if (eventFilter.startsWith('type:')) {
      if (event.type !== eventFilter.slice(5)) return false;
    }
    if (week !== 'any') {
      const start = parseWeekKey(week);
      const when = new Date(event.when);
      if (when < start || when >= addDays(start, 7)) return false;
    }
    return true;
  }

  Object.assign(exports, { firstDayOfWeek, startOfWeek, weeksInWindow, matches });
})(typeof module !== 'undefined' ? module.exports : (window.ActivityFilters = {}));
