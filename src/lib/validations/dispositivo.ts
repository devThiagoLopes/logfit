import { z } from "zod";

import { DISPOSITIVO_TIPOS } from "@/lib/db/dispositivo-schema";

export const createDispositivoSchema = z
  .object({
    nome: z.string().trim().min(2, "Informe o nome do dispositivo").max(100),
    local: z
      .string()
      .trim()
      .max(100)
      .optional()
      .transform((value) => (value ? value : undefined)),
    tipo: z.enum(DISPOSITIVO_TIPOS).default("catraca"),
    lotacaoMaxima: z.coerce
      .number()
      .int()
      .positive("Informe uma lotação válida")
      .optional(),
  })
  .transform((data) => ({
    ...data,
    // Lotação só existe para catraca; vibração não usa o campo.
    lotacaoMaxima: data.tipo === "catraca" ? data.lotacaoMaxima : undefined,
  }))
  .refine(
    (data) => data.tipo !== "catraca" || data.lotacaoMaxima !== undefined,
    {
      message: "Informe a lotação máxima da catraca",
      path: ["lotacaoMaxima"],
    },
  );

export type CreateDispositivoFormInput = z.input<typeof createDispositivoSchema>;
export type CreateDispositivoInput = z.infer<typeof createDispositivoSchema>;
