"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DASHBOARD_PERIODOS,
  parseDashboardPeriodo,
} from "@/constants/dashboard-periodo";

export function DashboardPeriodoFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const periodo = parseDashboardPeriodo(searchParams.get("periodo") ?? undefined);

  function selecionar(value: string | null) {
    if (!value) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("periodo", value);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="space-y-1.5">
      <Label
        htmlFor="periodo"
        className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
      >
        Período dos gráficos
      </Label>
      <Select value={periodo} onValueChange={selecionar}>
        <SelectTrigger id="periodo" className="w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {DASHBOARD_PERIODOS.map((opcao) => (
            <SelectItem key={opcao.key} value={opcao.key}>
              {opcao.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
