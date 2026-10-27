import { useState } from "react";
import {
  Activity,
  Camera,
  CameraOff,
  FlaskConical,
  Gauge,
  Hand,
  History,
  Info,
  Lightbulb,
  Loader2,
  ScanLine,
  Settings2,
  ShieldCheck,
  Sparkles,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { GESTURES, SUPPORTED } from "@/lib/gestures";
import { useHandTracker, type Settings, type TrackerStatus } from "@/hooks/use-hand-tracker";
import { HandGlyph } from "./HandGlyph";

const STATUS: Record<TrackerStatus, { label: string; tone: string }> = {
  off: { label: "Camera off", tone: "status-idle" },
  requesting: { label: "Requesting camera", tone: "status-busy" },
  "loading-model": { label: "Initializing model", tone: "status-busy" },
  running: { label: "Live", tone: "status-live" },
  demo: { label: "Demo mode", tone: "status-demo" },
  error: { label: "Error", tone: "status-error" },
};

export function Dashboard() {
  const [settings, setSettings] = useState<Settings>({
    threshold: 0.65,
    showLandmarks: true,
    showConnections: true,
    mirror: true,
    numHands: 1,
  });
  const t = useHandTracker(settings);
  const { status, snapshot } = t;
  const active = status === "running" || status === "demo";
  const busy = status === "requesting" || status === "loading-model";
  const isDemo = status === "demo";
  const stable = snapshot.stable;
  const handCount = snapshot.hands.length;

  let gestureLabel = "—";
  let gestureDesc = "Start the camera or try demo mode to begin.";
  if (status === "loading-model") gestureDesc = "Downloading and preparing the hand tracking model…";
  if (status === "requesting") gestureDesc = "Waiting for camera permission…";
  if (active) {
    if (handCount === 0) {
      gestureLabel = "No hand detected";
      gestureDesc = "Show one hand clearly inside the frame.";
    } else if (stable) {
      gestureLabel = GESTURES[stable.gesture].name;
      gestureDesc = GESTURES[stable.gesture].description;
    } else {
      gestureLabel = "Analyzing…";
      gestureDesc = "Hold the pose steady for a moment.";
    }
  }

  const st = STATUS[status];

  return (
    <div className="min-h-screen bg-app">
      <header className="border-b border-border/60 bg-background/60 backdrop-blur-md sticky top-0 z-20">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-brand shadow-glow">
              <Hand className="h-5 w-5 text-primary-foreground" aria-hidden />
            </div>
            <div>
              <h1 className="font-display text-base font-semibold leading-tight sm:text-lg">GestureAI</h1>
              <p className="text-xs text-muted-foreground">Real-time hand gesture recognition</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-cyan" aria-hidden />
            <span className="hidden sm:inline">Processed locally · nothing uploaded</span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          {/* Camera panel */}
          <section aria-label="Live camera" className="panel overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 px-4 py-3">
              <div className="flex items-center gap-2">
                <span className={cn("status-pill", st.tone)} role="status" aria-live="polite">
                  <span className="status-dot" />
                  {st.label}
                </span>
                {isDemo && (
                  <Badge variant="outline" className="border-violet/50 text-violet">
                    Sample data
                  </Badge>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {t.devices.length > 1 && (
                  <Select value={t.deviceId ?? ""} onValueChange={t.selectDevice}>
                    <SelectTrigger className="h-9 w-[180px]" aria-label="Select camera">
                      <SelectValue placeholder="Select camera" />
                    </SelectTrigger>
                    <SelectContent>
                      {t.devices.map((d, i) => (
                        <SelectItem key={d.deviceId || i} value={d.deviceId || `cam-${i}`}>
                          {d.label || `Camera ${i + 1}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {status === "running" || busy ? (
                  <Button variant="outline" size="sm" onClick={t.stop}>
                    <CameraOff /> Stop camera
                  </Button>
                ) : (
                  <Button variant="glow" size="sm" onClick={() => void t.start()}>
                    <Camera /> Start camera
                  </Button>
                )}
                {isDemo ? (
                  <Button variant="outline" size="sm" onClick={t.stop}>
                    Exit demo
                  </Button>
                ) : (
                  <Button variant="ghost" size="sm" onClick={t.startDemo} disabled={busy}>
                    <FlaskConical /> Demo mode
                  </Button>
                )}
              </div>
            </div>

            <div className="relative aspect-video w-full bg-stage">
              <div
                className={cn("absolute inset-0", settings.mirror && "-scale-x-100")}
              >
                <video
                  ref={t.videoRef}
                  className={cn("h-full w-full object-contain", status !== "running" && "invisible")}
                  muted
                  playsInline
                  aria-label="Camera preview"
                />
                <canvas
                  ref={t.canvasRef}
                  className={cn("absolute inset-0 h-full w-full object-contain", !active && "invisible")}
                  aria-hidden
                />
              </div>

              {!active && (
                <div className="absolute inset-0 grid place-items-center p-6 text-center">
                  <div className="max-w-sm space-y-3">
                    {busy ? (
                      <Loader2 className="mx-auto h-10 w-10 animate-spin text-cyan" aria-hidden />
                    ) : status === "error" ? (
                      <TriangleAlert className="mx-auto h-10 w-10 text-destructive" aria-hidden />
                    ) : (
                      <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl border border-cyan/30 bg-cyan/10 shadow-glow">
                        <ScanLine className="h-8 w-8 text-cyan" aria-hidden />
                      </div>
                    )}
                    <p className="font-display text-lg font-medium">
                      {status === "error" ? "Camera unavailable" : st.label}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {status === "error" ? t.error : busy ? gestureDesc : "Click Start camera and allow access. Video stays on this device."}
                    </p>
                    {status === "error" && (
                      <div className="flex justify-center gap-2">
                        <Button variant="glow" size="sm" onClick={() => void t.start()}>Try again</Button>
                        <Button variant="outline" size="sm" onClick={t.startDemo}>Use demo mode</Button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {active && (
                <div className="pointer-events-none absolute bottom-3 left-3 right-3 flex justify-start">
                  <div className="glass rounded-xl px-4 py-2">
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                      {isDemo ? "Demo result" : "Detected"}
                    </p>
                    <p className="font-display text-xl font-semibold text-gradient">{gestureLabel}</p>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Side: KPIs + current */}
          <aside className="space-y-4">
            <div className="panel p-4">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Current gesture</p>
              <p className="mt-1 font-display text-2xl font-semibold text-gradient" aria-live="polite">{gestureLabel}</p>
              <p className="mt-1 text-sm text-muted-foreground">{gestureDesc}</p>
              {isDemo && (
                <p className="mt-2 text-xs text-violet">Demo data — generated sample poses, not camera input.</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Kpi icon={Hand} label="Finger count" value={active && stable ? String(GESTURES[stable.gesture].count ?? "—") : "—"} hint={isDemo ? "sample pose" : undefined} />
              <Kpi icon={Hand} label="Hands" value={active ? String(handCount) : "—"} />
              <Kpi
                icon={Gauge}
                label="FPS"
                value={status === "running" && snapshot.fps ? snapshot.fps.toFixed(0) : "—"}
                hint={isDemo ? "n/a in demo" : undefined}
              />
              <Kpi
                icon={Activity}
                label="Match"
                value={active && stable && stable.gesture !== "unknown" ? `${Math.round(stable.score * 100)}%` : "—"}
              />
            </div>
            <p className="px-1 text-xs text-muted-foreground">
              "Match" is a geometric fit score for the chosen gesture, not a calibrated probability.
            </p>

            <HistoryPanel history={t.history} onClear={t.clearHistory} />
          </aside>
        </div>

        <Tabs defaultValue="learn" className="space-y-4">
          <TabsList>
            <TabsTrigger value="learn"><Lightbulb className="mr-1.5 h-4 w-4" />Learn</TabsTrigger>
            <TabsTrigger value="settings"><Settings2 className="mr-1.5 h-4 w-4" />Settings</TabsTrigger>
            <TabsTrigger value="about"><Info className="mr-1.5 h-4 w-4" />About</TabsTrigger>
          </TabsList>

          <TabsContent value="learn" className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {SUPPORTED.map((id) => {
                const g = GESTURES[id];
                const live = active && stable?.gesture === id;
                return (
                  <article key={id} className={cn("panel panel-hover flex gap-4 p-4", live && "panel-active")}>
                    <div className="grid h-20 w-20 shrink-0 place-items-center rounded-xl bg-stage">
                      <HandGlyph gesture={id} className="h-16 w-16" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="flex items-center gap-2 font-display font-semibold">
                        {g.name}
                        {g.count !== undefined && <Badge variant="outline">{g.count}</Badge>}
                        {live && <Sparkles className="h-4 w-4 text-cyan" aria-label="Currently detected" />}
                      </h3>
                      <p className="text-sm text-muted-foreground">{g.description}</p>
                      <p className="mt-1.5 text-xs text-cyan/90">{g.tip}</p>
                    </div>
                  </article>
                );
              })}
            </div>
            <div className="panel grid gap-4 p-4 sm:grid-cols-3">
              <Guide title="Positioning" text="Keep your whole hand in frame, about 40–70 cm from the camera, palm facing the lens." />
              <Guide title="Lighting" text="Use even, front-facing light. Avoid a bright window behind you and strong shadows." />
              <Guide title="Background" text="A plain background helps. Hold each pose still for about half a second." />
            </div>
          </TabsContent>

          <TabsContent value="settings">
            <div className="panel grid gap-6 p-5 md:grid-cols-2">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="threshold">Gesture sensitivity threshold</Label>
                  <span className="font-mono text-sm text-cyan">{Math.round(settings.threshold * 100)}%</span>
                </div>
                <Slider
                  id="threshold"
                  min={0.4}
                  max={0.95}
                  step={0.05}
                  value={[settings.threshold]}
                  onValueChange={([v]) => setSettings((s) => ({ ...s, threshold: v ?? s.threshold }))}
                />
                <p className="text-xs text-muted-foreground">
                  Higher values report fewer, more certain gestures. Lower values react faster but may mislabel.
                </p>
              </div>
              <div className="space-y-4">
                <Toggle id="lm" label="Show landmarks" checked={settings.showLandmarks} onChange={(v) => setSettings((s) => ({ ...s, showLandmarks: v }))} />
                <Toggle id="cn" label="Show connections" checked={settings.showConnections} onChange={(v) => setSettings((s) => ({ ...s, showConnections: v }))} />
                <Toggle id="mr" label="Mirror camera" checked={settings.mirror} onChange={(v) => setSettings((s) => ({ ...s, mirror: v }))} />
                <Toggle id="nh" label="Track two hands" checked={settings.numHands === 2} onChange={(v) => setSettings((s) => ({ ...s, numHands: v ? 2 : 1 }))} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="about" className="space-y-4">
            <Alert className="panel">
              <Info className="h-4 w-4" />
              <AlertTitle>How recognition works</AlertTitle>
              <AlertDescription>
                MediaPipe Hand Landmarker finds 21 points on each hand in your browser. GestureAI then classifies the pose
                using simple geometry (which fingers are extended or curled). This is an MVP: results can be ambiguous
                depending on hand orientation, lighting and distance — the OK sign is the least reliable. When no
                gesture fits well, it reports "Unknown" instead of guessing.
              </AlertDescription>
            </Alert>
            <Alert className="panel">
              <ShieldCheck className="h-4 w-4" />
              <AlertTitle>Privacy</AlertTitle>
              <AlertDescription>
                Video is processed locally on your device. Camera footage is never uploaded or saved. Only the model
                files are downloaded once from a public CDN. Camera access needs HTTPS or localhost.
              </AlertDescription>
            </Alert>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function Kpi({ icon: Icon, label, value, hint }: { icon: typeof Hand; label: string; value: string; hint?: string | undefined }) {
  return (
    <div className="panel p-3">
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3.5 w-3.5 text-cyan" aria-hidden />
        {label}
      </div>
      <p className="mt-1 font-mono text-xl font-semibold">{value}</p>
      {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Toggle({ id, label, checked, onChange }: { id: string; label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between">
      <Label htmlFor={id}>{label}</Label>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function Guide({ title, text }: { title: string; text: string }) {
  return (
    <div>
      <h4 className="font-display text-sm font-semibold text-cyan">{title}</h4>
      <p className="mt-1 text-sm text-muted-foreground">{text}</p>
    </div>
  );
}

function HistoryPanel({ history, onClear }: { history: ReturnType<typeof useHandTracker>["history"]; onClear: () => void }) {
  return (
    <div className="panel flex max-h-[360px] flex-col">
      <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
        <h2 className="flex items-center gap-2 font-display text-sm font-semibold">
          <History className="h-4 w-4 text-violet" aria-hidden /> Gesture history
        </h2>
        <Button variant="ghost" size="sm" onClick={onClear} disabled={!history.length} aria-label="Clear history">
          <Trash2 /> Clear
        </Button>
      </div>
      {history.length === 0 ? (
        <p className="p-4 text-sm text-muted-foreground">
          No gestures yet. New entries appear when a gesture changes and holds steady.
        </p>
      ) : (
        <ol className="overflow-y-auto p-2" aria-label="Recent gestures">
          {history.map((h) => (
            <li key={h.id} className="flex items-center justify-between rounded-lg px-2 py-1.5 text-sm hover:bg-muted/40">
              <span className="flex items-center gap-2">
                <span className={cn("h-1.5 w-1.5 rounded-full", h.demo ? "bg-violet" : "bg-cyan")} />
                {GESTURES[h.gesture].name}
                {h.demo && <span className="text-[10px] uppercase text-violet">demo</span>}
              </span>
              <span className="font-mono text-xs text-muted-foreground">
                {h.at.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
