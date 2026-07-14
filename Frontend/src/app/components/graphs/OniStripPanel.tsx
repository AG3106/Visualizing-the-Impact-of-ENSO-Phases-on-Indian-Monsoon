import { useMemo } from "react";
import {
  Area,
  AreaChart,
  Brush,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useFilters } from "../../context/FilterContext";
import { useData } from "../../context/DataProvider";
import { PanelCard } from "../single/PanelCard";
import { ChartBox } from "../single/ChartBox";
import { LoadingState, ErrorState } from "../ui/ErrorState";

const tooltipStyle = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  fontSize: 12,
};

export function OniStripPanel({ className }: { className?: string }) {
  const { state, setBrushRange } = useFilters();
  const { oniSeries, loading, error } = useData();

  const range: [number, number] = state.brushRange ?? [
    Math.max(0, oniSeries.length - 120),
    oniSeries.length - 1,
  ];
  const startLabel = oniSeries[range[0]]?.date ?? "";
  const endLabel = oniSeries[range[1]]?.date ?? "";
  const rangeLabel = `${startLabel} → ${endLabel} (${range[1] - range[0] + 1} mo)`;

  return (
    <PanelCard
      className={className}
      title="ONI Timeline — ENSO Phase History"
      info="Diverging area chart of the Oceanic Niño Index (2000–2024). Drag the brush handles to select any time window — the Phase Distribution and Seasonal Intensity panels update live to reflect your selection."
      actions={
        <span className="text-muted-foreground hidden text-xs lg:inline">{rangeLabel}</span>
      }
      bodyClassName="flex flex-col"
    >
      {loading ? (
        <LoadingState />
      ) : error || oniSeries.length === 0 ? (
        <ErrorState message={error ?? "No ONI data available."} />
      ) : (
        <ChartBox>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={oniSeries} margin={{ top: 4, right: 8, bottom: 0, left: -14 }}>
              <defs key="defs">
                <linearGradient id="oniStrip" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.55} />
                  <stop offset="50%" stopColor="var(--chart-1)" stopOpacity={0.08} />
                  <stop offset="100%" stopColor="var(--chart-2)" stopOpacity={0.4} />
                </linearGradient>
              </defs>
              <XAxis
                key="x"
                dataKey="date"
                tickFormatter={(v: string) => v.slice(0, 4)}
                tick={{ fontSize: 9 }}
                minTickGap={44}
                stroke="var(--muted-foreground)"
              />
              <YAxis key="y" tick={{ fontSize: 9 }} stroke="var(--muted-foreground)" width={34} />
              <Tooltip key="tip" contentStyle={tooltipStyle} />
              <ReferenceLine key="hi" y={0.5} stroke="var(--destructive)" strokeDasharray="4 4" />
              <ReferenceLine key="lo" y={-0.5} stroke="var(--chart-2)" strokeDasharray="4 4" />
              <ReferenceLine key="zero" y={0} stroke="var(--muted-foreground)" />
              <Area
                type="monotone"
                dataKey="oni"
                name="ONI (°C)"
                stroke="var(--chart-1)"
                strokeWidth={1.5}
                fill="url(#oniStrip)"
                isAnimationActive={false}
              />
              <Brush
                key="brush"
                dataKey="date"
                height={16}
                travellerWidth={8}
                startIndex={range[0]}
                endIndex={range[1]}
                stroke="var(--chart-1)"
                fill="var(--muted)"
                onChange={(r: { startIndex?: number; endIndex?: number }) => {
                  if (r.startIndex != null && r.endIndex != null) {
                    setBrushRange([r.startIndex, r.endIndex]);
                  }
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartBox>
      )}
    </PanelCard>
  );
}
