"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { concluirPagamentoAction } from "@/app/(dashboard)/pagamentos/actions";
import { FORMAS_PAGAMENTO_OPCOES } from "@/constants/forma-pagamento";
import {
  concluirPagamentoSchema,
  type ConcluirPagamentoFormInput,
} from "@/lib/validations/pagamento";

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

type ConcluirPagamentoDialogProps = {
  pagamentoId: string;
  alunoNome: string;
  valor: string;
  trigger?: React.ReactElement;
};

export function ConcluirPagamentoDialog({
  pagamentoId,
  alunoNome,
  valor,
  trigger,
}: ConcluirPagamentoDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<ConcluirPagamentoFormInput>({
    resolver: zodResolver(concluirPagamentoSchema),
    defaultValues: { formaPagamento: "" },
  });

  async function onSubmit(data: ConcluirPagamentoFormInput) {
    setIsSubmitting(true);
    setFormError(null);

    const result = await concluirPagamentoAction(pagamentoId, data);

    if (result?.error) {
      setFormError(result.error);
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(false);
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) {
          setFormError(null);
          reset({ formaPagamento: "" });
        }
      }}
    >
      <DialogTrigger render={trigger ?? <Button size="sm">Concluir</Button>} />

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Concluir pagamento</DialogTitle>
          <DialogDescription>
            Confirme a forma de pagamento utilizada por {alunoNome}.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-2">
            <Label>Valor</Label>
            <p className="rounded-md border border-input bg-muted px-3 py-2 text-sm font-medium text-foreground">
              {currencyFormatter.format(Number(valor))}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="formaPagamento">Forma de pagamento</Label>
            <Controller
              name="formaPagamento"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="formaPagamento" className="w-full">
                    <SelectValue placeholder="Selecione a forma de pagamento">
                      {(value: string | null) =>
                        FORMAS_PAGAMENTO_OPCOES.find(
                          ({ key }) => key === value,
                        )?.label ?? "Selecione a forma de pagamento"
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {FORMAS_PAGAMENTO_OPCOES.map(({ key, label }) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.formaPagamento && (
              <p className="text-sm text-destructive">
                {errors.formaPagamento.message}
              </p>
            )}
          </div>

          {formError && (
            <p className="text-sm text-destructive">{formError}</p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Concluindo..." : "Confirmar pagamento"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
