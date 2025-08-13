import { withRetry } from './lib/retry.js';

export async function identity(q) {
  const domain = q.domain || (q.homepageUrl ? new URL(q.homepageUrl).hostname : undefined);
  const homepageUrl = q.homepageUrl || (domain ? `https://${domain}` : undefined);
  return { _source: 'identity', companyName: q.companyName, domain, homepageUrl, evidence: homepageUrl ? [{ url: homepageUrl, title: 'Homepage' }] : [] };
}

export async function websiteBasics(q) {
  if (!q.homepageUrl) return { _source: 'website' };
  const html = await withRetry(() => fetch(q.homepageUrl).then(r => r.text()));
  const titleMatch = html.match(/<title>([^<]+)<\/title>/i)?.[1];
  return { _source: 'website', evidence: [{ url: q.homepageUrl, title: titleMatch || 'Homepage' }] };
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

export async function jobsBoards(_q) {
  const jobs = [];
  return { _source: 'jobs', jobs };
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