import { buildOsintContext } from '../../osint/run.js';
import { synthesizeFindingsWithOpenAI } from '../llm/openai.js';

export async function runDeepResearch({ prompt, companyName, companyUrl, notes } = {}) {
  const ctx = await buildOsintContext({ companyName, homepageUrl: companyUrl, domain: companyUrl });

  // Baseline structured findings from OSINT
  let findings = [];
  for (const n of ctx.news || []) findings.push({ title: n.title || 'News', detail: n.url || '', tags: ['brody'] });
  for (const j of ctx.jobs || []) findings.push({ title: j.title || 'Job', detail: j.url || '', tags: ['kevin'] });
  for (const t of ctx.tech || []) findings.push({ title: t.name || 'Tech', detail: t.slug || '', tags: ['durin'] });
  let summary = `OSINT summary for ${companyName || companyUrl || 'target'}: ${findings.length} findings`;

  const requireAi = String(process.env.REQUIRE_AI_SYNTHESIS || '').trim() === '1';

  // If OpenAI is configured, synthesize company-specific analysis
  const ai = await synthesizeFindingsWithOpenAI(ctx).catch(() => null);
  if (ai && (ai.findings?.length || ai.summary)) {
    summary = ai.summary || summary;
    if (Array.isArray(ai.findings) && ai.findings.length) findings = ai.findings;
  } else if (requireAi) {
    throw new Error('AI synthesis required but not available');
  }

  return { jobId: `job_${Date.now()}`, model: ai ? 'openai' : 'osint-runner', summary, findings, meta: { notes, evidence: ctx.evidence?.length || 0, ai_required: requireAi } };
}