/* Egyszerű SMTP kliens Cloudflare Workers TCP socketekkel (pl. Gmail: smtp.gmail.com:465, alkalmazásjelszóval).
 * Egy kapcsolaton több levelet is elküld (hírlevélhez), a leveleket UTF-8 multipart/alternative formában állítja össze. */
import { connect } from "cloudflare:sockets";

const enc = new TextEncoder();

function b64(str) {
  const bytes = typeof str === "string" ? enc.encode(str) : str;
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}
const wrap76 = s => s.replace(/.{1,76}/g, "$&\r\n");
/* RFC 2047: nem ASCII fejlécek (tárgy, név) base64-ben, 45 bájtos darabokban */
export function encodeHeader(v) {
  const s = String(v || "");
  if (/^[\x20-\x7e]*$/.test(s)) return s;
  const bytes = enc.encode(s), parts = [];
  let start = 0;
  while (start < bytes.length) {
    let end = Math.min(start + 45, bytes.length);
    while (end < bytes.length && (bytes[end] & 0xc0) === 0x80) end--; /* ne vágjunk ketté UTF-8 karaktert */
    parts.push(`=?UTF-8?B?${b64(bytes.subarray(start, end))}?=`);
    start = end;
  }
  return parts.join("\r\n ");
}
const cleanAddr = a => String(a || "").replace(/[\r\n<>"]/g, "").trim();
/* „Név <cím>” vagy csak cím → { name, addr } */
export function parseAddress(v) {
  const m = /^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/.exec(String(v || ""));
  return m ? { name: m[1].trim(), addr: cleanAddr(m[2]) } : { name: "", addr: cleanAddr(v) };
}
const fmtAddr = ({ name, addr }) => (name ? `${encodeHeader(name)} <${addr}>` : `<${addr}>`);

export function buildMessage({ from, to, replyTo, subject, html, text, headers = {}, domain = "nscard.hu" }) {
  const boundary = `nsc_${crypto.randomUUID().replace(/-/g, "")}`;
  const id = `<${crypto.randomUUID()}@${domain}>`;
  const head = [
    `From: ${fmtAddr(parseAddress(from))}`,
    `To: ${fmtAddr(parseAddress(to))}`,
    replyTo ? `Reply-To: ${fmtAddr(parseAddress(replyTo))}` : "",
    `Subject: ${encodeHeader(subject)}`,
    `Date: ${new Date().toUTCString().replace("GMT", "+0000")}`,
    `Message-ID: ${id}`,
    "MIME-Version: 1.0",
    ...Object.entries(headers).filter(([k, v]) => /^[A-Za-z-]+$/.test(k) && v).map(([k, v]) => `${k}: ${String(v).replace(/[\r\n]/g, " ")}`),
    `Content-Type: multipart/alternative; boundary="${boundary}"`
  ].filter(Boolean);
  const part = (type, body) => `--${boundary}\r\nContent-Type: ${type}; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n${wrap76(b64(body))}`;
  return `${head.join("\r\n")}\r\n\r\n${part("text/plain", text || "")}${part("text/html", html || "")}--${boundary}--\r\n`;
}

/* soronként olvasó SMTP válasz-értelmező („250-…” folytatás, „250 …” vége) */
function reader(readable) {
  const r = readable.getReader();
  const dec = new TextDecoder();
  let buf = "";
  return async function next(timeoutMs = 20000) {
    const lines = [];
    const deadline = Date.now() + timeoutMs;
    for (;;) {
      let i;
      while ((i = buf.indexOf("\r\n")) >= 0) {
        const line = buf.slice(0, i); buf = buf.slice(i + 2);
        lines.push(line);
        if (/^\d{3} /.test(line) || /^\d{3}$/.test(line)) return { code: Number(line.slice(0, 3)), text: lines.join("\n") };
      }
      const left = deadline - Date.now();
      if (left <= 0) throw new Error("Az SMTP szerver nem válaszolt időben.");
      const chunk = await Promise.race([r.read(), new Promise((_, rej) => setTimeout(() => rej(new Error("Az SMTP szerver nem válaszolt időben.")), left))]);
      if (chunk.done) throw new Error("Az SMTP kapcsolat váratlanul megszakadt.");
      buf += dec.decode(chunk.value, { stream: true });
    }
  };
}

const friendly = (code, text) => {
  if (code === 535 || /BadCredentials|Username and Password not accepted/i.test(text)) return "A Gmail nem fogadta el a belépést: ellenőrizd az SMTP_USER címet és az alkalmazásjelszót (SMTP_PASS).";
  if (code === 550 && /daily|limit/i.test(text)) return "Elérted a Gmail napi küldési korlátját. Holnap újra lehet küldeni.";
  return `SMTP hiba (${code}): ${String(text).split("\n").pop().slice(0, 160)}`;
};

/* messages: [{ to, subject, html, text, replyTo, headers }] – egy kapcsolaton, sorban.
 * Visszaad: { ok, sent, results: [{ ok, error }], error } */
export async function smtpSend(env, from, messages, { connectFn } = {}) {
  const host = env.SMTP_HOST || "smtp.gmail.com";
  const port = Number(env.SMTP_PORT || 465);
  const user = String(env.SMTP_USER || "").trim(), pass = String(env.SMTP_PASS || "").replace(/\s+/g, "");
  const results = [];
  let socket;
  try {
    socket = (connectFn || env.__smtpConnect || connect)({ hostname: host, port }, { secureTransport: port === 465 ? "on" : "starttls", allowHalfOpen: false });
    let read = reader(socket.readable);
    let writer = socket.writable.getWriter();
    const send = s => writer.write(enc.encode(s));
    const cmd = async (line, want) => {
      await send(`${line}\r\n`);
      const r = await read();
      if (!want.includes(r.code)) { const e = new Error(friendly(r.code, r.text)); e.code = r.code; throw e; }
      return r;
    };
    let r = await read();
    if (r.code !== 220) throw new Error(friendly(r.code, r.text));
    const helo = String(env.SMTP_HELO || "nscard.hu").replace(/[^\w.-]/g, "");
    r = await cmd(`EHLO ${helo}`, [250]);
    if (port !== 465) {
      await cmd("STARTTLS", [220]);
      writer.releaseLock();
      socket = socket.startTls();
      read = reader(socket.readable);
      writer = socket.writable.getWriter();
      r = await cmd(`EHLO ${helo}`, [250]);
    }
    if (/AUTH[ =][^\n]*PLAIN/i.test(r.text) || !/AUTH/i.test(r.text)) await cmd(`AUTH PLAIN ${b64(`\0${user}\0${pass}`)}`, [235]);
    else { await cmd("AUTH LOGIN", [334]); await cmd(b64(user), [334]); await cmd(b64(pass), [235]); }
    const fromAddr = parseAddress(from).addr;
    for (const m of messages) {
      try {
        const rcpt = parseAddress(m.to).addr;
        if (!rcpt || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(rcpt)) throw new Error("Hibás címzett.");
        await cmd(`MAIL FROM:<${fromAddr}>`, [250]);
        await cmd(`RCPT TO:<${rcpt}>`, [250, 251]);
        await cmd("DATA", [354]);
        const data = buildMessage({ ...m, from }).replace(/\r\n\./g, "\r\n.."); /* pont-duplázás */
        await send(`${data}\r\n.\r\n`);
        const done = await read(60000);
        if (done.code !== 250) throw new Error(friendly(done.code, done.text));
        results.push({ ok: true });
      } catch (e) {
        results.push({ ok: false, error: e.message });
        if (e.code === 421 || e.code === 535 || /megszakadt|időben/.test(e.message)) throw e;
        try { await cmd("RSET", [250]); } catch { throw e; }
      }
    }
    try { await send("QUIT\r\n"); } catch {}
  } catch (e) {
    while (results.length < messages.length) results.push({ ok: false, error: e.message });
    try { socket?.close(); } catch {}
    const sent = results.filter(x => x.ok).length;
    return { ok: false, sent, results, error: e.message };
  }
  try { socket.close(); } catch {}
  const sent = results.filter(x => x.ok).length;
  return { ok: sent === messages.length, sent, results, error: results.find(x => !x.ok)?.error || "" };
}
