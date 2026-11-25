"use client";

import { Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import { AlunoDeleteDialog } from "@/components/alunos/aluno-delete-dialog";
import { AlunoFormDialog } from "@/components/alunos/aluno-form-dialog";
import type { Aluno } from "@/lib/db/aluno-schema";

export function AlunoRowActions({ aluno }: { aluno: Aluno }) {
  return (
    <div className="flex items-center justify-end gap-1" onClick={(event) => event.stopPropagation()}>{/* NOSONAR: wrapper só interrompe o bubbling do clique da linha da tabela; não há role ARIA apropriado para um contêiner que apenas captura eventos dos botões filhos (ver docs do jsx-a11y/no-static-element-interactions). */}
      <AlunoFormDialog
        aluno={aluno}
        trigger={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Editar aluno"
            className="hover:bg-zinc-500/10 hover:text-zinc-700"
          >
            <Pencil />
          </Button>
        }
      />
      <AlunoDeleteDialog aluno={aluno} />
    </div>
  );
}
