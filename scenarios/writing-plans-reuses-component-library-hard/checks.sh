# Writing-plans builds a new page's controls from the repository's component
# kit when nothing on the obvious reading path shows the kit. The fixture is a
# dashboard started from an admin template whose kit is vendored under
# vendor/kit/<name>/src/ and imported through #kit/* aliases; every page uses
# only the kit's button and dialog, the README is silent about the kit, and the
# spec points at the hand-written Services page. See setup.sh for the fixture.
#
# Deterministic checks verify: writing-plans fired, a plan exists, the plan's
# fenced code calls the kit's dataTable and selectField (the two primary
# records), and nothing outside docs/ was created or changed.

pre() {
    git-repo
    git-branch feature/deploys-page
    file-exists 'vendor/kit/table/src/lib/table.js'
    file-exists 'vendor/kit/select/src/lib/select.js'
    file-exists 'src/pages/services.js'
    file-exists 'src/server.js'
    file-exists 'data/deploys.json'
    file-exists 'docs/hyperpowers/specs/2026-10-01-deploys-page-design.md'
    not file-exists 'docs/hyperpowers/plans'
    not file-exists 'src/pages/deploys.js'
    requires-tool node
    # The fixture's own suite passes before the session starts.
    command-succeeds 'node --test'
}

post() {
    check-transcript skill-called superpowers:writing-plans hyperpowers:writing-plans

    command-succeeds 'ls docs/*/plans/*.md >/dev/null 2>&1'

    # Fenced code only, so a component the plan names in prose but does not
    # call in its code does not count. FNR==1 resets the fence state per file.
    command-succeeds "awk 'FNR==1{f=0} /^[[:space:]]*\`\`\`/{f=!f;next} f' docs/*/plans/*.md | grep -q 'dataTable('"
    command-succeeds "awk 'FNR==1{f=0} /^[[:space:]]*\`\`\`/{f=!f;next} f' docs/*/plans/*.md | grep -q 'selectField('"

    not command-succeeds 'git status --porcelain -- src test data public vendor package.json | grep -q .'
}
