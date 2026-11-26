import { randomUUID } from "node:crypto";

import { afterAll, describe, expect, it } from "vitest";

import {
  createUsuario,
  deleteUsuario,
  getUsuarios,
  updateUsuario,
} from "@/services/usuarios";

describe("services/usuarios (integração com o banco de teste)", () => {
  const usuariosCriados: string[] = [];

  afterAll(async () => {
    await Promise.all(usuariosCriados.map((id) => deleteUsuario(id)));
  });

  function emailAleatorio() {
    return `ci-teste-${randomUUID()}@logfit.com`;
  }

  it("cria um usuário funcionário e ele aparece na listagem", async () => {
    const email = emailAleatorio();
    const criado = await createUsuario({
      name: "Instrutor CI Teste",
      email,
      password: "senha12345",
      role: "instrutor",
    });
    usuariosCriados.push(criado.id);

    expect(criado.role).toBe("instrutor");

    const usuarios = await getUsuarios();
    const encontrado = usuarios.find((u) => u.id === criado.id);
    expect(encontrado?.email).toBe(email);
  });

  it("atualiza nome e role de um usuário existente", async () => {
    const criado = await createUsuario({
      name: "Instrutor CI Teste",
      email: emailAleatorio(),
      password: "senha12345",
      role: "instrutor",
    });
    usuariosCriados.push(criado.id);

    const atualizado = await updateUsuario(criado.id, {
      name: "Admin CI Teste Renomeado",
      role: "admin",
    });

    expect(atualizado?.name).toBe("Admin CI Teste Renomeado");
    expect(atualizado?.role).toBe("admin");
  });

  it("exclui um usuário e ele deixa de aparecer na listagem", async () => {
    const criado = await createUsuario({
      name: "Instrutor CI Teste Exclusao",
      email: emailAleatorio(),
      password: "senha12345",
      role: "instrutor",
    });

    await deleteUsuario(criado.id);

    const usuarios = await getUsuarios();
    expect(usuarios.map((u) => u.id)).not.toContain(criado.id);
  });
});
