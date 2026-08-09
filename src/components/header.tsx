import {
  CalendarDays,
  LogIn,
  LogOut,
  ShieldCheck,
  UserRound,
  Users,
} from "lucide-react";
import Link from "next/link";

import { logoutAction } from "@/app/actions";
import { getCurrentUser } from "@/lib/auth";

export async function Header() {
  const user = await getCurrentUser();

  return (
    <header className="sticky top-0 z-20 border-b border-black/10 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-[1180px] items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="flex min-w-0 items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-[#181a20] text-sm font-black text-white">
            OW
          </span>
          <span className="min-w-0">
            <span className="block truncate text-base font-black">先锋活动站</span>
            <span className="block truncate text-xs text-[var(--muted)]">
              非官方玩家活动平台
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-2 md:flex">
          <Link
            href="/events"
            className="focus-ring inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold text-[#2f3542] hover:bg-black/5"
          >
            <CalendarDays className="h-4 w-4" />
            活动
          </Link>
          <Link
            href="/players"
            className="focus-ring inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold text-[#2f3542] hover:bg-black/5"
          >
            <Users className="h-4 w-4" />
            玩家
          </Link>
          {user ? (
            <Link
              href="/me"
              className="focus-ring inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold text-[#2f3542] hover:bg-black/5"
            >
              <UserRound className="h-4 w-4" />
              我的
            </Link>
          ) : null}
          {user?.role === "ADMIN" ? (
            <Link
              href="/admin"
              className="focus-ring inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold text-[#2f3542] hover:bg-black/5"
            >
              <ShieldCheck className="h-4 w-4" />
              管理
            </Link>
          ) : null}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          {user ? (
            <form action={logoutAction}>
              <button
                type="submit"
                className="focus-ring inline-flex min-h-10 items-center gap-2 rounded-md border border-black/10 bg-white px-3 py-2 text-sm font-semibold hover:bg-black/5"
              >
                <LogOut className="h-4 w-4" />
                退出
              </button>
            </form>
          ) : (
            <Link
              href="/login"
              className="focus-ring inline-flex min-h-10 items-center gap-2 rounded-md bg-[#181a20] px-4 py-2 text-sm font-semibold text-white hover:bg-black"
            >
              <LogIn className="h-4 w-4" />
              登录
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
