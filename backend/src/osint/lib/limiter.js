const buckets = new Map();

export async function throttle(key, perMinute = 30) {
  const now = Date.now();
  const bucket = buckets.get(key) || { windowStart: now, count: 0 };
  const windowMs = 60_000;
  if (now - bucket.windowStart >= windowMs) {
    bucket.windowStart = now; bucket.count = 0;
  }
  if (bucket.count < perMinute) {
    bucket.count += 1;
    buckets.set(key, bucket);
    return;
  }
  const waitMs = windowMs - (now - bucket.windowStart) + 50;
  await new Promise(r => setTimeout(r, waitMs));
}