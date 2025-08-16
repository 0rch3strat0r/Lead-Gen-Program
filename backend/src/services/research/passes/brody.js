export async function brodyPass(ctx) {
  const findings = [];
  const news = Array.isArray(ctx.news) ? ctx.news.slice(0, 8) : [];
  for (const n of news) {
    if (!n || (!n.title && !n.url)) continue;
    findings.push({
      title: n.title?.trim() || 'Recent company news',
      detail: `Recent item: ${n.title || 'news'}${n.date ? ` (${n.date})` : ''}. Potential business impact: monitor for operational or regulatory triggers.`,
      confidence: 0.5,
      tags: ['market','why-now','momentum'],
      sources: [{ title: n.title || 'news', url: n.url || ctx.homepageUrl || '', date: n.date }]
    });
  }
  return findings.slice(0, 6);
}