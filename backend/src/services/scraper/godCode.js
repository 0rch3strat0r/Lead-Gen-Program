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

// Search LinkedIn Jobs
async function searchLinkedIn(keywords, location) {
  const q = encodeURIComponent(keywords);
  const l = location ? encodeURIComponent(location) : '';
  const url = `https://www.linkedin.com/jobs/search/?keywords=${q}&location=${l}`;
  
  try {
    await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1500));
    const html = await fetchText(url);
    const jobs = [];
    
    // LinkedIn job cards
    const jobCards = html.match(/<div[^>]*class="[^"]*job-search-card[^"]*"[^>]*>[\s\S]*?<\/div>\s*<\/div>/gi) || [];
    
    for (const card of jobCards) {
      const titleMatch = card.match(/<h3[^>]*class="[^"]*job-search-card__title[^"]*"[^>]*>([^<]+)<\/h3>/) ||
                        card.match(/<a[^>]*class="[^"]*job-card-list__title[^"]*"[^>]*>([^<]+)<\/a>/);
      const title = titleMatch ? titleMatch[1].trim() : '';
      
      const companyMatch = card.match(/<h4[^>]*class="[^"]*job-search-card__company-name[^"]*"[^>]*>([^<]+)<\/h4>/) ||
                          card.match(/<a[^>]*class="[^"]*job-card-container__company-name[^"]*"[^>]*>([^<]+)<\/a>/);
      const company = companyMatch ? companyMatch[1].trim() : '';
      
      const locationMatch = card.match(/<span[^>]*class="[^"]*job-search-card__location[^"]*"[^>]*>([^<]+)<\/span>/);
      const jobLocation = locationMatch ? locationMatch[1].trim() : '';
      
      if (title && company) {
        jobs.push({ title, company, location: jobLocation, url: url, source: 'linkedin' });
      }
      if (jobs.length >= 15) break;
    }
    return jobs;
  } catch {
    return [];
  }
}

// Search ZipRecruiter
async function searchZipRecruiter(keywords, location) {
  const q = encodeURIComponent(keywords);
  const l = location ? encodeURIComponent(location) : '';
  const url = `https://www.ziprecruiter.com/jobs-search?search=${q}&location=${l}`;
  
  try {
    await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1500));
    const html = await fetchText(url);
    const jobs = [];
    
    // ZipRecruiter job articles
    const jobCards = html.match(/<article[^>]*class="[^"]*job_result[^"]*"[^>]*>[\s\S]*?<\/article>/gi) || [];
    
    for (const card of jobCards) {
      const titleMatch = card.match(/<h2[^>]*class="[^"]*job_title[^"]*"[^>]*>([^<]+)<\/h2>/) ||
                        card.match(/<a[^>]*class="[^"]*job_link[^"]*"[^>]*>([^<]+)<\/a>/);
      const title = titleMatch ? titleMatch[1].trim() : '';
      
      const companyMatch = card.match(/<a[^>]*class="[^"]*company_name[^"]*"[^>]*>([^<]+)<\/a>/) ||
                          card.match(/<span[^>]*class="[^"]*hiring-company[^"]*"[^>]*>([^<]+)<\/span>/);
      const company = companyMatch ? companyMatch[1].trim() : '';
      
      const locationMatch = card.match(/<span[^>]*class="[^"]*location[^"]*"[^>]*>([^<]+)<\/span>/);
      const jobLocation = locationMatch ? locationMatch[1].trim() : '';
      
      if (title && company) {
        jobs.push({ title, company, location: jobLocation, url: url, source: 'ziprecruiter' });
      }
      if (jobs.length >= 15) break;
    }
    return jobs;
  } catch {
    return [];
  }
}

// Search SimplyHired
async function searchSimplyHired(keywords, location) {
  const q = encodeURIComponent(keywords);
  const l = location ? encodeURIComponent(location) : '';
  const url = `https://www.simplyhired.com/search?q=${q}&l=${l}`;
  
  try {
    await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1500));
    const html = await fetchText(url);
    const jobs = [];
    
    // SimplyHired job cards
    const jobCards = html.match(/<div[^>]*class="[^"]*SerpJob[^"]*"[^>]*>[\s\S]*?<\/article>/gi) || [];
    
    for (const card of jobCards) {
      const titleMatch = card.match(/<h2[^>]*class="[^"]*jobposting-title[^"]*"[^>]*>([^<]+)<\/h2>/) ||
                        card.match(/data-job-title="([^"]+)"/);
      const title = titleMatch ? titleMatch[1].trim() : '';
      
      const companyMatch = card.match(/<span[^>]*class="[^"]*jobposting-company[^"]*"[^>]*>([^<]+)<\/span>/) ||
                          card.match(/data-company="([^"]+)"/);
      const company = companyMatch ? companyMatch[1].trim() : '';
      
      const locationMatch = card.match(/<span[^>]*class="[^"]*jobposting-location[^"]*"[^>]*>([^<]+)<\/span>/);
      const jobLocation = locationMatch ? locationMatch[1].trim() : '';
      
      if (title && company) {
        jobs.push({ title, company, location: jobLocation, url: url, source: 'simplyhired' });
      }
      if (jobs.length >= 15) break;
    }
    return jobs;
  } catch {
    return [];
  }
}

// Search multiple Workday sites (major companies use Workday)
async function searchWorkday(keywords, location) {
  const jobs = [];
  // Major companies that use Workday for job postings
  const workdaySites = [
    'https://amazon.jobs',
    'https://jobs.apple.com',
    'https://careers.google.com',
    'https://careers.microsoft.com',
    'https://www.metacareers.com'
  ];
  
  for (const site of workdaySites.slice(0, 2)) { // Limit to avoid timeout
    try {
      await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 1000));
      const searchUrl = `${site}/search?q=${encodeURIComponent(keywords)}`;
      const html = await fetchText(searchUrl);
      
      // Generic job posting patterns
      const jobMatches = html.match(/<a[^>]*href="[^"]*job[^"]*"[^>]*>(.*?)<\/a>/gi) || [];
      const companyName = site.replace('https://', '').replace('.jobs', '').replace('careers.', '').replace('.com', '');
      
      for (const match of jobMatches.slice(0, 5)) {
        const title = match.replace(/<[^>]+>/g, '').trim();
        if (title && title.length > 5 && title.length < 100) {
          jobs.push({ 
            title, 
            company: companyName, 
            location: location || 'Remote', 
            url: site, 
            source: 'workday' 
          });
        }
      }
    } catch {
      // Skip failed sites
    }
  }
  return jobs;
}

// Search Indeed (existing function improved)
async function searchIndeedJobs(keywords, location) {
  const q = encodeURIComponent(keywords);
  const l = location ? `&l=${encodeURIComponent(location)}` : '';
  const url = `https://www.indeed.com/jobs?q=${q}${l}`;
  
  try {
    await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 2000));
    const html = await fetchText(url);
    const jobs = [];
    
    // Multiple patterns for Indeed's changing HTML
    const jobCards = html.match(/<div[^>]*class="[^"]*job_seen_beacon[^"]*"[^>]*>[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/gi) ||
                    html.match(/<div[^>]*class="[^"]*jobsearch-SerpJobCard[^"]*"[^>]*>[\s\S]*?<\/div>\s*<\/div>/gi) ||
                    html.match(/<div[^>]*data-jk="[^"]*"[^>]*>[\s\S]*?<\/div>\s*<\/div>/gi) || [];
    
    for (const card of jobCards) {
      const titleMatch = card.match(/<span[^>]*title="([^"]+)"[^>]*>/) ||
                        card.match(/<h2[^>]*class="[^"]*title[^"]*"[^>]*>.*?<a[^>]*>([^<]+)<\/a>/) ||
                        card.match(/<a[^>]*class="[^"]*jobtitle[^"]*"[^>]*>([^<]+)<\/a>/);
      const title = titleMatch ? (titleMatch[1] || titleMatch[2]).trim() : '';
      
      const companyMatch = card.match(/<a[^>]*data-testid="company-name"[^>]*>([^<]+)<\/a>/) ||
                          card.match(/<div[^>]*data-testid="company-name"[^>]*>([^<]+)<\/div>/) ||
                          card.match(/<span[^>]*class="[^"]*companyName[^"]*"[^>]*>([^<]+)<\/span>/) ||
                          card.match(/<span[^>]*class="[^"]*company[^"]*"[^>]*>([^<]+)<\/span>/);
      const company = companyMatch ? companyMatch[1].trim() : '';
      
      const locationMatch = card.match(/<div[^>]*data-testid="job-location"[^>]*>([^<]+)<\/div>/) ||
                           card.match(/<div[^>]*class="[^"]*locationsContainer[^"]*"[^>]*>([^<]+)<\/div>/) ||
                           card.match(/<span[^>]*class="[^"]*location[^"]*"[^>]*>([^<]+)<\/span>/);
      const jobLocation = locationMatch ? locationMatch[1].trim() : '';
      
      if (title && company) {
        jobs.push({ title, company, location: jobLocation, url: url, source: 'indeed' });
      }
      if (jobs.length >= 20) break;
    }
    return jobs;
  } catch {
    return [];
  }
}

// Main function that searches ALL job boards
export async function searchJobsByKeywords({ keywords, location } = {}) {
  console.log(`Searching for "${keywords}" in "${location}" across multiple job boards...`);
  
  // Search all job boards in parallel
  const [indeedJobs, linkedinJobs, zipJobs, simplyJobs, workdayJobs] = await Promise.all([
    searchIndeedJobs(keywords, location),
    searchLinkedIn(keywords, location),
    searchZipRecruiter(keywords, location),
    searchSimplyHired(keywords, location),
    searchWorkday(keywords, location)
  ]);
  
  // Combine all results
  const allJobs = [
    ...indeedJobs,
    ...linkedinJobs,
    ...zipJobs,
    ...simplyJobs,
    ...workdayJobs
  ];
  
  // Deduplicate by company name
  const uniqueCompanies = new Map();
  for (const job of allJobs) {
    if (!uniqueCompanies.has(job.company)) {
      uniqueCompanies.set(job.company, job);
    }
  }
  
  const jobs = Array.from(uniqueCompanies.values());
  
  console.log(`Found ${jobs.length} unique companies across ${allJobs.length} total jobs`);
  console.log(`Sources: Indeed(${indeedJobs.length}), LinkedIn(${linkedinJobs.length}), Zip(${zipJobs.length}), Simply(${simplyJobs.length}), Workday(${workdayJobs.length})`);
  
  return jobs.slice(0, 50); // Return top 50 to avoid overwhelming
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