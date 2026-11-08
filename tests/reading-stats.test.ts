import test from "node:test";
import assert from "node:assert";
import {
  computeLibraryStats,
  computeReadingStreak,
  dayKey,
} from "../src/lib/reader/reading-stats.ts";

test("Library stats: an empty library returns zeroes", () => {
  assert.deepStrictEqual(computeLibraryStats([], {}), {
    totalBooks: 0,
    finishedBooks: 0,
    inProgressBooks: 0,
    unreadBooks: 0,
    totalChaptersRead: 0,
    averageProgress: 0,
  });
});

test("Library stats: finished, in-progress, and unread books are counted", () => {
  const books = [
    { id: "finished", totalChapters: 3 },
    { id: "reading", totalChapters: 4 },
    { id: "no-progress", totalChapters: 2 },
    { id: "zero-progress", totalChapters: 5 },
  ];

  const stats = computeLibraryStats(books, {
    finished: { chapterIndex: 2, scrollPosition: 1 },
    reading: { chapterIndex: 1, scrollPosition: 0.5 },
    "zero-progress": { chapterIndex: 0, scrollPosition: 0 },
  });

  assert.strictEqual(stats.totalBooks, 4);
  assert.strictEqual(stats.finishedBooks, 1);
  assert.strictEqual(stats.inProgressBooks, 1);
  assert.strictEqual(stats.unreadBooks, 2);
  assert.strictEqual(stats.totalChaptersRead, 4);
});

test("Library stats: exactly 100% is finished, 99% is not", () => {
  const finished = computeLibraryStats(
    [{ id: "a", totalChapters: 2 }],
    { a: { chapterIndex: 1, scrollPosition: 1 } }
  );
  assert.strictEqual(finished.finishedBooks, 1);

  const almost = computeLibraryStats(
    [{ id: "b", totalChapters: 100 }],
    { b: { chapterIndex: 98, scrollPosition: 0.99 } }
  );
  assert.strictEqual(almost.finishedBooks, 0);
  assert.strictEqual(almost.inProgressBooks, 1);
  assert.strictEqual(almost.averageProgress, 99);
});

test("Library stats: books with no chapters count as unread without NaN", () => {
  const stats = computeLibraryStats(
    [{ id: "empty", totalChapters: 0 }],
    { empty: { chapterIndex: 0, scrollPosition: 0.4 } }
  );

  assert.strictEqual(stats.unreadBooks, 1);
  assert.strictEqual(stats.averageProgress, 0);
  assert.strictEqual(stats.totalChaptersRead, 0);
});

test("Library stats: progress for unknown books is ignored", () => {
  const stats = computeLibraryStats(
    [{ id: "known", totalChapters: 2 }],
    {
      known: { chapterIndex: 0, scrollPosition: 0 },
      deleted: { chapterIndex: 1, scrollPosition: 1 },
    }
  );

  assert.strictEqual(stats.totalBooks, 1);
  assert.strictEqual(stats.finishedBooks, 0);
  assert.strictEqual(stats.unreadBooks, 1);
});

test("Library stats: average progress is the mean of per-book percentages", () => {
  const stats = computeLibraryStats(
    [
      { id: "a", totalChapters: 2 },
      { id: "b", totalChapters: 2 },
      { id: "c", totalChapters: 2 },
    ],
    {
      a: { chapterIndex: 1, scrollPosition: 1 },
      b: { chapterIndex: 0, scrollPosition: 1 },
      c: { chapterIndex: 0, scrollPosition: 0 },
    }
  );

  assert.strictEqual(stats.averageProgress, 50);
  assert.strictEqual(stats.totalChaptersRead, 3);
});

test("Reading streak: day keys respect the timezone offset", () => {
  const late = Date.UTC(2026, 10, 8, 16, 59, 59);
  const midnight = Date.UTC(2026, 10, 8, 17, 0, 0);

  assert.strictEqual(dayKey(late, 420), "2026-11-08");
  assert.strictEqual(dayKey(midnight, 420), "2026-11-09");
  assert.strictEqual(dayKey(midnight, 0), "2026-11-08");
  assert.strictEqual(dayKey(Date.UTC(2026, 11, 31, 17, 0, 0), 420), "2027-01-01");
  assert.strictEqual(dayKey(Date.UTC(2026, 10, 9, 2, 0, 0), -300), "2026-11-08");
});

test("Reading streak: day keys reject invalid timestamps", () => {
  assert.strictEqual(dayKey(Number.NaN), "");
  assert.strictEqual(dayKey(0, Number.NaN), "");
});

test("Reading streak: a run ending today becomes the current streak", () => {
  const streak = computeReadingStreak(
    ["2026-11-04", "2026-11-05", "2026-11-06", "2026-11-07", "2026-11-08"],
    "2026-11-08"
  );

  assert.strictEqual(streak.current, 5);
  assert.strictEqual(streak.longest, 5);
});

test("Reading streak: a run ending yesterday keeps zero current streak", () => {
  const streak = computeReadingStreak(
    ["2026-11-03", "2026-11-04", "2026-11-05"],
    "2026-11-08"
  );

  assert.strictEqual(streak.current, 0);
  assert.strictEqual(streak.longest, 3);
});

test("Reading streak: duplicates and unsorted days are normalized", () => {
  const streak = computeReadingStreak(
    ["2026-11-06", "2026-11-04", "2026-11-05", "2026-11-05", "2026-11-06"],
    "2026-11-06"
  );

  assert.strictEqual(streak.current, 3);
  assert.strictEqual(streak.longest, 3);
});

test("Reading streak: the longest run can precede the current run", () => {
  const streak = computeReadingStreak(
    ["2026-10-01", "2026-10-02", "2026-10-03", "2026-10-04", "2026-11-08"],
    "2026-11-08"
  );

  assert.strictEqual(streak.current, 1);
  assert.strictEqual(streak.longest, 4);
});

test("Reading streak: empty or invalid input returns zeroes", () => {
  assert.deepStrictEqual(computeReadingStreak([], "2026-11-08"), { current: 0, longest: 0 });
  assert.deepStrictEqual(
    computeReadingStreak(["not-a-date", ""], "2026-11-08"),
    { current: 0, longest: 0 }
  );
});
