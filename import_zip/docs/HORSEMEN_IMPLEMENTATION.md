# Horsemen Implementation Guide

Implement each pass to return an array of findings: `{ title, detail, confidence?, tags? }`.

## Common Input
```ts
type PassInput = { companyUrl?: string; companyName?: string };
```

## Brody (Commercial Lens)
- Focus: revenue levers, clear offers, ICP alignment
- Signals: pricing pages, product SKUs, job posts for GTM roles, sales/CS tooling
- Output tags: ["brody","gtm","revenue"]

## Karen (Contradiction & Risk Lens)
- Focus: inconsistencies, compliance exposure, process gaps
- Signals: conflicting job posts, policy vs practice, audit/compliance mentions
- Output tags: ["karen","risk","compliance"]

## Kevin (Systems & Ops Lens)
- Focus: bottlenecks, manual workflows, data handoffs
- Signals: “manual”, “reconcile”, “copy/paste”, multiple systems without integration
- Output tags: ["kevin","ops","manual"]

## Durin (Deep Research / OSINT Lens)
- Focus: long‑form OSINT, leadership, funding, competitor posture, tech stack
- Sources: news RSS, careers, about pages, docs, public filings
- Output tags: ["durin","osint","competitors"]

## Pinko (Metadata & Traceability)
- Focus: citations, dates, confidence scores, provenance
- Output: attach `meta: { source, date, method }` and normalize tags
- Output tags: ["pinko","meta"]

## Pass Quality Bar
- 4–8 concrete findings per pass
- Each with a specific observation + why it matters (so we can map to solutions/ROI)
- Prefer structured phrasing: “We observed X. This implies Y. Therefore, opportunity Z.”
