"use client";

import { CircleDollarSign } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ConcluirPagamentoDialog } from "@/components/pagamentos/concluir-pagamento-dialog";

export function PagamentoAcaoCell({
  pagamentoId,
  alunoNome,
  valor,
  pendente,
}: {
  pagamentoId: string;
  alunoNome: string;
  valor: string;
  pendente: boolean;
}) {
  if (!pendente) return null;

  return (
    <div onClick={(event) => event.stopPropagation()}>
      <ConcluirPagamentoDialog
        pagamentoId={pagamentoId}
        alunoNome={alunoNome}
        valor={valor}
        trigger={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Concluir pagamento"
            className="hover:bg-emerald-500/10 hover:text-emerald-600"
          >
            <CircleDollarSign />
          </Button>
        }
      />
    </div>
  );
}
