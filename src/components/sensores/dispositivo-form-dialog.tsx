"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, type DefaultValues } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";

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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createDispositivoAction,
  updateDispositivoAction,
} from "@/app/(dashboard)/sensores/actions";
import type { Dispositivo } from "@/lib/db/dispositivo-schema";
import {
  createDispositivoSchema,
  type CreateDispositivoFormInput,
} from "@/lib/validations/dispositivo";

const emptyDefaultValues: DefaultValues<CreateDispositivoFormInput> = {
  nome: "",
  local: "",
};

function dispositivoToDefaultValues(
  dispositivo: Dispositivo,
): DefaultValues<CreateDispositivoFormInput> {
  return { nome: dispositivo.nome, local: dispositivo.local ?? "" };
}

type DispositivoFormDialogProps = {
  dispositivo?: Dispositivo;
  trigger?: React.ReactElement;
};

export function DispositivoFormDialog({
  dispositivo,
  trigger,
}: DispositivoFormDialogProps) {
  const isEditMode = Boolean(dispositivo);
  const defaultValues = dispositivo
    ? dispositivoToDefaultValues(dispositivo)
    : emptyDefaultValues;

  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateDispositivoFormInput>({
    resolver: zodResolver(createDispositivoSchema),
    defaultValues,
  });

  async function onSubmit(data: CreateDispositivoFormInput) {
    setIsSubmitting(true);
    setFormError(null);

    const result = isEditMode
      ? await updateDispositivoAction(dispositivo!.id, data)
      : await createDispositivoAction(data);

    if (result?.error) {
      setFormError(result.error);
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(false);
    setOpen(false);
    if (!isEditMode) reset(emptyDefaultValues);
    router.refresh();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) {
          setFormError(null);
          reset(defaultValues);
        }
      }}
    >
      <DialogTrigger
        render={
          trigger ?? (
            <Button>
              <Plus />
              Novo dispositivo
            </Button>
          )
        }
      />

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? "Editar dispositivo" : "Novo dispositivo"}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? "Atualize os dados da catraca/sensor."
              : "Cadastre uma catraca ou sensor de check-in. O token de autenticação é gerado automaticamente."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nome">Nome</Label>
            <Input
              id="nome"
              placeholder="Ex: Catraca entrada principal"
              {...register("nome")}
            />
            {errors.nome && (
              <p className="text-sm text-destructive">{errors.nome.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="local">Local</Label>
            <Input
              id="local"
              placeholder="Ex: Recepção"
              {...register("local")}
            />
            {errors.local && (
              <p className="text-sm text-destructive">
                {errors.local.message}
              </p>
            )}
          </div>

          {formError && <p className="text-sm text-destructive">{formError}</p>}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? "Salvando..."
                : isEditMode
                  ? "Salvar"
                  : "Cadastrar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
