import { headers } from "next/headers";

/**
 * The origin to bake into QR codes and reveal links.
 *
 * Derived from the actual request unless NEXT_PUBLIC_APP_URL is set, because
 * the common failure here is silent and expensive: a card gets printed with a
 * QR pointing at localhost, and nobody finds out until the wedding. Deriving it
 * also means opening the console at http://192.168.1.20:3000 produces a QR your
 * phone can actually scan, with no configuration.
 *
 * Set NEXT_PUBLIC_APP_URL in production, where the public origin is known and
 * the Host header should not be trusted.
 */
export async function baseUrl(): Promise<string> {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) return configured.replace(/\/+$/, "");

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
