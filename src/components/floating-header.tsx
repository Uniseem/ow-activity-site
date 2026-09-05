"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { nextHeaderScroll, visibleHeaderAt } from "@/lib/header-scroll";

export function FloatingHeader({
  className,
  children,
}: {
  className: string;
  children: ReactNode;
}) {
  const headerRef = useRef<HTMLElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;
    let frame = 0;
    let state = visibleHeaderAt(Math.max(0, window.scrollY));
    header.dataset.hidden = "false";

    const reveal = () => {
      state = visibleHeaderAt(Math.max(0, window.scrollY));
      header.dataset.hidden = "false";
    };
    const update = () => {
      frame = 0;
      state = nextHeaderScroll(state, window.scrollY, {
        maximum: document.documentElement.scrollHeight - window.innerHeight,
        topBoundary: header.offsetHeight + 24,
        // Dropdown popovers render in a portal; their trigger retains aria-expanded.
        locked: Boolean(
          header.querySelector('[aria-expanded="true"], :focus-visible'),
        ),
      });
      const hidden = String(state.hidden);
      if (header.dataset.hidden !== hidden) header.dataset.hidden = hidden;
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    const menus = new MutationObserver(schedule);
    menus.observe(header, {
      subtree: true,
      attributes: true,
      attributeFilter: ["aria-expanded"],
    });
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", reveal);
    window.addEventListener("pageshow", reveal);
    header.addEventListener("focusin", reveal);
    return () => {
      window.cancelAnimationFrame(frame);
      menus.disconnect();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", reveal);
      window.removeEventListener("pageshow", reveal);
      header.removeEventListener("focusin", reveal);
    };
  }, [pathname]);

  return (
    <header ref={headerRef} className={`${className} floating-header`}>
      {children}
    </header>
  );
}
