import { buildOsintContext } from '../../osint/run.js';
import { brodyPass } from './passes/brody.js';
import { karenPass } from './passes/karen.js';
import { kevinPass } from './passes/kevin.js';
import { durinPass } from './passes/durin.js';
import { pinkoPass } from './passes/pinko.js';

export async function runDeepResearch({ companyName, companyUrl, notes } = {}) {
  // Prefer God Code collector if present
  let ctx;
  try {
    const homepageUrl = companyUrl || undefined;
    const domain = homepageUrl ? new URL(homepageUrl).hostname : undefined;
    const { scrape } = await import('../scraper/godCode.js');
    const res = await scrape({ companyName, homepageUrl, domain, notes });
    ctx = normalizeCollector(res);
  } catch {
    ctx = await buildOsintContext({ companyName, companyUrl, notes });
  }

  const brody = await brodyPass(ctx);
  const karen = await karenPass(ctx);
  const durin = await durinPass(ctx);
  const pre = [...brody, ...karen, ...durin];
  const verified = await kevinPass(ctx, pre);
  const findings = await pinkoPass(ctx, verified);

  const summary = `Horsemen produced ${findings.length} findings for ${ctx.companyName || ctx.domain || 'target'}.`;
  return { jobId: `job_${Date.now()}`, model: 'horsemen', summary, findings, meta: { notes } };
}

function normalizeCollector(res){
  const companyName = String(res?.companyName || '');
  const domain = String(res?.domain || '');
  const homepageUrl = String(res?.homepageUrl || '');
  return {
    companyName,
    domain,
    homepageUrl,
    corp: res?.corp ?? null,
    news: Array.isArray(res?.news) ? res.news : [],
    jobs: Array.isArray(res?.jobs) ? res.jobs : [],
    tech: Array.isArray(res?.tech) ? res.tech : [],
    social: Array.isArray(res?.social) ? res.social : [],
    procurement: Array.isArray(res?.procurement) ? res.procurement : [],
    archives: Array.isArray(res?.archives) ? res.archives : [],
    evidence: Array.isArray(res?.evidence) ? res.evidence : []
  };
}