import { withRetry } from './lib/retry.js';

async function fetchText(url) {
  const r = await withRetry(() => fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 LeadGenBot/1.0' } }));
  if (!r.ok) throw new Error(`fetch ${url} ${r.status}`);
  return r.text();
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

export async function rssNews(_q) {
  const news = [];
  return { _source: 'rss', news };
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
  const bases = [home, `${u.origin}/careers`, `${u.origin}/jobs`, `${u.origin}/about/careers`, `${u.origin}/company/careers`];
  return Array.from(new Set(bases));
}

function extractJobLines(html) {
  const text = html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ');
  const lines = text.split(/\n|\.\s/).map(s => s.trim()).filter(Boolean);
  const patterns = /(engineer|developer|analyst|consultant|manager|specialist|coordinator|architect|designer|account|sales|support)/i;
  return lines.filter(s => s.length < 120 && patterns.test(s)).slice(0, 10);
}

export async function jobsBoards(q) {
  const jobs = [];
  if (!q.homepageUrl) return { _source: 'jobs', jobs };
  const urls = guessCareersUrls(q.homepageUrl);
  const evidence = [];
  for (const url of urls) {
    try {
      const html = await fetchText(url);
      const lines = extractJobLines(html);
      if (lines.length) evidence.push({ url, title: 'Careers' });
      for (const l of lines) jobs.push({ title: l, url });
      if (jobs.length >= 15) break;
    } catch {}
  }
  return { _source: 'jobs', jobs, evidence };
}

export async function socialPublic(_q) {
  const social = [];
  return { _source: 'social', social };
}

export async function techFootprint(_q) {
  const tech = [];
  return { _source: 'tech', tech };
}

export async function procurement(_q) {
  const procurement = [];
  return { _source: 'procurement', procurement };
}

export async function archives(_q) {
  const archives = [];
  return { _source: 'archives', archives };
}