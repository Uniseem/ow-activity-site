"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/** Runs after navigation without replacing the page or its form state. */
export function RouteMotion() {
  const pathname = usePathname();

  useEffect(() => {
    const content = document.getElementById("page-content");
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!content || preference.matches || typeof content.animate !== "function")
      return;

    const styles = getComputedStyle(content);
    const duration = Number.parseFloat(
      styles.getPropertyValue("--motion-slow"),
    );
    const easing = styles.getPropertyValue("--motion-enter").trim();
    // Translation does not cut off backdrop-filter sampling like ancestor opacity.
    // No fill means the finished animation leaves no containing block behind.
    const animation = content.animate(
      [{ translate: "0 8px" }, { translate: "none" }],
      {
        duration: Number.isFinite(duration) ? duration : 420,
        easing: easing || "cubic-bezier(0.16, 1, 0.3, 1)",
      },
    );
    const stopForReducedMotion = () => {
      if (preference.matches) animation.cancel();
    };
    preference.addEventListener("change", stopForReducedMotion);
    return () => {
      animation.cancel();
      preference.removeEventListener("change", stopForReducedMotion);
    };
  }, [pathname]);

  return null;
}
