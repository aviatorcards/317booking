type Bucket = { timestamps: number[] };

const buckets = new Map<string, Bucket>();

/** Returns true when the caller is within the limit. */
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = buckets.get(key) ?? { timestamps: [] };
  bucket.timestamps = bucket.timestamps.filter((t) => now - t < windowMs);
  if (bucket.timestamps.length >= limit) {
    buckets.set(key, bucket);
    return false;
  }
  bucket.timestamps.push(now);
  buckets.set(key, bucket);
  return true;
}

export function clientIp(headerSource: { get(name: string): string | null }): string {
  const forwarded = headerSource.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return headerSource.get("x-real-ip") ?? "unknown";
}

export function resetRateLimits() {
  buckets.clear();
}
