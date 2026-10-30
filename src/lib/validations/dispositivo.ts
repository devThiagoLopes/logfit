import { z } from "zod";

export const createDispositivoSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome do dispositivo").max(100),
  local: z
    .string()
    .trim()
    .max(100)
    .optional()
    .transform((value) => (value ? value : undefined)),
});

export type CreateDispositivoFormInput = z.input<typeof createDispositivoSchema>;
export type CreateDispositivoInput = z.infer<typeof createDispositivoSchema>;
