"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const tooltipStyle = {
  backgroundColor: "var(--popover)",
  color: "var(--popover-foreground)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  fontSize: 12,
  padding: "6px 10px",
};

export function MovimentoSemanaChart({
  data,
}: {
  data: { dia: string; total: number }[];
}) {
  const maiorTotal = Math.max(0, ...data.map((item) => item.total));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid
          vertical={false}
          stroke="var(--border)"
          strokeDasharray="3 3"
        />
        <XAxis
          dataKey="dia"
          tickLine={false}
          axisLine={false}
          tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
        />
        <YAxis
          allowDecimals={false}
          tickLine={false}
          axisLine={false}
          width={32}
          tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          labelStyle={{ color: "var(--popover-foreground)" }}
          cursor={{ fill: "var(--muted)" }}
          formatter={(value) => [value, "Entradas"]}
        />
        <Bar dataKey="total" radius={[4, 4, 0, 0]} maxBarSize={40}>
          {data.map((item) => (
            <Cell
              key={item.dia}
              fill={
                item.total === maiorTotal && maiorTotal > 0
                  ? "var(--chart-1)"
                  : "var(--chart-3)"
              }
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
