"use client";

import { useState, type BaseSyntheticEvent } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Paperclip } from "lucide-react";

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
import { Textarea } from "@/components/ui/textarea";
import { uploadDocumentoAlunoAction } from "@/app/(dashboard)/alunos/documentos-actions";
import {
  createDocumentoAlunoSchema,
  validarArquivoDocumentoAluno,
  type CreateDocumentoAlunoFormInput,
} from "@/lib/validations/documento-aluno";

const ACCEPT = "application/pdf,image/jpeg,image/png,image/webp";

const emptyDefaultValues: CreateDocumentoAlunoFormInput = {
  titulo: "",
  descricao: "",
};

export function DocumentoAlunoFormDialog({ alunoId }: { alunoId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateDocumentoAlunoFormInput>({
    resolver: zodResolver(createDocumentoAlunoSchema),
    defaultValues: emptyDefaultValues,
  });

  async function onSubmit(
    data: CreateDocumentoAlunoFormInput,
    event?: BaseSyntheticEvent,
  ) {
    const formElement = event?.target as HTMLFormElement | undefined;
    const file = formElement
      ? (new FormData(formElement).get("arquivo") as File | null)
      : null;

    if (!file || file.size === 0) {
      setFormError("Selecione um arquivo para anexar.");
      return;
    }

    const fileError = validarArquivoDocumentoAluno(file);
    if (fileError) {
      setFormError(fileError);
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    const formData = new FormData();
    formData.set("titulo", data.titulo);
    if (data.descricao) formData.set("descricao", data.descricao);
    formData.set("arquivo", file);

    const result = await uploadDocumentoAlunoAction(alunoId, formData);

    if (result?.error) {
      setFormError(result.error);
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(false);
    setOpen(false);
    reset(emptyDefaultValues);
    router.refresh();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) {
          setFormError(null);
          reset(emptyDefaultValues);
        }
      }}
    >
      <DialogTrigger
        render={
          <Button type="button" variant="outline" size="sm">
            <Paperclip />
            Anexar documento
          </Button>
        }
      />

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Anexar documento</DialogTitle>
          <DialogDescription>
            Envie um PDF ou imagem (até 10 MB) para o cadastro deste aluno.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="titulo">Título</Label>
            <Input
              id="titulo"
              placeholder="Ex: Atestado médico"
              {...register("titulo")}
            />
            {errors.titulo && (
              <p className="text-sm text-destructive">
                {errors.titulo.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição (opcional)</Label>
            <Textarea
              id="descricao"
              placeholder="Alguma observação sobre esse documento"
              {...register("descricao")}
            />
            {errors.descricao && (
              <p className="text-sm text-destructive">
                {errors.descricao.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="arquivo">Arquivo</Label>
            <Input id="arquivo" name="arquivo" type="file" accept={ACCEPT} />
            <p className="text-xs text-muted-foreground">
              PDF, JPG, PNG ou WEBP — máximo de 10 MB.
            </p>
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
              {isSubmitting ? "Enviando..." : "Anexar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
