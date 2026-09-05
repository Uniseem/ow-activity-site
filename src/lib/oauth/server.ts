import "server-only";
import { headers } from "next/headers";
import { isDatabaseConfigured, prisma } from "@/lib/prisma";
import { oauthAvailability, runtimeConfig } from "./config";
import { oauthProviders, type OAuthProvider } from "./shared";

export function oauthOrigin(localOrigin?: string) {
  const configured =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_ENV === "production" &&
    process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : undefined);
  if (configured) {
    const url = new URL(configured);
    if (
      url.username ||
      url.password ||
      (url.protocol !== "https:" &&
        !(
          url.protocol === "http:" &&
          ["localhost", "127.0.0.1"].includes(url.hostname)
        ))
    )
      throw new Error("Invalid site URL");
    return url.origin;
  }
  if (localOrigin) {
    const url = new URL(localOrigin);
    if (
      ["localhost", "127.0.0.1"].includes(url.hostname) &&
      ["http:", "https:"].includes(url.protocol)
    )
      return url.origin;
  }
  return "http://localhost:3000";
}
export async function pageOAuthOrigin() {
  const host = (await headers()).get("host");
  return oauthOrigin(host ? `http://${host}` : undefined);
}
export async function getOAuthAvailability() {
  if (!isDatabaseConfigured())
    return oauthProviders.map((provider) => ({ provider, available: false }));
  return oauthAvailability(prisma, process.env.OAUTH_ENCRYPTION_KEY);
}
export async function getRuntimeOAuthConfig(provider: OAuthProvider) {
  if (!isDatabaseConfigured()) return null;
  return runtimeConfig(
    await prisma.oAuthConfig.findUnique({ where: { provider } }),
    process.env.OAUTH_ENCRYPTION_KEY,
  );
}
export function flowCookieName(provider: OAuthProvider) {
  return `${process.env.NODE_ENV === "production" ? "__Host-" : ""}ow_oauth_${provider}`;
}
