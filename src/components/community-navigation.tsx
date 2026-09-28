"use client";

import { buttonVariants } from "@heroui/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLayoutEffect, useRef } from "react";

const communityLinks = [
  { href: "/", label: "首页" },
  { href: "/events", label: "活动" },
  { href: "/articles", label: "文章" },
  { href: "/players", label: "玩家" },
];

function positionIndicator(nav: HTMLElement, href: string | null) {
  const indicator = nav.querySelector<HTMLElement>(".community-nav-indicator");
  const links = nav.querySelectorAll<HTMLAnchorElement>("[data-nav-href]");
  let target: HTMLAnchorElement | undefined;
  for (const link of links) {
    const selected = link.dataset.navHref === href;
    link.dataset.active = String(selected);
    if (selected) target = link;
  }
  if (!indicator) return;
  indicator.dataset.visible = String(Boolean(target));
  if (!target) return;

  const firstPosition = nav.dataset.indicatorPositioned !== "true";
  if (firstPosition) nav.dataset.indicatorAnimated = "false";
  // Layout offsets stay accurate while the enclosing floating header scales.
  indicator.style.width = `${target.offsetWidth}px`;
  indicator.style.height = `${target.offsetHeight}px`;
  indicator.style.transform = `translate3d(${target.offsetLeft}px, ${target.offsetTop}px, 0)`;
  nav.dataset.indicatorPositioned = "true";
  if (firstPosition) {
    // Commit the first placement before enabling transitions, including when
    // the initial route (for example /login) has no matching navigation item.
    void indicator.offsetWidth;
    nav.dataset.indicatorAnimated = "true";
  }
}

export function CommunityNavigation() {
  const pathname = usePathname();
  const navRef = useRef<HTMLElement>(null);
  const selectionRef = useRef<string | null>(null);
  const activeHref =
    communityLinks.find(({ href }) =>
      href === "/"
        ? pathname === href
        : pathname === href || pathname.startsWith(`${href}/`),
    )?.href ?? null;

  useLayoutEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    selectionRef.current = activeHref;
    positionIndicator(nav, activeHref);
  }, [activeHref, pathname]);

  useLayoutEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    let disposed = false;
    const measure = () => positionIndicator(nav, selectionRef.current);
    const observer = new ResizeObserver(measure);
    observer.observe(nav);
    for (const link of nav.querySelectorAll("a")) observer.observe(link);
    document.fonts.ready.then(() => {
      if (!disposed) measure();
    });
    return () => {
      disposed = true;
      observer.disconnect();
    };
  }, []);

  return (
    <nav
      ref={navRef}
      className="community-nav community-nav--animated"
      aria-label="社区导航"
    >
      <span className="community-nav-indicator" aria-hidden="true" />
      {communityLinks.map(({ href, label }) => (
        <Link
          key={href}
          href={href}
          data-nav-href={href}
          className={buttonVariants({
            variant: "ghost",
            size: "sm",
            className: "community-nav-link",
          })}
          aria-current={activeHref === href ? "page" : undefined}
          onNavigate={() => {
            // Next only calls this for real same-tab navigation, including Enter.
            selectionRef.current = href;
            if (navRef.current) positionIndicator(navRef.current, href);
          }}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
