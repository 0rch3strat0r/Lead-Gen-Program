function byKey(arr, keyFn) {
  const seen = new Set();
  const out = [];
  for (const x of arr || []) {
    const k = keyFn(x);
    if (!k || seen.has(k)) continue;
    seen.add(k); out.push(x);
  }
  return out;
}

export function dedupeNews(items) {
  return byKey(items, x => (x.url || x.title || '').toLowerCase());
}
export function dedupeJobs(items) {
  return byKey(items, x => (x.url || x.title || '').toLowerCase());
}
export function dedupeTech(items) {
  return byKey(items, x => (x.name || x.slug || '').toLowerCase());
}