import { describe, it, expect } from "vitest";
import { Rng, mulberry32 } from "@/scheduling-engine/rng";

describe("mulberry32", () => {
  it("produces deterministic values for the same seed", () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    for (let i = 0; i < 10; i += 1) expect(a()).toBe(b());
  });

  it("returns values in [0, 1)", () => {
    const next = mulberry32(7);
    for (let i = 0; i < 100; i += 1) {
      const v = next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe("Rng", () => {
  it("int stays within range", () => {
    const rng = new Rng(123);
    for (let i = 1; i < 100; i += 1) {
      const v = rng.int(3, 7);
      expect(v).toBeGreaterThanOrEqual(3);
      expect(v).toBeLessThanOrEqual(7);
    }
  });

  it("shuffle preserves elements", () => {
    const rng = new Rng(5);
    const input = [1, 2, 3, 4, 5];
    const shuffled = rng.shuffle(input);
    expect(shuffled.sort()).toEqual([1, 2, 3, 4, 5]);
  });

  it("pick returns an element of the array", () => {
    const rng = new Rng(9);
    const arr = ["a", "b", "c"];
    const picked = rng.pick(arr);
    expect(arr).toContain(picked);
  });

  it("fork produces a different stream", () => {
    const rng = new Rng(100);
    const forked = rng.fork(1);
    expect(rng.int(0, 1000)).not.toBe(forked.int(0, 1000));
  });
});
