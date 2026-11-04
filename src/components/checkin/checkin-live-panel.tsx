"use client";

import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, XCircle } from "lucide-react";

import { getCheckinsRecentesAction } from "@/app/(dashboard)/checkin/actions";
import { cn } from "@/lib/utils";
import type { getCheckinsRecentes } from "@/services/checkins";

const timeFormatter = new Intl.DateTimeFormat("pt-BR", { timeStyle: "medium" });

type CheckinRecente = Awaited<ReturnType<typeof getCheckinsRecentes>>[number];

export function CheckinLivePanel({
  initialCheckins,
  className = "mt-8",
}: {
  initialCheckins: CheckinRecente[];
  className?: string;
}) {
  const { data } = useQuery({
    queryKey: ["checkins-recentes"],
    queryFn: () => getCheckinsRecentesAction(),
    initialData: { success: true as const, checkins: initialCheckins },
    refetchInterval: 5000,
  });

  const checkins: CheckinRecente[] =
    data && data.success ? data.checkins : initialCheckins;

  return (
    <div className={cn("rounded-lg border border-border", className)}>
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
        </span>
        <p className="text-sm font-medium text-foreground">Ao vivo</p>
      </div>

      {checkins.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-muted-foreground">
          Nenhum acesso registrado ainda.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {checkins.map((item) => (
            <li
              key={item.id}
              className="flex items-center gap-3 px-4 py-2.5 text-sm"
            >
              {item.liberado ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              ) : (
                <XCircle className="h-4 w-4 shrink-0 text-red-600" />
              )}
              <span className="text-muted-foreground">
                {timeFormatter.format(new Date(item.ocorridoEm))}
              </span>
              <span className="font-medium text-foreground">
                {item.alunoNome ?? `Não identificado — ${item.identificadorValor}`}
              </span>
              <span className="ml-auto text-xs text-muted-foreground">
                {item.dispositivoNome}
                {item.motivo ? ` · ${item.motivo}` : ""}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
