import { afterAll, describe, expect, it } from "vitest";

import { createPlano, deletePlano, getPlanos } from "@/services/planos";

describe("service de planos (integração com o banco de teste)", () => {
  const idsCriados: string[] = [];

  afterAll(async () => {
    await Promise.all(idsCriados.map((id) => deletePlano(id)));
  });

  it("cria um plano e ele aparece na listagem", async () => {
    const criado = await createPlano({
      nome: "Plano CI Teste",
      periodicidade: "mensal",
      valor: 99.9,
    });
    idsCriados.push(criado.id);

    const planos = await getPlanos();
    const encontrado = planos.find((plano) => plano.id === criado.id);

    expect(encontrado).toBeDefined();
    expect(encontrado?.nome).toBe("Plano CI Teste");
    expect(encontrado?.alunosVinculados).toBe(0);
  });
});
