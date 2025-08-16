import { withRetry } from './lib/retry.js';

async function fetchText(url) {
  const r = await withRetry(() => fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 LeadGenBot/1.0' } }));
  if (!r.ok) throw new Error(`fetch ${url} ${r.status}`);
  const ct = r.headers.get('content-type') || '';
  if (!ct.includes('text/html') && !ct.includes('xml')) throw new Error(`skip non-html ${url}`);
  return r.text();
}

function isSameOrigin(base, href){
  try { const a = new URL(base); const b = new URL(href, base); return a.origin === b.origin; } catch { return false; }
}
function absolute(base, href){ try{ const u=new URL(href, base); return u.href; }catch{ return null; } }
function extractLinks(html, base){ return Array.from(html.matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)).map(m=>({ href:absolute(base,m[1]), text: (m[2]||'').replace(/<[^>]+>/g,'').trim() })).filter(l=>l.href); }
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
      // Record hit if matches includePatterns
      if (!includePatterns.length || includePatterns.some(rx => rx.test(url))) {
        hits.push({ url, html });
      }
      for (const h of links) if (!visited.has(h) && queue.length + visited.size < maxPages) queue.push(h);
    } catch { /* ignore single page errors */ }
  }
  return hits;
}

export async function identity(q) {
  const domain = q.domain || (q.homepageUrl ? new URL(q.homepageUrl).hostname : undefined);
  const homepageUrl = q.homepageUrl || (domain ? `https://${domain}` : undefined);
  return { _source: 'identity', companyName: q.companyName, domain, homepageUrl, evidence: homepageUrl ? [{ url: homepageUrl, title: 'Homepage' }] : [] };
}

export async function websiteBasics(q) {
  if (!q.homepageUrl) return { _source: 'website' };
  try {
    const html = await fetchText(q.homepageUrl);
    const title = html.match(/<title>([^<]+)<\/title>/i)?.[1] || '';
    const metaDesc = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["'][^>]*>/i)?.[1] || '';
    const h1s = Array.from(html.matchAll(/<h1[^>]*>(.*?)<\/h1>/gi)).map(m => m[1].replace(/<[^>]+>/g, '').trim()).slice(0, 3);
    const evidence = [{ url: q.homepageUrl, title: title || 'Homepage' }];
    return { _source: 'website', evidence, corp: null, news: [], jobs: [], tech: [], social: [], procurement: [], archives: [], homepageUrl: q.homepageUrl, companyName: q.companyName, domain: q.domain, meta: { title, metaDesc, h1s } };
  } catch (e) {
    return { _source: 'website', evidence: [{ url: q.homepageUrl, title: 'Homepage (fetched failed)' }] };
  }
}

export async function rssNews(q) {
  const news = [];
  const evidence = [];
  if (!q.homepageUrl) return { _source: 'rss', news };
  try {
    const html = await fetchText(q.homepageUrl);
    // Discover RSS/Atom
    const feedHref = html.match(/<link[^>]+type=["'](application\/rss\+xml|application\/atom\+xml)["'][^>]*href=["']([^"']+)["'][^>]*>/i)?.[2];
    if (feedHref) {
      const feedUrl = absolute(q.homepageUrl, feedHref);
      if (feedUrl) {
        const feed = await fetchText(feedUrl);
        const items = Array.from(feed.matchAll(/<item[\s\S]*?<title>([\s\S]*?)<\/title>[\s\S]*?<link>([\s\S]*?)<\/link>/gi)).slice(0, 12);
        for (const it of items) news.push({ title: it[1].trim(), url: it[2].trim() });
        if (news.length) evidence.push({ url: feedUrl, title: 'RSS feed' });
      }
    }
    if (!news.length) {
      // Fallback: try common sections
      for (const path of ['/news','/press','/blog','/insights','/media','/stories','/updates']) {
        const url = new URL(path, q.homepageUrl).href;
        try {
          const page = await fetchText(url);
          const links = extractLinks(page, url).filter(l => l.text && l.text.length < 160).slice(0, 12);
          for (const l of links) news.push({ title: l.text, url: l.href });
          if (links.length) evidence.push({ url, title: 'News/Blog' });
          if (news.length >= 12) break;
        } catch {}
      }
    }
    if (!news.length) {
      // Last resort: bounded crawler to discover likely news pages
      const hits = await boundedCrawl(q.homepageUrl, { maxPages: 20, includePatterns: ['news','press','blog','insights','media','stories','updates'] });
      for (const { url, html: page } of hits) {
        const links = extractLinks(page, url).filter(l => l.text && l.text.length < 160).slice(0, 6);
        for (const l of links) news.push({ title: l.text, url: l.href });
        if (links.length) evidence.push({ url, title: 'Discovered by crawl' });
        if (news.length >= 12) break;
      }
    }
  } catch {}
  return { _source: 'rss', news, evidence };
}

export async function gdeltNews(_q) {
  const news = [];
  return { _source: 'gdelt', news };
}

export async function wikipediaFacts(q) {
  const corp = q.companyName ? { legalName: q.companyName, status: 'Unknown', officers: [], sources: [] } : null;
  return { _source: 'wikipedia', corp };
}

export async function openCorporatesFacts(q) {
  const corp = q.companyName ? { legalName: q.companyName, status: 'Unknown' } : null;
  return { _source: 'open_corporates', corp };
}

function guessCareersUrls(home) {
  const u = new URL(home);
  const bases = [home, `${u.origin}/careers`, `${u.origin}/jobs`, `${u.origin}/about/careers`, `${u.origin}/company/careers`, `${u.origin}/about-us/careers`, `${u.origin}/join-us`];
  return Array.from(new Set(bases));
}

function extractJobLines(html) {
  const text = html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ');
  const lines = text.split(/\n|\.\s/).map(s => s.trim()).filter(Boolean);
  const patterns = /(engineer|developer|analyst|consultant|manager|specialist|coordinator|architect|designer|account|sales|support)/i;
  return lines.filter(s => s.length < 140 && patterns.test(s)).slice(0, 50);
}

export async function jobsBoards(q) {
  const jobs = [];
  if (!q.homepageUrl) return { _source: 'jobs', jobs };
  const urls = guessCareersUrls(q.homepageUrl);
  const evidence = [];
  // First pass: common paths
  for (const url of urls) {
    try {
      const html = await fetchText(url);
      const lines = extractJobLines(html);
      if (lines.length) evidence.push({ url, title: 'Careers' });
      for (const l of lines) jobs.push({ title: l, url });
      if (jobs.length >= 50) break;
    } catch {}
  }
  // Second pass: bounded crawl to discover careers-like pages
  if (jobs.length < 10) {
    const hits = await boundedCrawl(q.homepageUrl, { maxPages: 20, includePatterns: ['careers','jobs','join','work-with','employment','positions','opportun'] });
    for (const { url, html } of hits) {
      try {
        const lines = extractJobLines(html);
        if (lines.length) evidence.push({ url, title: 'Careers (crawl)' });
        for (const l of lines) jobs.push({ title: l, url });
        if (jobs.length >= 50) break;
      } catch {}
    }
  }
  return { _source: 'jobs', jobs, evidence };
}

export async function socialPublic(_q) {
  const social = [];
  return { _source: 'social', social };
}

export async function techFootprint(q) {
  const tech = [];
  const evidence = [];
  if (!q.homepageUrl) return { _source: 'tech', tech };
  try {
    const html = await fetchText(q.homepageUrl);
    const scripts = Array.from(html.matchAll(/<script[^>]+src=["']([^"']+)["']/gi)).map(m=>m[1]);
    const links = Array.from(html.matchAll(/<link[^>]+href=["']([^"']+)["']/gi)).map(m=>m[1]);
    const urls = [...scripts, ...links].map(h => absolute(q.homepageUrl, h)).filter(Boolean);
    const domains = Array.from(new Set(urls.map(u => { try{ return new URL(u).hostname; }catch{ return null; } }).filter(Boolean)));
    function add(name, match){ if (domains.some(d => match.some(m => d.includes(m)))) tech.push({ name }); }
    add('Google Analytics', ['googletagmanager.com','google-analytics.com']);
    add('Tag Manager', ['googletagmanager.com']);
    add('HubSpot', ['hs-scripts.com','hscollectedforms.net','hubspot.com']);
    add('Marketo', ['marketo','mktoss']);
    add('Salesforce', ['salesforce','pardot']);
    add('Cloudflare', ['cloudflare']);
    add('Shopify', ['shopify','cdn.shopify']);
    add('WordPress', ['wp-content','wp-includes']);
    if (tech.length) evidence.push({ url: q.homepageUrl, title: 'Tech signals' });
  } catch {}
  return { _source: 'tech', tech, evidence };
}

export async function procurement(_q) {
  const procurement = [];
  return { _source: 'procurement', procurement };
}

export async function archives(_q) {
  const archives = [];
  return { _source: 'archives', archives };
}