export async function synthesizeFindingsWithOpenAI(ctx, { model = process.env.OPENAI_MODEL || 'gpt-4o-mini' } = {}) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  // Compact OSINT context for the prompt
  const topNews = (ctx.news || []).slice(0, 6).map(n => `- ${n.title || ''} ${n.url ? '('+n.url+')' : ''}`).join('\n');
  const topJobs = (ctx.jobs || []).slice(0, 6).map(j => `- ${j.title || ''} ${j.url ? '('+j.url+')' : ''}`).join('\n');
  const topTech = (ctx.tech || []).slice(0, 10).map(t => `- ${t.name || t.slug || ''}`).join('\n');

  const system = `You are a senior analyst. Read the OSINT summary and produce specific, actionable findings for the company. Return STRICT JSON with keys: summary (string) and findings (array of {title, detail, tags, confidence}). Use concrete specifics pulled from the inputs. If evidence is weak, note uncertainty.`;

  const user = [
    `Company: ${ctx.companyName || ''}`,
    `Domain/Homepage: ${ctx.domain || ctx.homepageUrl || ''}`,
    `News Headlines:\n${topNews || '- none'}`,
    `Job Postings:\n${topJobs || '- none'}`,
    `Tech Stack Signals:\n${topTech || '- none'}`
  ].join('\n\n');

  try {
    const rsp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'authorization': `Bearer ${apiKey}`,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user }
        ]
      })
    });
    if (!rsp.ok) {
      const errText = await rsp.text().catch(() => '');
      throw new Error(`OpenAI ${rsp.status}: ${errText}`);
    }
    const data = await rsp.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) return null;
    const parsed = JSON.parse(content);
    const summary = String(parsed.summary || '');
    const findings = Array.isArray(parsed.findings) ? parsed.findings.map(f => ({
      title: String(f.title || ''),
      detail: String(f.detail || ''),
      tags: Array.isArray(f.tags) ? f.tags : [],
      confidence: typeof f.confidence === 'number' ? f.confidence : undefined
    })) : [];
    return { summary, findings };
  } catch (err) {
    // Fail soft: return null so caller can fall back
    return null;
  }
}