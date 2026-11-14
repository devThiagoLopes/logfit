"use client";

import { useState } from "react";
import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
import {
  AlertTriangle,
  Ban,
  Check,
  CheckCircle2,
  Copy,
  FileText,
  MessageCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { getMatriculaStatusAction } from "@/app/(dashboard)/matriculas/actions";
import { getSituacaoMatricula } from "@/lib/matricula-situacao";
import type { getMatriculaById } from "@/services/matriculas";

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});

function buildWhatsAppLink(
  telefone: string,
  alunoNome: string,
  link: string,
) {
  const digits = telefone.replace(/\D/g, "");
  const numero = digits ? (digits.length <= 11 ? `55${digits}` : digits) : "";
  const mensagem = `Olá, ${alunoNome}! Para concluir sua matrícula na Estação do Corpo, acesse o link abaixo e assine seu contrato digital:\n${link}`;
  const base = numero ? `https://wa.me/${numero}` : "https://wa.me/";
  return `${base}?text=${encodeURIComponent(mensagem)}`;
}

type MatriculaSummary = NonNullable<
  Awaited<ReturnType<typeof getMatriculaById>>
>;

export function MatriculaSignaturePanel({
  matricula,
  link,
}: {
  matricula: MatriculaSummary;
  link: string;
}) {
  const [copiado, setCopiado] = useState(false);

  const { data } = useQuery({
    queryKey: ["matricula-status", matricula.id],
    queryFn: () => getMatriculaStatusAction(matricula.id),
    initialData: {
      success: true as const,
      status: matricula.status,
      assinaturaNome: matricula.assinaturaNome,
      assinaturaImagem: matricula.assinaturaImagem,
      assinadoEm: matricula.assinadoEm,
      dataExpiracao: matricula.dataExpiracao,
    },
    refetchInterval: (query) =>
      query.state.data && !("error" in query.state.data)
        ? query.state.data.status === "assinada" ||
          query.state.data.status === "cancelada"
          ? false
          : 3000
        : 3000,
  });

  const status = data && !("error" in data) ? data.status : matricula.status;
  const assinaturaNome =
    data && !("error" in data) ? data.assinaturaNome : matricula.assinaturaNome;
  const assinaturaImagem =
    data && !("error" in data)
      ? data.assinaturaImagem
      : matricula.assinaturaImagem;
  const assinadoEm =
    data && !("error" in data) ? data.assinadoEm : matricula.assinadoEm;
  const dataExpiracao =
    data && !("error" in data) ? data.dataExpiracao : matricula.dataExpiracao;

  if (status === "assinada") {
    const situacao = getSituacaoMatricula(status, dataExpiracao);
    const expirada = situacao === "expirada";

    return (
      <div
        className={`flex flex-col items-center gap-3 rounded-xl border p-4 text-center ${
          expirada
            ? "border-red-200 bg-red-50"
            : "border-emerald-200 bg-emerald-50"
        }`}
      >
        {expirada ? (
          <AlertTriangle className="h-10 w-10 text-red-600" />
        ) : (
          <CheckCircle2 className="h-10 w-10 text-emerald-600" />
        )}
        <p
          className={`text-base font-semibold ${
            expirada ? "text-red-900" : "text-emerald-900"
          }`}
        >
          {expirada ? "Matrícula expirada" : "Documento assinado!"}
        </p>
        <p
          className={`text-sm ${expirada ? "text-red-800" : "text-emerald-800"}`}
        >
          Assinado por {assinaturaNome}
          {assinadoEm
            ? ` em ${dateFormatter.format(new Date(assinadoEm))}`
            : ""}
        </p>
        {assinaturaImagem && (
          <div className="relative h-20 w-40 rounded-md border border-border bg-white p-2">
            <Image
              src={assinaturaImagem}
              alt={`Assinatura de ${assinaturaNome}`}
              fill
              unoptimized
              className="object-contain"
            />
          </div>
        )}
        {dataExpiracao && (
          <p
            className={`text-xs ${expirada ? "text-red-700" : "text-emerald-700"}`}
          >
            {expirada ? "Venceu em " : "Válida até "}
            {dateFormatter.format(new Date(dataExpiracao))}
          </p>
        )}

        <Button
          nativeButton={false}
          variant="ghost"
          size="sm"
          className={expirada ? "text-red-800" : "text-emerald-800"}
          render={
            <a href={link} target="_blank" rel="noopener noreferrer" />
          }
        >
          <FileText />
          Ver contrato
        </Button>
      </div>
    );
  }

  if (status === "cancelada") {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-center">
        <Ban className="h-10 w-10 text-slate-500" />
        <p className="text-base font-semibold text-slate-800">
          Matrícula cancelada
        </p>
        <p className="text-sm text-slate-600">
          Esta matrícula foi cancelada e não pode mais ser assinada.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border border-border bg-muted/40 p-6">
      <div className="rounded-xl border border-border bg-white p-4 shadow-sm">
        <QRCodeSVG value={link} size={200} marginSize={2} level="M" />
      </div>

      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
        </span>
        Aguardando assinatura do aluno...
      </div>

      <div className="w-full space-y-2">
        <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2">
          <p className="flex-1 truncate text-xs text-muted-foreground">
            {link}
          </p>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Copiar link"
            onClick={async () => {
              await navigator.clipboard.writeText(link);
              setCopiado(true);
              setTimeout(() => setCopiado(false), 2000);
            }}
          >
            {copiado ? <Check /> : <Copy />}
          </Button>
        </div>

        <Button
          nativeButton={false}
          variant="outline"
          className="w-full"
          render={
            <a
              href={buildWhatsAppLink(
                matricula.alunoTelefone,
                matricula.alunoNome,
                link,
              )}
              target="_blank"
              rel="noopener noreferrer"
            />
          }
        >
          <MessageCircle />
          Compartilhar via WhatsApp
        </Button>
      </div>
    </div>
  );
}
