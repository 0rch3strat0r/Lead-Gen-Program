export type ScoreInput = { companyUrl?: string; companyName?: string; findings: any[] };
export type ScoreOutput = { score: number; reasons: string[] };

export function scoreOpportunity(input: ScoreInput): ScoreOutput {
  const reasons: string[] = [];
  let score = 50;
  const txt = JSON.stringify(input.findings).toLowerCase();
  if (txt.includes('manual')) { score += 15; reasons.push('Manual process signals found'); }
  if (txt.includes('cost') || txt.includes('roi')) { score += 10; reasons.push('ROI indicators present'); }
  if (txt.includes('compliance') || txt.includes('risk')) { score += 5; reasons.push('Risk/compliance angle present'); }
  return { score: Math.max(0, Math.min(100, score)), reasons };
}
