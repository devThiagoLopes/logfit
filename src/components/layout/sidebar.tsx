"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Radio,
  Receipt,
  ScanLine,
  UserCog,
  Users,
  Wallet,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { authClient } from "@/lib/auth/client";

const navGroups = [
  [{ href: "/", label: "Dashboard", icon: LayoutDashboard }],
  [
    { href: "/alunos", label: "Alunos", icon: Users },
    { href: "/matriculas", label: "Matrículas", icon: ClipboardList },
    { href: "/pagamentos", label: "Pagamentos", icon: Receipt },
    { href: "/checkin", label: "Check-in", icon: ScanLine },
  ],
  [
    { href: "/usuarios", label: "Usuários", icon: UserCog },
    { href: "/planos", label: "Planos", icon: Wallet },
    { href: "/sensores", label: "Sensores", icon: Radio },
  ],
];

const navItems = navGroups.flat();

function navLinkClass(isActive: boolean) {
  return cn(
    "flex items-center gap-3 rounded-md border-l-2 border-transparent px-3 py-2 text-sm font-medium text-zinc-400 transition-colors hover:bg-white/5 hover:text-white",
    isActive && "border-primary bg-white/5 text-white",
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const activeHref = [...navItems]
    .sort((a, b) => b.href.length - a.href.length)
    .find(
      (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
    )?.href;

  async function handleSignOut() {
    await authClient.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="flex w-60 shrink-0 flex-col justify-between overflow-y-auto bg-[#404040] py-4">
      <nav className="flex flex-col gap-1 px-3">
        {navGroups.map((group, index) => (
          <div key={index} className="flex flex-col gap-1">
            {index > 0 && <div className="my-2 border-t border-white/10" />}

            {group.map((item) => {
              const isActive = activeHref === item.href;
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={navLinkClass(isActive)}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="px-3">
        <button
          type="button"
          onClick={handleSignOut}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-zinc-400 transition-colors hover:bg-destructive/10 hover:text-destructive"
        >
          <LogOut className="h-4 w-4" />
          Sair
        </button>
      </div>
    </aside>
  );
}
