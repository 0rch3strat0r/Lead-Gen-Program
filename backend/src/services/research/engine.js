import { buildOsintContext } from '../../osint/run.js';

export async function runDeepResearch({ prompt, companyName, companyUrl, notes } = {}) {
  const ctx = await buildOsintContext({ companyName, homepageUrl: companyUrl, domain: companyUrl });
  const findings = [];
  for (const n of ctx.news || []) findings.push({ title: n.title || 'News', detail: n.url || '', tags: ['brody'] });
  for (const j of ctx.jobs || []) findings.push({ title: j.title || 'Job', detail: j.url || '', tags: ['kevin'] });
  for (const t of ctx.tech || []) findings.push({ title: t.name || 'Tech', detail: t.slug || '', tags: ['durin'] });
  const summary = `OSINT summary for ${companyName || companyUrl || 'target'}: ${findings.length} findings`;
  return { jobId: `job_${Date.now()}`, model: 'osint-runner', summary, findings, meta: { notes, evidence: ctx.evidence?.length || 0 } };
}