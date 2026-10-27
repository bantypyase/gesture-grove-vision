import { HAND_CONNECTIONS, syntheticHand, type GestureId, type Idx } from "@/lib/gestures";

/** Small schematic illustration built from the same synthetic pose the classifier is tested on. */
export function HandGlyph({ gesture, className }: { gesture: Exclude<GestureId, "unknown">; className?: string }) {
  const pts = syntheticHand(gesture).map((p) => ({ x: (p.x - 0.5) * 170 + 50, y: (p.y - 0.64) * 170 + 50 })) as unknown as Record<Idx, { x: number; y: number }> & { x: number; y: number }[];
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      {HAND_CONNECTIONS.map(([a, b]) => (
        <line
          key={`${a}-${b}`}
          x1={pts[a].x}
          y1={pts[a].y}
          x2={pts[b].x}
          y2={pts[b].y}
          className="stroke-violet"
          strokeWidth={2.2}
          strokeLinecap="round"
        />
      ))}
      {pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={2.2} className="fill-cyan" />
      ))}
    </svg>
  );
}
