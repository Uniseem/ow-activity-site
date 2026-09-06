"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { AdminRouteFallback } from "@/components/admin-route-fallback";
import { CommunityRouteFallback } from "@/components/community-route-fallback";
import {
  clickNavigationHref,
  formNavigationHref,
  navigationIntent,
} from "@/lib/navigation-intent";

type BarState = "idle" | "running" | "done";

type NavigationProgressValue = {
  displayPath: string;
  pendingPath: string | null;
  swapPage: boolean;
  finish: () => void;
};

const NavigationProgressContext = createContext<NavigationProgressValue>({
  displayPath: "/",
  pendingPath: null,
  swapPage: false,
  finish: () => {},
});

export function useNavigationDisplayPath() {
  return useContext(NavigationProgressContext).displayPath;
}

function isAdminPath(pathname: string) {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

export function NavigationProgressProvider({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [pendingPath, setPendingPath] = useState<string | null>(null);
  const [swapPage, setSwapPage] = useState(false);
  const [bar, setBar] = useState<BarState>("idle");
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const pendingRef = useRef<string | null>(null);
  const committedPath = useRef(pathname);
  const committedSearch = useRef("");
  const finishTimer = useRef<number>(undefined);
  const resetTimer = useRef<number>(undefined);
  const safetyTimer = useRef<number>(undefined);
  const startedAt = useRef(0);

  useEffect(() => {
    const root = document.documentElement;
    const pending = bar === "running" || bar === "done";
    root.toggleAttribute("data-nav-pending", pending);
    root.toggleAttribute("data-nav-swap", pending && swapPage);
    return () => {
      root.removeAttribute("data-nav-pending");
      root.removeAttribute("data-nav-swap");
    };
  }, [bar, swapPage]);

  useEffect(() => {
    if (pendingPath) return;
    committedPath.current = pathname;
    committedSearch.current = window.location.search;
  }, [pathname, pendingPath]);

  const finish = useCallback(() => {
    if (!pendingRef.current) return;
    pendingRef.current = null;
    window.clearTimeout(safetyTimer.current);
    const elapsed = Date.now() - startedAt.current;
    window.clearTimeout(finishTimer.current);
    finishTimer.current = window.setTimeout(
      () => {
        setPendingPath(null);
        setSwapPage(false);
        setBar("done");
        window.clearTimeout(resetTimer.current);
        resetTimer.current = window.setTimeout(() => setBar("idle"), 320);
      },
      Math.max(0, 160 - elapsed),
    );
  }, []);

  const begin = useCallback((pathname: string, pathChanged: boolean) => {
    window.clearTimeout(finishTimer.current);
    window.clearTimeout(resetTimer.current);
    window.clearTimeout(safetyTimer.current);
    pendingRef.current = pathname;
    startedAt.current = Date.now();
    setPendingPath(pathname);
    setSwapPage(pathChanged);
    setBar("running");
    safetyTimer.current = window.setTimeout(() => finish(), 12_000);
  }, [finish]);

  const start = useCallback((href: string) => {
    const intent = navigationIntent(href, {
      origin: window.location.origin,
      pathname: committedPath.current,
      search: committedSearch.current,
    });
    if (!intent) return;
    begin(intent.pathname, intent.pathChanged);
  }, [begin]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const href = clickNavigationHref(event);
      if (href) start(href);
    };
    const onSubmit = (event: SubmitEvent) => {
      const form = event.target;
      if (!(form instanceof HTMLFormElement)) return;
      const href = formNavigationHref(form);
      if (href) start(href);
    };
    const onPopState = () => {
      begin(location.pathname, true);
    };
    document.addEventListener("click", onClick, true);
    document.addEventListener("submit", onSubmit, true);
    window.addEventListener("popstate", onPopState);
    return () => {
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("submit", onSubmit, true);
      window.removeEventListener("popstate", onPopState);
      window.clearTimeout(finishTimer.current);
      window.clearTimeout(resetTimer.current);
      window.clearTimeout(safetyTimer.current);
    };
  }, [begin, start]);

  return (
    <NavigationProgressContext.Provider
      value={{
        displayPath: pendingPath ?? pathname,
        pendingPath,
        swapPage,
        finish,
      }}
    >
      {mounted
        ? createPortal(
            <div
              className="nav-progress"
              data-state={bar}
              hidden={bar === "idle"}
              role="progressbar"
              aria-hidden={bar === "idle" || undefined}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuetext="正在加载"
            />,
            document.body,
          )
        : null}
      {children}
    </NavigationProgressContext.Provider>
  );
}

export function NavigationPendingPage({ children }: { children: ReactNode }) {
  const { pendingPath, swapPage, displayPath, finish } = useContext(
    NavigationProgressContext,
  );
  const childrenRef = useRef(children);
  const showFallback = swapPage && pendingPath !== null;

  useEffect(() => {
    if (!pendingPath) {
      childrenRef.current = children;
      return;
    }
    if (childrenRef.current !== children) {
      childrenRef.current = children;
      finish();
    }
  }, [children, finish, pendingPath]);

  return (
    <>
      <div hidden={showFallback} aria-hidden={showFallback || undefined}>
        {children}
      </div>
      {showFallback ? (
        isAdminPath(displayPath) ? (
          <AdminRouteFallback pathname={displayPath} />
        ) : (
          <CommunityRouteFallback />
        )
      ) : null}
    </>
  );
}
