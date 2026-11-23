/* Stripe segédek: API hívás és webhook aláírás ellenőrzés (STRIPE_WEBHOOK_SECRET). */
export async function stripe(env, path, { method = "GET", params = null } = {}) {
  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    method,
    headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`, ...(params ? { "Content-Type": "application/x-www-form-urlencoded" } : {}) },
    body: params || undefined
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

const enc = s => new TextEncoder().encode(s);
const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");

export async function verifyStripeSignature(payload, header, secret, toleranceSec = 300) {
  if (!header || !secret) return false;
  let t = 0;
  const sigs = [];
  for (const part of String(header).split(",")) {
    const [k, v] = part.split("=");
    if (k === "t") t = Number(v);
    else if (k === "v1" && v) sigs.push(v.trim());
  }
  if (!t || !sigs.length || Math.abs(Date.now() / 1000 - t) > toleranceSec) return false;
  const key = await crypto.subtle.importKey("raw", enc(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const expected = hex(await crypto.subtle.sign("HMAC", key, enc(`${t}.${payload}`)));
  return sigs.some(sig => {
    if (sig.length !== expected.length) return false;
    let diff = 0;
    for (let i = 0; i < sig.length; i++) diff |= sig.charCodeAt(i) ^ expected.charCodeAt(i);
    return diff === 0;
  });
}
