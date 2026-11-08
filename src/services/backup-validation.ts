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
