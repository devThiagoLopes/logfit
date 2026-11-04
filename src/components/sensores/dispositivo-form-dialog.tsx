"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, type DefaultValues } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, ScanLine, Vibrate } from "lucide-react";

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
import { cn } from "@/lib/utils";
import {
  createDispositivoAction,
  updateDispositivoAction,
} from "@/app/(dashboard)/sensores/actions";
import { DISPOSITIVO_TIPOS, type Dispositivo } from "@/lib/db/dispositivo-schema";
import {
  createDispositivoSchema,
  type CreateDispositivoFormInput,
} from "@/lib/validations/dispositivo";

const TIPO_OPCOES = [
  { value: "catraca", label: "Catraca", icon: ScanLine },
  { value: "vibracao", label: "Vibração", icon: Vibrate },
] as const satisfies readonly {
  value: (typeof DISPOSITIVO_TIPOS)[number];
  label: string;
  icon: typeof ScanLine;
}[];

const emptyDefaultValues: DefaultValues<CreateDispositivoFormInput> = {
  nome: "",
  local: "",
  tipo: "catraca",
  lotacaoMaxima: undefined,
};

function dispositivoToDefaultValues(
  dispositivo: Dispositivo,
): DefaultValues<CreateDispositivoFormInput> {
  return {
    nome: dispositivo.nome,
    local: dispositivo.local ?? "",
    tipo: dispositivo.tipo,
    lotacaoMaxima: dispositivo.lotacaoMaxima ?? undefined,
  };
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
    watch,
    setValue,
    formState: { errors },
  } = useForm<CreateDispositivoFormInput>({
    resolver: zodResolver(createDispositivoSchema),
    defaultValues,
  });

  const tipo = watch("tipo") ?? "catraca";

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
          <div className="flex rounded-lg bg-muted p-1">
            {TIPO_OPCOES.map((opcao) => {
              const Icon = opcao.icon;
              const isSelecionado = tipo === opcao.value;

              return (
                <button
                  key={opcao.value}
                  type="button"
                  onClick={() => setValue("tipo", opcao.value, { shouldDirty: true })}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                    isSelecionado
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {opcao.label}
                </button>
              );
            })}
          </div>

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

          {tipo === "catraca" ? (
            <div className="space-y-2">
              <Label htmlFor="lotacaoMaxima">Lotação máxima</Label>
              <Input
                id="lotacaoMaxima"
                type="number"
                min={1}
                placeholder="Ex: 60"
                {...register("lotacaoMaxima")}
              />
              {errors.lotacaoMaxima && (
                <p className="text-sm text-destructive">
                  {errors.lotacaoMaxima.message}
                </p>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border py-10 text-center">
              <Vibrate className="h-12 w-12 text-muted-foreground" />
              <p className="text-sm font-medium text-muted-foreground">
                Em desenvolvimento
              </p>
            </div>
          )}

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
