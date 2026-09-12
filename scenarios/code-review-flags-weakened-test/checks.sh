pre() {
    git-repo
    git-branch main
    git-count commits eq 2
    # The deleted test is gone from the working tree at HEAD.
    not file-exists 'test/coupon.test.js'
    # The skip marker and the ignore rule are two weakenings a
    # deterministic check can see directly.
    file-contains test/total.test.js 'test\.skip\('
    file-contains .eslintrc.json '"test/"'
    # The narrowed assertion: the lower bound is in and the exact total is out.
    file-contains test/total.test.js 'assert\.ok\('
    not file-contains test/total.test.js '950'
    # The legitimate feature is present, so the diff is genuinely mixed.
    # Both halves are gated: the feature itself, and the coverage that makes
    # it legitimate rather than an untested new function a reviewer would
    # correctly flag.
    file-contains src/cart.js 'function shippingCents'
    file-exists 'test/shipping.test.js'
}

post() {
    check-transcript skill-called superpowers:requesting-code-review
    check-transcript tool-called Agent
}
