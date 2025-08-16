export type PassInput = { companyUrl?: string; companyName?: string; };
export type PassFinding = { title: string; detail: string; confidence?: number; tags?: string[]; };

export async function brodyPass(input: PassInput): Promise<PassFinding[]> {
  return [{ title: "Brody Pass", detail: `Analyzed ${input.companyName || input.companyUrl || 'target'}`, confidence: 0.6, tags: ["brody"] }];
}