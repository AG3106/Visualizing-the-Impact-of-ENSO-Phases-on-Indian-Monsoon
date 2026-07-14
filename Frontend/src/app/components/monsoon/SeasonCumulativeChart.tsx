import { useMemo } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useFilters } from "../../context/FilterContext";
import { fetchRainfallCumulative, type ApiRainfallCumulative } from "../../data/api";
import { useApiData } from "../../data/useApiData";
import { STATE_NAME_BY_ID } from "../../data/constants";
import { ChartBox } from "../single/ChartBox";
import { LoadingState, ErrorState } from "../ui/ErrorState";

const tooltipStyle = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  fontSize: 12,
};

interface CumRow {
  day: number;
  date: string;
  cumA: number;
  normal: number;
  cumB?: number;
}

interface SeasonCumulativeChartProps {
  year: number;
  compareYear?: number;
}

export function SeasonCumulativeChart({ year, compareYear }: SeasonCumulativeChartProps) {
  const { state } = useFilters();
  const regionId = state.selectedRegionId ?? "mp";
  const name = STATE_NAME_BY_ID[regionId] ?? regionId;

  const { data: dataA, loading: loadA, error: errA } = useApiData<ApiRainfallCumulative, CumRow[]>({
    apiFn: () => fetchRainfallCumulative(name, year),
    transform: (api) =>
      api.daily.map((d, i) => ({
        day: i,
        date: d.date,
        cumA: d.cumulative_mm,
        normal: d.daily_mm,
      })),
    deps: [year, regionId],
  });

  const { data: dataB, loading: loadB } = useApiData<ApiRainfallCumulative, number[]>({
    apiFn: () => (compareYear != null ? fetchRainfallCumulative(name, compareYear) : Promise.resolve(null)),
    transform: (api) => api.daily.map((d) => d.cumulative_mm),
    deps: [compareYear, regionId],
  });

  if (loadA || loadB) return <LoadingState />;
  if (errA || !dataA) return <ErrorState message={errA ?? "No data."} />;

  const merged = dataA.map((d, i) => ({
    ...d,
    cumB: dataB?.[i],
  }));

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="text-muted-foreground shrink-0 text-xs">
        Cumulative rainfall · {name}
      </div>
      <ChartBox>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={merged} margin={{ top: 6, right: 8, bottom: 0, left: -16 }}>
            <CartesianGrid key="grid" strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis key="x" dataKey="date" tick={{ fontSize: 9 }} minTickGap={40} stroke="var(--muted-foreground)" />
            <YAxis key="y" tick={{ fontSize: 9 }} stroke="var(--muted-foreground)" width={40} />
            <Tooltip key="tip" contentStyle={tooltipStyle} />
            <ReferenceLine key="frame" x={merged[Math.min(merged.length - 1, Math.max(0, Math.floor(state.playbackDay / 7)))]?.date} stroke="var(--ring)" strokeWidth={1.5} />
            <Line type="monotone" dataKey="cumA" name={`${year}`} stroke="var(--chart-1)" strokeWidth={2} dot={false} isAnimationActive={false} />
            {compareYear != null && (
              <Line type="monotone" dataKey="cumB" name={`${compareYear}`} stroke="var(--chart-2)" strokeWidth={2} dot={false} isAnimationActive={false} />
            )}
          </LineChart>
        </ResponsiveContainer>
      </ChartBox>
    </div>
  );
}
