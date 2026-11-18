// Small key-value store for saved pages (birthday surprises, orders).
// Uses Upstash Redis when connected (required on Vercel). When testing on your own
// computer without Upstash, it keeps data in memory until the test server stops.
const mem = new Map();
const memLists = new Map();

function creds() {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  return url && token ? { url: url.replace(/\/$/, ""), token } : null;
}

// On Vercel, memory would lose pages, so saving needs Upstash.
export function storeReady() {
  return !!creds() || !process.env.VERCEL;
}

async function run(commands) {
  const c = creds();
  const r = await fetch(c.url + "/pipeline", {
    method: "POST",
    headers: { Authorization: "Bearer " + c.token, "Content-Type": "application/json" },
    body: JSON.stringify(commands)
  });
  if (!r.ok) throw new Error("store " + r.status);
  const out = await r.json();
  for (const x of out) if (x && x.error) throw new Error("store " + x.error);
  return out.map((x) => x.result);
}

export async function getJSON(key) {
  if (!creds()) return mem.has(key) ? JSON.parse(mem.get(key)) : null;
  const [v] = await run([["GET", key]]);
  return v ? JSON.parse(v) : null;
}

export async function setJSON(key, value, ttlSeconds) {
  const s = JSON.stringify(value);
  if (!creds()) { mem.set(key, s); return; }
  await run([ttlSeconds ? ["SET", key, s, "EX", ttlSeconds] : ["SET", key, s]]);
}

export async function del(...keys) {
  if (!creds()) { keys.forEach((k) => mem.delete(k)); return; }
  await run([["DEL", ...keys]]);
}

export async function pushToList(key, value, max = 1000) {
  if (!creds()) { const l = memLists.get(key) || []; l.unshift(value); memLists.set(key, l.slice(0, max)); return; }
  await run([["LPUSH", key, value], ["LTRIM", key, 0, max - 1]]);
}

export async function readList(key, count = 100) {
  if (!creds()) return (memLists.get(key) || []).slice(0, count);
  const [l] = await run([["LRANGE", key, 0, count - 1]]);
  return l || [];
}

export async function removeFromList(key, value) {
  if (!creds()) { memLists.set(key, (memLists.get(key) || []).filter((v) => v !== value)); return; }
  await run([["LREM", key, 0, value]]);
}

// Counts uses per day (for "max N new pages per person per day").
export async function countToday(key) {
  const day = new Date().toISOString().slice(0, 10);
  const k = key + ":" + day;
  if (!creds()) { const n = (Number(mem.get(k)) || 0) + 1; mem.set(k, String(n)); return n; }
  const [n] = await run([["INCR", k], ["EXPIRE", k, 60 * 60 * 26]]);
  return Number(n);
}
