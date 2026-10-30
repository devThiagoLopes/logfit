export function maskTelefone(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length === 0) return "";
  if (digits.length <= 2) return `(${digits}`;

  const ddd = digits.slice(0, 2);
  const numero = digits.slice(2);
  const isCelular = digits.length > 10;
  const tamanhoPrefixo = isCelular ? 5 : 4;
  const prefixo = numero.slice(0, tamanhoPrefixo);
  const sufixo = numero.slice(tamanhoPrefixo);

  return sufixo ? `(${ddd}) ${prefixo}-${sufixo}` : `(${ddd}) ${prefixo}`;
}

export function maskCpf(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  const p1 = digits.slice(0, 3);
  const p2 = digits.slice(3, 6);
  const p3 = digits.slice(6, 9);
  const p4 = digits.slice(9, 11);

  let resultado = p1;
  if (p2) resultado += `.${p2}`;
  if (p3) resultado += `.${p3}`;
  if (p4) resultado += `-${p4}`;
  return resultado;
}

export function maskCep(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  const p1 = digits.slice(0, 5);
  const p2 = digits.slice(5, 8);
  return p2 ? `${p1}-${p2}` : p1;
}
