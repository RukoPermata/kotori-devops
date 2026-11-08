import type { BookMeta, Chapter, ReadingProgress } from "../types/book.ts";

export interface BackupMetadata {
  appName: string;
  version: string;
  exportedAt: string;
  totalBooks: number;
  totalChapters: number;
  totalProgress: number;
}

export interface BackupValidationResult {
  isValid: boolean;
  error?: string;
}

export interface BackupValidationPayload {
  books: BookMeta[];
  chapters: Chapter[];
  progress?: ReadingProgress[];
  metadata?: BackupMetadata;
}

/**
 * Validates relational and referential integrity of Kotori backup data.
 * Strictly rejects any mismatch, orphan references, duplicates, or boundary violations.
 */
export function validateBackupRelations(
  payload: BackupValidationPayload
): BackupValidationResult {
  if (!payload || !Array.isArray(payload.books) || !Array.isArray(payload.chapters)) {
    return {
      isValid: false,
      error: "Invalid backup payload: books and chapters must be arrays.",
    };
  }

  const { books, chapters, progress, metadata } = payload;

  // 1. Primary / Unique Keys: Books
  const bookMap = new Map<string, BookMeta>();
  for (const book of books) {
    if (!book || typeof book.id !== "string" || !book.id.trim()) {
      return { isValid: false, error: "Invalid book: missing or invalid book ID." };
    }
    if (bookMap.has(book.id)) {
      return { isValid: false, error: `Duplicate book ID found: "${book.id}".` };
    }
    bookMap.set(book.id, book);
  }

  // 2. Chapters: Unique ID, Foreign Key to Book, Duplicate (bookId, index), Bounds Check
  const chapterIds = new Set<string>();
  const chapterCompositeKeys = new Set<string>();
  const chapterCountPerBook = new Map<string, number>();

  for (const book of books) {
    chapterCountPerBook.set(book.id, 0);
  }

  for (const chapter of chapters) {
    if (!chapter || typeof chapter.id !== "string" || !chapter.id.trim()) {
      return { isValid: false, error: "Invalid chapter: missing or invalid chapter ID." };
    }
    if (chapterIds.has(chapter.id)) {
      return { isValid: false, error: `Duplicate chapter ID found: "${chapter.id}".` };
    }
    chapterIds.add(chapter.id);

    // Foreign key check
    const parentBook = bookMap.get(chapter.bookId);
    if (!parentBook) {
      return {
        isValid: false,
        error: `Orphan chapter found: chapter "${chapter.id}" references non-existent book ID "${chapter.bookId}".`,
      };
    }

    // Unique composite key (bookId, index)
    const compositeKey = `${chapter.bookId}:${chapter.index}`;
    if (chapterCompositeKeys.has(compositeKey)) {
      return {
        isValid: false,
        error: `Duplicate chapter composite key found for book "${chapter.bookId}" and index ${chapter.index}.`,
      };
    }
    chapterCompositeKeys.add(compositeKey);

    // Bounds check: 0 <= chapter.index < book.totalChapters
    if (
      typeof chapter.index !== "number" ||
      !Number.isInteger(chapter.index) ||
      chapter.index < 0 ||
      chapter.index >= parentBook.totalChapters
    ) {
      return {
        isValid: false,
        error: `Chapter index ${chapter.index} for chapter "${chapter.id}" is out of bounds for book "${chapter.bookId}" (expected 0 <= index < ${parentBook.totalChapters}).`,
      };
    }

    chapterCountPerBook.set(
      chapter.bookId,
      (chapterCountPerBook.get(chapter.bookId) || 0) + 1
    );
  }

  // 3. Referential integrity: Every book must have at least 1 chapter & count must match totalChapters
  for (const book of books) {
    const count = chapterCountPerBook.get(book.id) || 0;
    if (count === 0) {
      return {
        isValid: false,
        error: `Book "${book.id}" ("${book.title}") has 0 chapters. Every book must have at least one chapter.`,
      };
    }
    if (count !== book.totalChapters) {
      return {
        isValid: false,
        error: `Chapter count mismatch for book "${book.id}" ("${book.title}"): expected ${book.totalChapters}, found ${count}.`,
      };
    }
  }

  // 4. Progress: Unique bookId, Foreign Key to Book, Bounds Check
  if (progress !== undefined) {
    if (!Array.isArray(progress)) {
      return { isValid: false, error: "Invalid progress: must be an array." };
    }

    const progressBookIds = new Set<string>();
    for (const prog of progress) {
      if (!prog || typeof prog.bookId !== "string" || !prog.bookId.trim()) {
        return { isValid: false, error: "Invalid progress: missing or invalid bookId." };
      }
      if (progressBookIds.has(prog.bookId)) {
        return {
          isValid: false,
          error: `Duplicate progress for book ID found: "${prog.bookId}".`,
        };
      }
      progressBookIds.add(prog.bookId);

      const parentBook = bookMap.get(prog.bookId);
      if (!parentBook) {
        return {
          isValid: false,
          error: `Orphan progress found: progress references non-existent book ID "${prog.bookId}".`,
        };
      }

      // Bounds check: 0 <= progress.chapterIndex < book.totalChapters
      if (
        typeof prog.chapterIndex !== "number" ||
        !Number.isInteger(prog.chapterIndex) ||
        prog.chapterIndex < 0 ||
        prog.chapterIndex >= parentBook.totalChapters
      ) {
        return {
          isValid: false,
          error: `Progress chapterIndex ${prog.chapterIndex} for book "${prog.bookId}" is out of bounds (expected 0 <= chapterIndex < ${parentBook.totalChapters}).`,
        };
      }
    }
  }

  // 5. Metadata Consistency (if metadata is present)
  if (metadata) {
    if (
      metadata.totalBooks !== undefined &&
      metadata.totalBooks !== books.length
    ) {
      return {
        isValid: false,
        error: `Metadata totalBooks mismatch: metadata reports ${metadata.totalBooks}, but found ${books.length} books.`,
      };
    }
    if (
      metadata.totalChapters !== undefined &&
      metadata.totalChapters !== chapters.length
    ) {
      return {
        isValid: false,
        error: `Metadata totalChapters mismatch: metadata reports ${metadata.totalChapters}, but found ${chapters.length} chapters.`,
      };
    }
    if (
      progress !== undefined &&
      metadata.totalProgress !== undefined &&
      metadata.totalProgress !== progress.length
    ) {
      return {
        isValid: false,
        error: `Metadata totalProgress mismatch: metadata reports ${metadata.totalProgress}, but found ${progress.length} progress entries.`,
      };
    }
  }

  return { isValid: true };
}
