import fs from 'node:fs/promises';
import path from 'node:path';

const TPL_DIR = path.resolve(process.cwd(), 'frontend/templates');

export async function loadTemplate(file: string): Promise<string> {
  const full = path.join(TPL_DIR, file);
  return fs.readFile(full, 'utf-8');
}

export async function listTemplates(): Promise<Array<{name:string,file:string}>> {
  const manifestPath = path.join(TPL_DIR, 'manifest.json');
  const raw = await fs.readFile(manifestPath, 'utf-8');
  const m = JSON.parse(raw);
  return m.templates.map((t: any) => ({ name: t.name, file: t.file }));
}