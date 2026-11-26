import { afterAll, describe, expect, it } from "vitest";

import {
  autenticarDispositivo,
  createDispositivo,
  deleteDispositivo,
  toggleAtivoDispositivo,
} from "@/services/dispositivos";

describe("autenticarDispositivo (integração com o banco de teste)", () => {
  const idsCriados: string[] = [];

  afterAll(async () => {
    await Promise.all(idsCriados.map((id) => deleteDispositivo(id)));
  });

  it("autentica com header 'Bearer <token>' e retorna o dispositivo", async () => {
    const criado = await createDispositivo({
      nome: "Catraca CI Teste",
      local: undefined,
      tipo: "catraca",
      lotacaoMaxima: 10,
    });
    idsCriados.push(criado.id);

    const dispositivo = await autenticarDispositivo(`Bearer ${criado.token}`);

    expect(dispositivo?.id).toBe(criado.id);
  });

  it("aceita o esquema em caixa baixa e espaços extras", async () => {
    const criado = await createDispositivo({
      nome: "Catraca CI Teste 2",
      local: undefined,
      tipo: "catraca",
      lotacaoMaxima: 10,
    });
    idsCriados.push(criado.id);

    const dispositivo = await autenticarDispositivo(
      `bearer   ${criado.token}  `,
    );

    expect(dispositivo?.id).toBe(criado.id);
  });

  it("retorna null quando não há header de autorização", async () => {
    expect(await autenticarDispositivo(null)).toBeNull();
  });

  it("retorna null quando o esquema não é Bearer", async () => {
    expect(await autenticarDispositivo("Basic abc123")).toBeNull();
  });

  it("retorna null quando o token não existe", async () => {
    expect(await autenticarDispositivo("Bearer token-inexistente")).toBeNull();
  });

  it("retorna null quando o dispositivo está inativo", async () => {
    const criado = await createDispositivo({
      nome: "Catraca CI Teste Inativa",
      local: undefined,
      tipo: "catraca",
      lotacaoMaxima: 10,
    });
    idsCriados.push(criado.id);
    await toggleAtivoDispositivo(criado.id, false);

    const dispositivo = await autenticarDispositivo(`Bearer ${criado.token}`);

    expect(dispositivo).toBeNull();
  });
});
