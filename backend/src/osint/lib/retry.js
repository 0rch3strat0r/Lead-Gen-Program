export async function withRetry(fn, opts = {}) {
  const retries = Number(opts.retries ?? 2);
  const baseMs = Number(opts.baseMs ?? 300);
  let lastErr;
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (i < retries) {
        const delay = baseMs * Math.pow(2, i);
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }
  throw lastErr;
}