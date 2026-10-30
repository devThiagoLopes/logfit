"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Switch } from "@/components/ui/switch";
import { toggleAtivoDispositivoAction } from "@/app/(dashboard)/sensores/actions";

export function DispositivoAtivoToggle({
  dispositivoId,
  ativo,
}: {
  dispositivoId: string;
  ativo: boolean;
}) {
  const router = useRouter();
  const [checked, setChecked] = useState(ativo);
  const [isSalvando, setIsSalvando] = useState(false);

  async function handleChange(nextChecked: boolean) {
    setChecked(nextChecked);
    setIsSalvando(true);

    const result = await toggleAtivoDispositivoAction(
      dispositivoId,
      nextChecked,
    );

    if (result?.error) {
      setChecked(!nextChecked);
    }

    setIsSalvando(false);
    router.refresh();
  }

  return (
    <Switch
      checked={checked}
      onCheckedChange={handleChange}
      disabled={isSalvando}
      aria-label={checked ? "Desativar dispositivo" : "Ativar dispositivo"}
    />
  );
}
