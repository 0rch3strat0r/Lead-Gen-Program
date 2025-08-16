# HORSEMEN_IMPLEMENTATION.md
**Scope:** Exact prompts, rules, and interfaces for the Horsemen + God Code deep‑research pipeline.
**No enrichment APIs.** OSINT/open web only. **ESM everywhere (no CommonJS).**
**Collector:** Use the project’s God Code scraper as the only data collector.

---

## 0) Interfaces (God Code ➜ Horsemen)

Collector module: `backend/src/services/scraper/godCode.ts`

```ts
export type SourceRef = { title?: string; url: string; date?: string; publisher?: string };

export type NewsItem = { title: string; url: string; date?: string; source?: string; topics?: string[] };
export type JobItem  = { title: string; employer?: string; location?: string; url: string; date?: string; text?: string };
export type TechFact = { product: string; category?: string; firstSeen?: string; lastSeen?: string; evidenceUrl?: string };
export type CorpRecord = { legalName: string; status?: 'Active'|'Inactive'|'Unknown'; jurisdiction?: string; ids?: Record<string,string>; officers?: string[]; sources?: SourceRef[] };
export type SocialPost = { platform: 'linkedin'|'twitter'|'facebook'|'other'; url: string; date?: string; text?: string };
export type ProcRecord = { buyer?: string; supplier?: string; amount?: string; date?: string; url: string; notes?: string };
export type ArchiveSnapshot = { url: string; snapshotUrl: string; timestamp: string };

export type GodCodeResult = {
  companyName?: string;
  domain?: string;
  homepageUrl?: string;
  corp?: CorpRecord | null;
  news?: NewsItem[];
  jobs?: JobItem[];
  tech?: TechFact[];
  social?: SocialPost[];
  procurement?: ProcRecord[];
  archives?: ArchiveSnapshot[];
  evidence?: SourceRef[];
};

export async function scrape(input: {
  companyName?: string;
  homepageUrl?: string;
  domain?: string;
  notes?: string;
}): Promise<GodCodeResult>;
```

Research context passed to Horsemen (normalized):

```ts
type OsintContext = Required<Pick<GodCodeResult,'companyName'|'domain'|'homepageUrl'>> & {
  corp: GodCodeResult['corp'] | null;
  news: NonNullable<GodCodeResult['news'>];
  jobs: NonNullable<GodCodeResult['jobs'>];
  tech: NonNullable<GodCodeResult['tech'>];
  social: NonNullable<GodCodeResult['social'>];
  procurement: NonNullable<GodCodeResult['procurement'>];
  archives: NonNullable<GodCodeResult['archives'>];
  evidence: NonNullable<GodCodeResult['evidence'>];
};
```

Completion contract (quality gate): A research job is “complete” only when all required touchpoints (identity/site, RSS news, Jobs, Tech) have returned successfully (with retries). Optional touchpoints (GDELT/Wikipedia/OpenCorporates/social/procurement/archives) never block completion.

---

## 1) Horsemen roles (prompts & outputs)

All Horsemen MUST:
- Use only facts present in OsintContext and cite sources (URL + title + date).
- Avoid hypotheticals. If a fact cannot be supported by at least one source, do not assert it.
- Prefer recent items (last 120 days) for “momentum/trigger” claims and label dates explicitly.

Finding schema (all passes must return arrays of this type):

```ts
type ResearchFinding = {
  title: string;                 // concise, decision-useful
  detail: string;                // 2–5 sentences, concrete evidence inline
  confidence?: number;           // 0..1 (0.2 = weak, 0.5 = medium, 0.8 = strong)
  tags?: string[];               // e.g., ["market","why-now","ops","risk","verified"]
  sources?: {title?:string; url:string; date?:string}[];
};
```

A) BRODY — Market & Momentum
- Goal: “Why now?” Make the business case with triggers.
- Sources: news, tech, procurement, archives
- Output: 3–6 momentum findings, no fluff
- Prompt: Identify concrete “Why Now” triggers in the last 120 days. Prioritize events that change urgency (regulation, cost pressure, vendor change, new site/office, hiring surge/decline). Tie each trigger to a plausible business impact in one sentence.
- Tags: ["market","why-now","momentum"].

B) KAREN — Contradictions & Gaps
- Goal: Find “say vs do” mismatches and operational gaps.
- Sources: jobs + tech + corp + homepage/about
- Prompt: List mismatches where the company’s messaging or goals conflict with their observable hiring/stack/footprint. For each, state the risk/cost exposure in dollars/time terms if possible.
- Tags: ["gap","risk","ops"].

C) KEVIN — Verification & Confidence
- Goal: Raise signal quality; down‑rank weak claims.
- Action: Cross-check all high-impact claims; set confidence; consolidate duplicates.
- Tags: ["verified","confidence"].

D) DURIN — Deep OSINT & Triggers
- Goal: Pull buried details (no login, no paid APIs).
- Sources: procurement, archives, long-tail news, niche public portals
- Prompt: Mine public portals and archives for triggers that expose cost, compliance, or vendor change opportunities. Summarize concrete evidence and link the actionable angle.
- Tags: ["osint","trigger","pain"].

E) PINKO — Metadata, Hygiene, and Compliance
- Goal: Make outputs provable and template-ready.
- Action: Normalize citations; ensure each finding has at least one source; add tags; remove duplicates.
- Tags: ["meta","citation"].

---

## 2) Scoring (opportunity-centric)

Signal (weight) — How computed:
- Manual-role hiring density (+25)
- Absence of AI/automation roles (+10)
- Negative ops/margin pressure (+10)
- Outdated stack vs peers (+10)
- Fresh trigger in last 90d (+15)
- Verified findings fraction (+10)
- Contradiction count (+10)
- Data quality penalty (–X)

Output:

```ts
type ScoreOutput = {
  score: number;                  // 0..100
  reasons: string[];              // bullet reasons
  features: Record<string,number> // per-signal contribution
};
```

---

## 3) Workflow (one pass, ordered, quality‑gated)

1) Collect (God Code) → scrape({ companyName?, homepageUrl?, domain?, notes? }) : GodCodeResult
2) Normalize & Gate → ensure arrays/nulls; required touchpoints present after retries; optional never block.
3) Horsemen → Brody → Karen → Kevin → Durin → Pinko.
4) Score → produce ScoreOutput + reason codes.
5) Template Fill → recent events, hiring signals, tech snapshot, contradictions, verified facts, opportunity map, score, citations.

---

## 4) Style rules
- Concrete > Abstract (dates, counts, amounts, job titles, product names).
- Max 5 sentences per finding.
- No speculation; lower confidence if unsure.
- Always cite (≥1 URL; 2 for high‑impact claims when available).
- Plain English. Exec‑brief tone.

---

## 5) Inputs from UI/Admin
- notes (string) → hints (“focus on compliance triggers”, “ignore social”).
- Optional booleans: includeArchives, includeProcurement, includeSocial (default true but non‑blocking).

---

## 6) Done criteria
- Required touchpoints passed, ≥1 finding with citations, score computed.
- If required missing after retries → Fail with message and evidence log.