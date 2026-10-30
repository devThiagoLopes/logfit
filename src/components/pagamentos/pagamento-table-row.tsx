"use client";

import { useRouter } from "next/navigation";

export function PagamentoTableRow({
  matriculaId,
  children,
}: {
  matriculaId: string;
  children: React.ReactNode;
}) {
  const router = useRouter();

  return (
    <tr
      className="cursor-pointer transition-colors hover:bg-muted/50"
      onClick={() => router.push(`/matriculas/${matriculaId}`)}
    >
      {children}
    </tr>
  );
}
