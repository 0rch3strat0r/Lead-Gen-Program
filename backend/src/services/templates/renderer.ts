/**
 * Simple mustache‑like renderer (no deps). Replace with a templating lib if desired.
 */
export function renderTemplate(tpl: string, data: Record<string, any>): string {
  return tpl.replace(/{{\s*([\w.]+)\s*}}/g, (_m, key) => {
    const val = key.split('.').reduce((acc: any, k: string) => (acc ? acc[k] : ''), data);
    return (val === undefined || val === null) ? '' : String(val);
  });
}