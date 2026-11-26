import { describe, expect, it } from "vitest";

import {
  createDocumentoAlunoSchema,
  DOCUMENTO_ALUNO_MAX_BYTES,
  validarArquivoDocumentoAluno,
} from "@/lib/validations/documento-aluno";

describe("createDocumentoAlunoSchema", () => {
  it("aceita título obrigatório e descrição opcional", () => {
    const resultado = createDocumentoAlunoSchema.safeParse({
      titulo: "Atestado médico",
      descricao: "Válido até 2027",
    });

    expect(resultado.success).toBe(true);
    if (resultado.success) {
      expect(resultado.data.titulo).toBe("Atestado médico");
      expect(resultado.data.descricao).toBe("Válido até 2027");
    }
  });

  it("transforma descrição vazia em undefined", () => {
    const resultado = createDocumentoAlunoSchema.safeParse({
      titulo: "Atestado médico",
      descricao: "   ",
    });

    expect(resultado.success).toBe(true);
    if (resultado.success) {
      expect(resultado.data.descricao).toBeUndefined();
    }
  });

  it("rejeita título vazio", () => {
    const resultado = createDocumentoAlunoSchema.safeParse({ titulo: "  " });

    expect(resultado.success).toBe(false);
  });

  it("rejeita título acima de 120 caracteres", () => {
    const resultado = createDocumentoAlunoSchema.safeParse({
      titulo: "a".repeat(121),
    });

    expect(resultado.success).toBe(false);
  });
});

describe("validarArquivoDocumentoAluno", () => {
  function arquivo(type: string, size: number) {
    return { type, size } as File;
  }

  it("aceita PDF dentro do limite de tamanho", () => {
    expect(validarArquivoDocumentoAluno(arquivo("application/pdf", 1024))).toBeNull();
  });

  it("aceita imagens JPG/PNG/WEBP dentro do limite", () => {
    expect(validarArquivoDocumentoAluno(arquivo("image/jpeg", 1024))).toBeNull();
    expect(validarArquivoDocumentoAluno(arquivo("image/png", 1024))).toBeNull();
    expect(validarArquivoDocumentoAluno(arquivo("image/webp", 1024))).toBeNull();
  });

  it("rejeita tipo de arquivo não permitido", () => {
    expect(validarArquivoDocumentoAluno(arquivo("text/plain", 1024))).toBe(
      "Tipo de arquivo não permitido. Envie um PDF ou imagem (JPG, PNG, WEBP).",
    );
  });

  it("rejeita arquivo acima de 10 MB", () => {
    expect(
      validarArquivoDocumentoAluno(
        arquivo("application/pdf", DOCUMENTO_ALUNO_MAX_BYTES + 1),
      ),
    ).toBe("Arquivo muito grande. O tamanho máximo é 10 MB.");
  });

  it("aceita arquivo exatamente no limite de tamanho", () => {
    expect(
      validarArquivoDocumentoAluno(
        arquivo("application/pdf", DOCUMENTO_ALUNO_MAX_BYTES),
      ),
    ).toBeNull();
  });
});
