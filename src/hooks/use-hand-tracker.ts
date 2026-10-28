import { useCallback, useEffect, useRef, useState } from "react";
import {
  classifyHand,
  HAND_CONNECTIONS,
  supportedGestures,
  syntheticHand,
  type GestureId,
  type Point,
  type RecognitionMode,
} from "@/lib/gestures";

const WASM_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.1.1/wasm";
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";

export type TrackerStatus =
  | "off"
  | "requesting"
  | "loading-model"
  | "running"
  | "demo"
  | "error";

export interface Settings {
  threshold: number;
  showLandmarks: boolean;
  showConnections: boolean;
  mirror: boolean;
  numHands: 1 | 2;
  mode: RecognitionMode;
}

export interface HandResult {
  gesture: GestureId;
  score: number;
  handedness?: string | undefined;
}

export interface Snapshot {
  hands: HandResult[];
  fps: number | null;
  /** Stable gesture after debounce (primary hand). */
  stable: HandResult | null;
  stableHands: HandResult[];
}

export interface HistoryEntry {
  id: number;
  gesture: GestureId;
  score: number;
  at: Date;
  demo: boolean;
  handedness?: string;
}

type Landmarker = {
  detectForVideo: (v: HTMLVideoElement, t: number) => {
    landmarks: Point[][];
    handedness?: { categoryName: string; score: number }[][];
  };
  setOptions: (o: { numHands: number }) => Promise<void>;
  close: () => void;
};

const STABLE_MS = 350;

function cssVar(name: string, fallback: string) {
  if (typeof document === "undefined") return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

export function describeCameraError(err: unknown): string {
  const e = err as { name?: string; message?: string };
  switch (e?.name) {
    case "NotAllowedError":
    case "SecurityError":
      return "Camera permission was denied. Allow camera access in your browser's site settings and try again.";
    case "NotFoundError":
    case "OverconstrainedError":
      return "No camera was found. Connect a webcam or try another device.";
    case "NotReadableError":
      return "The camera is in use by another app or tab. Close it and try again.";
    default:
      return e?.message || "Could not start the camera.";
  }
}

export function useHandTracker(settings: Settings) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const landmarkerRef = useRef<Landmarker | null>(null);
  const rafRef = useRef<number | null>(null);
  const runIdRef = useRef(0);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const [status, setStatus] = useState<TrackerStatus>("off");
  const [error, setError] = useState<string | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [deviceId, setDeviceId] = useState<string | undefined>(undefined);
  const [snapshot, setSnapshot] = useState<Snapshot>({ hands: [], fps: null, stable: null, stableHands: [] });
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  // debounce state
  const candRef = useRef<{ g: string | null; since: number }>({ g: null, since: 0 });
  const stableRef = useRef<HandResult | null>(null);
  const stableHandsRef = useRef<HandResult[]>([]);
  const lastLoggedRef = useRef<string | null>(null);
  const historyId = useRef(0);

  const resetDetection = () => {
    candRef.current = { g: null, since: 0 };
    stableRef.current = null;
    stableHandsRef.current = [];
    lastLoggedRef.current = null;
  };

  const clearCanvas = () => {
    const c = canvasRef.current;
    c?.getContext("2d")?.clearRect(0, 0, c.width, c.height);
  };

  const stopLoop = () => {
    runIdRef.current++;
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
  };

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  };

  const stop = useCallback(() => {
    stopLoop();
    stopStream();
    clearCanvas();
    resetDetection();
    setSnapshot({ hands: [], fps: null, stable: null, stableHands: [] });
    setStatus("off");
  }, []);

  const draw = (all: Point[][], results: HandResult[], demo: boolean) => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, c.width, c.height);
    const s = settingsRef.current;
    const cyan = cssVar("--cyan", "#22d3ee");
    const violet = cssVar("--violet", "#a78bfa");
    all.forEach((lm, h) => {
      if (s.showConnections) {
        ctx.strokeStyle = violet;
        ctx.lineWidth = Math.max(2, c.width / 320);
        ctx.shadowColor = violet;
        ctx.shadowBlur = 6;
        for (const [ai, bi] of HAND_CONNECTIONS) {
          const a = lm[ai], b = lm[bi];
          if (!a || !b) continue;
          ctx.beginPath();
          ctx.moveTo(a.x * c.width, a.y * c.height);
          ctx.lineTo(b.x * c.width, b.y * c.height);
          ctx.stroke();
        }
      }
      if (s.showLandmarks) {
        ctx.fillStyle = cyan;
        ctx.shadowColor = cyan;
        ctx.shadowBlur = 8;
        const r = Math.max(3, c.width / 200);
        for (const p of lm) {
          ctx.beginPath();
          ctx.arc(p.x * c.width, p.y * c.height, r, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.shadowBlur = 0;
      void results[h];
    });
    if (demo) {
      ctx.save();
      if (s.mirror) {
        // keep label readable when canvas is mirrored via CSS
        ctx.translate(c.width, 0);
        ctx.scale(-1, 1);
      }
      ctx.font = `600 ${Math.round(c.width / 28)}px ui-monospace, monospace`;
      ctx.fillStyle = violet;
      ctx.fillText("DEMO DATA — NOT A LIVE DETECTION", c.width * 0.04, c.height * 0.08);
      ctx.restore();
    }
  };

  const process = (results: HandResult[], now: number, demo: boolean, fps: number | null) => {
    const ordered = [...results].sort((a, b) => (a.handedness ?? "").localeCompare(b.handedness ?? ""));
    const primary = ordered[0] ?? null;
    const g = ordered.length ? `${settingsRef.current.mode}:` + ordered.map(h => `${h.handedness ?? "Hand"}:${h.gesture}`).join("|") : null;
    if (g !== candRef.current.g) {
      candRef.current = { g, since: now };
      stableRef.current = null;
      stableHandsRef.current = [];
    }
    if (now - candRef.current.since >= STABLE_MS) {
      stableRef.current = primary;
      stableHandsRef.current = ordered;
      if (g && g !== lastLoggedRef.current) {
        lastLoggedRef.current = g;
        const entries: HistoryEntry[] = ordered.filter(h => h.gesture !== "unknown").map(hand => ({
          id: ++historyId.current,
          gesture: hand.gesture,
          score: hand.score,
          at: new Date(),
          demo,
          ...(hand.handedness ? { handedness: hand.handedness } : {}),
        }));
        setHistory((h) => [...entries, ...h].slice(0, 50));
      }
      if (!g) lastLoggedRef.current = null;
    }
    return { hands: ordered, fps, stable: stableRef.current, stableHands: stableHandsRef.current } satisfies Snapshot;
  };

  const ensureLandmarker = async (): Promise<Landmarker> => {
    if (landmarkerRef.current) return landmarkerRef.current;
    const vision = await import("@mediapipe/tasks-vision");
    const fileset = await vision.FilesetResolver.forVisionTasks(WASM_URL);
    const make = (delegate: "GPU" | "CPU") =>
      vision.HandLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: MODEL_URL, delegate },
        runningMode: "VIDEO",
        numHands: settingsRef.current.numHands,
        minHandDetectionConfidence: 0.5,
        minHandPresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });
    let lm;
    try {
      lm = await make("GPU");
    } catch {
      lm = await make("CPU");
    }
    landmarkerRef.current = lm as unknown as Landmarker;
    return landmarkerRef.current;
  };

  const refreshDevices = async () => {
    try {
      const list = (await navigator.mediaDevices.enumerateDevices()).filter(
        (d) => d.kind === "videoinput",
      );
      setDevices(list);
    } catch {
      /* ignore */
    }
  };

  const start = useCallback(async (requestedId?: string) => {
    stopLoop();
    stopStream();
    resetDetection();
    setError(null);
    const runId = runIdRef.current;

    if (typeof window === "undefined" || !window.isSecureContext) {
      setStatus("error");
      setError("Camera access requires a secure connection (HTTPS or localhost).");
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus("error");
      setError("This browser does not support camera access.");
      return;
    }

    setStatus("requesting");
    let stream: MediaStream;
    const id = requestedId ?? deviceId;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: id
          ? { deviceId: { exact: id }, width: { ideal: 1280 }, height: { ideal: 720 } }
          : { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
    } catch (e) {
      if (runId !== runIdRef.current) return;
      setStatus("error");
      setError(describeCameraError(e));
      return;
    }
    if (runId !== runIdRef.current) {
      stream.getTracks().forEach((t) => t.stop());
      return;
    }
    streamRef.current = stream;
    const track = stream.getVideoTracks()[0];
    const activeId = track?.getSettings().deviceId;
    if (activeId) setDeviceId(activeId);
    track?.addEventListener("ended", () => {
      if (streamRef.current === stream) {
        stop();
        setError("The camera was disconnected.");
        setStatus("error");
      }
    });
    void refreshDevices();

    const video = videoRef.current;
    if (!video) {
      stopStream();
      setStatus("error");
      setError("Camera preview is unavailable. Please try again.");
      return;
    }
    video.srcObject = stream;
    try {
      await video.play();
    } catch {
      /* autoplay handled by muted+playsInline */
    }

    setStatus("loading-model");
    let lm: Landmarker;
    try {
      lm = await ensureLandmarker();
      await lm.setOptions({ numHands: settingsRef.current.numHands });
    } catch (e) {
      if (runId !== runIdRef.current) return;
      stopStream();
      setStatus("error");
      setError(
        "The hand tracking model failed to load. Check your internet connection (the model is downloaded once) and try again." +
          (e instanceof Error ? ` (${e.message})` : ""),
      );
      return;
    }
    if (runId !== runIdRef.current) return;
    setStatus("running");

    let lastVideoTime = -1;
    let lastFrame = 0;
    let fps: number | null = null;
    let lastUi = 0;
    const loop = () => {
      if (runId !== runIdRef.current) return;
      const now = performance.now();
      if (video.readyState >= 2 && video.currentTime !== lastVideoTime) {
        lastVideoTime = video.currentTime;
        const c = canvasRef.current;
        if (c && (c.width !== video.videoWidth || c.height !== video.videoHeight)) {
          c.width = video.videoWidth;
          c.height = video.videoHeight;
        }
        try {
          const res = lm.detectForVideo(video, now);
          if (lastFrame) {
            const inst = 1000 / (now - lastFrame);
            fps = fps == null ? inst : fps * 0.9 + inst * 0.1;
          }
          lastFrame = now;
          const hands: HandResult[] = res.landmarks.map((l, i) => {
            const c = classifyHand(l, settingsRef.current.threshold, settingsRef.current.mode);
            return {
              gesture: c.gesture,
              score: c.score,
              handedness: res.handedness?.[i]?.[0]?.categoryName,
            };
          });
          draw(res.landmarks, hands, false);
          const snap = process(hands, now, false, fps);
          if (now - lastUi > 100) {
            lastUi = now;
            setSnapshot(snap);
          }
        } catch (e) {
          console.error(e);
        }
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
  }, [deviceId, stop]);

  const startDemo = useCallback(() => {
    stopLoop();
    stopStream();
    resetDetection();
    setError(null);
    setStatus("demo");
    const runId = runIdRef.current;
    const c = canvasRef.current;
    if (c) {
      c.width = 1280;
      c.height = 720;
    }
    const t0 = performance.now();
    let lastUi = 0;
    const loop = () => {
      if (runId !== runIdRef.current) return;
      const now = performance.now();
      const t = (now - t0) / 1000;
      const supported = supportedGestures(settingsRef.current.mode);
      const idx = Math.floor(t / 2.6) % supported.length;
      const poses: Point[][] = [];
      const hands: HandResult[] = [];
      for (let h = 0; h < settingsRef.current.numHands; h++) {
        const gesture = supported[(idx + h * 2) % supported.length];
        if (!gesture) continue;
        const base = syntheticHand(gesture);
        const center = settingsRef.current.numHands === 2 ? (h === 0 ? 0.28 : 0.76) : 0.5;
        const scale = settingsRef.current.numHands === 2 ? 1.2 : 1.8;
        const cl = classifyHand(base, settingsRef.current.threshold, settingsRef.current.mode);
        poses.push(base.map(p => ({
          x: center + (p.x - 0.5) * scale * (9 / 16) * (h === 0 ? 1 : -1) + Math.sin(t * 1.3) * 0.01,
          y: 0.58 + (p.y - 0.64) * scale + Math.cos(t * 1.1) * 0.01,
        })));
        hands.push({ gesture: cl.gesture, score: cl.score, handedness: h === 0 ? "Left" : "Right" });
      }
      draw(poses, hands, true);
      const snap = process(hands, now, true, null);
      if (now - lastUi > 100) {
        lastUi = now;
        setSnapshot(snap);
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
  }, []);

  const selectDevice = useCallback(
    (id: string) => {
      setDeviceId(id);
      if (streamRef.current) void start(id);
    },
    [start],
  );

  // apply numHands live
  useEffect(() => {
    void landmarkerRef.current?.setOptions({ numHands: settings.numHands }).catch(() => {});
  }, [settings.numHands]);

  // cleanup on unmount
  useEffect(() => {
    return () => {
      stopLoop();
      stopStream();
      landmarkerRef.current?.close();
      landmarkerRef.current = null;
    };
  }, []);

  return {
    videoRef,
    canvasRef,
    status,
    error,
    devices,
    deviceId,
    snapshot,
    history,
    clearHistory: () => {
      setHistory([]);
      lastLoggedRef.current = null;
    },
    start,
    startDemo,
    stop,
    selectDevice,
  };
}
