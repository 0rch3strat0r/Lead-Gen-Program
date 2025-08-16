export async function karenPass(ctx) {
  const findings = [];
  const manualPatterns = /(data entry|reconciliation|manual|spreadsheet|clerical|copy\s*\/?\s*paste|invoice|ap clerk|accounts payable|bank rec|reporting)/i;
  const manualJobs = (ctx.jobs || []).filter(j => manualPatterns.test([j.title, j.text].filter(Boolean).join(' ')));
  if (manualJobs.length) {
    findings.push({
      title: `Manual ops signals in hiring (${manualJobs.length} roles)`,
      detail: `Recent postings indicate manual workflows (e.g., ${manualJobs[0].title}). This suggests cost/time exposure in data handling or finance ops.`,
      confidence: Math.min(0.8, 0.4 + manualJobs.length * 0.05),
      tags: ['gap','ops'],
      sources: manualJobs.slice(0, 3).map(j => ({ title: j.title, url: j.url || ctx.homepageUrl || '' }))
    });
  }
  // Say/do mismatch (simple heuristic): no AI/automation mentions on jobs page + generic automation claims on site
  const siteText = JSON.stringify(ctx.evidence || []).toLowerCase();
  const aiClaims = /automation|ai|machine learning|intelligent/i.test(siteText);
  const aiJobs = (ctx.jobs || []).some(j => /automation|ml|machine learning|data engineer|ai/i.test([j.title, j.text].filter(Boolean).join(' ')));
  if (aiClaims && !aiJobs) {
    findings.push({
      title: 'Messaging vs hiring mismatch (automation claim vs no AI roles)',
      detail: 'Site messaging mentions automation/AI, but recent postings do not include AI/automation roles. Risk: under-resourced automation program.',
      confidence: 0.6,
      tags: ['gap','risk'],
      sources: [{ title: 'Site messaging', url: ctx.homepageUrl || '' }]
    });
  }
  return findings;
}