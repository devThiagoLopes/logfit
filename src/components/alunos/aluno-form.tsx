"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm, type DefaultValues } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ImageIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createAlunoAction, updateAlunoAction } from "@/app/(dashboard)/alunos/actions";
import { UFS } from "@/constants/uf";
import { ALUNO_GENEROS, type Aluno } from "@/lib/db/aluno-schema";
import {
  createAlunoSchema,
  type CreateAlunoFormInput,
} from "@/lib/validations/aluno";
import { getEnderecoByCep } from "@/services/cep";
import { maskCep, maskCpf, maskTelefone } from "@/lib/masks";

const generoLabels: Record<(typeof ALUNO_GENEROS)[number], string> = {
  masculino: "Masculino",
  feminino: "Feminino",
  outro: "Outro",
};

const emptyDefaultValues: DefaultValues<CreateAlunoFormInput> = {
  situacao: "ativo",
  debito: 0,
};

function alunoToDefaultValues(
  aluno: Aluno,
): DefaultValues<CreateAlunoFormInput> {
  return {
    nome: aluno.nome,
    email: aluno.email ?? "",
    dataNascimento: aluno.dataNascimento ?? "",
    genero: aluno.genero ?? undefined,
    endereco: aluno.endereco ?? "",
    numero: aluno.numero ?? "",
    bairro: aluno.bairro ?? "",
    cidade: aluno.cidade ?? "",
    uf: aluno.uf ?? "",
    cep: aluno.cep ? maskCep(aluno.cep) : "",
    telefone: maskTelefone(aluno.telefone),
    cpf: maskCpf(aluno.cpf),
    rg: aluno.rg ?? "",
    situacao: aluno.situacao,
    debito: Number(aluno.debito),
    observacoes: aluno.observacoes ?? "",
  };
}

type AlunoFormProps = {
  aluno?: Aluno;
  onCancel?: () => void;
  onSaved?: (alunoCriado?: { id: string; nome: string }) => void;
};

export function AlunoForm({ aluno, onCancel, onSaved }: AlunoFormProps) {
  const isEditMode = Boolean(aluno);
  const defaultValues = aluno ? alunoToDefaultValues(aluno) : emptyDefaultValues;

  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isBuscandoCep, setIsBuscandoCep] = useState(false);
  const [cepNaoEncontrado, setCepNaoEncontrado] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    formState: { errors },
  } = useForm<CreateAlunoFormInput>({
    resolver: zodResolver(createAlunoSchema),
    defaultValues,
  });

  const telefoneField = register("telefone");
  const cpfField = register("cpf");
  const cepField = register("cep");

  async function handleCepBlur(event: React.FocusEvent<HTMLInputElement>) {
    cepField.onBlur(event);

    const cep = event.target.value;
    const digits = cep.replace(/\D/g, "");
    if (digits.length !== 8) return;

    setIsBuscandoCep(true);
    setCepNaoEncontrado(false);

    const endereco = await getEnderecoByCep(cep);

    if (endereco) {
      setValue("endereco", endereco.endereco, { shouldValidate: true });
      setValue("bairro", endereco.bairro, { shouldValidate: true });
      setValue("cidade", endereco.cidade, { shouldValidate: true });
      setValue("uf", endereco.uf, { shouldValidate: true });
    } else {
      setCepNaoEncontrado(true);
    }

    setIsBuscandoCep(false);
  }

  async function onSubmit(data: CreateAlunoFormInput) {
    setIsSubmitting(true);
    setFormError(null);

    if (isEditMode) {
      const result = await updateAlunoAction(aluno!.id, data);
      if (result?.error) {
        setFormError(result.error);
        setIsSubmitting(false);
        return;
      }

      setIsSubmitting(false);
      router.refresh();
      onSaved?.();
      return;
    }

    const result = await createAlunoAction(data);
    if ("error" in result) {
      setFormError(result.error);
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(false);
    reset(emptyDefaultValues);
    router.refresh();
    onSaved?.({ id: result.id, nome: result.nome });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Informações pessoais */}
      <section className="space-y-4">
        <h3 className="text-sm font-medium text-foreground">
          Informações pessoais
        </h3>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col items-center gap-1.5">
            <div className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-full border border-dashed border-border bg-muted/40 text-center">
              <ImageIcon className="h-5 w-5 text-muted-foreground" />
            </div>
            <span className="text-[11px] text-muted-foreground">
              Foto em breve
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="nome">Nome completo</Label>
              <Input
                id="nome"
                placeholder="Nome completo"
                maxLength={100}
                {...register("nome")}
              />
              {errors.nome && (
                <p className="text-sm text-destructive">
                  {errors.nome.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="aluno@email.com"
                maxLength={160}
                {...register("email")}
              />
              {errors.email && (
                <p className="text-sm text-destructive">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="telefone">Telefone / Celular</Label>
              <Input
                id="telefone"
                placeholder="(00) 00000-0000"
                maxLength={15}
                {...telefoneField}
                onChange={(event) => {
                  event.target.value = maskTelefone(event.target.value);
                  telefoneField.onChange(event);
                }}
              />
              {errors.telefone && (
                <p className="text-sm text-destructive">
                  {errors.telefone.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="dataNascimento">Data de nascimento</Label>
              <Input
                id="dataNascimento"
                type="date"
                {...register("dataNascimento")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="genero">Gênero</Label>
              <Controller
                name="genero"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value ?? ""}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger id="genero" className="w-full">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(generoLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cpf">CPF</Label>
              <Input
                id="cpf"
                placeholder="000.000.000-00"
                maxLength={14}
                {...cpfField}
                onChange={(event) => {
                  event.target.value = maskCpf(event.target.value);
                  cpfField.onChange(event);
                }}
              />
              {errors.cpf && (
                <p className="text-sm text-destructive">
                  {errors.cpf.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="rg">RG</Label>
              <Input id="rg" maxLength={20} {...register("rg")} />
            </div>
          </div>
        </div>
      </section>

      {/* Endereço */}
      <section className="space-y-3 border-t border-border pt-4">
        <h3 className="text-sm font-medium text-foreground">Endereço</h3>
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_2fr]">
            <div className="space-y-2">
              <Label htmlFor="cep">CEP</Label>
              <Input
                id="cep"
                placeholder="00000-000"
                maxLength={9}
                {...cepField}
                onChange={(event) => {
                  event.target.value = maskCep(event.target.value);
                  cepField.onChange(event);
                }}
                onBlur={handleCepBlur}
              />
              {isBuscandoCep && (
                <p className="text-xs text-muted-foreground">
                  Buscando endereço...
                </p>
              )}
              {cepNaoEncontrado && (
                <p className="text-xs text-destructive">
                  CEP não encontrado. Preencha manualmente.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="endereco">Rua</Label>
              <Input
                id="endereco"
                placeholder="Nome da rua"
                maxLength={120}
                {...register("endereco")}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[2fr_2fr_1fr_1fr]">
            <div className="space-y-2">
              <Label htmlFor="bairro">Bairro</Label>
              <Input id="bairro" maxLength={80} {...register("bairro")} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cidade">Cidade</Label>
              <Input id="cidade" maxLength={80} {...register("cidade")} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="numero">Número</Label>
              <Input
                id="numero"
                placeholder="Nº"
                maxLength={10}
                {...register("numero")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="uf">UF</Label>
              <Controller
                name="uf"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value ?? ""}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger id="uf" className="w-full">
                      <SelectValue placeholder="UF" />
                    </SelectTrigger>
                    <SelectContent>
                      {UFS.map((uf) => (
                        <SelectItem key={uf} value={uf}>
                          {uf}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Observações */}
      <section className="space-y-3 border-t border-border pt-4">
        <h3 className="text-sm font-medium text-foreground">Observações</h3>
        <div className="space-y-2">
          <Textarea
            id="observacoes"
            rows={3}
            placeholder="Anotações sobre saúde, restrições, histórico..."
            maxLength={1000}
            {...register("observacoes")}
          />
        </div>
      </section>

      {formError && <p className="text-sm text-destructive">{formError}</p>}

      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
        )}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting
            ? "Salvando..."
            : isEditMode
              ? "Salvar"
              : "Cadastrar"}
        </Button>
      </div>
    </form>
  );
}
