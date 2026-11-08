import test from "node:test";
import assert from "node:assert";
import {
  clampRatio,
  computeBookProgress,
  computeProgressPercent,
  sumCharCounts,
} from "../src/lib/reader/progress.ts";

test("Progress: weights chapters by character count instead of chapter index", () => {
  const progress = computeBookProgress({
    chapterCharCounts: [900, 100],
    chapterIndex: 0,
    inChapterRatio: 0.5,
  });

  assert.strictEqual(progress.totalChars, 1000);
  assert.strictEqual(progress.charsRead, 450);
  assert.strictEqual(progress.exactPercent, 45);
  assert.strictEqual(progress.percent, 45);
  assert.notStrictEqual(
    progress.percent,
    computeProgressPercent(0, 0.5, 2)
  );
});

test("Progress: uniform chapters compute a weighted percentage", () => {
  const progress = computeBookProgress({
    chapterCharCounts: [100, 100, 100, 100],
    chapterIndex: 1,
    inChapterRatio: 0.5,
  });

  assert.strictEqual(progress.charsRead, 150);
  assert.strictEqual(progress.exactPercent, 37.5);
  assert.strictEqual(progress.percent, 38);
  assert.strictEqual(progress.chaptersCompleted, 1);
});

test("Progress: book start and book end are exactly 0% and 100%", () => {
  const start = computeBookProgress({
    chapterCharCounts: [100, 100, 100, 100],
    chapterIndex: 0,
    inChapterRatio: 0,
  });
  assert.strictEqual(start.percent, 0);
  assert.strictEqual(start.charsRead, 0);

  const end = computeBookProgress({
    chapterCharCounts: [100, 100, 100, 100],
    chapterIndex: 3,
    inChapterRatio: 1,
  });
  assert.strictEqual(end.percent, 100);
  assert.strictEqual(end.exactPercent, 100);
  assert.strictEqual(end.charsRead, 400);
  assert.strictEqual(end.chaptersCompleted, 4);
});

test("Progress: a single chapter at half scroll is 50%", () => {
  const progress = computeBookProgress({
    chapterCharCounts: [200],
    chapterIndex: 0,
    inChapterRatio: 0.5,
  });

  assert.strictEqual(progress.percent, 50);
  assert.strictEqual(progress.charsRead, 100);
});

test("Progress: an empty chapter list returns zeroes without NaN", () => {
  const progress = computeBookProgress({
    chapterCharCounts: [],
    chapterIndex: 3,
    inChapterRatio: 0.7,
  });

  assert.deepStrictEqual(progress, {
    percent: 0,
    exactPercent: 0,
    charsRead: 0,
    totalChars: 0,
    chaptersCompleted: 0,
  });
});

test("Progress: all-zero chapters fall back to the chapter-count formula", () => {
  const progress = computeBookProgress({
    chapterCharCounts: [0, 0],
    chapterIndex: 1,
    inChapterRatio: 0.5,
  });

  assert.strictEqual(progress.totalChars, 0);
  assert.strictEqual(progress.charsRead, 0);
  assert.strictEqual(progress.percent, 75);
});

test("Progress: out-of-range chapter indexes are clamped", () => {
  const beyond = computeBookProgress({
    chapterCharCounts: [100, 100],
    chapterIndex: 99,
    inChapterRatio: 0,
  });
  assert.strictEqual(beyond.percent, 50);

  const negative = computeBookProgress({
    chapterCharCounts: [100, 100],
    chapterIndex: -5,
    inChapterRatio: 0,
  });
  assert.strictEqual(negative.percent, 0);

  const notANumber = computeBookProgress({
    chapterCharCounts: [100, 100],
    chapterIndex: Number.NaN,
    inChapterRatio: 0,
  });
  assert.strictEqual(notANumber.percent, 0);
});

test("Progress: in-chapter ratios are clamped to 0..1", () => {
  assert.strictEqual(clampRatio(Number.NaN), 0);
  assert.strictEqual(clampRatio(-1), 0);
  assert.strictEqual(clampRatio(2), 1);
  assert.strictEqual(clampRatio(0.25), 0.25);

  const above = computeBookProgress({
    chapterCharCounts: [100, 100],
    chapterIndex: 0,
    inChapterRatio: 5,
  });
  assert.strictEqual(above.percent, 50);

  const below = computeBookProgress({
    chapterCharCounts: [100, 100],
    chapterIndex: 1,
    inChapterRatio: -3,
  });
  assert.strictEqual(below.percent, 50);
});

test("Progress: sumCharCounts ignores invalid and negative values", () => {
  assert.strictEqual(
    sumCharCounts([100, Number.NaN, Number.POSITIVE_INFINITY, -5, 50]),
    150
  );
});

test("Progress: computeProgressPercent clamps to 0..100", () => {
  assert.strictEqual(computeProgressPercent(0, 0, 0), 0);
  assert.strictEqual(computeProgressPercent(0, 0.5, 0), 0);
  assert.strictEqual(computeProgressPercent(5, 0, 2), 100);
  assert.strictEqual(computeProgressPercent(-2, 0, 2), 0);
  assert.strictEqual(computeProgressPercent(0, Number.NaN, 2), 0);
  assert.strictEqual(computeProgressPercent(1, 0.5, 2), 75);
});

test("Progress: zero-length chapters in the middle do not distort progress", () => {
  const progress = computeBookProgress({
    chapterCharCounts: [100, 0, 100],
    chapterIndex: 2,
    inChapterRatio: 0,
  });

  assert.strictEqual(progress.totalChars, 200);
  assert.strictEqual(progress.charsRead, 100);
  assert.strictEqual(progress.percent, 50);
  assert.strictEqual(progress.chaptersCompleted, 2);
});
