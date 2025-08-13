import { throttle } from './lib/limiter.js';
import { withRetry } from './lib/retry.js';
import { dedupeNews, dedupeJobs, dedupeTech } from './lib/dedupe.js';
import { identity, websiteBasics, rssNews, gdeltNews, wikipediaFacts, openCorporatesFacts, jobsBoards, socialPublic, techFootprint, procurement, archives } from './fetchers.js';

const TOUCHPOINTS = [
  { id:'identity', stage:0, required:true,  rateKey:'identity',  fn: identity },
  { id:'website',  stage:0, required:true,  rateKey:'website',   fn: websiteBasics },

  { id:'wikipedia',       stage:1, required:false, rateKey:'wikipedia', fn: wikipediaFacts },
  { id:'open_corporates', stage:1, required:false, rateKey:'opencorp',  fn: openCorporatesFacts },

  { id:'rss',   stage:2, required:true,  rateKey:'rss',   fn: rssNews },
  { id:'gdelt', stage:2, required:false, rateKey:'gdelt', fn: gdeltNews },

  { id:'jobs',   stage:3, required:true,  rateKey:'jobs',   fn: jobsBoards },
  { id:'social', stage:3, required:false, rateKey:'social', fn: socialPublic },

  { id:'tech', stage:4, required:true, rateKey:'tech', fn: techFootprint },

  { id:'procurement', stage:5, required:false, rateKey:'proc',     fn: procurement },
  { id:'archives',    stage:5, required:false, rateKey:'archives', fn: archives }
];

export async function buildOsintContext(q, opts = {}) {
  const byStage = groupBy(TOUCHPOINTS, t => t.stage);
  const ctx = { companyName:q.companyName, domain:q.domain, homepageUrl:q.homepageUrl,
    corp:null, news:[], jobs:[], tech:[], social:[], procurement:[], archives:[], evidence:[] };

  const maxConc = Math.max(1, Number(opts.maxConcurrencyPerStage ?? 4));
  const requiredRetryRounds = Math.max(0, Number(opts.requiredRetryRounds ?? 1));
  const failOnRequiredMiss = opts.failOnRequiredMiss ?? true;

  for (const stage of Object.keys(byStage).map(Number).sort((a,b)=>a-b)) {
    const tasks = byStage[stage];

    await runBatchStage(tasks, q, maxConc, ctx);

    ctx.news = dedupeNews(ctx.news);
    ctx.jobs = dedupeJobs(ctx.jobs);
    ctx.tech = dedupeTech(ctx.tech);

    let missing = requiredMissing(tasks, ctx);
    for (let r = 0; r < requiredRetryRounds && missing.length; r++) {
      await runBatchStage(tasks.filter(t => missing.includes(t.id)), q, 1, ctx);
      ctx.news = dedupeNews(ctx.news); ctx.jobs = dedupeJobs(ctx.jobs); ctx.tech = dedupeTech(ctx.tech);
      missing = requiredMissing(tasks, ctx);
    }
    if (missing.length && failOnRequiredMiss) throw new Error(`Required touchpoints failed at stage ${stage}: ${missing.join(', ')}`);
  }
  return ctx;
}

async function runBatchStage(tasks, q, maxConc, ctx){
  for (let i=0;i<tasks.length;i+=maxConc) {
    const batch = tasks.slice(i, i+maxConc);
    const results = await Promise.all(batch.map(tp =>
      runTouchpoint(tp, q).catch(err => ({ _source: tp.id, _error: err?.message || String(err) }))
    ));
    results.forEach(res => merge(ctx, res));
  }
}

async function runTouchpoint(tp, q){ await throttle(tp.rateKey, rateFor(tp.rateKey)); return withRetry(() => tp.fn(q), { retries: retryCount(tp.id), baseMs: 400 }); }
function rateFor(key){ const env=(k,d)=>Number(process.env[k])||d; const d={ identity:env('RATE_LIMIT_IDENTITY_PER_MIN',30), website:env('RATE_LIMIT_WEBSITE_PER_MIN',20), wikipedia:env('RATE_LIMIT_WIKIPEDIA_PER_MIN',20), opencorp:env('RATE_LIMIT_OPEN_CORP_PER_MIN',10), rss:env('RATE_LIMIT_RSS_PER_MIN',20), gdelt:env('RATE_LIMIT_GDELT_PER_MIN',30), jobs:env('RATE_LIMIT_JOBS_PER_MIN',20), social:env('RATE_LIMIT_SOCIAL_PER_MIN',20), tech:env('RATE_LIMIT_TECH_PER_MIN',15), proc:env('RATE_LIMIT_PROC_PER_MIN',10), archives:env('RATE_LIMIT_ARCHIVES_PER_MIN',10) }; return d[key] ?? 15; }
function retryCount(id){ if (id==='website'||id==='rss'||id==='jobs') return 3; if (id==='gdelt') return 2; return 2; }
function groupBy(arr, keyFn){ return arr.reduce((m,t)=>{ const k=String(keyFn(t)); (m[k] ||= []).push(t); return m; },{}); }
function requiredMissing(tasks, ctx){ const req=tasks.filter(t=>t.required).map(t=>t.id); const ok=new Set();
  for(const id of req){ if(id==='identity'&&(ctx.homepageUrl||ctx.domain)) ok.add(id);
    else if(id==='website'&&ctx.evidence?.some(e=>(e.title||'').toLowerCase().includes('home'))) ok.add(id);
    else if(id==='wikipedia'&&ctx.corp) ok.add(id);
    else if(id==='open_corporates'&&ctx.corp) ok.add(id);
    else if(id==='rss'&&ctx.news.length) ok.add(id);
    else if(id==='gdelt'&&ctx.news.length) ok.add(id);
    else if(id==='jobs'&&ctx.jobs.length) ok.add(id);
    else if(id==='tech'&&ctx.tech.length) ok.add(id); }
  return req.filter(id=>!ok.has(id)); }
function merge(ctx,res){ if(!res)return; if(res.companyName)ctx.companyName=ctx.companyName||res.companyName; if(res.domain)ctx.domain=ctx.domain||res.domain; if(res.homepageUrl)ctx.homepageUrl=ctx.homepageUrl||res.homepageUrl; if(res.corp)ctx.corp=ctx.corp??res.corp; if(res.news?.length)ctx.news.push(...res.news); if(res.jobs?.length)ctx.jobs.push(...res.jobs); if(res.tech?.length)ctx.tech.push(...res.tech); if(res.social?.length)ctx.social.push(...res.social); if(res.procurement?.length)ctx.procurement.push(...res.procurement); if(res.archives?.length)ctx.archives.push(...res.archives); if(res.evidence?.length)ctx.evidence.push(...res.evidence); }