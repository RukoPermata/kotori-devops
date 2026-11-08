export interface StatsBook {
  id: string;
  totalChapters: number;
}

export interface StatsProgress {
  chapterIndex: number;
  scrollPosition: number;
}

export interface LibraryStats {
  totalBooks: number;
  finishedBooks: number;
  inProgressBooks: number;
  unreadBooks: number;
  totalChaptersRead: number;
  averageProgress: number;
}

export interface ReadingStreak {
  current: number;
  longest: number;
}

const DAY_MS = 86_400_000;

function parseDayKey(key: string): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!match) return Number.NaN;
  return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function dayKeyFromMs(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

function bookPercent(book: StatsBook, progress: StatsProgress | undefined): number {
  if (!progress) return 0;
  if (!Number.isFinite(book.totalChapters) || book.totalChapters <= 0) return 0;

  const index = Number.isFinite(progress.chapterIndex)
    ? Math.max(0, progress.chapterIndex)
    : 0;
  const ratio = Number.isFinite(progress.scrollPosition)
    ? Math.min(1, Math.max(0, progress.scrollPosition))
    : 0;

  return Math.round(Math.min(100, Math.max(0, ((index + ratio) / book.totalChapters) * 100)));
}

function bookChaptersRead(book: StatsBook, progress: StatsProgress | undefined): number {
  if (!progress || !Number.isFinite(book.totalChapters) || book.totalChapters <= 0) return 0;

  const index = Number.isFinite(progress.chapterIndex)
    ? Math.max(0, progress.chapterIndex)
    : 0;
  const finishedCurrent = Number.isFinite(progress.scrollPosition) && progress.scrollPosition >= 1;
  return Math.min(book.totalChapters, index + (finishedCurrent ? 1 : 0));
}

export function computeLibraryStats(
  books: StatsBook[],
  progresses: Record<string, StatsProgress | undefined>
): LibraryStats {
  if (!Array.isArray(books) || books.length === 0) {
    return {
      totalBooks: 0,
      finishedBooks: 0,
      inProgressBooks: 0,
      unreadBooks: 0,
      totalChaptersRead: 0,
      averageProgress: 0,
    };
  }

  let finishedBooks = 0;
  let inProgressBooks = 0;
  let unreadBooks = 0;
  let totalChaptersRead = 0;
  let progressSum = 0;

  for (const book of books) {
    const progress = progresses?.[book.id];
    const percent = bookPercent(book, progress);
    progressSum += percent;
    totalChaptersRead += bookChaptersRead(book, progress);

    if (percent >= 100) {
      finishedBooks++;
    } else if (percent > 0) {
      inProgressBooks++;
    } else {
      unreadBooks++;
    }
  }

  return {
    totalBooks: books.length,
    finishedBooks,
    inProgressBooks,
    unreadBooks,
    totalChaptersRead,
    averageProgress: Math.round(progressSum / books.length),
  };
}

export function dayKey(timestamp: number, timezoneOffsetMinutes = 0): string {
  if (!Number.isFinite(timestamp) || !Number.isFinite(timezoneOffsetMinutes)) return "";
  const shifted = timestamp + timezoneOffsetMinutes * 60_000;
  return new Date(shifted).toISOString().slice(0, 10);
}

export function computeReadingStreak(
  dayKeys: string[],
  todayKey: string
): ReadingStreak {
  const unique = Array.from(
    new Set(
      (Array.isArray(dayKeys) ? dayKeys : []).filter(
        (key) => typeof key === "string" && !Number.isNaN(parseDayKey(key))
      )
    )
  ).sort();

  if (unique.length === 0) return { current: 0, longest: 0 };

  let longest = 1;
  let run = 1;
  for (let i = 1; i < unique.length; i++) {
    const previous = parseDayKey(unique[i - 1]);
    const current = parseDayKey(unique[i]);
    run = current - previous === DAY_MS ? run + 1 : 1;
    if (run > longest) longest = run;
  }

  let currentStreak = 0;
  const today = parseDayKey(todayKey);
  if (!Number.isNaN(today)) {
    const days = new Set(unique);
    let cursor = today;
    while (days.has(dayKeyFromMs(cursor))) {
      currentStreak++;
      cursor -= DAY_MS;
    }
  }

  return { current: currentStreak, longest };
}
