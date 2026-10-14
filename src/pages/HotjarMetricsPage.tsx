import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import sessions50 from "../../data/hotjar/sessions-50.json";
import sessions250 from "../../data/hotjar/sessions-250.json";
import sessions1000 from "../../data/hotjar/sessions-1000.json";
import {
  averageDuration,
  formatDuration,
  funnelCounts,
  HOTJAR_FUNNEL,
  isFrustrated,
  type HotjarSeedFile,
  type HotjarSeedSession,
} from "@/lib/hotjarMetrics";

const FILES: Record<number, HotjarSeedFile> = {
  50: sessions50 as HotjarSeedFile,
  250: sessions250 as HotjarSeedFile,
  1000: sessions1000 as HotjarSeedFile,
};

export default function HotjarMetricsPage() {
  const [sampleSize, setSampleSize] = useState<50 | 250 | 1000>(50);
  const [device, setDevice] = useState<"all" | "desktop" | "mobile">("all");
  const [frustratedOnly, setFrustratedOnly] = useState(false);
  const [dropOffEvent, setDropOffEvent] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const file = FILES[sampleSize];
  const cohort = useMemo(() => {
    return file.sessions.filter((session) => {
      if (device !== "all" && session.device !== device) return false;
      if (frustratedOnly && !isFrustrated(session)) return false;
      return true;
    });
  }, [file, device, frustratedOnly]);

  const tableSessions = useMemo(() => {
    if (!dropOffEvent) return cohort;
    const index = HOTJAR_FUNNEL.findIndex(([event]) => event === dropOffEvent);
    const previous = index > 0 ? HOTJAR_FUNNEL[index - 1][0] : null;
    return cohort.filter((session) => {
      const reachedPrevious = previous === null || session.events.includes(previous);
      return reachedPrevious && !session.events.includes(dropOffEvent);
    });
  }, [cohort, dropOffEvent]);

  const funnel = useMemo(() => funnelCounts(cohort), [cohort]);
  const duration = averageDuration(cohort);
  const frustrated = cohort.filter(isFrustrated).length;
  const frustrationRate = cohort.length === 0 ? 0 : frustrated / cohort.length;
  const reportStep = funnel[funnel.length - 1];
  const selected = tableSessions.find((session) => session.userIdHash === selectedId) ?? null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Local synthetic fixtures · site {file.siteId} · snippet v{file.version}</p>
            <h1 className="text-3xl font-bold">Hotjar metrics</h1>
            <p className="text-muted-foreground">Computed in this browser from the seed files. Nothing here is read back from Hotjar.</p>
          </div>
          <Badge variant="secondary">synthetic</Badge>
        </div>

        <div className="flex flex-wrap gap-2">
          {([50, 250, 1000] as const).map((size) => (
            <Button key={size} variant={sampleSize === size ? "default" : "outline"} onClick={() => { setSampleSize(size); setSelectedId(null); }}>
              {size} sessions
            </Button>
          ))}
          <span className="mx-2 hidden w-px bg-border sm:inline" />
          {(["all", "desktop", "mobile"] as const).map((value) => (
            <Button key={value} variant={device === value ? "secondary" : "outline"} onClick={() => setDevice(value)}>
              {value}
            </Button>
          ))}
          <Button variant={frustratedOnly ? "secondary" : "outline"} onClick={() => setFrustratedOnly((current) => !current)}>
            Frustration only
          </Button>
          {dropOffEvent && (
            <Button variant="outline" onClick={() => setDropOffEvent(null)}>Clear drop-off</Button>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Sessions" value={String(cohort.length)} />
          <Metric label="Average duration" value={formatDuration(duration)} />
          <Metric label="Report conversion" value={`${Math.round(reportStep.overallRate * 100)}%`} detail={`${reportStep.reached} reached report viewed`} />
          <Metric
            label="Frustration index"
            value={`${Math.round(frustrationRate * 100)}%`}
            detail={`${frustrated} with rage clicks or u-turns`}
            alert={frustrationRate >= 0.25}
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Funnel</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {funnel.map((step) => (
              <button
                key={step.event}
                type="button"
                className="grid w-full grid-cols-[9rem_1fr_auto] items-center gap-3 text-left"
                onClick={() => setDropOffEvent(step.dropOff > 0 ? step.event : null)}
              >
                <span className="text-sm">{step.label}</span>
                <span className="h-3 overflow-hidden rounded-full bg-muted">
                  <span className="block h-full rounded-full bg-primary" style={{ width: `${Math.max(step.overallRate * 100, 2)}%` }} />
                </span>
                <span className="text-xs text-muted-foreground">
                  {step.reached} · {Math.round(step.overallRate * 100)}% · drop {step.dropOff}
                </span>
              </button>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              Sessions
              {dropOffEvent ? ` that dropped before ${dropOffEvent.replace(/_/g, " ")}` : ""}
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground">
                <tr>
                  <th className="py-2 pr-3 font-medium">Persona</th>
                  <th className="py-2 pr-3 font-medium">Device</th>
                  <th className="py-2 pr-3 font-medium">Duration</th>
                  <th className="py-2 pr-3 font-medium">Last step</th>
                  <th className="py-2 font-medium">Signals</th>
                </tr>
              </thead>
              <tbody>
                {tableSessions.slice(0, 25).map((session) => (
                  <SessionRow
                    key={session.userIdHash}
                    session={session}
                    open={selectedId === session.userIdHash}
                    onToggle={() => setSelectedId(selectedId === session.userIdHash ? null : session.userIdHash)}
                  />
                ))}
              </tbody>
            </table>
            {tableSessions.length > 25 && (
              <p className="pt-3 text-xs text-muted-foreground">Showing 25 of {tableSessions.length} sessions.</p>
            )}
            {selected && (
              <ol className="mt-4 space-y-1 border-t pt-4 text-sm">
                {selected.events.map((event, index) => (
                  <li key={`${selected.userIdHash}-${event}-${index}`}>{index + 1}. {event.replace(/_/g, " ")}</li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Metric({ label, value, detail, alert }: { label: string; value: string; detail?: string; alert?: boolean }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className={`text-2xl font-bold ${alert ? "text-destructive" : ""}`}>{value}</p>
        {detail && <p className="text-xs text-muted-foreground">{detail}</p>}
      </CardContent>
    </Card>
  );
}

function SessionRow({ session, open, onToggle }: { session: HotjarSeedSession; open: boolean; onToggle: () => void }) {
  const last = session.events[session.events.length - 1]?.replace(/_/g, " ");
  return (
    <tr className={`cursor-pointer border-t ${open ? "bg-muted/40" : ""}`} onClick={onToggle}>
      <td className="py-2 pr-3 font-mono text-xs">{session.userIdHash.slice(0, 12)}</td>
      <td className="py-2 pr-3">{session.device}</td>
      <td className="py-2 pr-3">{formatDuration(session.durationSec)}</td>
      <td className="py-2 pr-3">{last}</td>
      <td className="py-2">
        {session.rageClicks > 0 && <Badge variant="destructive" className="mr-1">{session.rageClicks} rage</Badge>}
        {session.uTurns > 0 && <Badge variant="outline">{session.uTurns} u-turn</Badge>}
        {session.rageClicks === 0 && session.uTurns === 0 && <span className="text-muted-foreground">none</span>}
      </td>
    </tr>
  );
}
