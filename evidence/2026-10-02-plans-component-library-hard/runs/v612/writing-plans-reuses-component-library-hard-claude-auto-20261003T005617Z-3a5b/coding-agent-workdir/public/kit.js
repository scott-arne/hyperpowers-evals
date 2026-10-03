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
