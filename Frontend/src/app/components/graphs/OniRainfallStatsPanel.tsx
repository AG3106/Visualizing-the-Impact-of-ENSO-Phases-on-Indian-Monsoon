import { useState } from "react";
import { useFilters } from "../../context/FilterContext";
import { fetchCorrelationHeatmap, fetchCorrelationScatter } from "../../data/api";
import { STATE_NAME_BY_ID } from "../../data/constants";
import { ColorLegend } from "../ColorLegend";
import { PanelCard } from "../single/PanelCard";
import { ViewSelect } from "../single/ViewSelect";
import { OniRainfallScatter } from "../stats/OniRainfallScatter";
import { StateSensitivityHeatmap } from "../stats/StateSensitivityHeatmap";

export function OniRainfallStatsPanel({ className }: { className?: string }) {
  const { state, selectRegion } = useFilters();
  const [view, setView] = useState<"scatter" | "heatmap">("scatter");
  const regionId = state.selectedRegionId ?? "mp";
  const resolvedName = STATE_NAME_BY_ID[regionId] ?? regionId;

  return (
    <PanelCard
      className={className}
      title="ONI vs rainfall"
      info="How strongly each state's monsoon rainfall responds to ENSO. Scatter shows one state's per-year points with an OLS fit; the heatmap ranks every state by Pearson r."
      actions={
        <ViewSelect
          value={view}
          onChange={(v) => setView(v as "scatter" | "heatmap")}
          width={120}
          options={[
            { value: "scatter", label: "Scatter" },
            { value: "heatmap", label: "Sensitivity" },
          ]}
        />
      }
      bodyClassName="flex flex-col gap-2"
    >
      {view === "scatter" ? (
        <>
          <div className="min-h-0 flex-1">
            <OniRainfallScatter stateName={resolvedName} />
          </div>
          {/* <div className="text-muted-foreground shrink-0 text-[11px]">
            Colour = ENSO phase. {state.compareMode ? "Ringed dots = Year A / Year B." : "Switch to Sensitivity to pick a state."}
          </div> */}
        </>
      ) : (
        <>
          <div className="min-h-0 flex-1">
            <StateSensitivityHeatmap
              selectedRegionId={state.selectedRegionId}
              onSelect={(id) => {
                selectRegion(id);
                setView("scatter");
              }}
            />
          </div>
          <ColorLegend
            kind="correlation"
            domain={1}
            minLabel="−1"
            midLabel="0"
            maxLabel="+1"
            className="shrink-0"
          />
        </>
      )}
    </PanelCard>
  );
}
