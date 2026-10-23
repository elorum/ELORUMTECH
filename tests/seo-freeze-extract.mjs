// Extracts SEO-critical fields from an HTML string for the visual-refresh guard.
export const THEME_LINK = '<link rel="stylesheet" href="/assets/elorum-theme.css">';
export function extract(html) {
  const all = (re) => [...html.matchAll(re)].map((m) => m[0]);
  const body = (html.split(/<body[^>]*>/i)[1] || '')
    .replace(/<script\b[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  return {
    title: all(/<title\b[^>]*>[\s\S]*?<\/title>/gi),
    metaDescription: all(/<meta\s+name="description"[^>]*>/gi),
    h1: all(/<h1\b[^>]*>[\s\S]*?<\/h1>/gi),
    canonical: all(/<link\s+rel="canonical"[^>]*>/gi),
    jsonLd: all(/<script\s+type="application\/ld\+json"[^>]*>[\s\S]*?<\/script>/gi),
    hrefs: all(/\bhref="[^"]*"/gi).filter((h) => h !== 'href="/assets/elorum-theme.css"'),
    anchors: all(/<a\b[\s\S]*?<\/a>/gi),
    bodyText: body,
    withoutThemeLink: html.split(THEME_LINK).join(''),
  };
}
