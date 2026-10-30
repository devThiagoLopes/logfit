import { z } from "zod";

import { ALUNO_GENEROS, ALUNO_SITUACOES } from "@/lib/db/aluno-schema";

function optionalText(max: number) {
  return z
    .string()
    .trim()
    .max(max, `Máximo de ${max} caracteres`)
    .optional()
    .transform((value) => (value ? value : undefined));
}

export const createAlunoSchema = z.object({
  nome: z.string().trim().min(3, "Informe o nome completo").max(100),
  email: z
    .string()
    .trim()
    .max(160, "E-mail muito longo")
    .email("E-mail inválido")
    .optional()
    .or(z.literal(""))
    .transform((value) => (value ? value : undefined)),
  dataNascimento: optionalText(10),
  genero: z.enum(ALUNO_GENEROS).optional(),
  endereco: optionalText(120),
  numero: optionalText(10),
  bairro: optionalText(80),
  cidade: optionalText(80),
  uf: optionalText(2),
  cep: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value ? value : undefined))
    .refine(
      (value) => !value || /^\d{5}-\d{3}$/.test(value),
      "CEP inválido. Use o formato 00000-000",
    ),
  telefone: z
    .string()
    .trim()
    .regex(
      /^\(\d{2}\) \d{4,5}-\d{4}$/,
      "Informe um telefone válido no formato (00) 00000-0000",
    ),
  cpf: z
    .string()
    .trim()
    .regex(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/, "CPF inválido. Use o formato 000.000.000-00"),
  rg: optionalText(20),
  situacao: z.enum(ALUNO_SITUACOES).default("ativo"),
  debito: z.coerce.number().min(0, "Débito inválido").default(0),
  observacoes: optionalText(1000),
});

// Formato bruto digitado no formulário (antes do coerce/transform do Zod).
export type CreateAlunoFormInput = z.input<typeof createAlunoSchema>;

// Formato validado/normalizado, usado pelo service e pela Server Action.
export type CreateAlunoInput = z.infer<typeof createAlunoSchema>;
