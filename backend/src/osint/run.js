import { TOUCHPOINTS } from './touchpoints.js';
import { throttle } from './lib/limiter.js';
import { withRetry } from './lib/retry.js';
import { dedupeNews, dedupeJobs, dedupeTech } from './lib/dedupe.js';

export async function buildOsintContext(q, opts = {}) {
  const byStage = groupBy(TOUCHPOINTS, t => t.stage);
  const ctx = {
    companyName: q.companyName,
    domain: q.domain,
    homepageUrl: q.homepageUrl,
    corp: null, news: [], jobs: [], tech: [], social: [], procurement: [], archives: [], evidence: []
  };

  const maxConc = Math.max(1, Number(opts.maxConcurrencyPerStage ?? 4));
  const requiredRetryRounds = Math.max(0, Number(opts.requiredRetryRounds ?? 1));
  const failOnRequiredMiss = opts.failOnRequiredMiss ?? true;

  for (const stage of sorted(Object.keys(byStage).map(Number))) {
    const tasks = byStage[stage];

    await runBatchStage(stage, tasks, q, maxConc, ctx);
    dedupeStage(ctx);

    const missing = requiredMissing(stage, tasks, ctx);
    if (missing.length) {
      for (let r = 0; r < requiredRetryRounds && missing.length; r++) {
        await runBatchStage(stage, tasks.filter(t => missing.includes(t.id)), q, 1, ctx);
        dedupeStage(ctx);
        const stillMissing = requiredMissing(stage, tasks, ctx);
        missing.splice(0, missing.length, ...stillMissing);
      }
    }

    if (missing.length && failOnRequiredMiss) {
      const msg = `Required touchpoints failed at stage ${stage}: ${missing.join(', ')}`;
      ctx.evidence.push({ url: '#', title: msg });
      throw new Error(msg);
    }
  }

  return ctx;
}

async function runBatchStage(stage, tasks, q, maxConc, ctx) {
  for (let i = 0; i < tasks.length; i += maxConc) {
    const batch = tasks.slice(i, i + maxConc);
    const results = await Promise.all(batch.map(tp =>
      runTouchpoint(tp, q).catch(err => ({ _source: tp.id, _error: err?.message || String(err) }))
    ));
    results.forEach(res => merge(ctx, res));
    batch.forEach(tp => {
      const r = results.find(x => x?._source === tp.id);
      if (r?._error) ctx.evidence.push({ url: '#', title: `Touchpoint error: ${tp.id} – ${r._error}` });
    });
  }
}

function requiredMissing(stage, tasks, ctx) {
  const req = tasks.filter(t => t.stage === stage && t.required).map(t => t.id);
  const ok = new Set();
  for (const id of req) {
    if (id === 'identity' && (ctx.homepageUrl || ctx.domain)) ok.add(id);
    else if (id === 'website' && ctx.evidence.some(e => e.title?.toLowerCase().includes('home'))) ok.add(id);
    else if (id === 'wikipedia' && ctx.corp) ok.add(id);
    else if (id === 'open_corporates' && ctx.corp) ok.add(id);
    else if (id === 'rss' && ctx.news.length) ok.add(id);
    else if (id === 'gdelt' && ctx.news.length) ok.add(id);
    else if (id === 'jobs' && ctx.jobs.length) ok.add(id);
    else if (id === 'tech' && ctx.tech.length) ok.add(id);
  }
  return req.filter(id => !ok.has(id));
}

async function runTouchpoint(tp, q) {
  await throttle(tp.rateKey, rateFor(tp.rateKey));
  return withRetry(() => tp.fn(q), { retries: retryCount(tp.id), baseMs: 400 });
}

function rateFor(key) {
  const env = (k, d) => Number(process.env[k] || d);
  const defaults = {
    identity: env("RATE_LIMIT_IDENTITY_PER_MIN", 30),
    website:  env("RATE_LIMIT_WEBSITE_PER_MIN", 20),
    wikipedia:env("RATE_LIMIT_WIKIPEDIA_PER_MIN", 20),
    opencorp: env("RATE_LIMIT_OPEN_CORP_PER_MIN", 10),
    rss:      env("RATE_LIMIT_RSS_PER_MIN", 20),
    gdelt:    env("RATE_LIMIT_GDELT_PER_MIN", 30),
    jobs:     env("RATE_LIMIT_JOBS_PER_MIN", 20),
    social:   env("RATE_LIMIT_SOCIAL_PER_MIN", 20),
    tech:     env("RATE_LIMIT_TECH_PER_MIN", 15),
    proc:     env("RATE_LIMIT_PROC_PER_MIN", 10),
    archives: env("RATE_LIMIT_ARCHIVES_PER_MIN", 10)
  };
  return defaults[key] ?? 15;
}

function retryCount(id) {
  if (id === 'website' || id === 'rss' || id === 'jobs') return 3;
  if (id === 'gdelt') return 2;
  return 2;
}

function sorted(nums) { return nums.sort((a,b)=>a-b); }
function groupBy(arr, keyFn) { return arr.reduce((m,t)=>{ const k=String(keyFn(t)); (m[k] ||= []).push(t); return m; },{}); }
function dedupeStage(ctx) { ctx.news = dedupeNews(ctx.news); ctx.jobs = dedupeJobs(ctx.jobs); ctx.tech = dedupeTech(ctx.tech); }
function merge(ctx, res) {
  if (!res) return;
  if (res.companyName) ctx.companyName = ctx.companyName || res.companyName;
  if (res.domain) ctx.domain = ctx.domain || res.domain;
  if (res.homepageUrl) ctx.homepageUrl = ctx.homepageUrl || res.homepageUrl;
  if (res.corp) ctx.corp = ctx.corp ?? res.corp;
  if (res.news?.length) ctx.news.push(...res.news);
  if (res.jobs?.length) ctx.jobs.push(...res.jobs);
  if (res.tech?.length) ctx.tech.push(...res.tech);
  if (res.social?.length) ctx.social.push(...res.social);
  if (res.procurement?.length) ctx.procurement.push(...res.procurement);
  if (res.archives?.length) ctx.archives.push(...res.archives);
  if (res.evidence?.length) ctx.evidence.push(...res.evidence);
}