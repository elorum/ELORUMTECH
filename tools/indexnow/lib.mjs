/**
 * IndexNow submit helpers. Pure functions + injectable fetch for offline tests.
 * Live POST is performed only by submit.mjs after production-deploy guards pass.
 */
export const INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow";
export const MAX_URLS_PER_REQUEST = 10_000;

export function assertIndexNowKey(key) {
  if (typeof key !== "string" || !/^[0-9a-f]{32}$/.test(key)) {
    throw new Error("IndexNow key must be 32 lowercase hex characters");
  }
  return key;
}

export function unescapeXml(value) {
  return String(value)
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .trim();
}

function tagText(block, tag) {
  const m = block.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, "i"));
  return m ? unescapeXml(m[1]) : null;
}

export function parseSitemap(xml) {
  if (typeof xml !== "string" || !xml.trim()) {
    return { type: "empty", urls: [], sitemaps: [] };
  }
  if (/<sitemapindex[\s>]/i.test(xml)) {
    const sitemaps = [...xml.matchAll(/<sitemap\b[\s\S]*?<\/sitemap>/gi)]
      .map((m) => tagText(m[0], "loc"))
      .filter(Boolean);
    return { type: "index", urls: [], sitemaps };
  }
  const urls = [...xml.matchAll(/<url\b[\s\S]*?<\/url>/gi)]
    .map((m) => {
      const loc = tagText(m[0], "loc");
      if (!loc) return null;
      return { loc, lastmod: tagText(m[0], "lastmod") };
    })
    .filter(Boolean);
  return { type: "urlset", urls, sitemaps: [] };
}

export function normalizeUrl(value) {
  const url = new URL(value);
  url.hash = "";
  url.username = "";
  url.password = "";
  url.hostname = url.hostname.toLowerCase();
  if ((url.protocol === "https:" && url.port === "443") || (url.protocol === "http:" && url.port === "80")) {
    url.port = "";
  }
  if (url.pathname.length > 1 && url.pathname.endsWith("/")) {
    url.pathname = url.pathname.slice(0, -1);
  }
  url.pathname = url.pathname.replace(/\/{2,}/g, "/");
  return url.toString();
}

export function filterByHost(entries, host) {
  const expected = String(host).toLowerCase();
  const accepted = [];
  const rejected = [];
  for (const entry of entries) {
    let url;
    try {
      url = new URL(entry.loc);
    } catch {
      rejected.push({ ...entry, reason: "invalid-url" });
      continue;
    }
    if (url.protocol !== "https:") {
      rejected.push({ ...entry, reason: "non-https" });
      continue;
    }
    const hostname = url.hostname.toLowerCase();
    // Hard host equality: never submit github.io, www, previews, or any other host.
    if (hostname !== expected) {
      rejected.push({ ...entry, reason: "host-mismatch" });
      continue;
    }
    accepted.push(entry);
  }
  return { accepted, rejected };
}

function headerGet(headers, name) {
  if (!headers) return "";
  if (typeof headers.get === "function") return headers.get(name) || "";
  const direct = headers[name] || headers[name.toLowerCase()];
  return direct == null ? "" : String(direct);
}

function attr(tag, name) {
  const m = tag.match(new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"));
  return m ? (m[1] ?? m[2] ?? m[3] ?? "") : "";
}

export function extractCanonical(headers, html, baseUrl) {
  const linkHeader = headerGet(headers, "link");
  if (linkHeader) {
    const parts = String(linkHeader).split(/,(?=[^>]*(?:<|$))/);
    for (const part of parts) {
      if (/\brel\s*=\s*"?canonical"?/i.test(part)) {
        const href = part.match(/<([^>]+)>/);
        if (href) {
          try {
            return new URL(href[1].trim(), baseUrl).toString();
          } catch {
            /* ignore invalid */
          }
        }
      }
    }
  }
  if (!html) return null;
  const tags = html.match(/<link\b[^>]*>/gi) || [];
  for (const tag of tags) {
    const rel = attr(tag, "rel");
    if (rel.toLowerCase().split(/\s+/).includes("canonical")) {
      const href = attr(tag, "href").trim();
      if (!href) continue;
      try {
        return new URL(href, baseUrl).toString();
      } catch {
        /* ignore invalid */
      }
    }
  }
  return null;
}

export function collectRobotsDirectives(headers, html) {
  const parts = [];
  const xRobots = headerGet(headers, "x-robots-tag");
  if (xRobots) parts.push(xRobots);
  if (html) {
    const metas = html.match(/<meta\b[^>]*>/gi) || [];
    for (const tag of metas) {
      const name = attr(tag, "name").toLowerCase();
      const httpEquiv = attr(tag, "http-equiv").toLowerCase();
      if (name === "robots" || name === "googlebot" || name === "bingbot" || httpEquiv === "robots" || httpEquiv === "x-robots-tag") {
        parts.push(attr(tag, "content"));
      }
    }
  }
  const joined = parts.join(", ").toLowerCase();
  return {
    raw: parts,
    noindex: /\bnoindex\b/.test(joined) || /\bnone\b/.test(joined),
  };
}

export function classifyFetchedUrl(sitemapUrl, response) {
  const status = response.status;
  if (response.redirected) return { ok: false, reason: "redirect" };
  if (status >= 300 && status < 400) return { ok: false, reason: "redirect" };
  if (status !== 200) return { ok: false, reason: `non-200:${status}` };
  if (response.url && normalizeUrl(response.url) !== normalizeUrl(sitemapUrl)) {
    return { ok: false, reason: "redirect" };
  }
  const robots = collectRobotsDirectives(response.headers, response.body || "");
  if (robots.noindex) return { ok: false, reason: "noindex" };
  const canonical = extractCanonical(response.headers, response.body || "", sitemapUrl);
  if (canonical && normalizeUrl(canonical) !== normalizeUrl(sitemapUrl)) {
    return { ok: false, reason: "canonical-mismatch", canonical };
  }
  return { ok: true, reason: "accepted" };
}

export function chunkUrls(urls, size = MAX_URLS_PER_REQUEST) {
  if (size < 1) throw new Error("chunk size must be >= 1");
  const out = [];
  for (let i = 0; i < urls.length; i += size) out.push(urls.slice(i, i + size));
  return out;
}

export function buildPayload({ host, key, keyLocation, urlList }) {
  assertIndexNowKey(key);
  if (!host || typeof host !== "string") throw new Error("host is required");
  if (!keyLocation || typeof keyLocation !== "string") throw new Error("keyLocation is required");
  const location = new URL(keyLocation);
  if (location.protocol !== "https:" || location.hostname.toLowerCase() !== host.toLowerCase()) {
    throw new Error("keyLocation must be https on the same host");
  }
  if (location.pathname !== `/${key}.txt`) {
    throw new Error("keyLocation path must be /<key>.txt");
  }
  if (!Array.isArray(urlList)) throw new Error("urlList must be an array");
  if (urlList.length > MAX_URLS_PER_REQUEST) {
    throw new Error(`urlList exceeds ${MAX_URLS_PER_REQUEST} URLs; chunk before posting`);
  }
  for (const item of urlList) {
    const url = new URL(item);
    if (url.protocol !== "https:" || url.hostname.toLowerCase() !== host.toLowerCase()) {
      throw new Error(`urlList contains a URL that is not https://${host}: ${item}`);
    }
  }
  return { host, key, keyLocation, urlList: [...urlList] };
}

export function diffSubmission(currentEntries, previousState, { full = false } = {}) {
  if (full || !previousState || !previousState.urls || Object.keys(previousState.urls).length === 0) {
    return {
      mode: full ? "full-forced" : "full-first-run",
      selected: currentEntries.map((e) => e.loc),
      unchanged: [],
    };
  }
  const selected = [];
  const unchanged = [];
  for (const entry of currentEntries) {
    const prev = previousState.urls[entry.loc];
    if (!prev) {
      selected.push(entry.loc);
      continue;
    }
    const prevLastmod = prev.lastmod ?? null;
    const nextLastmod = entry.lastmod ?? null;
    if (nextLastmod && nextLastmod !== prevLastmod) selected.push(entry.loc);
    else unchanged.push(entry.loc);
  }
  return { mode: "delta", selected, unchanged };
}

export function writeStateObject(host, entries, submittedAt = new Date().toISOString()) {
  const urls = {};
  for (const entry of entries) {
    urls[entry.loc] = { lastmod: entry.lastmod ?? null, submittedAt };
  }
  return { version: 1, host, submittedAt, urls };
}

const PREVIEW_EVENTS = new Set([
  "pull_request",
  "pull_request_target",
  "pull_request_review",
  "pull_request_review_comment",
]);

function hostnameOf(value) {
  if (!value) return "";
  try {
    return new URL(value).hostname.toLowerCase();
  } catch {
    return String(value).toLowerCase();
  }
}

function isPreviewHostname(hostname) {
  return (
    hostname.endsWith(".workers.dev") ||
    hostname.endsWith(".pages.dev") ||
    hostname.endsWith(".github.io") ||
    hostname.includes("preview")
  );
}

/**
 * Decide whether a live IndexNow POST is allowed.
 * Dry-run is always allowed (no POST). A real POST requires --submit and
 * --confirm-production, and is refused in PR / preview / non-production CI.
 */
export function inspectSubmitContext({
  submit = false,
  confirmProduction = false,
  host,
  keyLocation,
  env = {},
} = {}) {
  const reasons = [];
  const eventName = String(env.GITHUB_EVENT_NAME || "").toLowerCase();
  if (PREVIEW_EVENTS.has(eventName)) reasons.push(`github_event=${eventName}`);
  if (env.GITHUB_ACTIONS === "true" && env.GITHUB_REF && env.GITHUB_REF !== "refs/heads/main") {
    reasons.push(`github_ref=${env.GITHUB_REF}`);
  }
  const pagesBranch = env.CF_PAGES_BRANCH || env.CF_PAGES_BRANCH_NAME || "";
  if (pagesBranch && pagesBranch !== "main") reasons.push(`cf_pages_branch=${pagesBranch}`);
  for (const [label, value] of [
    ["cf_pages_url", env.CF_PAGES_URL],
    ["preview_url", env.PREVIEW_URL],
    ["workers_preview", env.CLOUDFLARE_PREVIEW_URL],
    ["keyLocation", keyLocation],
  ]) {
    const hostname = hostnameOf(value);
    if (hostname && isPreviewHostname(hostname)) reasons.push(`${label}=${hostname}`);
  }
  if (host && isPreviewHostname(String(host).toLowerCase())) reasons.push(`host=${host}`);
  if (env.INDEXNOW_ALLOW_PRODUCTION === "0") reasons.push("INDEXNOW_ALLOW_PRODUCTION=0");

  const isPreview = reasons.some(
    (r) =>
      r.startsWith("github_event=") ||
      r.startsWith("cf_pages_") ||
      r.startsWith("preview_url=") ||
      r.startsWith("workers_preview=") ||
      r.includes(".workers.dev") ||
      r.includes(".pages.dev") ||
      r.includes(".github.io") ||
      r.includes("preview"),
  );
  const dryRun = !submit;
  const flagsOk = Boolean(submit) && Boolean(confirmProduction);
  const allowed = flagsOk && reasons.length === 0 && !isPreview;
  return { allowed, dryRun, isPreview, reasons, flagsOk };
}

export function assertCanPost(ctx) {
  if (ctx.allowed) return;
  if (!ctx.flagsOk) {
    throw new Error(
      "Refusing IndexNow POST: dry-run is the default. Pass --submit --confirm-production only after an approved production deploy.",
    );
  }
  throw new Error(`Refusing IndexNow POST: ${ctx.reasons.join("; ") || "preview or unconfirmed context"}`);
}

export async function loadSitemapEntries(sitemapUrl, getText, { host } = {}) {
  const seen = new Set();
  const urls = [];
  const queue = [sitemapUrl];
  while (queue.length) {
    const current = queue.shift();
    if (seen.has(current)) continue;
    seen.add(current);
    const xml = await getText(current);
    const parsed = parseSitemap(xml);
    for (const child of parsed.sitemaps) queue.push(child);
    for (const entry of parsed.urls) urls.push(entry);
  }
  if (!host) return { urls, rejected: [] };
  return { ...filterByHost(urls, host), urls: undefined };
}

export async function mapPool(items, limit, worker) {
  const results = new Array(items.length);
  let index = 0;
  async function run() {
    while (index < items.length) {
      const current = index++;
      results[current] = await worker(items[current], current);
    }
  }
  const n = Math.max(1, Math.min(limit, items.length || 1));
  await Promise.all(Array.from({ length: n }, run));
  return results;
}
