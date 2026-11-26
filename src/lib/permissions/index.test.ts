import { describe, expect, it } from "vitest";

import { hasRole } from "@/lib/permissions";

describe("hasRole", () => {
  it("retorna true quando o role do usuário está na lista permitida", () => {
    expect(hasRole({ role: "admin" }, ["admin", "instrutor"])).toBe(true);
  });

  it("retorna false quando o role do usuário não está na lista permitida", () => {
    expect(hasRole({ role: "aluno" }, ["admin", "instrutor"])).toBe(false);
  });

  it("retorna false quando a lista permitida está vazia", () => {
    expect(hasRole({ role: "admin" }, [])).toBe(false);
  });

  it("retorna false quando o usuário é null", () => {
    expect(hasRole(null, ["admin"])).toBe(false);
  });

  it("retorna false quando o usuário é undefined", () => {
    expect(hasRole(undefined, ["admin"])).toBe(false);
  });

  it("retorna false quando o usuário não tem role", () => {
    expect(hasRole({}, ["admin"])).toBe(false);
  });
});
