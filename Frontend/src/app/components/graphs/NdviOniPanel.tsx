import { useMemo, useState, useEffect } from "react";
import {
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
  ComposedChart,
  Line,
  Legend,
  Brush,
} from "recharts";
import { REGION_GROUPS } from "../../data/constants";
import { YEAR_MIN, YEAR_MAX } from "../../data/constants";
import { fetchNdviRegional, fetchNdviNational, type ApiNdviRegional } from "../../data/api";
import { useApiData } from "../../data/useApiData";
import { linearRegression, pearson, pValue } from "../../data/utils";
import { classifyPhase } from "../../data/utils";
import { phaseColor } from "../../lib/colorScale";
import type { Phase } from "../../data/types";
import { PanelCard } from "../single/PanelCard";
import { ChartBox } from "../single/ChartBox";
import { ViewSelect } from "../single/ViewSelect";
import { LoadingState, ErrorState } from "../ui/ErrorState";

const tooltipStyle = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  fontSize: 12,
  padding: "6px 10px",
};

interface ScatterPoint {
  x: number;   // ONI
  y: number;   // mean NDVI
  z: number;   // dot area — encodes year (larger = more recent)
  phase: Phase;
  date: string;
}

function yearToSize(year: number, min = 14, max = 68): number {
  const t = (year - YEAR_MIN) / Math.max(1, YEAR_MAX - YEAR_MIN);
  return Math.round(min + t * (max - min));
}

function NdviScatterTip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: ScatterPoint }[];
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div style={tooltipStyle}>
      <div className="font-semibold mb-0.5">{d.date.slice(0, 7)}</div>
      <div className="text-muted-foreground">ONI : {d.x.toFixed(2)}</div>
      <div className="text-muted-foreground">NDVI : {d.y.toFixed(3)}</div>
      <div className="text-muted-foreground">{d.phase}</div>
    </div>
  );
}

export function NdviOniPanel({ className }: { className?: string }) {
  const [groupId, setGroupId] = useState("S");
  const [viewType, setViewType] = useState<"scatter" | "dual">("scatter");

  const ALL_INDIA = "ALL";
  const isNational = groupId === ALL_INDIA;

  let regionLabel =
    REGION_GROUPS.find((g) => g.id === groupId)?.label?.toLowerCase() ?? "south";
  if (regionLabel === "east & ne") regionLabel = "east";

  const [brushIdx, setBrushIdx] = useState<[number, number]>([0, 0]);

  const { data: rawData, loading, error, refetch } = useApiData<
    ApiNdviRegional,
    ScatterPoint[]
  >({
    apiFn: () =>
      isNational
        ? (fetchNdviNational() as Promise<ApiNdviRegional | null>)
        : fetchNdviRegional(regionLabel),
    transform: (api) =>
      api.data.map((d) => ({
        x: d.oni,
        y: d.mean_ndvi,
        z: yearToSize(new Date(d.composite_start).getFullYear()),
        phase: classifyPhase(d.oni),
        date: d.composite_start,
      })),
    deps: [groupId],
  });

  useEffect(() => {
    if (rawData && rawData.length > 0) {
      // 5 years out of roughly 25 years (2000-2024) is about 1/5th of the data
      const windowSize = Math.floor(rawData.length / 5);
      setBrushIdx([Math.max(0, rawData.length - windowSize), rawData.length - 1]);
    }
  }, [rawData]);

  const stats = useMemo(() => {
    if (!rawData || rawData.length < 3) return null;
    const xs = rawData.map((d) => d.x);
    const ys = rawData.map((d) => d.y);
    const r = pearson(xs, ys);
    const p = pValue(r, rawData.length);
    const reg = linearRegression(rawData.map((d) => ({ x: d.x, y: d.y })));
    const minX = Math.min(...xs, -0.5);
    const maxX = Math.max(...xs, 0.5);
    const line = [
      { x: minX, y: reg.intercept + reg.slope * minX },
      { x: maxX, y: reg.intercept + reg.slope * maxX },
    ];
    return { r, p, n: rawData.length, line };
  }, [rawData]);

  const groupLabel = isNational
    ? "All India"
    : (REGION_GROUPS.find((g) => g.id === groupId)?.label ?? groupId);

  return (
    <PanelCard
      className={className}
      title="NDVI vs ONI"
      info="Scatter of kharif-season NDVI against the concurrent ONI index. Each dot is one 16-day composite. The red line is the OLS fit; dots are coloured by ENSO phase."
      actions={
        <div className="flex items-center gap-2">
          <ViewSelect
            value={viewType}
            onChange={(v) => setViewType(v as "scatter" | "dual")}
            width={120}
            options={[
              { value: "scatter", label: "Scatter Plot" },
              { value: "dual", label: "Dual Axis" },
            ]}
          />
          <ViewSelect
            value={groupId}
            onChange={setGroupId}
            width={140}
            options={[
              { value: ALL_INDIA, label: "All India" },
              ...REGION_GROUPS.map((g) => ({ value: g.id, label: g.label })),
            ]}
          />
        </div>
      }
      bodyClassName="flex flex-col"
    >
      {loading ? (
        <LoadingState />
      ) : error || !rawData ? (
        <ErrorState message={error ?? "No NDVI data."} onRetry={refetch} />
      ) : (
        <div className="flex h-full min-h-0 flex-col">
          {stats && (
            <div className="text-muted-foreground shrink-0 text-xs">
              Correlation: r = {stats.r.toFixed(2)}, p ={" "}
              {stats.p < 0.001 ? "<0.001" : stats.p.toFixed(3)} (n = {stats.n})
            </div>
          )}
          <ChartBox>
            <ResponsiveContainer width="100%" height="100%">
              {viewType === "scatter" ? (
                <ScatterChart margin={{ top: 8, right: 10, bottom: 4, left: -12 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis
                    type="number"
                    dataKey="x"
                    name="ONI"
                    domain={[-2.5, 2.5]}
                    tick={{ fontSize: 9 }}
                    stroke="var(--muted-foreground)"
                  />
                  <YAxis
                    type="number"
                    dataKey="y"
                    name="NDVI"
                    domain={["auto", "auto"]}
                    tick={{ fontSize: 9 }}
                    width={38}
                    stroke="var(--muted-foreground)"
                  />
                  <ZAxis type="number" dataKey="z" range={[14, 68]} />
                  <Tooltip content={<NdviScatterTip />} cursor={{ strokeDasharray: "3 3" }} />
                  <ReferenceLine x={0} stroke="var(--muted-foreground)" strokeWidth={1} />

                  {/* OLS regression line */}
                  {stats && (
                    <Scatter
                      data={stats.line}
                      line={{ stroke: "var(--destructive)", strokeWidth: 2 }}
                      shape={() => <g />}
                      isAnimationActive={false}
                    />
                  )}

                  {/* Data points coloured by ENSO phase */}
                  <Scatter data={rawData} isAnimationActive={false}>
                    {rawData.map((d, i) => (
                      <Cell
                        key={i}
                        fill={phaseColor(d.phase)}
                        fillOpacity={0.75}
                      />
                    ))}
                  </Scatter>
                </ScatterChart>
              ) : (
                <ComposedChart data={rawData} margin={{ top: 8, right: 10, bottom: 4, left: -12 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(val) => val.slice(0, 4)}
                    tick={{ fontSize: 9 }}
                    stroke="var(--muted-foreground)"
                    minTickGap={20}
                  />
                  <YAxis
                    yAxisId="ndvi"
                    type="number"
                    domain={["auto", "auto"]}
                    tick={{ fontSize: 9 }}
                    width={38}
                    stroke="var(--primary)"
                  />
                  <YAxis
                    yAxisId="oni"
                    type="number"
                    orientation="right"
                    domain={[-2.5, 2.5]}
                    tick={{ fontSize: 9 }}
                    width={30}
                    stroke="var(--destructive)"
                  />
                  <Tooltip
                    contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }}
                    itemStyle={{ fontSize: 12 }}
                    labelStyle={{ fontSize: 12, fontWeight: 600, color: "var(--foreground)", marginBottom: 4 }}
                    labelFormatter={(val) => val.slice(0, 7)}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <ReferenceLine yAxisId="oni" y={0} stroke="var(--muted-foreground)" strokeWidth={1} strokeDasharray="3 3" />
                  <Line
                    yAxisId="ndvi"
                    type="monotone"
                    dataKey="y"
                    name="NDVI"
                    stroke="var(--primary)"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                  <Line
                    yAxisId="oni"
                    type="step"
                    dataKey="x"
                    name="ONI"
                    stroke="var(--destructive)"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                  <Brush
                    dataKey="date"
                    height={16}
                    travellerWidth={8}
                    startIndex={brushIdx[0]}
                    endIndex={brushIdx[1]}
                    stroke="var(--primary)"
                    fill="var(--muted)"
                    onChange={(r: any) => {
                      if (r.startIndex != null && r.endIndex != null) {
                        setBrushIdx([r.startIndex, r.endIndex]);
                      }
                    }}
                  />
                </ComposedChart>
              )}
            </ResponsiveContainer>
          </ChartBox>
        </div>
      )}
    </PanelCard>
  );
}
