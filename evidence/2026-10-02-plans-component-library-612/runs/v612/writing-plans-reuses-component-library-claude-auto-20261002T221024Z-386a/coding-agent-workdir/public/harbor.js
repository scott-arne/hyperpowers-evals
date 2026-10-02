// Submits a filter bar's form when one of its auto-submit fields changes.
document.addEventListener('change', (event) => {
  const field = event.target.closest('[data-autosubmit]');
  if (field && field.form) field.form.submit();
});
