import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ScanLine } from "lucide-react";

import { auth } from "@/lib/auth/auth";
import { hasRole } from "@/lib/permissions";
import { CheckinFiltros } from "@/components/checkin/checkin-filtros";
import { CheckinLivePanel } from "@/components/checkin/checkin-live-panel";
import { getCheckins, getCheckinsRecentes } from "@/services/checkins";
import { getDispositivos } from "@/services/dispositivos";

const dateTimeFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});

const SENTIDO_LABEL: Record<string, string> = {
  entrada: "Entrada",
  saida: "Saída",
};

function diaParaIntervalo(data: string) {
  const inicio = new Date(`${data}T00:00:00`);
  const fim = new Date(`${data}T23:59:59.999`);
  return { inicio, fim };
}

export default async function CheckinPage({
  searchParams,
}: {
  searchParams: Promise<{
    dispositivoId?: string;
    liberado?: string;
    data?: string;
  }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!hasRole(session?.user, ["admin", "instrutor"])) {
    redirect("/");
  }

  const { dispositivoId, liberado, data } = await searchParams;

  const [checkins, checkinsRecentes, dispositivos] = await Promise.all([
    getCheckins({
      dispositivoId,
      ...(data ? diaParaIntervalo(data) : {}),
    }),
    getCheckinsRecentes(),
    getDispositivos(),
  ]);

  const checkinsFiltrados =
    liberado && liberado !== "all"
      ? checkins.filter((item) => String(item.liberado) === liberado)
      : checkins;

  return (
    <div className="px-8 py-10">
      <h1 className="text-2xl font-semibold text-foreground">Check-in</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Histórico de acessos registrados pelas catracas/sensores.
      </p>

      <CheckinLivePanel initialCheckins={checkinsRecentes} />

      <CheckinFiltros
        dispositivos={dispositivos.map(({ id, nome }) => ({ id, nome }))}
      />

      {checkinsFiltrados.length === 0 ? (
        <div className="mt-6 flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16 text-center">
          <ScanLine className="h-8 w-8 text-muted-foreground" />
          <p className="mt-3 text-sm font-medium text-foreground">
            Nenhum acesso encontrado
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Ajuste os filtros ou aguarde novos check-ins da catraca.
          </p>
        </div>
      ) : (
        <div className="mt-6 overflow-hidden rounded-lg border border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Horário</th>
                <th className="px-4 py-3 font-medium">Aluno</th>
                <th className="px-4 py-3 font-medium">Dispositivo</th>
                <th className="px-4 py-3 font-medium">Sentido</th>
                <th className="px-4 py-3 font-medium">Resultado</th>
                <th className="px-4 py-3 font-medium">Motivo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {checkinsFiltrados.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-3 text-muted-foreground">
                    {dateTimeFormatter.format(new Date(item.ocorridoEm))}
                  </td>
                  <td className="px-4 py-3 font-medium text-foreground">
                    {item.alunoNome ??
                      `Não identificado — ${item.identificadorValor}`}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {item.dispositivoNome}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {item.sentido ? SENTIDO_LABEL[item.sentido] : "-"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium ${
                        item.liberado
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {item.liberado ? "Liberado" : "Negado"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {item.motivo ?? "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
