// Best-effort, in-memory sliding-window rate limiter. Works within a single
// warm server/serverless instance — it does NOT coordinate across multiple
// instances, so on a highly-distributed serverless deployment a determined
// attacker could get multiple instances' worth of attempts. Given the gift
// card code space (32^8 combinations, ambiguous characters excluded) brute
// forcing isn't practical regardless — this exists to blunt casual scripted
// probing, not as a hard security boundary. For that, put this behind a
// real distributed limiter (e.g. Upstash Redis) instead.
const hits = new Map<string, number[]>();

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const timestamps = (hits.get(key) ?? []).filter((t) => now - t < windowMs);

  if (timestamps.length >= limit) {
    hits.set(key, timestamps);
    return false;
  }
  timestamps.push(now);
  hits.set(key, timestamps);

  // Opportunistic cleanup so the map doesn't grow unboundedly over the
  // life of a warm instance — cheap, and only runs occasionally.
  if (hits.size > 5000 && Math.random() < 0.01) {
    for (const [k, v] of hits) {
      if (v.every((t) => now - t >= windowMs)) hits.delete(k);
    }
  }

  return true;
}
