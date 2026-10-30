"use client";

import { Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import { UsuarioDeleteDialog } from "@/components/usuarios/usuario-delete-dialog";
import { UsuarioFormDialog } from "@/components/usuarios/usuario-form-dialog";
import type { Usuario } from "@/lib/db/auth-schema";

export function UsuarioRowActions({
  usuario,
  isCurrentUser,
}: {
  usuario: Usuario;
  isCurrentUser: boolean;
}) {
  return (
    <div className="flex items-center justify-end gap-1">
      <UsuarioFormDialog
        usuario={usuario}
        trigger={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Editar usuário"
            className="hover:bg-zinc-500/10 hover:text-zinc-700"
          >
            <Pencil />
          </Button>
        }
      />
      {!isCurrentUser && <UsuarioDeleteDialog usuario={usuario} />}
    </div>
  );
}
