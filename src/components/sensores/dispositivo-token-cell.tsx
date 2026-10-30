"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, RefreshCw } from "lucide-react";

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
import { regenerarTokenDispositivoAction } from "@/app/(dashboard)/sensores/actions";

function mascarar(token: string) {
  return `${token.slice(0, 8)}••••••••••••••••••••••••••`;
}

export function DispositivoTokenCell({
  dispositivoId,
  token,
}: {
  dispositivoId: string;
  token: string;
}) {
  const router = useRouter();
  const [valorAtual, setValorAtual] = useState(token);
  const [copiado, setCopiado] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isRegenerando, setIsRegenerando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCopiar() {
    await navigator.clipboard.writeText(valorAtual);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  async function handleRegenerar() {
    setIsRegenerando(true);
    setError(null);

    const result = await regenerarTokenDispositivoAction(dispositivoId);

    if (result?.error || !result.token) {
      setError(result?.error ?? "Erro ao gerar novo token.");
      setIsRegenerando(false);
      return;
    }

    setValorAtual(result.token);
    setIsRegenerando(false);
    setConfirmOpen(false);
    router.refresh();
  }

  return (
    <div className="flex items-center gap-1">
      <code className="truncate font-mono text-xs text-muted-foreground">
        {mascarar(valorAtual)}
      </code>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label="Copiar token"
        onClick={handleCopiar}
      >
        {copiado ? <Check /> : <Copy />}
      </Button>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Regenerar token"
            >
              <RefreshCw />
            </Button>
          }
        />

        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Regenerar token</AlertDialogTitle>
            <AlertDialogDescription>
              O token atual deste dispositivo deixará de funcionar
              imediatamente. Você vai precisar atualizar a configuração do
              dispositivo/middleware com o novo token.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <AlertDialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleRegenerar}
              disabled={isRegenerando}
            >
              {isRegenerando ? "Gerando..." : "Regenerar"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
