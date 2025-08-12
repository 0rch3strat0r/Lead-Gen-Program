export type PassInput = { companyUrl?: string; companyName?: string; };
export type PassFinding = { title: string; detail: string; confidence?: number; tags?: string[]; };

export async function karenPass(input: PassInput): Promise<PassFinding[]> {
  return [{ title: "Karen Pass", detail: `Analyzed ${input.companyName || input.companyUrl || 'target'}`, confidence: 0.6, tags: ["karen"] }];
}