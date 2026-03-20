import { PHASES } from "@/lib/smm-engine";

const phaseColors: Record<string, string> = {
  "Warm Start": "bg-phase-warm",
  "Steady Growth": "bg-phase-steady",
  "Peak Growth": "bg-phase-peak",
  "Decay": "bg-phase-decay",
};

const phaseTextColors: Record<string, string> = {
  "Warm Start": "text-phase-warm",
  "Steady Growth": "text-phase-steady",
  "Peak Growth": "text-phase-peak",
  "Decay": "text-phase-decay",
};

export function PhaseTimeline({ currentPhase, elapsedHours }: { currentPhase: string; elapsedHours: number }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-widest">
        <span>Phase Timeline</span>
        <span className="ml-auto font-mono">{elapsedHours.toFixed(1)}h / 12h</span>
      </div>
      <div className="flex gap-1 h-2 rounded-full overflow-hidden bg-muted">
        {PHASES.map((p) => {
          const width = ((p.endHour - p.startHour) / 12) * 100;
          const active = currentPhase === p.name;
          const past = elapsedHours >= p.endHour;
          return (
            <div
              key={p.name}
              className={`${phaseColors[p.name]} transition-opacity duration-500 ${active ? "opacity-100 animate-pulse" : past ? "opacity-60" : "opacity-20"}`}
              style={{ width: `${width}%` }}
            />
          );
        })}
      </div>
      <div className="flex gap-4 flex-wrap">
        {PHASES.map((p) => (
          <span key={p.name} className={`text-xs font-mono ${currentPhase === p.name ? phaseTextColors[p.name] : "text-muted-foreground"}`}>
            {p.name} ({p.startHour}-{p.endHour}h)
          </span>
        ))}
      </div>
    </div>
  );
}
