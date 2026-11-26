import "@testing-library/jest-dom/vitest";

import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(() => {
  cleanup();
});

// jsdom's `new FormData(form)` não lê os arquivos reais de
// `<input type="file">` (sempre retorna um File vazio), mesmo quando
// `input.files` foi definido corretamente via fireEvent/user-event. Isso só
// afeta o ambiente jsdom dos testes de componente (`*.test.tsx`) — em
// navegador real funciona nativamente, só reforça o comportamento aqui.
if (typeof window !== "undefined") {
  const OriginalFormData = window.FormData;

  class PatchedFormData extends OriginalFormData {
    constructor(form?: HTMLFormElement) {
      super(form);
      if (!form) return;
      for (const input of form.querySelectorAll('input[type="file"]')) {
        const fileInput = input as HTMLInputElement;
        if (!fileInput.name) continue;
        this.delete(fileInput.name);
        for (const file of Array.from(fileInput.files ?? [])) {
          this.append(fileInput.name, file);
        }
      }
    }
  }

  window.FormData = PatchedFormData as unknown as typeof FormData;
  globalThis.FormData = PatchedFormData as unknown as typeof FormData;
}
