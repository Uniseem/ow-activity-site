export const oauthProviders = ["google", "github"] as const;
export type OAuthProvider = (typeof oauthProviders)[number];
export const oauthNames = { google: "Google", github: "GitHub" };
export function isOAuthProvider(value: string): value is OAuthProvider {
  return value === "google" || value === "github";
}
export const oauthMessages: Record<string, string> = {
  disabled: "该登录方式尚未启用，请使用用户名和密码登录。",
  expired: "登录请求已失效，请重新点击登录按钮。",
  cancelled: "已取消第三方授权，你可以选择其他登录方式。",
  failed: "第三方登录失败，请重试或联系管理员检查 OAuth 配置。",
  banned: "该账号已被停用，请联系管理员。",
  linked: "第三方账号已绑定，下次可以使用它一键登录。",
  conflict: "该第三方账号已绑定其他用户，或当前用户已绑定该平台的其他账号。",
  session: "登录状态已变化，请重新登录后再绑定。",
};
export type OAuthAvailability = { provider: OAuthProvider; available: boolean };
