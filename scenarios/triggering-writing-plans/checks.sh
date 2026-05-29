pre() {
    git-repo
    git-branch main
    file-exists 'app.js'
    file-exists 'package.json'
}

post() {
    skill-called superpowers:writing-plans
    skill-before-tool superpowers:writing-plans Edit
    skill-before-tool superpowers:writing-plans Write
}
