import { buildOsintContext } from '../../osint/run.js';
import { brodyPass } from './passes/brody.js';
import { karenPass } from './passes/karen.js';
import { kevinPass } from './passes/kevin.js';
import { durinPass } from './passes/durin.js';
import { pinkoPass } from './passes/pinko.js';

export async function runDeepResearch({ companyName, companyUrl, notes } = {}) {
  const ctx = await buildOsintContext({ companyName, companyUrl, notes });

  const brody = await brodyPass(ctx);
  const karen = await karenPass(ctx);
  const durin = await durinPass(ctx);
  const pre = [...brody, ...karen, ...durin];
  const verified = await kevinPass(ctx, pre);
  const findings = await pinkoPass(ctx, verified);

  const summary = `Horsemen produced ${findings.length} findings for ${ctx.companyName || ctx.domain || 'target'}.`;
  return { jobId: `job_${Date.now()}`, model: 'horsemen', summary, findings, meta: { notes } };
}