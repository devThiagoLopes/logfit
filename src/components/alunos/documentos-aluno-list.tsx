"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Image as ImageIcon, Paperclip, Trash2 } from "lucide-react";

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { deleteDocumentoAlunoAction } from "@/app/(dashboard)/alunos/documentos-actions";
import type { DocumentoAluno } from "@/lib/db/documento-aluno-schema";

const dateFormatter = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" });

function formatarTamanho(bytes: number) {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function DocumentoIcone({ mimeType }: { mimeType: string }) {
  if (mimeType === "application/pdf") {
    return <FileText className="h-5 w-5 text-muted-foreground" />;
  }
  return <ImageIcon className="h-5 w-5 text-muted-foreground" />;
}

function DocumentoDeleteButton({ documento }: { documento: DocumentoAluno }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setIsDeleting(true);
    setError(null);

    const result = await deleteDocumentoAlunoAction(
      documento.id,
      documento.alunoId,
    );

    if (result?.error) {
      setError(result.error);
      setIsDeleting(false);
      return;
    }

    setIsDeleting(false);
    setOpen(false);
    router.refresh();
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) setError(null);
      }}
    >
      <AlertDialogTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Excluir documento"
            className="hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 />
          </Button>
        }
      />

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir documento</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja excluir &quot;{documento.titulo}&quot;? Essa
            ação não pode ser desfeita.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <AlertDialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? "Excluindo..." : "Excluir"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function DocumentosAlunoList({
  documentos,
}: {
  documentos: DocumentoAluno[];
}) {
  if (documentos.length === 0) {
    return (
      <div className="mt-4 flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-8 text-center">
        <Paperclip className="h-8 w-8 text-muted-foreground" />
        <p className="mt-3 text-sm font-medium text-foreground">
          Nenhum documento anexado ainda
        </p>
      </div>
    );
  }

  return (
    <ul className="mt-4 divide-y divide-border rounded-lg border border-border">
      {documentos.map((documento) => (
        <li
          key={documento.id}
          className="flex items-center justify-between gap-4 px-4 py-3"
        >
          <div className="flex items-start gap-3">
            <DocumentoIcone mimeType={documento.mimeType} />
            <div>
              <a
                href={`/alunos/documentos/${documento.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-foreground hover:underline"
              >
                {documento.titulo}
              </a>
              {documento.descricao && (
                <p className="text-sm text-muted-foreground">
                  {documento.descricao}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                {dateFormatter.format(documento.createdAt)} ·{" "}
                {formatarTamanho(documento.tamanhoBytes)}
              </p>
            </div>
          </div>

          <DocumentoDeleteButton documento={documento} />
        </li>
      ))}
    </ul>
  );
}
