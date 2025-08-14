export async function durinPass(ctx) {
  const findings = [];
  const tech = Array.isArray(ctx.tech) ? ctx.tech : [];
  if (tech.length) {
    const names = Array.from(new Set(tech.map(t => t.name || t.product).filter(Boolean))).slice(0, 6);
    findings.push({
      title: 'Web tech signals (public footprint)',
      detail: `Detected public web stack signals: ${names.join(', ')}. These tools indicate current marketing/analytics posture and potential integration points.`,
      confidence: 0.6,
      tags: ['osint','tech'],
      sources: (ctx.evidence || []).slice(0, 2)
    });
  }
  // Archives hint (placeholder if present)
  if ((ctx.archives || []).length) {
    findings.push({
      title: 'Historical footprint (archives)',
      detail: 'Archived snapshots suggest prior vendor/content patterns; consider diffing templates for recent stack changes or policy shifts.',
      confidence: 0.4,
      tags: ['osint','trigger'],
      sources: (ctx.archives || []).slice(0, 2).map(a => ({ url: a.snapshotUrl || a.url, title: 'Archive' }))
    });
  }
  return findings;
}