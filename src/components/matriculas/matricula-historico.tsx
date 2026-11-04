import { Ban, CheckCircle2, FilePlus2, RefreshCcw, RotateCcw, Wallet } from "lucide-react";

import type {
  HistoricoEvento,
  HistoricoEventoTipo,
} from "@/services/matriculas";

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});

const TIPO_ICON: Record<HistoricoEventoTipo, typeof FilePlus2> = {
  criada: FilePlus2,
  assinada: CheckCircle2,
  cancelada: Ban,
  reaberta: RotateCcw,
  renovada: RefreshCcw,
  pagamento_confirmado: Wallet,
};

export function MatriculaHistoricoTimeline({
  eventos,
}: {
  eventos: HistoricoEvento[];
}) {
  if (eventos.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Nenhum evento registrado ainda.
      </p>
    );
  }

  // Mais recente primeiro, igual a qualquer timeline de atividade.
  const eventosRecentesPrimeiro = [...eventos].reverse();

  return (
    <ol className="max-h-96 space-y-4 overflow-y-auto pr-1">
      {eventosRecentesPrimeiro.map((evento) => {
        const Icon = TIPO_ICON[evento.tipo] ?? FilePlus2;

        return (
          <li key={evento.id} className="flex gap-3">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Icon className="h-3.5 w-3.5" />
            </div>
            <div className="space-y-0.5">
              <p className="text-sm text-foreground">{evento.descricao}</p>
              <p className="text-xs text-muted-foreground">
                {dateFormatter.format(new Date(evento.createdAt))}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
