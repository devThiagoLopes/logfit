import { Receipt } from "lucide-react";

import { PagamentoAcaoCell } from "@/components/pagamentos/pagamento-acao-cell";
import { PagamentoTableRow } from "@/components/pagamentos/pagamento-table-row";
import { PeriodoFilter } from "@/components/pagamentos/periodo-filter";
import { FORMAS_PAGAMENTO_OPCOES } from "@/constants/forma-pagamento";
import { PERIODICIDADES } from "@/constants/periodicidade";
import { resolverFiltroPagamentos } from "@/lib/pagamentos/periodo";
import {
  getPagamentos,
  getSituacaoPagamento,
  type PagamentoSituacao,
} from "@/services/pagamentos";

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});

const vencimentoFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
});

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const STATUS_LABEL: Record<PagamentoSituacao, string> = {
  pendente: "Pendente",
  atrasado: "Atrasado",
  pago: "Pago",
};

const STATUS_CLASS: Record<PagamentoSituacao, string> = {
  pendente: "bg-amber-100 text-amber-800",
  atrasado: "bg-red-100 text-red-800",
  pago: "bg-emerald-100 text-emerald-800",
};

export default async function PagamentosPage({
  searchParams,
}: {
  searchParams: Promise<{ modo?: string; mes?: string; de?: string; ate?: string }>;
}) {
  const params = await searchParams;
  const filtro = resolverFiltroPagamentos(params);
  const pagamentos = await getPagamentos({ inicio: filtro.inicio, fim: filtro.fim });

  return (
    <div className="px-8 py-10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Pagamentos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Pagamentos gerados a partir das matrículas assinadas
          </p>
        </div>
        <PeriodoFilter
          modo={filtro.modo}
          mes={filtro.mes}
          de={filtro.de}
          ate={filtro.ate}
        />
      </div>

      {pagamentos.length === 0 ? (
        <div className="mt-8 flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16 text-center">
          <Receipt className="h-8 w-8 text-muted-foreground" />
          <p className="mt-3 text-sm font-medium text-foreground">
            Nenhum pagamento registrado ainda
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Pagamentos aparecem aqui assim que uma matrícula é assinada.
          </p>
        </div>
      ) : (
        <div className="mt-8 overflow-hidden rounded-lg border border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Aluno</th>
                <th className="px-4 py-3 font-medium">Plano</th>
                <th className="px-4 py-3 font-medium">Periodicidade</th>
                <th className="px-4 py-3 font-medium">Parcela</th>
                <th className="px-4 py-3 font-medium">Vencimento</th>
                <th className="px-4 py-3 font-medium">Valor</th>
                <th className="px-4 py-3 font-medium">Pagamento</th>
                <th className="px-4 py-3 font-medium">Data</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {pagamentos.map((item) => {
                const situacao = getSituacaoPagamento(
                  item.status,
                  item.vencimento,
                );
                return (
                  <PagamentoTableRow key={item.id} matriculaId={item.matriculaId}>
                    <td className="px-4 py-3 font-medium text-foreground">
                      {item.alunoNome}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {item.planoNome}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {
                        PERIODICIDADES.find(
                          ({ key }) => key === item.periodicidade,
                        )?.label
                      }
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {item.numeroParcela}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {vencimentoFormatter.format(item.vencimento)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {currencyFormatter.format(Number(item.valor))}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {item.status === "pago" && item.formaPagamento
                        ? FORMAS_PAGAMENTO_OPCOES.find(
                            ({ key }) => key === item.formaPagamento,
                          )?.label
                        : "-"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {item.status === "pago" && item.pagoEm
                        ? dateFormatter.format(item.pagoEm)
                        : "-"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_CLASS[situacao]}`}
                      >
                        {STATUS_LABEL[situacao]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <PagamentoAcaoCell
                        pagamentoId={item.id}
                        alunoNome={item.alunoNome}
                        valor={item.valor}
                        pendente={item.status === "pendente"}
                      />
                    </td>
                  </PagamentoTableRow>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
