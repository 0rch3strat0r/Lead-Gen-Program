export async function kevinPass(ctx, priorFindings = []) {
  const findings = Array.isArray(priorFindings) ? [...priorFindings] : [];
  // Simple duplicate consolidation by title
  const seen = new Map();
  for (const f of findings) {
    const key = (f.title || '').toLowerCase();
    if (!seen.has(key)) { seen.set(key, f); continue; }
    const prev = seen.get(key);
    prev.sources = [...(prev.sources || []), ...(f.sources || [])].slice(0, 4);
    prev.confidence = Math.min(1, (prev.confidence || 0.4) + 0.1);
  }
  const out = Array.from(seen.values());
  // Confidence bump for multi-source citations
  for (const f of out) {
    const n = (f.sources || []).length;
    if (n >= 2) f.confidence = Math.min(1, Math.max(f.confidence || 0.5, 0.7));
    else f.confidence = Math.max(0.4, f.confidence || 0.4);
  }
  return out;
}