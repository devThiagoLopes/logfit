"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ChevronDown,
  ClipboardList,
  FolderCog,
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
];

const cadastrosGeraisNav = {
  label: "Cadastros gerais",
  icon: FolderCog,
  items: [
    { href: "/usuarios", label: "Usuários", icon: UserCog },
    { href: "/planos", label: "Planos", icon: Wallet },
    { href: "/sensores", label: "Sensores", icon: Radio },
  ],
};

const navItems = [...navGroups.flat(), ...cadastrosGeraisNav.items];

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

  const isCadastrosAtivo = cadastrosGeraisNav.items.some(
    (item) => item.href === activeHref,
  );
  const [isCadastrosOpen, setIsCadastrosOpen] = useState(isCadastrosAtivo);

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

        <div className="my-2 border-t border-white/10" />

        <div className="flex flex-col gap-1">
          <button
            type="button"
            onClick={() => setIsCadastrosOpen((open) => !open)}
            aria-expanded={isCadastrosOpen}
            className={navLinkClass(isCadastrosAtivo && !isCadastrosOpen)}
          >
            <cadastrosGeraisNav.icon className="h-4 w-4" />
            <span className="flex-1 text-left">{cadastrosGeraisNav.label}</span>
            <ChevronDown
              className={cn(
                "h-4 w-4 shrink-0 transition-transform",
                isCadastrosOpen && "rotate-180",
              )}
            />
          </button>

          {isCadastrosOpen && (
            <div className="flex flex-col gap-1 pl-4">
              {cadastrosGeraisNav.items.map((item) => {
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
          )}
        </div>
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
