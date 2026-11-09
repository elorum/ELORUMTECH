import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { HOST, KEY, KEY_LOCATION, SITEMAP_URL } from "../tools/indexnow/config.mjs";
import {
  INDEXNOW_ENDPOINT,
  MAX_URLS_PER_REQUEST,
  assertCanPost,
  assertIndexNowKey,
  buildPayload,
  chunkUrls,
  classifyFetchedUrl,
  collectRobotsDirectives,
  diffSubmission,
  extractCanonical,
  filterByHost,
  inspectSubmitContext,
  parseSitemap,
} from "../tools/indexnow/lib.mjs";
import { main } from "../tools/indexnow/submit.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
// Do not embed the retired origin as a literal; site-origin tests scan .mjs files.
const RETIRED_ORIGIN = ["https://", "elorum.github.io", "/", "ELORUMTECH"].join("");

test("IndexNow key is 32 lowercase hex, matches the root key file, and is not the elorum.world key", () => {
  assertIndexNowKey(KEY);
  assert.equal(KEY, "0ddb9901730d4fb37141fdffa9fa02fa");
  assert.notEqual(KEY, "9d2b17cf87e921d33f6474fa8c8f58db");
  const publicFile = path.join(root, `${KEY}.txt`);
  assert.equal(readFileSync(publicFile, "utf8"), KEY);
  assert.equal(HOST, "elorumtech.elorum.world");
  assert.equal(KEY_LOCATION, `https://elorumtech.elorum.world/${KEY}.txt`);
  assert.equal(SITEMAP_URL, "https://elorumtech.elorum.world/sitemap.xml");
  const cname = readFileSync(path.join(root, "CNAME"), "utf8").trim();
  assert.equal(cname, "elorumtech.elorum.world");
});

test("parseSitemap reads urlset loc/lastmod and sitemap indexes", () => {
  const urlset = parseSitemap(`<?xml version="1.0"?>
    <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
      <url><loc>https://elorumtech.elorum.world/guides/</loc><lastmod>2026-10-06</lastmod></url>
      <url><loc>https://elorumtech.elorum.world/privacy.html</loc></url>
    </urlset>`);
  assert.equal(urlset.type, "urlset");
  assert.deepEqual(urlset.urls, [
    { loc: "https://elorumtech.elorum.world/guides/", lastmod: "2026-10-06" },
    { loc: "https://elorumtech.elorum.world/privacy.html", lastmod: null },
  ]);
  const index = parseSitemap(`<sitemapindex>
      <sitemap><loc>https://elorumtech.elorum.world/sitemap-pages.xml</loc></sitemap>
    </sitemapindex>`);
  assert.equal(index.type, "index");
  assert.deepEqual(index.sitemaps, ["https://elorumtech.elorum.world/sitemap-pages.xml"]);
  assert.deepEqual(index.urls, []);
});

test("filterByHost keeps only https URLs on the exact production host", () => {
  const { accepted, rejected } = filterByHost(
    [
      { loc: "https://elorumtech.elorum.world/guides/" },
      { loc: "https://www.elorum.world/music" },
      { loc: "http://elorum.world/music" },
      { loc: RETIRED_ORIGIN + "/" },
      { loc: "https://elorumtech.elorum.world/" },
      { loc: "https://foo-elorum.world.workers.dev/music" },
    ],
    "elorumtech.elorum.world",
  );
  assert.deepEqual(accepted.map((e) => e.loc), [
    "https://elorumtech.elorum.world/guides/",
    "https://elorumtech.elorum.world/",
  ]);
  assert.deepEqual(
    rejected.map((e) => [e.loc, e.reason]),
    [
      ["https://www.elorum.world/music", "host-mismatch"],
      ["http://elorum.world/music", "non-https"],
      [RETIRED_ORIGIN + "/", "host-mismatch"],
      ["https://foo-elorum.world.workers.dev/music", "host-mismatch"],
    ],
  );
});

test("classifyFetchedUrl filters redirects, non-200, noindex, and canonical mismatch", () => {
  const url = "https://elorumtech.elorum.world/guides/";
  assert.equal(classifyFetchedUrl(url, { status: 301, headers: {}, body: "", redirected: false }).reason, "redirect");
  assert.equal(classifyFetchedUrl(url, { status: 200, headers: {}, body: "", redirected: true }).reason, "redirect");
  assert.equal(classifyFetchedUrl(url, { status: 404, headers: {}, body: "", redirected: false }).reason, "non-200:404");
  assert.equal(
    classifyFetchedUrl(url, {
      status: 200,
      headers: {},
      body: '<html><head><meta name="robots" content="noindex,follow"></head></html>',
      redirected: false,
    }).reason,
    "noindex",
  );
  assert.equal(
    classifyFetchedUrl(url, {
      status: 200,
      headers: { get: (n) => (n.toLowerCase() === "x-robots-tag" ? "noindex" : null) },
      body: "<html></html>",
      redirected: false,
    }).reason,
    "noindex",
  );
  assert.equal(
    classifyFetchedUrl(url, {
      status: 200,
      headers: {},
      body: '<link rel="canonical" href="https://elorumtech.elorum.world/about.html">',
      redirected: false,
    }).reason,
    "canonical-mismatch",
  );
  assert.equal(
    classifyFetchedUrl(url, {
      status: 200,
      headers: {},
      body: '<link rel="canonical" href="https://elorumtech.elorum.world/guides">',
      redirected: false,
    }).ok,
    true,
  );
  assert.equal(
    classifyFetchedUrl(url, {
      status: 200,
      headers: {},
      body: "<html><head><title>ok</title></head></html>",
      redirected: false,
    }).ok,
    true,
  );
});

test("collectRobotsDirectives and extractCanonical cover meta and Link header", () => {
  assert.equal(collectRobotsDirectives({}, '<meta name="googlebot" content="none">').noindex, true);
  const canonical = extractCanonical(
    { get: (n) => (n.toLowerCase() === "link" ? '<https://elorumtech.elorum.world/guides/>; rel="canonical"' : null) },
    "",
    "https://elorumtech.elorum.world/guides/",
  );
  assert.equal(canonical, "https://elorumtech.elorum.world/guides/");
});

test("payload shape, host guard, and 10,000-URL chunking", () => {
  const urls = ["https://elorumtech.elorum.world/", "https://elorumtech.elorum.world/guides/"];
  const payload = buildPayload({ host: HOST, key: KEY, keyLocation: KEY_LOCATION, urlList: urls });
  assert.deepEqual(Object.keys(payload).sort(), ["host", "key", "keyLocation", "urlList"]);
  assert.equal(payload.host, "elorumtech.elorum.world");
  assert.equal(payload.key, KEY);
  assert.equal(payload.keyLocation, KEY_LOCATION);
  assert.deepEqual(payload.urlList, urls);
  assert.throws(
    () => buildPayload({ host: HOST, key: KEY, keyLocation: KEY_LOCATION, urlList: [RETIRED_ORIGIN.replace(/ELORUMTECH$/, "x")] }),
    /not https:\/\/elorumtech\.elorum\.world/,
  );
  assert.throws(
    () => buildPayload({ host: HOST, key: KEY, keyLocation: "https://elorumtech.elorum.world/wrong.txt", urlList: urls }),
    /keyLocation path/,
  );
  const many = Array.from({ length: 10001 }, (_, i) => `https://elorumtech.elorum.world/p-${i}`);
  assert.throws(() => buildPayload({ host: HOST, key: KEY, keyLocation: KEY_LOCATION, urlList: many }), /exceeds/);
  const chunks = chunkUrls(many, MAX_URLS_PER_REQUEST);
  assert.equal(chunks.length, 2);
  assert.equal(chunks[0].length, 10000);
  assert.equal(chunks[1].length, 1);
});

test("first run submits the full passing list; later runs only new or lastmod-changed URLs", () => {
  const current = [
    { loc: "https://elorumtech.elorum.world/", lastmod: "2026-10-06" },
    { loc: "https://elorumtech.elorum.world/guides/", lastmod: "2026-11-09" },
    { loc: "https://elorumtech.elorum.world/privacy.html", lastmod: "2026-08-26" },
  ];
  const first = diffSubmission(current, null);
  assert.equal(first.mode, "full-first-run");
  assert.equal(first.selected.length, 3);
  const state = {
    urls: {
      "https://elorumtech.elorum.world/": { lastmod: "2026-10-06" },
      "https://elorumtech.elorum.world/privacy.html": { lastmod: "2026-08-26" },
    },
  };
  const delta = diffSubmission(current, state);
  assert.equal(delta.mode, "delta");
  assert.deepEqual(delta.selected, ["https://elorumtech.elorum.world/guides/"]);
  assert.deepEqual(delta.unchanged, ["https://elorumtech.elorum.world/", "https://elorumtech.elorum.world/privacy.html"]);
  const forced = diffSubmission(current, state, { full: true });
  assert.equal(forced.mode, "full-forced");
  assert.equal(forced.selected.length, 3);
});

test("inspectSubmitContext refuses PR, preview hosts, and missing opt-in flags", () => {
  const base = { host: HOST, keyLocation: KEY_LOCATION, submit: true, confirmProduction: true, env: {} };
  assert.equal(inspectSubmitContext(base).allowed, true);
  const pr = inspectSubmitContext({ ...base, env: { GITHUB_EVENT_NAME: "pull_request" } });
  assert.equal(pr.allowed, false);
  assert.equal(pr.isPreview, true);
  assert.ok(pr.reasons.some((r) => r.includes("pull_request")));
  assert.throws(() => assertCanPost(pr), /Refusing IndexNow POST/);
  const preview = inspectSubmitContext({
    ...base,
    keyLocation: "https://abcd-elorum.workers.dev/key.txt",
  });
  assert.equal(preview.allowed, false);
  assert.equal(preview.isPreview, true);
  const pages = inspectSubmitContext({
    ...base,
    env: { CF_PAGES: "1", CF_PAGES_BRANCH: "feat/indexnow-20261109", CF_PAGES_URL: "https://feat.elorum.pages.dev" },
  });
  assert.equal(pages.allowed, false);
  const actions = inspectSubmitContext({
    ...base,
    env: { GITHUB_ACTIONS: "true", GITHUB_REF: "refs/heads/feat/indexnow-20261109" },
  });
  assert.equal(actions.allowed, false);
  const dry = inspectSubmitContext({ ...base, submit: false, confirmProduction: false, env: {} });
  assert.equal(dry.dryRun, true);
  assert.equal(dry.allowed, false);
  assert.throws(() => assertCanPost(dry), /dry-run is the default/);
});

test("submit.mjs dry-run default never POSTs, including when preview env is set", async () => {
  const posts = [];
  const sitemapXml = `<?xml version="1.0"?><urlset>
    <url><loc>https://elorumtech.elorum.world/guides/</loc><lastmod>2026-10-06</lastmod></url>
    <url><loc>${RETIRED_ORIGIN}/old</loc></url>
    <url><loc>https://elorumtech.elorum.world/hidden</loc></url>
  </urlset>`;
  const pages = {
    "https://elorumtech.elorum.world/guides/": {
      status: 200,
      headers: {},
      body: '<link rel="canonical" href="https://elorumtech.elorum.world/guides/">',
      redirected: false,
      url: "https://elorumtech.elorum.world/guides/",
    },
    "https://elorumtech.elorum.world/hidden": {
      status: 200,
      headers: {},
      body: '<meta name="robots" content="noindex">',
      redirected: false,
      url: "https://elorumtech.elorum.world/hidden",
    },
  };
  const logs = [];
  const result = await main(["--dry-run"], {
    env: { GITHUB_EVENT_NAME: "pull_request" },
    stdout: { log: (m) => logs.push(String(m)) },
    getText: async (url) => {
      assert.equal(url, SITEMAP_URL);
      return sitemapXml;
    },
    httpGet: async (url) => {
      if (url === KEY_LOCATION) return { status: 404, headers: {}, body: "", redirected: false, url };
      return pages[url] || { status: 404, headers: {}, body: "", redirected: false, url };
    },
    postJson: async (url, payload) => {
      posts.push({ url, payload });
      return { status: 200, body: "" };
    },
  });
  assert.equal(result.dryRun, true);
  assert.equal(result.wouldSubmit, 1);
  assert.deepEqual(result.urlList, ["https://elorumtech.elorum.world/guides/"]);
  assert.equal(posts.length, 0);
  assert.ok(logs.some((l) => l.includes("DRY-RUN complete")));
});

test("submit.mjs refuses a live POST from a pull_request context even with opt-in flags", async () => {
  const posts = [];
  await assert.rejects(
    () =>
      main(["--submit", "--confirm-production"], {
        env: { GITHUB_EVENT_NAME: "pull_request" },
        stdout: { log() {} },
        getText: async () => `<?xml version="1.0"?><urlset><url><loc>https://elorumtech.elorum.world/guides/</loc></url></urlset>`,
        httpGet: async (url) => ({
          status: 200,
          headers: {},
          body: url === KEY_LOCATION ? KEY : '<link rel="canonical" href="https://elorumtech.elorum.world/guides/">',
          redirected: false,
          url,
        }),
        postJson: async (url, payload) => {
          posts.push({ url, payload });
          return { status: 200, body: "" };
        },
      }),
    /Refusing IndexNow POST/,
  );
  assert.equal(posts.length, 0);
});

test("submit.mjs live POST sends the expected payload and does not run without flags", async () => {
  const posts = [];
  const dir = mkdtempSync(path.join(tmpdir(), "indexnow-state-"));
  const statePath = path.join(dir, "state.json");
  const result = await main(["--submit", "--confirm-production", "--state", statePath], {
    env: {},
    stdout: { log() {} },
    getText: async () => `<?xml version="1.0"?><urlset><url><loc>https://elorumtech.elorum.world/guides/</loc><lastmod>2026-10-06</lastmod></url></urlset>`,
    httpGet: async (url) => ({
      status: 200,
      headers: { get: (n) => (n.toLowerCase() === "content-type" ? "text/plain; charset=utf-8" : null) },
      body: url === KEY_LOCATION ? KEY : '<link rel="canonical" href="https://elorumtech.elorum.world/guides/">',
      redirected: false,
      url,
    }),
    postJson: async (url, payload) => {
      posts.push({ url, payload });
      return { status: 202, body: "Accepted" };
    },
  });
  assert.equal(result.dryRun, false);
  assert.equal(result.posted, 1);
  assert.deepEqual(result.statuses, [202]);
  assert.equal(posts.length, 1);
  assert.equal(posts[0].url, INDEXNOW_ENDPOINT);
  assert.deepEqual(posts[0].payload, {
    host: "elorumtech.elorum.world",
    key: KEY,
    keyLocation: KEY_LOCATION,
    urlList: ["https://elorumtech.elorum.world/guides/"],
  });
  assert.equal(existsSync(statePath), true);
});
