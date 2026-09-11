pre() {
    git-repo
    git-branch main
    git-count commits eq 2
    # The deleted test is gone from the working tree at HEAD.
    not file-exists 'test/coupon.test.js'
    # The skip marker and the ignore rule are the two weakenings a
    # deterministic check can see directly.
    file-contains test/total.test.js 'test\.skip\('
    file-contains .eslintrc.json '"test/"'
    # The legitimate feature is present, so the diff is genuinely mixed.
    file-contains src/cart.js 'function shippingCents'
}

post() {
    check-transcript skill-called superpowers:requesting-code-review
    check-transcript tool-called Agent
}
