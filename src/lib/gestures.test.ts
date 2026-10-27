import { describe, expect, it } from "vitest";
import { classifyHand, SUPPORTED, syntheticHand } from "./gestures";

describe("gesture classifier", () => {
  for (const g of SUPPORTED) {
    it(`recognizes ${g}`, () => {
      expect(classifyHand(syntheticHand(g), 0.65).gesture).toBe(g);
    });
  }
  it("returns unknown when the threshold cannot be met", () => {
    expect(classifyHand(syntheticHand("peace"), 1.01).gesture).toBe("unknown");
  });
});
