import { z } from "zod";

import { CHECKIN_SENTIDOS } from "@/lib/db/checkin-schema";

const identificadorShape = {
  matricula: z.coerce.number().int().positive().optional(),
  cpf: z.string().trim().min(11, "CPF inválido").optional(),
};

function exatamenteUmIdentificador(data: {
  matricula?: number;
  cpf?: string;
}) {
  return Boolean(data.matricula) !== Boolean(data.cpf);
}

export const autorizarAcessoSchema = z
  .object(identificadorShape)
  .refine(exatamenteUmIdentificador, {
    message: "Informe matrícula ou CPF (apenas um).",
  });

export type AutorizarAcessoInput = z.infer<typeof autorizarAcessoSchema>;

export const registrarCheckinSchema = z
  .object({
    ...identificadorShape,
    liberado: z.boolean(),
    motivo: z.string().trim().max(255).optional(),
    sentido: z.enum(CHECKIN_SENTIDOS).optional(),
    ocorridoEm: z.coerce.date().optional(),
  })
  .refine(exatamenteUmIdentificador, {
    message: "Informe matrícula ou CPF (apenas um).",
  });

export type RegistrarCheckinInput = z.infer<typeof registrarCheckinSchema>;
