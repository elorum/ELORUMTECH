#!/usr/bin/env node
/**
 * IndexNow submitter. Default is dry-run (no POST).
 * A live POST requires --submit --confirm-production and a non-preview context.
 * Use only after an approved production deploy.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { HOST, KEY, KEY_LOCATION, SITEMAP_URL, USER_AGENT } from "./config.mjs";
import {
  INDEXNOW_ENDPOINT,
  MAX_URLS_PER_REQUEST,
  assertCanPost,
  assertIndexNowKey,
  buildPayload,
  classifyFetchedUrl,
  chunkUrls,
  diffSubmission,
  filterByHost,
  inspectSubmitContext,
  loadSitemapEntries,
  mapPool,
  writeStateObject,
} from "./lib.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_STATE = path.join(here, "state.json");
const CONCURRENCY = 6;
const TIMEOUT_MS = 15_000;

function parseArgs(argv) {
  const flags = {
    dryRun: true,
    submit: false,
    confirmProduction: false,
    full: false,
    statePath: DEFAULT_STATE,
    sitemapUrl: SITEMAP_URL,
    limit: Infinity,
    help: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") flags.help = true;
    else if (arg === "--dry-run") flags.dryRun = true;
    else if (arg === "--submit") flags.submit = true;
    else if (arg === "--confirm-production") flags.confirmProduction = true;
    else if (arg === "--full") flags.full = true;
    else if (arg === "--state") flags.statePath = argv[++i];
    else if (arg === "--sitemap") flags.sitemapUrl = argv[++i];
    else if (arg === "--limit") flags.limit = Number(argv[++i]);
    else throw new Error(`Unknown argument: ${arg}`);
  }
  // Dry-run wins if both are present; --submit is required to leave dry-run.
  if (flags.submit && !flags.dryRun) {
    /* submit already set */
  }
  if (flags.submit) flags.dryRun = false;
  // Explicit --dry-run after we also saw --submit: prefer dry-run (safer).
  if (argv.includes("--dry-run")) flags.dryRun = true;
  return flags;
}

function usage() {
  return `Usage: node tools/indexnow/submit.mjs [--dry-run] [--submit --confirm-production] [--full] [--sitemap URL] [--state PATH] [--limit N]

Default: dry-run against the live sitemap. No POST is sent.
Live POST is allowed only after an approved production deploy, with both
--submit and --confirm-production, and never from a PR or preview.`;
}

function loadState(statePath) {
  try {
    return JSON.parse(readFileSync(statePath, "utf8"));
  } catch (err) {
    if (err && err.code === "ENOENT") return null;
    throw err;
  }
}

async function httpGet(url, { method = "GET" } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method,
      redirect: "manual",
      headers: { "user-agent": USER_AGENT, accept: "text/html,application/xml,text/xml,text/plain,*/*" },
      signal: controller.signal,
    });
    const headers = response.headers;
    const status = response.status;
    const body = await response.text();
    return { status, headers, body, url: response.url || url, redirected: response.redirected === true };
  } finally {
    clearTimeout(timer);
  }
}

async function getText(url) {
  const res = await httpGet(url);
  if (res.status !== 200) throw new Error(`Failed to fetch ${url}: HTTP ${res.status}`);
  return res.body;
}

function summarize(label, counts) {
  const parts = Object.entries(counts).map(([k, v]) => `${k}=${v}`);
  console.log(`${label}: ${parts.join(", ")}`);
}

async function main(argv = process.argv.slice(2), deps = { httpGet, getText, postJson, env: process.env, stdout: console }) {
  const flags = parseArgs(argv);
  if (flags.help) {
    deps.stdout.log(usage());
    return { ok: true, dryRun: true, wouldSubmit: 0 };
  }

  assertIndexNowKey(KEY);
  const ctx = inspectSubmitContext({
    submit: flags.submit && !flags.dryRun,
    confirmProduction: flags.confirmProduction,
    host: HOST,
    keyLocation: KEY_LOCATION,
    env: deps.env,
  });

  deps.stdout.log(`IndexNow ${HOST}`);
  deps.stdout.log(`keyLocation: ${KEY_LOCATION}`);
  deps.stdout.log(`sitemap: ${flags.sitemapUrl}`);
  deps.stdout.log(`mode: ${ctx.dryRun || flags.dryRun ? "DRY-RUN (no POST)" : "SUBMIT"}`);

  const loaded = await loadSitemapEntries(flags.sitemapUrl, deps.getText, { host: HOST });
  // loadSitemapEntries with host returns {accepted, rejected}
  const acceptedHost = loaded.accepted || loaded.urls || [];
  const rejectedHost = loaded.rejected || [];

  const classified = { accepted: [], rejected: [...rejectedHost] };
  const toCheck = acceptedHost.slice(0, Number.isFinite(flags.limit) ? flags.limit : acceptedHost.length);
  const checks = await mapPool(toCheck, CONCURRENCY, async (entry) => {
    try {
      const fetched = await deps.httpGet(entry.loc);
      const verdict = classifyFetchedUrl(entry.loc, fetched);
      return { entry, verdict };
    } catch (err) {
      return { entry, verdict: { ok: false, reason: `fetch-error:${err.message || err}` } };
    }
  });
  for (const item of checks) {
    if (item.verdict.ok) classified.accepted.push(item.entry);
    else classified.rejected.push({ ...item.entry, reason: item.verdict.reason, canonical: item.verdict.canonical });
  }

  const previous = loadState(flags.statePath);
  const diff = diffSubmission(classified.accepted, previous, { full: flags.full });
  const urlList = diff.selected;

  const reasonCounts = {};
  for (const row of classified.rejected) {
    const key = row.reason || "rejected";
    reasonCounts[key] = (reasonCounts[key] || 0) + 1;
  }

  deps.stdout.log(`sitemap URLs on ${HOST}: ${acceptedHost.length}`);
  deps.stdout.log(`rejected before submit: ${classified.rejected.length}`);
  if (Object.keys(reasonCounts).length) summarize("reject reasons", reasonCounts);
  deps.stdout.log(`live 200 + indexable + canonical: ${classified.accepted.length}`);
  deps.stdout.log(`diff mode: ${diff.mode}`);
  deps.stdout.log(`would submit: ${urlList.length}`);
  deps.stdout.log(`unchanged (skipped in delta): ${diff.unchanged.length}`);

  // Key file check is informative on dry-run (the file is not live until deploy).
  try {
    const keyRes = await deps.httpGet(KEY_LOCATION);
    const keyOk = keyRes.status === 200 && (keyRes.body || "") === KEY;
    const type = (typeof keyRes.headers?.get === "function" ? keyRes.headers.get("content-type") : "") || "";
    deps.stdout.log(`live key file: HTTP ${keyRes.status}, exact body=${keyOk}, content-type=${type || "(none)"}`);
  } catch (err) {
    deps.stdout.log(`live key file: not reachable (${err.message || err}) — expected until this change is deployed.`);
  }

  if (flags.dryRun || ctx.dryRun) {
    deps.stdout.log("DRY-RUN complete. No request was sent to IndexNow.");
    return {
      ok: true,
      dryRun: true,
      host: HOST,
      sitemapCount: acceptedHost.length,
      accepted: classified.accepted.length,
      rejected: classified.rejected.length,
      wouldSubmit: urlList.length,
      mode: diff.mode,
      urlList,
      rejectedRows: classified.rejected,
    };
  }

  assertCanPost({ ...ctx, dryRun: false });
  if (urlList.length === 0) {
    deps.stdout.log("Nothing to submit.");
    return { ok: true, dryRun: false, wouldSubmit: 0, posted: 0 };
  }

  const batches = chunkUrls(urlList, MAX_URLS_PER_REQUEST);
  const results = [];
  for (const batch of batches) {
    const payload = buildPayload({ host: HOST, key: KEY, keyLocation: KEY_LOCATION, urlList: batch });
    const result = await deps.postJson(INDEXNOW_ENDPOINT, payload);
    results.push(result);
    deps.stdout.log(`IndexNow POST ${result.status} for ${batch.length} URL(s)`);
    if (result.status !== 200 && result.status !== 202) {
      throw new Error(`IndexNow POST failed: HTTP ${result.status} ${result.body || ""}`);
    }
  }

  const submittedAt = new Date().toISOString();
  const state = writeStateObject(HOST, classified.accepted, submittedAt);
  mkdirSync(path.dirname(flags.statePath), { recursive: true });
  writeFileSync(flags.statePath, `${JSON.stringify(state, null, 2)}\n`);
  deps.stdout.log(`Wrote state: ${flags.statePath}`);
  return {
    ok: true,
    dryRun: false,
    posted: urlList.length,
    statuses: results.map((r) => r.status),
  };
}

async function postJson(url, payload) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json; charset=utf-8",
      "user-agent": USER_AGENT,
    },
    body: JSON.stringify(payload),
  });
  const body = await response.text();
  return { status: response.status, body };
}

export { main, parseArgs, usage };

const isDirect =
  Boolean(process.argv[1]) && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isDirect) {
  main().catch((err) => {
    console.error(err.message || err);
    process.exit(1);
  });
}
