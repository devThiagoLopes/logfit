import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SignaturePad } from "@/components/matriculas/signature-pad";

const fakeContext = {
  scale: vi.fn(),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  stroke: vi.fn(),
  clearRect: vi.fn(),
  lineWidth: 0,
  lineCap: "",
  lineJoin: "",
  strokeStyle: "",
};

beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
    fakeContext as unknown as CanvasRenderingContext2D,
  );
  vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue(
    "data:image/png;base64,fake-signature",
  );
  // jsdom não implementa setPointerCapture — stub manual (não dá pra
  // vi.spyOn em um método que não existe no protótipo).
  HTMLCanvasElement.prototype.setPointerCapture = vi.fn();
});

describe("SignaturePad", () => {
  it("mostra o placeholder e o botão 'Limpar assinatura' desabilitado quando vazio", () => {
    render(<SignaturePad onChange={vi.fn()} />);

    expect(
      screen.getByText("Assine aqui com o dedo ou o mouse"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Limpar assinatura" }),
    ).toBeDisabled();
  });

  it("chama onChange com o PNG ao finalizar um traço", () => {
    const onChange = vi.fn();
    render(<SignaturePad onChange={onChange} />);

    const canvas = document.querySelector("canvas")!;
    fireEvent.pointerDown(canvas, { pointerId: 1, clientX: 0, clientY: 0 });
    fireEvent.pointerMove(canvas, { pointerId: 1, clientX: 10, clientY: 10 });
    fireEvent.pointerUp(canvas, { pointerId: 1 });

    expect(onChange).toHaveBeenCalledWith("data:image/png;base64,fake-signature");
    expect(
      screen.queryByText("Assine aqui com o dedo ou o mouse"),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Limpar assinatura" }),
    ).toBeEnabled();
  });

  it("limpa a assinatura e chama onChange(null)", () => {
    const onChange = vi.fn();
    render(<SignaturePad onChange={onChange} />);

    const canvas = document.querySelector("canvas")!;
    fireEvent.pointerDown(canvas, { pointerId: 1, clientX: 0, clientY: 0 });
    fireEvent.pointerMove(canvas, { pointerId: 1, clientX: 10, clientY: 10 });
    fireEvent.pointerUp(canvas, { pointerId: 1 });

    fireEvent.click(
      screen.getByRole("button", { name: "Limpar assinatura" }),
    );

    expect(onChange).toHaveBeenLastCalledWith(null);
    expect(
      screen.getByText("Assine aqui com o dedo ou o mouse"),
    ).toBeInTheDocument();
  });
});
