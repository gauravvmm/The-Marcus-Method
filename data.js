// Vercel serverless function: stores the log in Upstash Redis (one hash, one field per value).
// Finds the Redis variables whatever prefix Vercel gave them (KV_, UPSTASH_, STORAGE_, ...).
const find = (re) => { const k = Object.keys(process.env).find((n) => re.test(n)); return k ? process.env[k] : undefined; };
const URL_ = find(/REST_(API_)?URL$/);
const TOKEN = find(/REST_(API_)?TOKEN$/); // does not match READ_ONLY_TOKEN
const KEY = 'daily-log';

async function redis(cmd) {
  const r = await fetch(URL_, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}` },
    body: JSON.stringify(cmd),
  });
  const j = await r.json();
  if (j.error) throw new Error(j.error);
  return j.result;
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const need = process.env.APP_PASSCODE; // optional shared passcode
  if (need && req.headers['x-passcode'] !== need) return res.status(401).json({ error: 'Passcode required' });
  if (!URL_ || !TOKEN) return res.status(500).json({ error: 'Redis not connected: add Upstash Redis in Vercel Storage, then redeploy' });

  try {
    if (req.method === 'GET') {
      const flat = (await redis(['HGETALL', KEY])) || [];
      const days = {};
      const names = [null, null];
      for (let i = 0; i < flat.length; i += 2) {
        const [kind, a, b, c] = flat[i].split('|');
        const v = flat[i + 1];
        if (kind === 'n') names[a] = v;
        else ((days[a] ??= {})[b] ??= {})[c] = Number(v);
      }
      return res.status(200).json({ days, names });
    }

    if (req.method === 'POST') {
      const b = req.body || {};
      if (b.op === 'set') {
        const ok = /^\d{4}-\d{2}-\d{2}$/.test(b.date) && (b.p === 0 || b.p === 1) && /^[a-z0-9_-]{1,24}$/.test(b.a) && Number.isFinite(b.v);
        if (!ok) return res.status(400).json({ error: 'Bad value' });
        const v = Math.min(1440, Math.max(0, Math.round(b.v)));
        await redis(['HSET', KEY, `d|${b.date}|${b.p}|${b.a}`, String(v)]);
        return res.status(200).json({ ok: true });
      }
      if (b.op === 'name') {
        if (!(b.p === 0 || b.p === 1) || typeof b.v !== 'string') return res.status(400).json({ error: 'Bad name' });
        await redis(['HSET', KEY, `n|${b.p}`, b.v.slice(0, 24)]);
        return res.status(200).json({ ok: true });
      }
      return res.status(400).json({ error: 'Unknown op' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    return res.status(500).json({ error: 'Redis error: ' + String(e.message).slice(0, 80) });
  }
};
