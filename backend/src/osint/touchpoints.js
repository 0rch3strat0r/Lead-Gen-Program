export const TOUCHPOINTS = [
  { id: 'identity', stage: 1, required: true, rateKey: 'identity', fn: async (q) => ({ _source:'identity', companyName: q.companyName, domain: q.domain, homepageUrl: q.homepageUrl }) },
  { id: 'website',  stage: 1, required: true, rateKey: 'website',  fn: async (_q) => ({ _source:'website', evidence:[{ url:'#', title:'Home page detected' }] }) },
  { id: 'rss',      stage: 2, required: true, rateKey: 'rss',      fn: async (_q) => ({ _source:'rss', news:[{ url:'#', title:'News item' }] }) },
  { id: 'jobs',     stage: 2, required: false, rateKey: 'jobs',     fn: async (_q) => ({ _source:'jobs', jobs:[{ url:'#', title:'Job post' }] }) },
  { id: 'tech',     stage: 3, required: false, rateKey: 'tech',     fn: async (_q) => ({ _source:'tech', tech:[{ name:'GA4' }] }) }
];