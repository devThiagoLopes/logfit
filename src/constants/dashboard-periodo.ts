export const DASHBOARD_PERIODO_KEYS = ["semana", "mes", "ano"] as const;

export type DashboardPeriodoKey = (typeof DASHBOARD_PERIODO_KEYS)[number];

export const DASHBOARD_PERIODOS: {
  key: DashboardPeriodoKey;
  label: string;
  dias: number;
}[] = [
  { key: "semana", label: "Semana", dias: 7 },
  { key: "mes", label: "Mês", dias: 30 },
  { key: "ano", label: "Ano", dias: 365 },
];

export const DASHBOARD_PERIODO_PADRAO: DashboardPeriodoKey = "mes";

export const DASHBOARD_PERIODO_DESCRICAO: Record<DashboardPeriodoKey, string> = {
  semana: "na última semana",
  mes: "no último mês",
  ano: "no último ano",
};

export function diasDoPeriodo(periodo: DashboardPeriodoKey) {
  return (
    DASHBOARD_PERIODOS.find(({ key }) => key === periodo)?.dias ??
    DASHBOARD_PERIODOS.find(({ key }) => key === DASHBOARD_PERIODO_PADRAO)!.dias
  );
}

export function parseDashboardPeriodo(value: string | undefined): DashboardPeriodoKey {
  return DASHBOARD_PERIODO_KEYS.includes(value as DashboardPeriodoKey)
    ? (value as DashboardPeriodoKey)
    : DASHBOARD_PERIODO_PADRAO;
}
