import { headers } from "next/headers";
import { AlertTriangle, Gauge, ScanLine, Users } from "lucide-react";

import { CheckinLivePanel } from "@/components/checkin/checkin-live-panel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardPeriodoFilter } from "@/components/dashboard/periodo-filter";
import { MovimentoPorHoraChart } from "@/components/dashboard/movimento-por-hora-chart";
import { MovimentoSemanaChart } from "@/components/dashboard/movimento-semana-chart";
import { PendenciasPanel } from "@/components/dashboard/pendencias-panel";
import { StatCard } from "@/components/dashboard/stat-card";
import {
  DASHBOARD_PERIODO_DESCRICAO,
  diasDoPeriodo,
  parseDashboardPeriodo,
} from "@/constants/dashboard-periodo";
import { auth } from "@/lib/auth/auth";
import { hasRole } from "@/lib/permissions";
import { getDashboardResumo } from "@/services/dashboard";

function ocupacaoColorClass(percentual: number) {
  if (percentual >= 90) return "bg-red-500";
  if (percentual >= 70) return "bg-amber-500";
  return "bg-emerald-500";
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!hasRole(session?.user, ["admin", "instrutor"])) {
    return (
      <div className="px-8 py-10">
        <h1 className="text-2xl font-semibold text-foreground">
          Bem-vindo, {session?.user.name || session?.user.email}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Perfil: {session?.user.role}
        </p>
      </div>
    );
  }

  const { periodo: periodoParam } = await searchParams;
  const periodo = parseDashboardPeriodo(periodoParam);

  const { resumoCheckin, movimentoPorHora, movimentoPorDiaSemana, ocupacao, checkinsRecentes, pendencias } =
    await getDashboardResumo(diasDoPeriodo(periodo));

  const diaDePico = movimentoPorDiaSemana.reduce(
    (atual, item) => (item.total > atual.total ? item : atual),
    movimentoPorDiaSemana[0],
  );

  return (
    <div className="px-8 py-10">
      <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Acompanhe a situação atual da academia e as pendências em aberto.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Users}
          label="Pessoas na academia"
          value={resumoCheckin.pessoasNaAcademia}
          caption="Estimado pelas entradas/saídas de hoje"
        />
        <StatCard
          icon={ScanLine}
          label="Entradas hoje"
          value={resumoCheckin.passagensHoje}
          caption="Passagens liberadas pela catraca"
        />
        <StatCard
          icon={Gauge}
          label="Ocupação atual"
          value={ocupacao.percentual !== null ? `${ocupacao.percentual}%` : "—"}
          caption={
            ocupacao.percentual !== null
              ? `${ocupacao.pessoasNaAcademia} de ${ocupacao.lotacaoMaxima} lugares`
              : "Nenhuma catraca com lotação cadastrada"
          }
          progress={
            ocupacao.percentual !== null
              ? {
                  percent: ocupacao.percentual,
                  colorClassName: ocupacaoColorClass(ocupacao.percentual),
                }
              : undefined
          }
        />
        <StatCard
          icon={AlertTriangle}
          label="Pendências"
          value={pendencias.length}
          caption="Pagamentos, matrículas e cadastros a resolver"
        />
      </div>

      <Card className="mt-6">
        <CardContent className="flex flex-wrap items-end gap-4">
          <DashboardPeriodoFilter />
        </CardContent>
      </Card>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-foreground">
              Movimento por horário (hoje)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <MovimentoPorHoraChart data={movimentoPorHora} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-medium text-foreground">
                Movimento por dia da semana
              </CardTitle>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Entradas registradas {DASHBOARD_PERIODO_DESCRICAO[periodo]}
              </p>
            </div>
            {diaDePico && diaDePico.total > 0 && (
              <span className="text-xs text-muted-foreground">
                Pico: {diaDePico.dia}
              </span>
            )}
          </CardHeader>
          <CardContent>
            <MovimentoSemanaChart data={movimentoPorDiaSemana} />
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <PendenciasPanel pendencias={pendencias} />
        <CheckinLivePanel initialCheckins={checkinsRecentes} className="" />
      </div>
    </div>
  );
}
