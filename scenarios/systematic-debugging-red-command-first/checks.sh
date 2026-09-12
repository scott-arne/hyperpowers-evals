pre() {
    requires-tool node
    git-repo
    git-branch main
    # create_base_repo seeds 3 commits; setup.sh adds the pricing module = 4.
    git-count commits eq 4
    file-exists 'src/pricing.js'
    file-contains src/pricing.js 'function getDiscountRate'
    file-contains src/pricing.js 'function finalPrice'
    not command-succeeds 'node -e "const {finalPrice}=require(\"./src/pricing.js\"); process.exit(finalPrice(100,\"BOGUS\")===100?0:1)"'
}

post() {
    # S3 grades "ran a failing command before the first change, and before the
    # first hypothesis" through the acceptance criteria ALONE, on purpose. No
    # transcript verb can witness it: flattenToolCalls (src/atif/project.ts)
    # projects each step to {tool,args}, dropping BOTH the observation output
    # and step.message (the agent's own prose), so a check can see only that a
    # command was TYPED — never that it ran, what it printed, or what the agent
    # said about it. A text match on the command is satisfied by a commit
    # message, by a grep, or by a heredoc that writes a test, and it FAILS a
    # correct TDD-first run; since one failed post-check downgrades the
    # verdict on its own (src/composer.ts), that is a hard false negative.
    # The Gauntlet-Agent, which reads the output, is the only witness there is.
    # Do not re-add a transcript check here without a verb that can see command
    # output AND agent message text — part one needs the first, and part two
    # ("before the agent first states a theory") needs the second.
    check-transcript skill-called superpowers:systematic-debugging

    # The sibling's `investigated` verb is deliberately NOT carried over. It
    # accepts only Read/Grep/grep/rg and has no ordering semantics (it passes on
    # any such call anywhere in the run), while this scenario grades RUNNING a
    # command and disqualifies grep-shaped evidence as REPRODUCTION — and S3
    # drops the sibling's paired "Investigated before fixing" criterion, so the
    # check would be an unpaired hard gate that only ever fires on an agent that
    # reproduced without ever reading a file: a failure S3 does not grade.

    # Retained from the sibling: the producer itself means NO DISCOUNT —
    # exactly 0 — for ANY unrecognized code, including two that appear nowhere
    # in the story or the fixture. A symptom-only guard in the consumer leaves
    # getDiscountRate returning undefined, and a lookup table keyed on the
    # reported code leaves every other unknown wrong; both FAIL here even when
    # the reported output looks correct.
    command-succeeds 'node -e "const {getDiscountRate}=require(\"./src/pricing.js\"); const bad=[\"BOGUS\",\"ZZTOP\",\"NOPE99\"].filter(c=>getDiscountRate(c)!==0); process.exit(bad.length===0?0:1)"'

    # Retained: end-to-end correctness, over an unseen unknown code and every
    # code in the fixture's rate table — so a patch that repairs only the codes
    # the user quoted does not pass.
    command-succeeds 'node -e "const {finalPrice}=require(\"./src/pricing.js\"); const ok=finalPrice(100,\"BOGUS\")===100 && finalPrice(100,\"ZZTOP\")===100 && finalPrice(100,\"SAVE10\")===90 && finalPrice(100,\"SAVE20\")===80 && finalPrice(100,\"HALFOFF\")===50; process.exit(ok?0:1)"'

    # Retained: a reproducing test was left behind. Keyed on a
    # test/tests/spec/specs token at a path boundary rather than a bare
    # substring, so test/pricing.js and pricing.spec.js count while an
    # unrelated contest.js does not.
    command-succeeds 'find . -name node_modules -prune -o -name .git -prune -o -name "*.js" -print | grep -qE "(^|/|[-._])(tests|test|specs|spec)[-._/]"'
}
