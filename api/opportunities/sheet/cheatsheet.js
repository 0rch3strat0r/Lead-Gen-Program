export default async function handler(req, res) {
  try {
    if (req.method !== 'GET') return res.status(405).end('Method not allowed');
    const clientId = req.headers['x-client-id'] || process.env.DEFAULT_CLIENT_ID || '';
    const id = (new URL(req.url, 'http://x')).searchParams.get('id');
    if (!clientId || !id) return res.status(400).end('missing client_id or id');

    const { getSupabase } = await import('../../../backend/src/services/db.js');
    const supabase = getSupabase();
    const { data: opp, error } = await supabase
      .from('opportunities')
      .select('*')
      .eq('id', id)
      .eq('client_id', clientId)
      .single();
    if (error || !opp) return res.status(404).end('not found');

    const fs = await import('node:fs/promises');
    const path = await import('node:path');
    const tplPath = path.default.resolve(process.cwd(), 'frontend/templates/cheatsheet_template.html');
    const tpl = await fs.readFile(tplPath, 'utf-8');

    function render(tplStr, data) {
      return tplStr.replace(/{{\s*([\w.]+)\s*}}/g, (_m, key) => {
        const val = key.split('.').reduce((acc, k) => (acc ? acc[k] : ''), data);
        return (val === undefined || val === null) ? '' : String(val);
      });
    }

    const { getIntroPatterns, getDiscoveryQuestions, getObjectionDiffusers } = await import('../../../backend/src/services/nepq/index.ts');
    const intros = await getIntroPatterns();
    const disc = await getDiscoveryQuestions();
    const objs = await getObjectionDiffusers();

    const toLi = (arr) => (arr || []).map(s => `<li>${s}</li>`).join('');

    const html = render(tpl, {
      company_name: opp.title || 'Company',
      intro_patterns: toLi(intros),
      discovery_questions: toLi(disc),
      objection_diffusers: toLi(objs)
    });

    res.setHeader('content-type', 'text/html; charset=utf-8');
    res.setHeader('content-disposition', `attachment; filename="cheatsheet_${id}.html"`);
    return res.status(200).end(html);
  } catch (err) {
    return res.status(500).end('internal error');
  }
}