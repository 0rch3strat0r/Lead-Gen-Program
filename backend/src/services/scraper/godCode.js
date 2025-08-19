export async function scrape(input = {}) {
  const companyName = input.companyName || '';
  const homepageUrl = normalizeHomepage(input.homepageUrl, input.domain);
  const domain = homepageUrl ? new URL(homepageUrl).hostname : (input.domain || '');

  const result = {
    companyName,
    domain,
    homepageUrl,
    corp: null,
    news: [],
    jobs: [],
    tech: [],
    social: [],
    procurement: [],
    archives: [],
    evidence: []
  };

  if (!homepageUrl) return result;

  try {
    // Fetch homepage for quick facts and tech signals
    const homeHtml = await fetchText(homepageUrl);
    result.evidence.push({ url: homepageUrl, title: extractTitle(homeHtml) || 'Homepage' });
    addTechSignals(result.tech, homepageUrl, homeHtml);
  } catch {}

  // Discover news-like pages
  try {
    const newsHits = await boundedCrawl(homepageUrl, { maxPages: 20, includePatterns: ['news','press','blog','insights','stories','updates','media'] });
    for (const { url, html } of newsHits) {
      const items = extractLinks(html, url).filter(l => l.text && l.text.length < 160).slice(0, 8);
      if (items.length) result.evidence.push({ url, title: 'News/Blog' });
      for (const it of items) result.news.push({ title: it.text, url: it.href });
      if (result.news.length >= 20) break;
    }
  } catch {}

  // Discover jobs-like pages (on-site)
  try {
    const careerHits = await boundedCrawl(homepageUrl, { maxPages: 20, includePatterns: ['career','job','join','work-with','employment','opportun'] });
    for (const { url, html } of careerHits) {
      const lines = extractJobLines(html);
      if (lines.length) result.evidence.push({ url, title: 'Careers' });
      for (const l of lines) result.jobs.push({ title: l, url });
      if (result.jobs.length >= 50) break;
    }
  } catch {}

  // If on-site jobs are scarce, augment with external search (Indeed)
  if ((result.jobs?.length || 0) < 5 && companyName) {
    try {
      const extJobs = await searchIndeed(companyName);
      if (extJobs.length) {
        result.jobs.push(...extJobs);
        result.evidence.push({ url: buildIndeedSearchUrl(companyName), title: 'External jobs: Indeed' });
      }
    } catch {}
  }

  // Deduplicate simple
  result.news = dedupeArray(result.news, it => (it.url || it.title || '').toLowerCase());
  result.jobs = dedupeArray(result.jobs, it => (it.url || it.title || '').toLowerCase());
  result.tech = dedupeArray(result.tech, it => (it.product || it.name || '').toLowerCase());

  // Advisory if no on-site jobs found
  if (!result.jobs.length) {
    const query = encodeURIComponent(companyName || domain);
    const indeedUrl = `https://www.indeed.com/jobs?q=${query}`;
    const linkedinUrl = `https://www.linkedin.com/jobs/search/?keywords=${query}`;
    result.jobs.push({ title: 'No on-site jobs detected — check external job boards', url: indeedUrl });
    result.evidence.push({ url: linkedinUrl, title: 'External jobs: LinkedIn search' });
  }

  return result;
}

function normalizeHomepage(homepageUrl, domain){
  if (homepageUrl) return homepageUrl;
  if (domain) try { return `https://${domain}`; } catch { return undefined; }
  return undefined;
}

async function fetchText(url) {
  // Add random delay to seem human (1-3 seconds)
  await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
  
  const r = await fetch(url, { 
    headers: { 
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'accept-language': 'en-US,en;q=0.9',
      'accept-encoding': 'gzip, deflate, br',
      'upgrade-insecure-requests': '1',
      'sec-fetch-dest': 'document',
      'sec-fetch-mode': 'navigate',
      'sec-fetch-site': 'none',
      'cache-control': 'max-age=0'
    } 
  });
  if (!r.ok) throw new Error(`fetch ${url} ${r.status}`);
  const ct = r.headers.get('content-type') || '';
  if (!ct.includes('text/html') && !ct.includes('xml')) throw new Error(`skip non-html ${url}`);
  return r.text();
}

function absolute(base, href){ try{ const u=new URL(href, base); return u.href; }catch{ return null; } }
function extractTitle(html){ return html.match(/<title>([^<]+)<\/title>/i)?.[1] || ''; }
function extractLinks(html, base){ return Array.from(html.matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)).map(m=>({ href:absolute(base,m[1]), text: (m[2]||'').replace(/<[^>]+>/g,'').trim() })).filter(l=>l.href); }
function isSameOrigin(base, href){ try { const a = new URL(base); const b = new URL(href, base); return a.origin === b.origin; } catch { return false; } }
function isCrawlableUrl(url){
  try {
    const u = new URL(url);
    const ext = (u.pathname.split('.').pop()||'').toLowerCase();
    const banned = new Set(['pdf','jpg','jpeg','png','gif','svg','ico','zip','rar','7z','mp4','mp3','webm','css','js']);
    if (banned.has(ext)) return false;
    if (u.hash) return false;
    return true;
  } catch { return false; }
}
async function boundedCrawl(startUrl, opts){
  const maxPages = Math.max(5, Math.min(30, Number(opts?.maxPages ?? 15)));
  const includePatterns = (opts?.includePatterns || []).map(p => new RegExp(p, 'i'));
  const visited = new Set();
  const queue = [startUrl];
  const hits = [];
  while (queue.length && visited.size < maxPages) {
    const url = queue.shift();
    if (!url || visited.has(url)) continue;
    visited.add(url);
    try {
      const html = await fetchText(url);
      const links = extractLinks(html, url)
        .map(l => l.href)
        .filter(h => isSameOrigin(startUrl, h) && isCrawlableUrl(h));
      if (!includePatterns.length || includePatterns.some(rx => rx.test(url))) hits.push({ url, html });
      for (const h of links) if (!visited.has(h) && queue.length + visited.size < maxPages) queue.push(h);
    } catch {}
  }
  return hits;
}

function extractJobLines(html) {
  const text = html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ');
  const lines = text.split(/\n|\.\s/).map(s => s.trim()).filter(Boolean);
  const patterns = /(engineer|developer|analyst|consultant|manager|specialist|coordinator|architect|designer|account|sales|support)/i;
  return lines.filter(s => s.length < 140 && patterns.test(s)).slice(0, 50);
}

function addTechSignals(techArr, baseUrl, html){
  const scripts = Array.from(html.matchAll(/<script[^>]+src=["']([^"']+)["']/gi)).map(m=>m[1]);
  const links = Array.from(html.matchAll(/<link[^>]+href=["']([^"']+)["']/gi)).map(m=>m[1]);
  const urls = [...scripts, ...links].map(h => absolute(baseUrl, h)).filter(Boolean);
  const domains = Array.from(new Set(urls.map(u => { try{ return new URL(u).hostname; }catch{ return null; } }).filter(Boolean)));
  function add(product, match){ if (domains.some(d => match.some(m => d.includes(m)))) techArr.push({ product }); }
  add('Google Analytics', ['googletagmanager.com','google-analytics.com']);
  add('Tag Manager', ['googletagmanager.com']);
  add('HubSpot', ['hs-scripts.com','hscollectedforms.net','hubspot.com']);
  add('Marketo', ['marketo','mktoss']);
  add('Salesforce', ['salesforce','pardot']);
  add('Cloudflare', ['cloudflare']);
  add('Shopify', ['shopify','cdn.shopify']);
  add('WordPress', ['wp-content','wp-includes']);
}

function dedupeArray(arr, keyFn){
  const seen = new Set();
  const out = [];
  for (const it of arr) {
    const k = keyFn(it);
    if (!k || !seen.has(k)) { if (k) seen.add(k); out.push(it); }
  }
  return out;
}

function buildIndeedSearchUrl(companyName){
  const q = encodeURIComponent(companyName);
  return `https://www.indeed.com/jobs?q=${q}`;
}

export async function searchJobsByKeywords({ keywords, location } = {}) {
  // Build search URL for job keywords (not company name)
  const q = encodeURIComponent(keywords);
  const l = location ? `&l=${encodeURIComponent(location)}` : '';
  const url = `https://www.indeed.com/jobs?q=${q}${l}`;
  
  try {
    // Extra delay before Indeed search (2-4 seconds total)
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
    
    const html = await fetchText(url);
    const jobs = [];
    
    // Extract job cards with company names
    const jobCards = html.match(/<div[^>]*class="[^"]*job_seen_beacon[^"]*"[^>]*>[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/gi) || [];
    
    for (const card of jobCards) {
      // Extract job title
      const titleMatch = card.match(/<span[^>]*title="([^"]+)"[^>]*>/);
      const title = titleMatch ? titleMatch[1] : '';
      
      // Extract company name - this is key!
      const companyMatch = card.match(/<a[^>]*data-testid="company-name"[^>]*>([^<]+)<\/a>/) ||
                           card.match(/<div[^>]*data-testid="company-name"[^>]*>([^<]+)<\/div>/) ||
                           card.match(/<span[^>]*class="[^"]*companyName[^"]*"[^>]*>([^<]+)<\/span>/);
      const company = companyMatch ? companyMatch[1].trim() : '';
      
      // Extract location
      const locationMatch = card.match(/<div[^>]*data-testid="job-location"[^>]*>([^<]+)<\/div>/) ||
                           card.match(/<div[^>]*class="[^"]*locationsContainer[^"]*"[^>]*>([^<]+)<\/div>/);
      const jobLocation = locationMatch ? locationMatch[1].trim() : '';
      
      // Extract job URL
      const urlMatch = card.match(/<a[^>]*href="\/rc\/clk\?([^"]+)"[^>]*>/) ||
                      card.match(/<a[^>]*href="\/pagead\/clk\?([^"]+)"[^>]*>/);
      const jobUrl = urlMatch ? `https://www.indeed.com/rc/clk?${urlMatch[1]}` : '';
      
      if (title && company) {
        jobs.push({
          title,
          company,
          location: jobLocation,
          url: jobUrl,
          source: 'indeed'
        });
      }
      
      if (jobs.length >= 20) break;
    }
    
    return jobs;
  } catch (err) {
    return [];
  }
}

async function searchIndeed(companyName){
  const url = buildIndeedSearchUrl(companyName);
  try {
    const html = await fetchText(url);
    // Extract job anchors typical to Indeed result items
    const items = [];
    const re = /<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
    let m;
    while ((m = re.exec(html)) && items.length < 20) {
      const href = m[1] || '';
      const text = (m[2] || '').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
      if (!/viewjob|pagead|rc\/clk/.test(href)) continue;
      if (text.length < 2) continue;
      const abs = absolute('https://www.indeed.com', href);
      if (!abs) continue;
      items.push({ title: text, url: abs, source: 'indeed' });
    }
    return items;
  } catch {
    return [];
  }
}