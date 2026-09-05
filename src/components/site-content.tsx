"use client";
import { createContext, useContext, type ReactNode } from "react";
import {
  createSiteText,
  defaultSiteConfiguration,
  type SiteConfiguration,
} from "@/lib/site-config";

const SiteContext = createContext<SiteConfiguration>(defaultSiteConfiguration);
export function SiteContentProvider({
  configuration,
  children,
}: {
  configuration: SiteConfiguration;
  children: ReactNode;
}) {
  return (
    <SiteContext.Provider value={configuration}>
      {children}
    </SiteContext.Provider>
  );
}
export function useSiteConfiguration() {
  return useContext(SiteContext);
}
export function useSiteText() {
  return createSiteText(useSiteConfiguration());
}
export function SiteLogo() {
  const config = useSiteConfiguration();
  return config.images.logo ? (
    // eslint-disable-next-line @next/next/no-img-element -- Admin-managed logo served directly.
    <img
      src={config.images.logo}
      alt=""
      className="h-full w-full object-contain"
    />
  ) : null;
}
export function SiteCover() {
  const config = useSiteConfiguration();
  if (
    !config.images.event ||
    ["/arena-v2.webp", "/arena-cover.png"].includes(config.images.event)
  )
    return null;
  return (
    <div
      className="event-cover"
      style={{
        backgroundImage: config.images.event
          ? "url(" + JSON.stringify(config.images.event) + ")"
          : undefined,
        backgroundColor: "#24262f",
      }}
      role="img"
      aria-label="活动封面"
    />
  );
}
