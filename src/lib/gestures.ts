// Geometry-based static gesture classifier (MVP).
// Works on 21 normalized hand landmarks (MediaPipe ordering).

export type Point = { x: number; y: number; z?: number };

export type Idx = 0|1|2|3|4|5|6|7|8|9|10|11|12|13|14|15|16|17|18|19|20;
export type Hand = Record<Idx, Point>;
export type KnownGesture = Exclude<GestureId, "unknown">;
export type RecognitionMode = "symbols" | "alphabet";

export type GestureId =
  | "open_palm"
  | "fist"
  | "thumbs_up"
  | "peace"
  | "ok"
  | "pointing_up"
  | "three"
  | "four"
  | "rock_on"
  | "love_you"
  | "shaka"
  | "l_shape"
  | "asl_b" | "asl_f" | "asl_i" | "asl_l" | "asl_s" | "asl_v" | "asl_w" | "asl_y"
  | "unknown";

export interface GestureInfo {
  id: GestureId;
  name: string;
  description: string;
  tip: string;
  count?: number;
}

export const GESTURES: Record<GestureId, GestureInfo> = {
  open_palm: {
    id: "open_palm",
    name: "Open Palm",
    count: 5,
    description: "All five fingers extended and spread.",
    tip: "Face your palm to the camera with fingers spread apart.",
  },
  fist: {
    id: "fist",
    name: "Fist",
    count: 0,
    description: "All fingers curled in, thumb folded.",
    tip: "Close your hand fully; keep the knuckles facing the camera.",
  },
  thumbs_up: {
    id: "thumbs_up",
    name: "Thumbs Up",
    description: "Fingers curled, thumb pointing upward.",
    tip: "Hold your fist sideways and raise your thumb straight up.",
  },
  peace: {
    id: "peace",
    name: "Peace / V Sign",
    count: 2,
    description: "Index and middle fingers extended, others curled.",
    tip: "Spread the two raised fingers slightly into a clear V.",
  },
  ok: {
    id: "ok",
    name: "OK Sign",
    description: "Thumb and index tips touching, other fingers extended.",
    tip: "Form a clear circle; keep the three other fingers up. Can be ambiguous.",
  },
  pointing_up: {
    id: "pointing_up",
    name: "Pointing Up",
    count: 1,
    description: "Only the index finger extended, pointing upward.",
    tip: "Raise your index finger vertically and curl the rest.",
  },
  three: {
    id: "three",
    name: "Three",
    count: 3,
    description: "Index, middle and ring fingers extended.",
    tip: "Raise three fingers; keep your thumb and little finger folded.",
  },
  four: {
    id: "four",
    name: "Four",
    count: 4,
    description: "Four fingers extended, thumb folded.",
    tip: "Raise all four fingers and tuck your thumb across your palm.",
  },
  rock_on: { id: "rock_on", name: "Rock On", description: "Index and little finger raised; thumb folded.", tip: "Curl the middle and ring fingers and tuck your thumb." },
  love_you: { id: "love_you", name: "I Love You", description: "Thumb, index and little finger extended.", tip: "Keep the middle and ring fingers curled, palm facing the camera." },
  shaka: { id: "shaka", name: "Shaka", description: "Thumb and little finger extended.", tip: "Fold the three middle fingers and spread thumb and little finger." },
  l_shape: { id: "l_shape", name: "L Shape", description: "Index raised and thumb extended sideways.", tip: "Make an L with your thumb and index; curl the other fingers." },
  asl_b: { id: "asl_b", name: "ASL · B", description: "Four fingers upright, thumb across palm.", tip: "Keep the four raised fingers together." },
  asl_f: { id: "asl_f", name: "ASL · F", description: "Thumb and index touching; three fingers raised.", tip: "Make a circle with the thumb and index fingertips." },
  asl_i: { id: "asl_i", name: "ASL · I", description: "Little finger raised, other fingers folded.", tip: "Keep your thumb tucked across the folded fingers." },
  asl_l: { id: "asl_l", name: "ASL · L", description: "Index upright and thumb sideways.", tip: "Extend thumb and index into an L shape." },
  asl_s: { id: "asl_s", name: "ASL · S", description: "Closed fist, thumb across the front.", tip: "Place your thumb over the curled fingers." },
  asl_v: { id: "asl_v", name: "ASL · V", description: "Index and middle fingers raised and separated.", tip: "Spread the two raised fingers into a V." },
  asl_w: { id: "asl_w", name: "ASL · W", description: "Index, middle and ring fingers raised.", tip: "Fold your thumb and little finger together." },
  asl_y: { id: "asl_y", name: "ASL · Y", description: "Thumb and little finger extended.", tip: "Fold the three middle fingers." },
  unknown: {
    id: "unknown",
    name: "Unknown",
    description: "Hand found, but the pose does not clearly match a supported gesture.",
    tip: "",
  },
};

export const SUPPORTED: KnownGesture[] = ["open_palm", "fist", "thumbs_up", "peace", "ok", "pointing_up", "three", "four", "rock_on", "love_you", "shaka", "l_shape"];
export const ALPHABET: KnownGesture[] = ["asl_b", "asl_f", "asl_i", "asl_l", "asl_s", "asl_v", "asl_w", "asl_y"];
export function supportedGestures(mode: RecognitionMode): KnownGesture[] {
  return mode === "alphabet" ? ALPHABET : SUPPORTED;
}

/** Unknown or non-counting poses must not produce a misleading partial total. */
export function combinedFingerCount(hands: { gesture: GestureId }[]): number | null {
  if (!hands.length) return null;
  let total = 0;
  for (const hand of hands) {
    const count = GESTURES[hand.gesture].count;
    if (count === undefined) return null;
    total += count;
  }
  return total;
}

export const HAND_CONNECTIONS: [Idx, Idx][] = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [17, 18], [18, 19], [19, 20],
  [0, 17],
];

const d = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

export interface Classification {
  gesture: GestureId;
  score: number; // 0..1 heuristic match strength (not a probability)
  scores: Record<Exclude<GestureId, "unknown">, number>;
}

/** threshold: minimum match strength for a gesture to be reported (0..1). */
export function classifyHand(input: Point[], threshold = 0.65, mode: RecognitionMode = "symbols"): Classification {
  const emptyScores = Object.fromEntries([...SUPPORTED, ...ALPHABET].map(id => [id, 0])) as Classification["scores"];
  if (input.length !== 21 || input.some(p => !Number.isFinite(p.x) || !Number.isFinite(p.y))) {
    return { gesture: "unknown", score: 0, scores: emptyScores };
  }
  const lm = input as unknown as Hand;
  const palm = d(lm[0], lm[9]) || 1e-6;
  const wrist = lm[0];

  // Finger extension by distance ratios (rotation-invariant).
  const finger = (pip: Idx, tip: Idx) => {
    const r = d(wrist, lm[tip]) / (d(wrist, lm[pip]) || 1e-6);
    return { ext: clamp01((r - 1.0) / 0.35), curl: clamp01((1.15 - r) / 0.3) };
  };
  const index = finger(6, 8);
  const middle = finger(10, 12);
  const ring = finger(14, 16);
  const pinky = finger(18, 20);

  const thumbSpread = d(lm[4], lm[5]) / palm;
  const thumbExt = clamp01((thumbSpread - 0.5) / 0.3);
  const thumbCurl = clamp01((0.75 - thumbSpread) / 0.3);

  // Thumb pointing upward in image space and above the curled fingers.
  const rise = (lm[2].y - lm[4].y) / palm;
  const aboveFingers = Math.min(lm[6].y, lm[10].y, lm[14].y, lm[18].y) - lm[4].y;
  const thumbUp =
    lm[4].y < lm[3].y && lm[3].y < lm[2].y
      ? clamp01((rise - 0.4) / 0.4) * clamp01(aboveFingers / (0.15 * palm))
      : 0;

  const indexUp = clamp01((lm[5].y - lm[8].y) / palm / 0.6);
  const pinch = clamp01((0.45 - d(lm[4], lm[8]) / palm) / 0.25);

  const avg = (...v: number[]) => {
    const m = Math.min(...v);
    return m < 0.3 ? m : v.reduce((a, b) => a + b, 0) / v.length;
  };

  const scores = {
    open_palm: avg(thumbExt, index.ext, middle.ext, ring.ext, pinky.ext),
    fist: avg(index.curl, middle.curl, ring.curl, pinky.curl, 1 - thumbUp, thumbCurl),
    thumbs_up: avg(index.curl, middle.curl, ring.curl, pinky.curl, thumbUp),
    peace: avg(index.ext, middle.ext, ring.curl, pinky.curl, 1 - pinch),
    ok: avg(pinch, middle.ext, ring.ext, pinky.ext),
    pointing_up: avg(index.ext, indexUp, middle.curl, ring.curl, pinky.curl, 1 - thumbUp, thumbCurl),
    three: avg(index.ext, middle.ext, ring.ext, pinky.curl, thumbCurl, 1 - pinch),
    four: avg(index.ext, middle.ext, ring.ext, pinky.ext, thumbCurl, 1 - pinch),
    rock_on: avg(index.ext, middle.curl, ring.curl, pinky.ext, thumbCurl),
    love_you: avg(index.ext, middle.curl, ring.curl, pinky.ext, thumbExt),
    shaka: avg(index.curl, middle.curl, ring.curl, pinky.ext, thumbExt),
    l_shape: avg(index.ext, indexUp, middle.curl, ring.curl, pinky.curl, thumbExt),
    asl_b: 0, asl_f: 0, asl_i: avg(index.curl, middle.curl, ring.curl, pinky.ext, thumbCurl),
    asl_l: 0, asl_s: 0, asl_v: 0, asl_w: 0, asl_y: 0,
  };
  scores.asl_b = scores.four;
  scores.asl_f = scores.ok;
  scores.asl_l = scores.l_shape;
  scores.asl_s = scores.fist;
  scores.asl_v = scores.peace;
  scores.asl_w = scores.three;
  scores.asl_y = scores.shaka;

  let best: GestureId = "unknown";
  let bestScore = 0;
  for (const k of supportedGestures(mode)) {
    const v = scores[k];
    if (v > bestScore) {
      bestScore = v;
      best = k;
    }
  }
  if (bestScore < threshold) return { gesture: "unknown", score: bestScore, scores };
  return { gesture: best, score: bestScore, scores };
}

/* ---------- Synthetic poses (used for demo mode, illustrations and tests) ---------- */

type F = "ext" | "curl";
const BASE_X = { index: -0.12, middle: 0, ring: 0.11, pinky: 0.21 };

function fingerPts(bx: number, state: F, len = 1): Point[] {
  const mcpY = -0.35;
  if (state === "ext") {
    const spread = bx * 0.5;
    return [1, 2, 3, 4].map((i) => ({ x: bx + spread * i * 0.3, y: mcpY - 0.14 * i * len + (i === 0 ? 0 : 0) }))
      .map((p, i) => (i === 0 ? { x: bx, y: mcpY } : p));
  }
  return [
    { x: bx, y: mcpY },
    { x: bx, y: -0.47 },
    { x: bx + 0.01, y: -0.39 },
    { x: bx + 0.01, y: -0.31 },
  ];
}

type ThumbPose = "side" | "tucked" | "up" | "pinch";
function thumbPts(p: ThumbPose): Point[] {
  switch (p) {
    case "side":
      return [{ x: -0.1, y: -0.08 }, { x: -0.2, y: -0.16 }, { x: -0.3, y: -0.23 }, { x: -0.4, y: -0.3 }];
    case "tucked":
      return [{ x: -0.1, y: -0.08 }, { x: -0.14, y: -0.2 }, { x: -0.06, y: -0.28 }, { x: 0.02, y: -0.32 }];
    case "up":
      return [{ x: -0.1, y: -0.12 }, { x: -0.16, y: -0.3 }, { x: -0.19, y: -0.5 }, { x: -0.2, y: -0.68 }];
    case "pinch":
      return [{ x: -0.1, y: -0.08 }, { x: -0.2, y: -0.18 }, { x: -0.26, y: -0.3 }, { x: -0.27, y: -0.41 }];
  }
}

export function syntheticHand(g: Exclude<GestureId, "unknown">): Point[] {
  const aliases: Partial<Record<KnownGesture, KnownGesture>> = { asl_b: "four", asl_f: "ok", asl_l: "l_shape", asl_s: "fist", asl_v: "peace", asl_w: "three", asl_y: "shaka" };
  const alias = aliases[g];
  if (alias) {
    const points = syntheticHand(alias);
    if (g === "asl_b") {
      // B has upright fingers held together, unlike a spread counting four.
      for (let i = 5; i < 21; i++) {
        const p = points[i];
        if (p) p.x = 0.5 + (p.x - 0.5) * 0.45;
      }
    }
    return points;
  }
  const cfg: Record<typeof g, { t: ThumbPose; f: [F, F, F, F] }> = {
    open_palm: { t: "side", f: ["ext", "ext", "ext", "ext"] },
    fist: { t: "tucked", f: ["curl", "curl", "curl", "curl"] },
    thumbs_up: { t: "up", f: ["curl", "curl", "curl", "curl"] },
    peace: { t: "tucked", f: ["ext", "ext", "curl", "curl"] },
    ok: { t: "pinch", f: ["curl", "ext", "ext", "ext"] },
    pointing_up: { t: "tucked", f: ["ext", "curl", "curl", "curl"] },
    three: { t: "tucked", f: ["ext", "ext", "ext", "curl"] },
    four: { t: "tucked", f: ["ext", "ext", "ext", "ext"] },
    rock_on: { t: "tucked", f: ["ext", "curl", "curl", "ext"] },
    love_you: { t: "side", f: ["ext", "curl", "curl", "ext"] },
    shaka: { t: "side", f: ["curl", "curl", "curl", "ext"] },
    l_shape: { t: "side", f: ["ext", "curl", "curl", "curl"] },
    asl_i: { t: "tucked", f: ["curl", "curl", "curl", "ext"] },
    asl_b: { t: "tucked", f: ["ext", "ext", "ext", "ext"] },
    asl_f: { t: "pinch", f: ["curl", "ext", "ext", "ext"] },
    asl_l: { t: "side", f: ["ext", "curl", "curl", "curl"] },
    asl_s: { t: "tucked", f: ["curl", "curl", "curl", "curl"] },
    asl_v: { t: "tucked", f: ["ext", "ext", "curl", "curl"] },
    asl_w: { t: "tucked", f: ["ext", "ext", "ext", "curl"] },
    asl_y: { t: "side", f: ["curl", "curl", "curl", "ext"] },
  };
  const c = cfg[g];
  let index = fingerPts(BASE_X.index, c.f[0]);
  if (g === "ok") {
    index = [{ x: -0.12, y: -0.35 }, { x: -0.17, y: -0.5 }, { x: -0.23, y: -0.5 }, { x: -0.26, y: -0.43 }];
  }
  const pts: Point[] = [
    { x: 0, y: 0 },
    ...thumbPts(c.t),
    ...index,
    ...fingerPts(BASE_X.middle, c.f[1], 1.05),
    ...fingerPts(BASE_X.ring, c.f[2], 0.95),
    ...fingerPts(BASE_X.pinky, c.f[3], 0.8),
  ];
  // map to normalized image coordinates
  return pts.map((p) => ({ x: 0.5 + p.x * 0.55, y: 0.85 + p.y * 0.55 }));
}
