import { describe, expect, it } from "vitest";
import { classifyHand, GESTURES, SUPPORTED, syntheticHand, type KnownGesture } from "./gestures";

describe("gesture classifier", () => {
  for (const g of SUPPORTED) {
    it(`recognizes ${g}`, () => {
      expect(classifyHand(syntheticHand(g), 0.65).gesture).toBe(g);
    });
  }
  it("returns unknown when the threshold cannot be met", () => {
    expect(classifyHand(syntheticHand("peace"), 1.01).gesture).toBe("unknown");
  });
  const counting: [KnownGesture, number][] = [["fist", 0], ["pointing_up", 1], ["peace", 2], ["three", 3], ["four", 4], ["open_palm", 5]];
  for (const [gesture, count] of counting) {
    it(`counts ${count} for ${gesture}, including mirrored and demo poses`, () => {
      const hand = syntheticHand(gesture);
      const variants = [hand, hand.map(p => ({ x: 1 - p.x, y: p.y })), hand.map(p => ({ x: 0.5 + (p.x - 0.5) * 1.8, y: 0.52 + (p.y - 0.64) * 1.8 }))];
      for (const pose of variants) {
        const result = classifyHand(pose, 0.65);
        expect(result.gesture).toBe(gesture);
        expect(GESTURES[result.gesture].count).toBe(count);
      }
    });
  }
  it("does not assign a count to non-counting signs or unknown poses", () => {
    for (const gesture of ["thumbs_up", "ok", "unknown"] as const) {
      expect(GESTURES[gesture].count).toBeUndefined();
    }
  });
});
