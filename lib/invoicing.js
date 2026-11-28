/* Számlázó kiválasztása. Beállítás: katalógus settings.invoiceProvider = "szamlazz" | "billingo" | "" (automatikus).
 * Automatikusan a Számlázz.hu (SZAMLAZZ_AGENT_KEY) az elsődleges, ha nincs, a Billingo (BILLINGO_API_KEY). */
import { billingoReady, createInvoice as billingoInvoice } from "./billingo.js";
import { szamlazzReady, createInvoice as szamlazzInvoice } from "./szamlazz.js";

export const PROVIDERS = { szamlazz: "Számlázz.hu", billingo: "Billingo" };

export const providerReady = (env, p) => (p === "szamlazz" ? szamlazzReady(env) : p === "billingo" ? billingoReady(env) : false);

export function invoiceProvider(env, s = {}) {
  const want = String(s?.invoiceProvider || "");
  if (PROVIDERS[want]) return want;
  return szamlazzReady(env) ? "szamlazz" : billingoReady(env) ? "billingo" : "";
}

export const invoicingReady = (env, s) => providerReady(env, invoiceProvider(env, s));

export async function issueInvoice(env, o, s = {}) {
  const p = invoiceProvider(env, s);
  if (!p) throw new Error("Nincs számlázó bekötve. Cloudflare → nscard-webshop → Settings → Variables and Secrets: SZAMLAZZ_AGENT_KEY (Számlázz.hu) vagy BILLINGO_API_KEY.");
  if (!providerReady(env, p)) throw new Error(p === "szamlazz" ? "A Számlázz.hu nincs bekötve (hiányzó SZAMLAZZ_AGENT_KEY)." : "A Billingo nincs bekötve (hiányzó BILLINGO_API_KEY).");
  const inv = p === "szamlazz" ? await szamlazzInvoice(env, o, s) : await billingoInvoice(env, o, s);
  return { ...inv, provider: p };
}
