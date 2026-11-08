import test from "node:test";
import assert from "node:assert";
import {
  charsPerMinute,
  estimateRemainingMinutes,
  formatDuration,
  movingAveragePace,
} from "../src/lib/reader/reading-session.ts";

test("Reading pace: two clean samples produce characters per minute", () => {
  const pace = charsPerMinute([
    { charsRead: 0, timestamp: 0 },
    { charsRead: 600, timestamp: 60_000 },
  ]);

  assert.strictEqual(pace, 600);
});

test("Reading pace: unsorted samples are ordered before calculating", () => {
  const pace = charsPerMinute([
    { charsRead: 1200, timestamp: 120_000 },
    { charsRead: 0, timestamp: 0 },
    { charsRead: 600, timestamp: 60_000 },
  ]);

  assert.strictEqual(pace, 600);
});

test("Reading pace: duplicate timestamps are ignored", () => {
  const pace = charsPerMinute([
    { charsRead: 0, timestamp: 0 },
    { charsRead: 600, timestamp: 60_000 },
    { charsRead: 1200, timestamp: 60_000 },
  ]);

  assert.strictEqual(pace, 600);
});

test("Reading pace: long idle gaps are ignored", () => {
  const pace = charsPerMinute([
    { charsRead: 0, timestamp: 0 },
    { charsRead: 100, timestamp: 10_000 },
    { charsRead: 1100, timestamp: 400_000 },
  ]);

  assert.strictEqual(pace, 600);
});

test("Reading pace: deltas below the character threshold are ignored", () => {
  const pace = charsPerMinute([
    { charsRead: 0, timestamp: 0 },
    { charsRead: 10, timestamp: 60_000 },
  ]);

  assert.strictEqual(pace, 0);
});

test("Reading pace: an outlier sprint is clamped to the maximum pace", () => {
  const pace = charsPerMinute([
    { charsRead: 0, timestamp: 0 },
    { charsRead: 5000, timestamp: 10_000 },
  ]);

  assert.strictEqual(pace, 1500);
});

test("Reading pace: a very slow sample is clamped to the minimum pace", () => {
  const pace = charsPerMinute([
    { charsRead: 0, timestamp: 0 },
    { charsRead: 30, timestamp: 60_000 },
  ]);

  assert.strictEqual(pace, 50);
});

test("Reading pace: the median discounts a single rushed delta", () => {
  const pace = charsPerMinute([
    { charsRead: 0, timestamp: 0 },
    { charsRead: 600, timestamp: 60_000 },
    { charsRead: 2400, timestamp: 120_000 },
    { charsRead: 3300, timestamp: 180_000 },
  ]);

  assert.strictEqual(pace, 900);
});

test("Reading pace: no usable deltas yields zero", () => {
  assert.strictEqual(charsPerMinute([]), 0);
  assert.strictEqual(charsPerMinute([{ charsRead: 100, timestamp: 1000 }]), 0);
  assert.strictEqual(
    charsPerMinute([
      { charsRead: Number.NaN, timestamp: 0 },
      { charsRead: 600, timestamp: 60_000 },
    ]),
    0
  );
});

test("Reading pace: moving average applies the latest delta with more weight", () => {
  const pace = movingAveragePace([
    { charsRead: 0, timestamp: 0 },
    { charsRead: 600, timestamp: 60_000 },
    { charsRead: 1800, timestamp: 120_000 },
  ]);

  assert.strictEqual(pace, 810);
});

test("Reading pace: remaining time is null when the pace is unknown", () => {
  assert.strictEqual(estimateRemainingMinutes(4500, 0), null);
  assert.strictEqual(estimateRemainingMinutes(4500, Number.NaN), null);
  assert.strictEqual(estimateRemainingMinutes(Number.NaN, 300), null);
  assert.strictEqual(estimateRemainingMinutes(-100, 300), 0);
});

test("Reading pace: remaining time converts characters to minutes", () => {
  assert.strictEqual(estimateRemainingMinutes(4500, 300), 15);
  assert.strictEqual(estimateRemainingMinutes(0, 300), 0);
  assert.strictEqual(estimateRemainingMinutes(150, 300), 0.5);
});

test("Reading pace: duration formatting boundaries", () => {
  assert.strictEqual(formatDuration(0), "<1m");
  assert.strictEqual(formatDuration(0.4), "<1m");
  assert.strictEqual(formatDuration(1), "1m");
  assert.strictEqual(formatDuration(59), "59m");
  assert.strictEqual(formatDuration(60), "1h 0m");
  assert.strictEqual(formatDuration(61), "1h 1m");
  assert.strictEqual(formatDuration(1440), "24h 0m");
  assert.strictEqual(formatDuration(-1), "—");
  assert.strictEqual(formatDuration(Number.NaN), "—");
});

test("Reading pace: duration uses the Indonesian hour suffix", () => {
  assert.strictEqual(formatDuration(75, "ID"), "1j 15m");
  assert.strictEqual(formatDuration(75, "EN"), "1h 15m");
  assert.strictEqual(formatDuration(20, "ID"), "20m");
});
