import { Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DispositivoDeleteDialog } from "@/components/sensores/dispositivo-delete-dialog";
import { DispositivoFormDialog } from "@/components/sensores/dispositivo-form-dialog";
import type { Dispositivo } from "@/lib/db/dispositivo-schema";

export function DispositivoRowActions({
  dispositivo,
}: {
  dispositivo: Dispositivo;
}) {
  return (
    <div className="flex items-center justify-end gap-1">
      <DispositivoFormDialog
        dispositivo={dispositivo}
        trigger={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Editar dispositivo"
            className="hover:bg-zinc-500/10 hover:text-zinc-700"
          >
            <Pencil />
          </Button>
        }
      />
      <DispositivoDeleteDialog dispositivo={dispositivo} />
    </div>
  );
}
