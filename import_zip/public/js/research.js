async function runResearch(payload) {
  const res = await fetch('/api/research/run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload || {}),
  });
  if (!res.ok) throw new Error('Research failed');
  return res.json();
}

// Example usage (Cursor can replace this):
// runResearch({ companyName: 'Acme Corp' }).then(console.log).catch(console.error);
