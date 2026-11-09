# IndexNow (manual post-deploy only)

This is a **manual, opt-in** IndexNow submitter for `elorumtech.elorum.world`. It does **not** run on pull requests, preview deployments, or GitHub Actions workflows unless a human runs it after an approved production deploy. It must only be used **after** Nicki has approved a merge, the change is on production `main`, and the GitHub Pages deploy to `elorumtech.elorum.world` has been verified.

The IndexNow key is public by design (it is served at the key file URL). It is not a secret. A **separate** key is used for this host; it is not the elorum.world key.

- Key file (must be HTTP 200, `text/plain`, body exactly the key): https://elorumtech.elorum.world/0ddb9901730d4fb37141fdffa9fa02fa.txt
- Endpoint: `https://api.indexnow.org/indexnow`
- First run (no local state): every canonical, HTTP 200, indexable sitemap URL whose host is exactly `elorumtech.elorum.world`
- Later runs: only new or lastmod-changed URLs (use `--full` to resubmit the whole passing list)
- At most 10,000 URLs per request (the script chunks automatically)
- **Hard filter:** URLs on the retired `elorum.github.io` origin are never submitted

## Dry-run (default, no POST)

From the repository root:

```bash
node tools/indexnow/submit.mjs --dry-run
# or: npm run indexnow:dry-run
```

This fetches the live production sitemap over HTTPS, checks each URL (no redirect follow), and prints how many URLs would be submitted. It never POSTs to IndexNow.

## Live submit (only after an approved production deploy)

```bash
node tools/indexnow/submit.mjs --submit --confirm-production
# or: npm run indexnow:submit
```

Both flags are required. The script still refuses to POST when it detects a GitHub pull_request event, a Cloudflare/GitHub preview host (`*.workers.dev`, `*.pages.dev`, `*.github.io`), or a non-`main` GitHub Actions ref. Set `INDEXNOW_ALLOW_PRODUCTION=0` to force a refusal.

Do not wire this to a pull-request or preview workflow. There is no automatic `on: push` hook in this change. GitHub Pages deploys from `main`; run the submitter only after that production deploy is live.

## State file

After a successful live POST, the script writes `tools/indexnow/state.json` (gitignored) so later runs can send only new or changed URLs.
