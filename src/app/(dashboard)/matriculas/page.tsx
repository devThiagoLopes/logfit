import Link from "next/link";
import { ClipboardList, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { MatriculaRowActions } from "@/components/matriculas/matricula-row-actions";
import { MatriculaTableRow } from "@/components/matriculas/matricula-table-row";
import { PERIODICIDADES } from "@/constants/periodicidade";
import {
  getMatriculas,
  getSituacaoExibicao,
  getSituacaoMatricula,
  type MatriculaSituacaoExibicao,
} from "@/services/matriculas";

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});

const SITUACAO_LABEL: Record<MatriculaSituacaoExibicao, string> = {
  aguardando_assinatura: "Aguardando assinatura",
  ativa: "Ativa",
  pendente: "Pagamento pendente",
  expirada: "Expirada",
  cancelada: "Cancelada",
};

const SITUACAO_CLASS: Record<MatriculaSituacaoExibicao, string> = {
  aguardando_assinatura: "bg-amber-100 text-amber-800",
  ativa: "bg-emerald-100 text-emerald-800",
  pendente: "bg-amber-100 text-amber-800",
  expirada: "bg-red-100 text-red-800",
  cancelada: "bg-slate-200 text-slate-700",
};

export default async function MatriculasPage({
  searchParams,
}: {
  searchParams: Promise<{ planoId?: string }>;
}) {
  const { planoId } = await searchParams;
  const matriculas = await getMatriculas(planoId ? { planoId } : undefined);
  const planoNomeFiltro = matriculas[0]?.planoNome;

  return (
    <div className="px-8 py-10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            Matrículas
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Matrículas de alunos nos planos da academia
          </p>
        </div>

        <Button
          nativeButton={false}
          render={<Link href="/matriculas/nova" />}
        >
          Nova Matrícula
        </Button>
      </div>

      {planoId && (
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
          Filtrando por plano
          {planoNomeFiltro && (
            <span className="font-medium text-foreground">
              {planoNomeFiltro}
            </span>
          )}
          <Link
            href="/matriculas"
            className="ml-auto inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <X className="h-3 w-3" />
            Limpar filtro
          </Link>
        </div>
      )}

      {matriculas.length === 0 ? (
        <div className="mt-8 flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16 text-center">
          <ClipboardList className="h-8 w-8 text-muted-foreground" />
          <p className="mt-3 text-sm font-medium text-foreground">
            {planoId
              ? "Nenhuma matrícula vinculada a este plano"
              : "Nenhuma matrícula cadastrada ainda"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Clique em &quot;Nova Matrícula&quot; para cadastrar a primeira.
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
                <th className="px-4 py-3 font-medium">Criada em</th>
                <th className="px-4 py-3 font-medium text-right">Situação</th>
                <th className="px-4 py-3 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {matriculas.map((item) => {
                const situacaoBase = getSituacaoMatricula(
                  item.status,
                  item.dataExpiracao,
                );
                const primeiraParcelaPendente =
                  item.primeiraParcelaStatus === "pendente";
                const situacao = getSituacaoExibicao(
                  situacaoBase,
                  primeiraParcelaPendente,
                );

                return (
                  <MatriculaTableRow key={item.id} matriculaId={item.id}>
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
                      {dateFormatter.format(item.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium ${SITUACAO_CLASS[situacao]}`}
                      >
                        {SITUACAO_LABEL[situacao]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <MatriculaRowActions
                        matriculaId={item.id}
                        alunoNome={item.alunoNome}
                        status={item.status}
                        canceladaEm={item.canceladaEm}
                      />
                    </td>
                  </MatriculaTableRow>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
