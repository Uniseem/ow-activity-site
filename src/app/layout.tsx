import type { Metadata } from "next";
import { Header } from "@/components/header";
import { SiteContentProvider } from "@/components/site-content";
import { createSiteText, siteThemeStyle } from "@/lib/site-config";
import { getSiteSettings } from "@/lib/site-settings";
import "./globals.css";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const vercelHostname =
  process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
export async function generateMetadata(): Promise<Metadata> {
  const { configuration } = await getSiteSettings();
  const t = createSiteText(configuration);
  return {
    metadataBase: new URL(
      process.env.NEXT_PUBLIC_SITE_URL ||
        (vercelHostname
          ? "https://" + vercelHostname
          : "http://localhost:3000"),
    ),
    title: { default: t("brand.name"), template: "%s | " + t("brand.name") },
    description: t("brand.metaDescription"),
    icons: { icon: configuration.images.favicon || "/favicon.ico" },
  };
}
export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { configuration } = await getSiteSettings();
  const t = createSiteText(configuration);
  return (
    <html lang="zh-CN" className="light" style={siteThemeStyle(configuration)}>
      <body>
        <SiteContentProvider configuration={configuration}>
          <Header />
          <div className="site-workspace" id="page-content" tabIndex={-1}>
            {children}
            <footer className="footer-shell">
              <span>{t("footer.text")}</span>
              <span>{t("footer.note")}</span>
            </footer>
          </div>
        </SiteContentProvider>
      </body>
    </html>
  );
}
