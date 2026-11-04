import Link from "next/link";
import { CheckCircle2, FileSignature, Receipt, UserX, Wallet } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Pendencia, PendenciaTipo } from "@/services/dashboard";

const TIPO_CONFIG: Record<PendenciaTipo, { icon: LucideIcon; iconClassName: string }> = {
  pagamento_atrasado: { icon: Receipt, iconClassName: "text-red-600" },
  primeira_parcela_pendente: { icon: Wallet, iconClassName: "text-amber-600" },
  matricula_aguardando_assinatura: {
    icon: FileSignature,
    iconClassName: "text-amber-600",
  },
  aluno_sem_matricula: { icon: UserX, iconClassName: "text-muted-foreground" },
};

export function PendenciasPanel({ pendencias }: { pendencias: Pendencia[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-foreground">
          Pendências
        </CardTitle>
      </CardHeader>
      <CardContent>
        {pendencias.length === 0 ? (
          <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            Nenhuma pendência no momento.
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {pendencias.map((item) => {
              const { icon: Icon, iconClassName } = TIPO_CONFIG[item.tipo];

              return (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    className="flex items-start gap-3 py-2.5 text-sm transition-colors hover:bg-muted/50"
                  >
                    <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${iconClassName}`} />
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">
                        {item.titulo}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {item.descricao}
                      </p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
