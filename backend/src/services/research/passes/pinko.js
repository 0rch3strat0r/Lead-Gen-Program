export async function pinkoPass(ctx, priorFindings = []) {
  const out = [];
  for (const f of (priorFindings || [])) {
    const nf = { ...f };
    if (!Array.isArray(nf.sources) || nf.sources.length === 0) {
      nf.sources = [{ url: ctx.homepageUrl || '', title: 'Company site' }];
      nf.confidence = Math.max(0.3, (nf.confidence || 0.3));
    }
    // Normalize dates to ISO if simple YYYY-MM-DD or YYYY/MM/DD
    nf.sources = nf.sources.map(s => {
      const sd = (s.date || '').trim();
      const m = sd.match(/^(\d{4})[-\/]?(\d{2})[-\/]?(\d{2})$/);
      return m ? { ...s, date: `${m[1]}-${m[2]}-${m[3]}` } : s;
    }).slice(0, 4);
    if (!Array.isArray(nf.tags)) nf.tags = [];
    if (!nf.tags.includes('citation')) nf.tags.push('citation');
    out.push(nf);
  }
  return out;
}