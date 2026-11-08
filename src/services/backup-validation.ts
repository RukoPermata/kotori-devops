export interface BackupMetadata {
  appName: string;
  version: string;
  exportedAt: string;
  totalBooks: number;
  totalChapters: number;
  totalProgress: number;
}

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export interface BackupStructurePayload {
  books: unknown[];
  chapters: unknown[];
  progress?: unknown[];
  settings?: unknown;
  metadata?: unknown;
}

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:?\d{2})?)?$/;

/**
 * Validates a single BookMeta object.
 */
export function validateBookMeta(book: unknown): ValidationResult {
  if (!book || typeof book !== "object" || Array.isArray(book)) {
    return { isValid: false, error: "Book must be a non-null object" };
  }

  const b = book as Record<string, unknown>;

  if (typeof b.id !== "string" || b.id.trim() === "") {
    return { isValid: false, error: "Book 'id' must be a non-empty string" };
  }

  if (typeof b.title !== "string" || b.title.trim() === "") {
    return { isValid: false, error: "Book 'title' must be a non-empty string" };
  }

  if (typeof b.author !== "string") {
    return { isValid: false, error: "Book 'author' must be a string" };
  }

  if (typeof b.language !== "string") {
    return { isValid: false, error: "Book 'language' must be a string" };
  }

  if (b.coverUrl !== null && typeof b.coverUrl !== "string") {
    return { isValid: false, error: "Book 'coverUrl' must be a string or null" };
  }

  if (typeof b.fileSize !== "number" || !Number.isFinite(b.fileSize) || b.fileSize < 0) {
    return { isValid: false, error: "Book 'fileSize' must be a finite number >= 0" };
  }

  if (typeof b.totalChapters !== "number" || !Number.isInteger(b.totalChapters) || b.totalChapters < 1) {
    return { isValid: false, error: "Book 'totalChapters' must be an integer >= 1" };
  }

  if (typeof b.uploadedAt !== "number" || !Number.isFinite(b.uploadedAt) || b.uploadedAt <= 0) {
    return { isValid: false, error: "Book 'uploadedAt' must be a finite number > 0" };
  }

  if (b.lastReadAt !== null && (typeof b.lastReadAt !== "number" || !Number.isFinite(b.lastReadAt))) {
    return { isValid: false, error: "Book 'lastReadAt' must be a finite number or null" };
  }

  if (b.englishTitle !== undefined && typeof b.englishTitle !== "string") {
    return { isValid: false, error: "Book 'englishTitle' must be a string if present" };
  }

  if (b.isJapanese !== undefined && typeof b.isJapanese !== "boolean") {
    return { isValid: false, error: "Book 'isJapanese' must be a boolean if present" };
  }

  return { isValid: true };
}

/**
 * Validates a single Chapter object.
 */
export function validateChapter(chapter: unknown): ValidationResult {
  if (!chapter || typeof chapter !== "object" || Array.isArray(chapter)) {
    return { isValid: false, error: "Chapter must be a non-null object" };
  }

  const c = chapter as Record<string, unknown>;

  if (typeof c.id !== "string" || c.id.trim() === "") {
    return { isValid: false, error: "Chapter 'id' must be a non-empty string" };
  }

  if (typeof c.bookId !== "string" || c.bookId.trim() === "") {
    return { isValid: false, error: "Chapter 'bookId' must be a non-empty string" };
  }

  if (typeof c.index !== "number" || !Number.isInteger(c.index) || c.index < 0) {
    return { isValid: false, error: "Chapter 'index' must be an integer >= 0" };
  }

  if (typeof c.title !== "string") {
    return { isValid: false, error: "Chapter 'title' must be a string" };
  }

  if (typeof c.htmlContent !== "string") {
    return { isValid: false, error: "Chapter 'htmlContent' must be a string" };
  }

  if (c.href !== undefined && typeof c.href !== "string") {
    return { isValid: false, error: "Chapter 'href' must be a string if present" };
  }

  return { isValid: true };
}

/**
 * Validates a single ReadingProgress object.
 */
export function validateReadingProgress(progress: unknown): ValidationResult {
  if (!progress || typeof progress !== "object" || Array.isArray(progress)) {
    return { isValid: false, error: "ReadingProgress must be a non-null object" };
  }

  const p = progress as Record<string, unknown>;

  if (typeof p.bookId !== "string" || p.bookId.trim() === "") {
    return { isValid: false, error: "ReadingProgress 'bookId' must be a non-empty string" };
  }

  if (typeof p.chapterIndex !== "number" || !Number.isInteger(p.chapterIndex) || p.chapterIndex < 0) {
    return { isValid: false, error: "ReadingProgress 'chapterIndex' must be an integer >= 0" };
  }

  if (
    typeof p.scrollPosition !== "number" ||
    !Number.isFinite(p.scrollPosition) ||
    p.scrollPosition < 0 ||
    p.scrollPosition > 1
  ) {
    return {
      isValid: false,
      error: "ReadingProgress 'scrollPosition' must be a finite number between 0 and 1 inclusive",
    };
  }

  if (typeof p.lastReadAt !== "number" || !Number.isFinite(p.lastReadAt) || p.lastReadAt < 0) {
    return { isValid: false, error: "ReadingProgress 'lastReadAt' must be a finite number >= 0" };
  }

  return { isValid: true };
}

/**
 * Validates a ReaderSettings object.
 */
export function validateReaderSettings(settings: unknown): ValidationResult {
  if (!settings || typeof settings !== "object" || Array.isArray(settings)) {
    return { isValid: false, error: "ReaderSettings must be a non-null object" };
  }

  const s = settings as Record<string, unknown>;

  if (s.writingMode !== "horizontal" && s.writingMode !== "vertical") {
    return { isValid: false, error: "ReaderSettings 'writingMode' must be 'horizontal' or 'vertical'" };
  }

  if (s.theme !== "light" && s.theme !== "dark" && s.theme !== "sepia") {
    return { isValid: false, error: "ReaderSettings 'theme' must be 'light', 'dark', or 'sepia'" };
  }

  if (typeof s.fontFamily !== "string") {
    return { isValid: false, error: "ReaderSettings 'fontFamily' must be a string" };
  }

  if (typeof s.fontSize !== "number" || !Number.isFinite(s.fontSize) || s.fontSize <= 0) {
    return { isValid: false, error: "ReaderSettings 'fontSize' must be a finite number > 0" };
  }

  if (typeof s.lineHeight !== "number" || !Number.isFinite(s.lineHeight) || s.lineHeight <= 0) {
    return { isValid: false, error: "ReaderSettings 'lineHeight' must be a finite number > 0" };
  }

  if (typeof s.letterSpacing !== "number" || !Number.isFinite(s.letterSpacing)) {
    return { isValid: false, error: "ReaderSettings 'letterSpacing' must be a finite number" };
  }

  if (s.margin !== "compact" && s.margin !== "normal" && s.margin !== "wide") {
    return { isValid: false, error: "ReaderSettings 'margin' must be 'compact', 'normal', or 'wide'" };
  }

  if (
    s.readerWidth !== "narrow" &&
    s.readerWidth !== "medium" &&
    s.readerWidth !== "wide" &&
    s.readerWidth !== "full"
  ) {
    return {
      isValid: false,
      error: "ReaderSettings 'readerWidth' must be 'narrow', 'medium', 'wide', or 'full'",
    };
  }

  if (typeof s.ttsSpeed !== "number" || !Number.isFinite(s.ttsSpeed) || s.ttsSpeed <= 0) {
    return { isValid: false, error: "ReaderSettings 'ttsSpeed' must be a finite number > 0" };
  }

  if (s.enableDictionary !== undefined && typeof s.enableDictionary !== "boolean") {
    return { isValid: false, error: "ReaderSettings 'enableDictionary' must be a boolean if present" };
  }

  if (s.lockChapterNav !== undefined && typeof s.lockChapterNav !== "boolean") {
    return { isValid: false, error: "ReaderSettings 'lockChapterNav' must be a boolean if present" };
  }

  if (
    s.dictTrigger !== undefined &&
    s.dictTrigger !== "hover" &&
    s.dictTrigger !== "shift" &&
    s.dictTrigger !== "click"
  ) {
    return {
      isValid: false,
      error: "ReaderSettings 'dictTrigger' must be 'hover', 'shift', or 'click' if present",
    };
  }

  return { isValid: true };
}

/**
 * Validates a BackupMetadata object.
 */
export function validateBackupMetadata(metadata: unknown): ValidationResult {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return { isValid: false, error: "BackupMetadata must be a non-null object" };
  }

  const m = metadata as Record<string, unknown>;

  if (typeof m.appName !== "string") {
    return { isValid: false, error: "BackupMetadata 'appName' must be a string" };
  }

  if (typeof m.version !== "string") {
    return { isValid: false, error: "BackupMetadata 'version' must be a string" };
  }

  if (
    typeof m.exportedAt !== "string" ||
    !ISO_DATE_REGEX.test(m.exportedAt) ||
    Number.isNaN(Date.parse(m.exportedAt))
  ) {
    return { isValid: false, error: "BackupMetadata 'exportedAt' must be a valid ISO date string" };
  }

  if (typeof m.totalBooks !== "number" || !Number.isInteger(m.totalBooks) || m.totalBooks < 0) {
    return { isValid: false, error: "BackupMetadata 'totalBooks' must be an integer >= 0" };
  }

  if (typeof m.totalChapters !== "number" || !Number.isInteger(m.totalChapters) || m.totalChapters < 0) {
    return { isValid: false, error: "BackupMetadata 'totalChapters' must be an integer >= 0" };
  }

  if (typeof m.totalProgress !== "number" || !Number.isInteger(m.totalProgress) || m.totalProgress < 0) {
    return { isValid: false, error: "BackupMetadata 'totalProgress' must be an integer >= 0" };
  }

  return { isValid: true };
}

/**
 * Validates the overall structure and schema of backup payload.
 */
export function validateStructure(payload: {
  books: unknown[];
  chapters: unknown[];
  progress?: unknown[];
  settings?: unknown;
  metadata?: unknown;
} | unknown): ValidationResult {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { isValid: false, error: "Payload must be a non-null object" };
  }

  const p = payload as Record<string, unknown>;

  if (!Array.isArray(p.books)) {
    return { isValid: false, error: "Payload 'books' must be an array" };
  }

  if (!Array.isArray(p.chapters)) {
    return { isValid: false, error: "Payload 'chapters' must be an array" };
  }

  for (let i = 0; i < p.books.length; i++) {
    const res = validateBookMeta(p.books[i]);
    if (!res.isValid) {
      return { isValid: false, error: `Invalid book at index ${i}: ${res.error}` };
    }
  }

  for (let i = 0; i < p.chapters.length; i++) {
    const res = validateChapter(p.chapters[i]);
    if (!res.isValid) {
      return { isValid: false, error: `Invalid chapter at index ${i}: ${res.error}` };
    }
  }

  if (p.progress !== undefined && p.progress !== null) {
    if (!Array.isArray(p.progress)) {
      return { isValid: false, error: "Payload 'progress' must be an array when present" };
    }
    for (let i = 0; i < p.progress.length; i++) {
      const res = validateReadingProgress(p.progress[i]);
      if (!res.isValid) {
        return { isValid: false, error: `Invalid progress at index ${i}: ${res.error}` };
      }
    }
  }

  if (p.settings !== undefined && p.settings !== null) {
    const res = validateReaderSettings(p.settings);
    if (!res.isValid) {
      return { isValid: false, error: `Invalid reader settings: ${res.error}` };
    }
  }

  if (p.metadata !== undefined && p.metadata !== null) {
    const res = validateBackupMetadata(p.metadata);
    if (!res.isValid) {
      return { isValid: false, error: `Invalid metadata: ${res.error}` };
    }
  }

  return { isValid: true };
}

/**
 * Backup archive limit validation (size, entries, path traversal, collection bounds).
 */

/**
 * Backup limit validation constants and functions.
 * Protects against zip bombs, path traversal, oversized payloads, and memory exhaustion.
 */

export class BackupValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BackupValidationError";
  }
}

export const BACKUP_LIMITS = {
  MAX_BACKUP_FILE_SIZE: 150 * 1024 * 1024, // 150MB
  MAX_RAW_JSON_SIZE: 100 * 1024 * 1024, // 100MB
  MAX_ZIP_ENTRIES: 10,
  MAX_UNCOMPRESSED_SIZE: 300 * 1024 * 1024, // 300MB
  MAX_BOOKS_COUNT: 500,
  MAX_CHAPTERS_COUNT: 25000,
  MAX_CHAPTERS_PER_BOOK: 2000,
  MAX_CHAPTER_CONTENT_BYTES: 5 * 1024 * 1024, // 5MB
  ALLOWED_ZIP_FILENAMES: [
    "kotori-metadata.json",
    "books.json",
    "chapters.json",
    "progress.json",
    "settings.json",
  ] as const,
};

const ALLOWED_ZIP_SET: ReadonlySet<string> = new Set(BACKUP_LIMITS.ALLOWED_ZIP_FILENAMES);

/**
 * Validates basic backup file size and name attributes before processing.
 */
export function validateBackupFile(file: { name?: string; size: number }): boolean {
  if (!file || typeof file.size !== "number" || Number.isNaN(file.size)) {
    throw new BackupValidationError("Informasi file backup tidak valid.");
  }

  if (file.size <= 0) {
    throw new BackupValidationError("File backup kosong (0 byte).");
  }

  const isJson = Boolean(file.name && file.name.toLowerCase().endsWith(".json"));

  if (isJson) {
    if (file.size > BACKUP_LIMITS.MAX_RAW_JSON_SIZE) {
      const maxMb = BACKUP_LIMITS.MAX_RAW_JSON_SIZE / (1024 * 1024);
      const currentMb = (file.size / (1024 * 1024)).toFixed(1);
      throw new BackupValidationError(
        `Ukuran file backup JSON (${currentMb} MB) melebihi batas maksimal (${maxMb} MB).`
      );
    }
  } else {
    if (file.size > BACKUP_LIMITS.MAX_BACKUP_FILE_SIZE) {
      const maxMb = BACKUP_LIMITS.MAX_BACKUP_FILE_SIZE / (1024 * 1024);
      const currentMb = (file.size / (1024 * 1024)).toFixed(1);
      throw new BackupValidationError(
        `Ukuran file backup (${currentMb} MB) melebihi batas maksimal (${maxMb} MB).`
      );
    }
  }

  return true;
}

/**
 * Validates zip archive metadata, total entries count, allowed filenames, and path traversal attempts.
 */
export function validateZipArchive(zip: { files: Record<string, any> }): boolean {
  if (!zip || typeof zip !== "object" || !zip.files || typeof zip.files !== "object") {
    throw new BackupValidationError("Arsip zip tidak valid atau tidak memiliki daftar file.");
  }

  const entries = Object.keys(zip.files);

  if (entries.length > BACKUP_LIMITS.MAX_ZIP_ENTRIES) {
    throw new BackupValidationError(
      `Jumlah entri dalam arsip zip (${entries.length}) melebihi batas maksimal (${BACKUP_LIMITS.MAX_ZIP_ENTRIES}).`
    );
  }

  for (const filename of entries) {
    // Path traversal & directory checks
    if (
      filename.includes("..") ||
      filename.startsWith("/") ||
      filename.includes("\\") ||
      filename.includes(":") ||
      filename.endsWith("/") ||
      Boolean(zip.files[filename]?.dir)
    ) {
      throw new BackupValidationError(
        `Path traversal atau entri direktori terdeteksi pada zip: "${filename}".`
      );
    }

    // Whitelist check
    if (!ALLOWED_ZIP_SET.has(filename)) {
      throw new BackupValidationError(
        `Entri tidak dikenal dalam arsip zip: "${filename}". Hanya file berikut yang diizinkan: ${BACKUP_LIMITS.ALLOWED_ZIP_FILENAMES.join(", ")}.`
      );
    }
  }

  return true;
}

/**
 * Tracks decompression progress and rejects if total uncompressed bytes exceed the threshold.
 */
export function validateDecompressedSize(accumulatedBytes: number, addedBytes: number): number {
  if (accumulatedBytes < 0 || addedBytes < 0) {
    throw new BackupValidationError("Nilai ukuran byte tidak valid.");
  }

  const total = accumulatedBytes + addedBytes;
  if (total > BACKUP_LIMITS.MAX_UNCOMPRESSED_SIZE) {
    const maxMb = BACKUP_LIMITS.MAX_UNCOMPRESSED_SIZE / (1024 * 1024);
    const totalMb = (total / (1024 * 1024)).toFixed(1);
    throw new BackupValidationError(
      `Total ukuran dekompresi (${totalMb} MB) melebihi batas maksimal (${maxMb} MB).`
    );
  }

  return total;
}

function getUtf8ByteLength(text: string): number {
  if (typeof Buffer !== "undefined") {
    return Buffer.byteLength(text, "utf8");
  }
  return new TextEncoder().encode(text).length;
}

/**
 * Validates collection counts and payload content sizes for books and chapters.
 */
export function validateCollectionLimits(payload: {
  books?: unknown[];
  chapters?: unknown[];
}): boolean {
  if (!payload || typeof payload !== "object") {
    return true;
  }

  // 1. books.length <= 500
  if (payload.books && Array.isArray(payload.books)) {
    if (payload.books.length > BACKUP_LIMITS.MAX_BOOKS_COUNT) {
      throw new BackupValidationError(
        `Jumlah buku (${payload.books.length}) melebihi batas maksimal (${BACKUP_LIMITS.MAX_BOOKS_COUNT}).`
      );
    }
  }

  // 2. chapters.length <= 25000
  if (payload.chapters && Array.isArray(payload.chapters)) {
    if (payload.chapters.length > BACKUP_LIMITS.MAX_CHAPTERS_COUNT) {
      throw new BackupValidationError(
        `Jumlah bab (${payload.chapters.length}) melebihi batas maksimal (${BACKUP_LIMITS.MAX_CHAPTERS_COUNT}).`
      );
    }

    const chaptersPerBook = new Map<string, number>();

    for (const ch of payload.chapters) {
      if (ch && typeof ch === "object") {
        const item = ch as Record<string, unknown>;

        // 3. Chapters per book <= 2000
        if ("bookId" in item && item.bookId != null) {
          const bookId = String(item.bookId);
          const currentCount = (chaptersPerBook.get(bookId) || 0) + 1;
          if (currentCount > BACKUP_LIMITS.MAX_CHAPTERS_PER_BOOK) {
            throw new BackupValidationError(
              `Jumlah bab untuk buku "${bookId}" (${currentCount}) melebihi batas maksimal (${BACKUP_LIMITS.MAX_CHAPTERS_PER_BOOK} bab per buku).`
            );
          }
          chaptersPerBook.set(bookId, currentCount);
        }

        // 4. Chapter content length <= 5MB
        const content =
          typeof item.htmlContent === "string"
            ? item.htmlContent
            : typeof item.content === "string"
            ? item.content
            : null;

        if (content) {
          const contentBytes = getUtf8ByteLength(content);
          if (contentBytes > BACKUP_LIMITS.MAX_CHAPTER_CONTENT_BYTES) {
            const chTitle =
              typeof item.title === "string"
                ? item.title
                : String(item.id ?? "unknown");
            const maxMb = BACKUP_LIMITS.MAX_CHAPTER_CONTENT_BYTES / (1024 * 1024);
            const contentMb = (contentBytes / (1024 * 1024)).toFixed(1);
            throw new BackupValidationError(
              `Ukuran konten bab "${chTitle}" (${contentMb} MB) melebihi batas maksimal (${maxMb} MB).`
            );
          }
        }
      }
    }
  }

  return true;
}
