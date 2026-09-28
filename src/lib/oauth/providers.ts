import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from "jose";
import { z } from "zod";
import type { RuntimeOAuthConfig } from "./config";
import { hashToken, sameToken, type OAuthFlow } from "./security";

export type OAuthIdentity = {
  accountId: string;
  email: string | null;
  name: string;
  avatarUrl: string | null;
};
const googleKeys = createRemoteJWKSet(
  new URL("https://www.googleapis.com/oauth2/v3/certs"),
  { timeoutDuration: 10_000 },
);
const tokenSchema = z.object({
  access_token: z.string().min(1).max(16_384),
  token_type: z.string(),
  id_token: z.string().optional(),
});
function safeAvatar(value: unknown) {
  if (typeof value !== "string" || value.length > 2000) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password
      ? url.href
      : null;
  } catch {
    return null;
  }
}
export function authorizationUrl(config: RuntimeOAuthConfig, flow: OAuthFlow) {
  const google = config.provider === "google";
  const url = new URL(
    google
      ? "https://accounts.google.com/o/oauth2/v2/auth"
      : "https://github.com/login/oauth/authorize",
  );
  url.search = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: flow.callbackUrl,
    response_type: "code",
    state: flow.state,
    scope: google ? "openid email profile" : "read:user user:email",
    code_challenge: hashToken(flow.verifier),
    code_challenge_method: "S256",
    prompt: "select_account",
    ...(google ? { nonce: flow.nonce } : {}),
  }).toString();
  return url;
}
export async function verifyGoogleIdentity(
  idToken: string,
  clientId: string,
  nonce: string,
  keys: JWTVerifyGetKey = googleKeys,
): Promise<OAuthIdentity> {
  const { payload } = await jwtVerify(idToken, keys, {
    issuer: ["https://accounts.google.com", "accounts.google.com"],
    audience: clientId,
    algorithms: ["RS256"],
    requiredClaims: ["sub", "iat", "exp", "nonce", "email", "email_verified"],
    maxTokenAge: "10m",
    clockTolerance: 5,
  });
  if (
    typeof payload.nonce !== "string" ||
    !sameToken(payload.nonce, nonce) ||
    payload.email_verified !== true ||
    (payload.azp !== undefined && payload.azp !== clientId)
  )
    throw new Error("Invalid Google identity");
  const accountId = z.string().min(1).max(255).parse(payload.sub);
  const email = z.string().email().max(320).parse(payload.email);
  return {
    accountId,
    email,
    name: typeof payload.name === "string" ? payload.name : "Google 玩家",
    avatarUrl: safeAvatar(payload.picture),
  };
}
export function githubIdentity(
  profile: unknown,
  emails: unknown,
): OAuthIdentity {
  const user = z
    .object({
      id: z.number().int().positive().safe(),
      login: z.string().min(1),
      name: z.string().nullable().optional(),
      avatar_url: z.string().optional(),
    })
    .parse(profile);
  const addresses = z
    .array(
      z.object({
        email: z.string().email(),
        primary: z.boolean(),
        verified: z.boolean(),
      }),
    )
    .parse(emails);
  const address =
    addresses.find((item) => item.primary && item.verified) ??
    addresses.find((item) => item.verified);
  return {
    accountId: String(user.id),
    email: address?.email ?? null,
    name: user.name || user.login,
    avatarUrl: safeAvatar(user.avatar_url),
  };
}
async function requestJson(
  url: string,
  init: RequestInit,
  request: typeof fetch,
) {
  const response = await request(url, {
    ...init,
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error("OAuth provider request failed");
  return response.json();
}
export async function exchangeIdentity(
  config: RuntimeOAuthConfig,
  flow: OAuthFlow,
  code: string,
  request: typeof fetch = fetch,
): Promise<OAuthIdentity> {
  const tokenUrl =
    config.provider === "google"
      ? "https://oauth2.googleapis.com/token"
      : "https://github.com/login/oauth/access_token";
  const raw = await requestJson(
    tokenUrl,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        code,
        redirect_uri: flow.callbackUrl,
        grant_type: "authorization_code",
        code_verifier: flow.verifier,
      }),
    },
    request,
  );
  const tokens = tokenSchema.parse(raw);
  if (tokens.token_type.toLowerCase() !== "bearer")
    throw new Error("Invalid OAuth token type");
  if (config.provider === "google") {
    if (!tokens.id_token) throw new Error("Missing Google ID token");
    return verifyGoogleIdentity(tokens.id_token, config.clientId, flow.nonce);
  }
  const headers = {
    Authorization: `Bearer ${tokens.access_token}`,
    Accept: "application/vnd.github+json",
    "User-Agent": "ow-activity-site",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  const profile = await requestJson(
    "https://api.github.com/user",
    { headers },
    request,
  );
  const emails = await requestJson(
    "https://api.github.com/user/emails",
    { headers },
    request,
  );
  return githubIdentity(profile, emails);
}
