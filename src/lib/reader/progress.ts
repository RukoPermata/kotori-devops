export interface ProgressInput {
  chapterCharCounts: number[];
  chapterIndex: number;
  inChapterRatio: number;
}

export interface BookProgress {
  percent: number;
  exactPercent: number;
  charsRead: number;
  totalChars: number;
  chaptersCompleted: number;
}

const EMPTY_PROGRESS: BookProgress = {
  percent: 0,
  exactPercent: 0,
  charsRead: 0,
  totalChars: 0,
  chaptersCompleted: 0,
};

export function clampRatio(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value <= 0) return 0;
  if (value >= 1) return 1;
  return value;
}

export function sumCharCounts(counts: number[]): number {
  let total = 0;
  for (const count of counts) {
    if (Number.isFinite(count) && count > 0) {
      total += count;
    }
  }
  return total;
}

function clampIndex(index: number, length: number): number {
  if (length <= 0) return 0;
  if (!Number.isFinite(index)) return 0;
  const floored = Math.floor(index);
  if (floored < 0) return 0;
  if (floored >= length) return length - 1;
  return floored;
}

export function computeProgressPercent(
  chapterIndex: number,
  scrollPosition: number,
  totalChapters: number
): number {
  if (!Number.isFinite(totalChapters) || totalChapters <= 0) return 0;
  const index = Number.isFinite(chapterIndex) ? Math.max(0, chapterIndex) : 0;
  const ratio = clampRatio(scrollPosition);
  const raw = ((index + ratio) / totalChapters) * 100;
  return Math.round(Math.min(100, Math.max(0, raw)));
}

export function computeBookProgress(input: ProgressInput): BookProgress {
  const counts = input.chapterCharCounts ?? [];
  if (counts.length === 0) return { ...EMPTY_PROGRESS };

  const totalChars = sumCharCounts(counts);
  const chapterIndex = clampIndex(input.chapterIndex, counts.length);
  const ratio = clampRatio(input.inChapterRatio);

  if (totalChars === 0) {
    const percent = computeProgressPercent(chapterIndex, ratio, counts.length);
    return { ...EMPTY_PROGRESS, percent };
  }

  let charsBefore = 0;
  for (let i = 0; i < chapterIndex; i++) {
    const count = counts[i];
    if (Number.isFinite(count) && count > 0) {
      charsBefore += count;
    }
  }

  const current = Number.isFinite(counts[chapterIndex]) && counts[chapterIndex] > 0
    ? counts[chapterIndex]
    : 0;
  const charsRead = Math.min(totalChars, Math.round(charsBefore + current * ratio));
  const exactPercent = (charsRead / totalChars) * 100;
  const chaptersCompleted = ratio === 1 ? chapterIndex + 1 : chapterIndex;

  return {
    percent: Math.round(Math.min(100, Math.max(0, exactPercent))),
    exactPercent,
    charsRead,
    totalChars,
    chaptersCompleted: Math.min(chaptersCompleted, counts.length),
  };
}
