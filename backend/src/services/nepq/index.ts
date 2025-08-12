/**
 * NEPQ accessor stubs.
 * Ingest parsed snippets (markdown) from /docs/nepq/snippets or return pointers to PDFs.
 */
import fs from 'node:fs/promises';
import path from 'node:path';

const SNIPPETS_DIR = path.resolve(process.cwd(), 'docs/nepq/snippets');

export async function getIntroPatterns(): Promise<string[]> {
  try {
    const txt = await fs.readFile(path.join(SNIPPETS_DIR, 'intros.md'), 'utf-8');
    return txt.split('\n').filter(Boolean);
  } catch {
    return [
      "Curious, how are you currently handling {{pain_point}}?",
      "Would it make sense to explore a way to reduce {{hours_wasted}} hours/month?"
    ];
  }
}

export async function getObjectionDiffusers(): Promise<string[]> {
  try {
    const txt = await fs.readFile(path.join(SNIPPETS_DIR, 'objections.md'), 'utf-8');
    return txt.split('\n').filter(Boolean);
  } catch {
    return [
      "Fair enough—when you say {{objection}}, can you unpack that a bit so I don't assume?",
      "That makes sense—if there were a way to {{benefit}} without {{risk}}, would you be open to a quick look?"
    ];
  }
}

export async function getDiscoveryQuestions(): Promise<string[]> {
  try {
    const txt = await fs.readFile(path.join(SNIPPETS_DIR, 'discovery.md'), 'utf-8');
    return txt.split('\n').filter(Boolean);
  } catch {
    return [
      "Walk me through your current process for {{process}} end‑to‑end?",
      "Where do handoffs typically break down or get reworked?"
    ];
  }
}