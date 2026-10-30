"use client";

import { Ban, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { MatriculaCancelarDialog } from "@/components/matriculas/matricula-cancelar-dialog";
import { MatriculaReabrirDialog } from "@/components/matriculas/matricula-reabrir-dialog";
import type { MATRICULA_STATUSES } from "@/lib/db/matricula-schema";
import { podeReabrirMatricula } from "@/services/matriculas";

export function MatriculaRowActions({
  matriculaId,
  alunoNome,
  status,
  canceladaEm,
}: {
  matriculaId: string;
  alunoNome: string;
  status: (typeof MATRICULA_STATUSES)[number];
  canceladaEm: Date | string | null;
}) {
  if (status === "cancelada") {
    if (!podeReabrirMatricula(status, canceladaEm)) {
      return null;
    }

    return (
      <div
        className="flex items-center justify-end"
        onClick={(event) => event.stopPropagation()}
      >
        <MatriculaReabrirDialog
          matriculaId={matriculaId}
          alunoNome={alunoNome}
          trigger={
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Reabrir matrícula"
            >
              <RotateCcw />
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div
      className="flex items-center justify-end"
      onClick={(event) => event.stopPropagation()}
    >
      <MatriculaCancelarDialog
        matriculaId={matriculaId}
        alunoNome={alunoNome}
        trigger={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Cancelar matrícula"
            className="hover:bg-destructive/10 hover:text-destructive"
          >
            <Ban />
          </Button>
        }
      />
    </div>
  );
}
