import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ClipboardList, Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import { AlunoFormDialog } from "@/components/alunos/aluno-form-dialog";
import { PERIODICIDADES } from "@/constants/periodicidade";
import { ALUNO_GENEROS } from "@/lib/db/aluno-schema";
import { getAlunoById } from "@/services/alunos";
import {
  getMatriculasByAluno,
  getSituacaoExibicao,
  getSituacaoMatricula,
  type MatriculaSituacaoExibicao,
} from "@/services/matriculas";

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
});

const generoLabels: Record<(typeof ALUNO_GENEROS)[number], string> = {
  masculino: "Masculino",
  feminino: "Feminino",
  outro: "Outro",
};

function Campo({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm text-foreground">{valor || "—"}</p>
    </div>
  );
}

function formatarEndereco(aluno: {
  endereco: string | null;
  numero: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  cep: string | null;
}) {
  const partes = [
    [aluno.endereco, aluno.numero].filter(Boolean).join(", "),
    aluno.bairro,
    aluno.cidade && aluno.uf ? `${aluno.cidade} – ${aluno.uf}` : aluno.cidade,
    aluno.cep,
  ].filter(Boolean);
  return partes.join(" — ");
}

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

export default async function AlunoDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const aluno = await getAlunoById(id);

  if (!aluno) {
    notFound();
  }

  const matriculas = await getMatriculasByAluno(id);

  return (
    <div className="px-8 py-10">
      <Link
        href="/alunos"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            {aluno.nome}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Matrícula nº {String(aluno.matricula).padStart(4, "0")} · CPF{" "}
            {aluno.cpf}
          </p>
        </div>

        <AlunoFormDialog
          aluno={aluno}
          trigger={
            <Button variant="outline" size="sm">
              <Pencil />
              Editar
            </Button>
          }
        />
      </div>

      <div className="mt-8 space-y-6 rounded-xl border border-border p-4">
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-foreground">
            Informações pessoais
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Campo label="Nome completo" valor={aluno.nome} />
            <Campo label="E-mail" valor={aluno.email ?? ""} />
            <Campo label="Telefone / Celular" valor={aluno.telefone} />
            <Campo
              label="Data de nascimento"
              valor={
                aluno.dataNascimento
                  ? dateFormatter.format(new Date(aluno.dataNascimento))
                  : ""
              }
            />
            <Campo
              label="Gênero"
              valor={aluno.genero ? generoLabels[aluno.genero] : ""}
            />
            <Campo label="CPF" valor={aluno.cpf} />
            <Campo label="RG" valor={aluno.rg ?? ""} />
          </div>
        </section>

        <section className="space-y-3 border-t border-border pt-4">
          <h2 className="text-sm font-medium text-foreground">Endereço</h2>
          <Campo label="Endereço" valor={formatarEndereco(aluno)} />
        </section>

        <section className="space-y-3 border-t border-border pt-4">
          <h2 className="text-sm font-medium text-foreground">
            Observações
          </h2>
          <p className="text-sm text-foreground">
            {aluno.observacoes || "—"}
          </p>
        </section>
      </div>

      <div className="mt-8">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-sm font-medium text-foreground">Matrícula</h2>
          <Button
            nativeButton={false}
            variant="outline"
            size="sm"
            render={<Link href="/matriculas/nova" />}
          >
            Nova matrícula
          </Button>
        </div>

        {matriculas.length === 0 ? (
          <div className="mt-4 flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-12 text-center">
            <ClipboardList className="h-8 w-8 text-muted-foreground" />
            <p className="mt-3 text-sm font-medium text-foreground">
              Nenhuma matrícula cadastrada ainda
            </p>
          </div>
        ) : (
          <ul className="mt-4 divide-y divide-border rounded-lg border border-border">
            {matriculas.map((item) => {
              const situacao = getSituacaoExibicao(
                getSituacaoMatricula(item.status, item.dataExpiracao),
                item.primeiraParcelaStatus === "pendente",
              );

              return (
                <li key={item.id}>
                  <Link
                    href={`/matriculas/${item.id}`}
                    className="flex items-center justify-between gap-4 px-4 py-3 transition-colors hover:bg-muted/50"
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {item.planoNome} ·{" "}
                        {
                          PERIODICIDADES.find(
                            ({ key }) => key === item.periodicidade,
                          )?.label
                        }
                      </p>
                      <p className="text-xs text-muted-foreground">
                        criada em {dateFormatter.format(item.createdAt)}
                      </p>
                    </div>

                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${SITUACAO_CLASS[situacao]}`}
                    >
                      {SITUACAO_LABEL[situacao]}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
