"use client";
import { createContext, useContext, useState, type ReactNode } from "react";
import {
  createSiteText,
  defaultSiteConfiguration,
  isSafeImageSource,
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
export function SiteCover({
  src,
  className = "",
  alt = "活动封面",
}: {
  src?: string | null;
  className?: string;
  alt?: string;
}) {
  const config = useSiteConfiguration();
  const [failedSource, setFailedSource] = useState("");
  const fallback = ["/arena-v2.webp", "/arena-cover.png"].includes(
    config.images.event,
  )
    ? ""
    : config.images.event;
  const source = src?.trim() || fallback;
  if (!source || !isSafeImageSource(source) || source === failedSource)
    return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- 管理员设置的活动封面。
    <img
      src={source}
      className={"event-cover " + className}
      alt={alt}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setFailedSource(source)}
    />
  );
}
