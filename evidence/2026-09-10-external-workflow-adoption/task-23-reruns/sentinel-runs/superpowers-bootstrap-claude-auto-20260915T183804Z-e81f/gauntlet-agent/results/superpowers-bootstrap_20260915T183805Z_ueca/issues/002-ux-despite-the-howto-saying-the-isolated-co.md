# Ux: Despite the HOWTO saying the isolated config is seeded 'with dialog-bypass state', launch still presented three interactive first-run dialogs (theme picker, security notes, folder-trust) plus a bypass-permissions warning that had to be answered manually before the prompt appeared. The trust dialog appeared even though .claude.json contains hasTrustDialogAccepted:true for that project path.

**Kind:** ux
**Scenario:** superpowers-bootstrap
**Scenario Status:** pass

## Description

Despite the HOWTO saying the isolated config is seeded 'with dialog-bypass state', launch still presented three interactive first-run dialogs (theme picker, security notes, folder-trust) plus a bypass-permissions warning that had to be answered manually before the prompt appeared. The trust dialog appeared even though .claude.json contains hasTrustDialogAccepted:true for that project path.
