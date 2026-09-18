# ELORUMTECH — Google Search Console sitemap checklist

**Production URL (canonical host):** `https://elorum.github.io/ELORUMTECH/`  
**Sitemap:** `https://elorum.github.io/ELORUMTECH/sitemap.xml`  
**robots.txt:** `https://elorum.github.io/ELORUMTECH/robots.txt`  
**Verification file:** `https://elorum.github.io/ELORUMTECH/google387f44b87908ecac.html`

## Why GSC often fails here (even when Googlebot can fetch)

Live checks (2026-09-18) show Googlebot UA receives **HTTP 200** for robots.txt and sitemap.xml, and all six sitemap `<loc>` URLs return **200** with matching self-canonicals. So a “couldn’t fetch sitemap” error is usually **not** a broken file on GitHub Pages.

Most likely causes:

1. **Wrong GSC property** — Domain property for `elorumtech.com` / `elorum.tech` while those DNS names **do not resolve**. Sitemap fetch then fails against a host that is not live.
2. **Wrong URL-prefix property** — Must be exactly `https://elorum.github.io/ELORUMTECH/` (project Pages path), not `https://elorum.github.io/` alone.
3. **Submitted sitemap URL typo** — Must be `https://elorum.github.io/ELORUMTECH/sitemap.xml` (not a custom domain, not `/sitemap.xml/` trailing slash which 404s).

## What to do in GSC

1. Open or create a **URL-prefix** property: `https://elorum.github.io/ELORUMTECH/`
2. Verify via the existing HTML file method if needed (`google387f44b87908ecac.html` is already on `main`).
3. Sitemaps → Add: `https://elorum.github.io/ELORUMTECH/sitemap.xml`
4. URL Inspection → test live URL for home + one guide.
5. Do **not** point a Domain property at `elorumtech.com` until DNS exists and is intentionally configured (report first; do not change DNS casually).

## Live facts (assistant-verified)

- robots Allow all + Sitemap directive → 200, `text/plain`
- sitemap → 200, `application/xml`, well-formed, 6 URLs
- All sitemap locs → 200; canonicals match locs; no `noindex` on those pages
- HTTP→HTTPS 301 for sitemap works
