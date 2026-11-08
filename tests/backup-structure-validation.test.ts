import test from "node:test";
import assert from "node:assert";
import JSZip from "jszip";
import {
  validateBookMeta,
  validateChapter,
  validateReadingProgress,
  validateReaderSettings,
  validateBackupMetadata,
  validateStructure,
} from "../src/services/backup-validation.ts";
import { inspectBackupFile } from "../src/services/backup-service.ts";
import type { BookMeta, Chapter, ReadingProgress, ReaderSettings } from "../src/types/book.ts";
import type { BackupMetadata } from "../src/services/backup-validation.ts";

const validBook: BookMeta = {
  id: "book-001",
  title: "Kokoro",
  author: "Natsume Soseki",
  language: "ja",
  coverUrl: "https://example.com/cover.jpg",
  fileSize: 1048576,
  totalChapters: 10,
  uploadedAt: 1672531199000,
  lastReadAt: 1672600000000,
  englishTitle: "The Heart",
  isJapanese: true,
};

const validChapter: Chapter = {
  id: "chap-001",
  bookId: "book-001",
  index: 0,
  title: "Chapter 1",
  htmlContent: "<p>こんにちは、世界</p>",
  href: "text/ch01.xhtml",
};

const validProgress: ReadingProgress = {
  bookId: "book-001",
  chapterIndex: 0,
  scrollPosition: 0.45,
  lastReadAt: 1672600000000,
};

const validSettings: ReaderSettings = {
  writingMode: "vertical",
  theme: "dark",
  fontFamily: "Noto Serif JP, serif",
  fontSize: 18,
  lineHeight: 1.8,
  letterSpacing: 0.05,
  margin: "normal",
  readerWidth: "medium",
  ttsSpeed: 1,
  enableDictionary: true,
  lockChapterNav: false,
  dictTrigger: "hover",
};

const validMetadata: BackupMetadata = {
  appName: "Kotori",
  version: "1.2.0",
  exportedAt: "2026-11-08T12:00:00.000Z",
  totalBooks: 1,
  totalChapters: 1,
  totalProgress: 1,
};

// ==========================================
// 1. validateBookMeta tests
// ==========================================
test("validateBookMeta: valid records", () => {
  const res1 = validateBookMeta(validBook);
  assert.strictEqual(res1.isValid, true);
  assert.strictEqual(res1.error, undefined);

  // Minimal valid record: null coverUrl & lastReadAt, no optional fields
  const minimalBook = {
    id: "b-min",
    title: "Minimal Title",
    author: "",
    language: "en",
    coverUrl: null,
    fileSize: 0,
    totalChapters: 1,
    uploadedAt: 1000,
    lastReadAt: null,
  };
  const res2 = validateBookMeta(minimalBook);
  assert.strictEqual(res2.isValid, true);
});

test("validateBookMeta: non-object and null", () => {
  assert.strictEqual(validateBookMeta(null).isValid, false);
  assert.strictEqual(validateBookMeta(undefined).isValid, false);
  assert.strictEqual(validateBookMeta("not an object").isValid, false);
  assert.strictEqual(validateBookMeta(12345).isValid, false);
  assert.strictEqual(validateBookMeta([]).isValid, false);
});

test("validateBookMeta: missing required fields", () => {
  const fields = ["id", "title", "author", "language", "coverUrl", "fileSize", "totalChapters", "uploadedAt", "lastReadAt"];
  for (const field of fields) {
    const invalid = { ...validBook };
    delete (invalid as Record<string, unknown>)[field];
    const res = validateBookMeta(invalid);
    assert.strictEqual(res.isValid, false, `Expected missing '${field}' to fail validation`);
  }
});

test("validateBookMeta: empty or whitespace-only strings", () => {
  assert.strictEqual(validateBookMeta({ ...validBook, id: "" }).isValid, false);
  assert.strictEqual(validateBookMeta({ ...validBook, id: "   " }).isValid, false);
  assert.strictEqual(validateBookMeta({ ...validBook, title: "" }).isValid, false);
  assert.strictEqual(validateBookMeta({ ...validBook, title: " \t\n " }).isValid, false);
});

test("validateBookMeta: invalid types", () => {
  assert.strictEqual(validateBookMeta({ ...validBook, id: 123 }).isValid, false);
  assert.strictEqual(validateBookMeta({ ...validBook, title: 999 }).isValid, false);
  assert.strictEqual(validateBookMeta({ ...validBook, author: null }).isValid, false);
  assert.strictEqual(validateBookMeta({ ...validBook, language: true }).isValid, false);
  assert.strictEqual(validateBookMeta({ ...validBook, coverUrl: 1234 }).isValid, false);
  assert.strictEqual(validateBookMeta({ ...validBook, fileSize: "100" }).isValid, false);
  assert.strictEqual(validateBookMeta({ ...validBook, totalChapters: "5" }).isValid, false);
  assert.strictEqual(validateBookMeta({ ...validBook, uploadedAt: "yesterday" }).isValid, false);
  assert.strictEqual(validateBookMeta({ ...validBook, lastReadAt: "never" }).isValid, false);
  assert.strictEqual(validateBookMeta({ ...validBook, englishTitle: 123 }).isValid, false);
  assert.strictEqual(validateBookMeta({ ...validBook, isJapanese: "yes" }).isValid, false);
});

test("validateBookMeta: negative numbers and boundary values", () => {
  assert.strictEqual(validateBookMeta({ ...validBook, fileSize: -1 }).isValid, false);
  assert.strictEqual(validateBookMeta({ ...validBook, totalChapters: 0 }).isValid, false);
  assert.strictEqual(validateBookMeta({ ...validBook, totalChapters: -5 }).isValid, false);
  assert.strictEqual(validateBookMeta({ ...validBook, uploadedAt: 0 }).isValid, false);
  assert.strictEqual(validateBookMeta({ ...validBook, uploadedAt: -100 }).isValid, false);
});

test("validateBookMeta: non-integer chapters and non-finite numbers", () => {
  assert.strictEqual(validateBookMeta({ ...validBook, totalChapters: 1.5 }).isValid, false);
  assert.strictEqual(validateBookMeta({ ...validBook, totalChapters: NaN }).isValid, false);
  assert.strictEqual(validateBookMeta({ ...validBook, totalChapters: Infinity }).isValid, false);
  assert.strictEqual(validateBookMeta({ ...validBook, fileSize: Infinity }).isValid, false);
  assert.strictEqual(validateBookMeta({ ...validBook, uploadedAt: NaN }).isValid, false);
});

// ==========================================
// 2. validateChapter tests
// ==========================================
test("validateChapter: valid records", () => {
  assert.strictEqual(validateChapter(validChapter).isValid, true);

  const minimalChapter = {
    id: "c-min",
    bookId: "b-min",
    index: 0,
    title: "",
    htmlContent: "",
  };
  assert.strictEqual(validateChapter(minimalChapter).isValid, true);
});

test("validateChapter: non-object and null", () => {
  assert.strictEqual(validateChapter(null).isValid, false);
  assert.strictEqual(validateChapter(undefined).isValid, false);
  assert.strictEqual(validateChapter("chapter").isValid, false);
  assert.strictEqual(validateChapter([]).isValid, false);
});

test("validateChapter: missing required fields", () => {
  const fields = ["id", "bookId", "index", "title", "htmlContent"];
  for (const field of fields) {
    const invalid = { ...validChapter };
    delete (invalid as Record<string, unknown>)[field];
    assert.strictEqual(validateChapter(invalid).isValid, false, `Expected missing '${field}' to fail`);
  }
});

test("validateChapter: empty strings for id/bookId", () => {
  assert.strictEqual(validateChapter({ ...validChapter, id: "" }).isValid, false);
  assert.strictEqual(validateChapter({ ...validChapter, id: "  " }).isValid, false);
  assert.strictEqual(validateChapter({ ...validChapter, bookId: "" }).isValid, false);
  assert.strictEqual(validateChapter({ ...validChapter, bookId: "  " }).isValid, false);
});

test("validateChapter: invalid index (negative, float, NaN)", () => {
  assert.strictEqual(validateChapter({ ...validChapter, index: -1 }).isValid, false);
  assert.strictEqual(validateChapter({ ...validChapter, index: 2.7 }).isValid, false);
  assert.strictEqual(validateChapter({ ...validChapter, index: NaN }).isValid, false);
});

test("validateChapter: non-string content and invalid href", () => {
  assert.strictEqual(validateChapter({ ...validChapter, htmlContent: null }).isValid, false);
  assert.strictEqual(validateChapter({ ...validChapter, htmlContent: 12345 }).isValid, false);
  assert.strictEqual(validateChapter({ ...validChapter, title: null }).isValid, false);
  assert.strictEqual(validateChapter({ ...validChapter, href: 123 }).isValid, false);
});

// ==========================================
// 3. validateReadingProgress tests
// ==========================================
test("validateReadingProgress: valid records", () => {
  assert.strictEqual(validateReadingProgress(validProgress).isValid, true);
  // Edge bounds for scrollPosition (0 and 1)
  assert.strictEqual(validateReadingProgress({ ...validProgress, scrollPosition: 0 }).isValid, true);
  assert.strictEqual(validateReadingProgress({ ...validProgress, scrollPosition: 1 }).isValid, true);
  assert.strictEqual(validateReadingProgress({ ...validProgress, lastReadAt: 0 }).isValid, true);
});

test("validateReadingProgress: non-object and null", () => {
  assert.strictEqual(validateReadingProgress(null).isValid, false);
  assert.strictEqual(validateReadingProgress(undefined).isValid, false);
  assert.strictEqual(validateReadingProgress([]).isValid, false);
});

test("validateReadingProgress: invalid bookId", () => {
  assert.strictEqual(validateReadingProgress({ ...validProgress, bookId: "" }).isValid, false);
  assert.strictEqual(validateReadingProgress({ ...validProgress, bookId: "  " }).isValid, false);
  assert.strictEqual(validateReadingProgress({ ...validProgress, bookId: 123 }).isValid, false);
});

test("validateReadingProgress: negative or non-integer chapterIndex", () => {
  assert.strictEqual(validateReadingProgress({ ...validProgress, chapterIndex: -1 }).isValid, false);
  assert.strictEqual(validateReadingProgress({ ...validProgress, chapterIndex: 1.5 }).isValid, false);
  assert.strictEqual(validateReadingProgress({ ...validProgress, chapterIndex: NaN }).isValid, false);
});

test("validateReadingProgress: scrollPosition out of range [0, 1]", () => {
  assert.strictEqual(validateReadingProgress({ ...validProgress, scrollPosition: -0.01 }).isValid, false);
  assert.strictEqual(validateReadingProgress({ ...validProgress, scrollPosition: 1.01 }).isValid, false);
  assert.strictEqual(validateReadingProgress({ ...validProgress, scrollPosition: 2 }).isValid, false);
  assert.strictEqual(validateReadingProgress({ ...validProgress, scrollPosition: NaN }).isValid, false);
  assert.strictEqual(validateReadingProgress({ ...validProgress, scrollPosition: Infinity }).isValid, false);
});

test("validateReadingProgress: invalid lastReadAt", () => {
  assert.strictEqual(validateReadingProgress({ ...validProgress, lastReadAt: -1 }).isValid, false);
  assert.strictEqual(validateReadingProgress({ ...validProgress, lastReadAt: NaN }).isValid, false);
  assert.strictEqual(validateReadingProgress({ ...validProgress, lastReadAt: "2026-11-08" }).isValid, false);
});

// ==========================================
// 4. validateReaderSettings tests
// ==========================================
test("validateReaderSettings: valid records", () => {
  assert.strictEqual(validateReaderSettings(validSettings).isValid, true);

  const minimalSettings = {
    writingMode: "horizontal" as const,
    theme: "sepia" as const,
    fontFamily: "serif",
    fontSize: 16,
    lineHeight: 1.5,
    letterSpacing: 0,
    margin: "compact" as const,
    readerWidth: "full" as const,
    ttsSpeed: 1.25,
  };
  assert.strictEqual(validateReaderSettings(minimalSettings).isValid, true);
});

test("validateReaderSettings: non-object and null", () => {
  assert.strictEqual(validateReaderSettings(null).isValid, false);
  assert.strictEqual(validateReaderSettings(undefined).isValid, false);
  assert.strictEqual(validateReaderSettings("settings").isValid, false);
});

test("validateReaderSettings: enum violations", () => {
  assert.strictEqual(validateReaderSettings({ ...validSettings, writingMode: "diagonal" }).isValid, false);
  assert.strictEqual(validateReaderSettings({ ...validSettings, theme: "cyberpunk" }).isValid, false);
  assert.strictEqual(validateReaderSettings({ ...validSettings, margin: "ultra" }).isValid, false);
  assert.strictEqual(validateReaderSettings({ ...validSettings, readerWidth: "huge" }).isValid, false);
  assert.strictEqual(validateReaderSettings({ ...validSettings, dictTrigger: "doubleclick" }).isValid, false);
});

test("validateReaderSettings: numerical violations", () => {
  assert.strictEqual(validateReaderSettings({ ...validSettings, fontSize: 0 }).isValid, false);
  assert.strictEqual(validateReaderSettings({ ...validSettings, fontSize: -10 }).isValid, false);
  assert.strictEqual(validateReaderSettings({ ...validSettings, lineHeight: 0 }).isValid, false);
  assert.strictEqual(validateReaderSettings({ ...validSettings, lineHeight: -1.5 }).isValid, false);
  assert.strictEqual(validateReaderSettings({ ...validSettings, ttsSpeed: 0 }).isValid, false);
  assert.strictEqual(validateReaderSettings({ ...validSettings, ttsSpeed: -0.5 }).isValid, false);
  assert.strictEqual(validateReaderSettings({ ...validSettings, letterSpacing: NaN }).isValid, false);
});

test("validateReaderSettings: boolean flag violations", () => {
  assert.strictEqual(validateReaderSettings({ ...validSettings, enableDictionary: "yes" }).isValid, false);
  assert.strictEqual(validateReaderSettings({ ...validSettings, lockChapterNav: 1 }).isValid, false);
});

// ==========================================
// 5. validateBackupMetadata tests
// ==========================================
test("validateBackupMetadata: valid records", () => {
  assert.strictEqual(validateBackupMetadata(validMetadata).isValid, true);
  assert.strictEqual(validateBackupMetadata({ ...validMetadata, totalBooks: 0, totalChapters: 0, totalProgress: 0 }).isValid, true);
});

test("validateBackupMetadata: non-object and null", () => {
  assert.strictEqual(validateBackupMetadata(null).isValid, false);
  assert.strictEqual(validateBackupMetadata("metadata").isValid, false);
});

test("validateBackupMetadata: invalid exportedAt ISO date string", () => {
  assert.strictEqual(validateBackupMetadata({ ...validMetadata, exportedAt: "invalid-date" }).isValid, false);
  assert.strictEqual(validateBackupMetadata({ ...validMetadata, exportedAt: "2026/11/08" }).isValid, false);
  assert.strictEqual(validateBackupMetadata({ ...validMetadata, exportedAt: 123456789 }).isValid, false);
});

test("validateBackupMetadata: negative totals or non-integers", () => {
  assert.strictEqual(validateBackupMetadata({ ...validMetadata, totalBooks: -1 }).isValid, false);
  assert.strictEqual(validateBackupMetadata({ ...validMetadata, totalChapters: -1 }).isValid, false);
  assert.strictEqual(validateBackupMetadata({ ...validMetadata, totalProgress: -1 }).isValid, false);
  assert.strictEqual(validateBackupMetadata({ ...validMetadata, totalBooks: 1.5 }).isValid, false);
});

// ==========================================
// 6. validateStructure aggregate tests
// ==========================================
test("validateStructure: valid complete payload", () => {
  const result = validateStructure({
    books: [validBook],
    chapters: [validChapter],
    progress: [validProgress],
    settings: validSettings,
    metadata: validMetadata,
  });
  assert.strictEqual(result.isValid, true);
  assert.strictEqual(result.error, undefined);
});

test("validateStructure: valid minimal payload", () => {
  const result = validateStructure({
    books: [validBook],
    chapters: [validChapter],
  });
  assert.strictEqual(result.isValid, true);
});

test("validateStructure: payload is null or non-object", () => {
  assert.strictEqual(validateStructure(null).isValid, false);
  assert.strictEqual(validateStructure([]).isValid, false);
  assert.strictEqual(validateStructure("not an object").isValid, false);
});

test("validateStructure: books or chapters not an array", () => {
  assert.strictEqual(validateStructure({ books: "not-array", chapters: [validChapter] }).isValid, false);
  assert.strictEqual(validateStructure({ books: [validBook], chapters: null }).isValid, false);
});

test("validateStructure: invalid item in books returns error with index", () => {
  const result = validateStructure({
    books: [validBook, { ...validBook, title: "" }],
    chapters: [validChapter],
  });
  assert.strictEqual(result.isValid, false);
  assert.ok(result.error?.includes("index 1"));
});

test("validateStructure: invalid item in chapters returns error with index", () => {
  const result = validateStructure({
    books: [validBook],
    chapters: [validChapter, { ...validChapter, index: -1 }],
  });
  assert.strictEqual(result.isValid, false);
  assert.ok(result.error?.includes("index 1"));
});

test("validateStructure: invalid progress returns error with index", () => {
  const result = validateStructure({
    books: [validBook],
    chapters: [validChapter],
    progress: [{ ...validProgress, scrollPosition: 5 }],
  });
  assert.strictEqual(result.isValid, false);
  assert.ok(result.error?.includes("index 0"));
});

test("validateStructure: invalid settings returns error", () => {
  const result = validateStructure({
    books: [validBook],
    chapters: [validChapter],
    settings: { ...validSettings, theme: "invalid-theme" },
  });
  assert.strictEqual(result.isValid, false);
  assert.ok(result.error?.includes("settings"));
});

test("validateStructure: invalid metadata returns error", () => {
  const result = validateStructure({
    books: [validBook],
    chapters: [validChapter],
    metadata: { ...validMetadata, exportedAt: "not-a-date" },
  });
  assert.strictEqual(result.isValid, false);
  assert.ok(result.error?.includes("metadata"));
});

// ==========================================
// 7. inspectBackupFile and applyBackupRestore integration
// ==========================================
test("inspectBackupFile: raw JSON with valid payload", async () => {
  const jsonContent = JSON.stringify({
    books: [{ ...validBook, totalChapters: 1 }],
    chapters: [validChapter],
    progress: [validProgress],
    settings: { reader: validSettings },
    metadata: validMetadata,
  });

  const file = new File([jsonContent], "valid-backup.json", { type: "application/json" });
  const result = await inspectBackupFile(file);
  assert.strictEqual(result.isValid, true);
  assert.strictEqual(result.books.length, 1);
  assert.strictEqual(result.chapters.length, 1);
  assert.strictEqual(result.progress.length, 1);
});

test("inspectBackupFile: raw JSON with invalid book schema", async () => {
  const jsonContent = JSON.stringify({
    books: [{ ...validBook, fileSize: -500 }],
    chapters: [validChapter],
  });

  const file = new File([jsonContent], "invalid-book.json", { type: "application/json" });
  const result = await inspectBackupFile(file);
  assert.strictEqual(result.isValid, false);
  assert.strictEqual(result.books.length, 0);
  assert.strictEqual(result.chapters.length, 0);
  assert.ok(result.error?.includes("fileSize"));
});

test("inspectBackupFile: raw JSON with invalid chapter schema", async () => {
  const jsonContent = JSON.stringify({
    books: [validBook],
    chapters: [{ ...validChapter, index: -1 }],
  });

  const file = new File([jsonContent], "invalid-chap.json", { type: "application/json" });
  const result = await inspectBackupFile(file);
  assert.strictEqual(result.isValid, false);
  assert.ok(result.error?.includes("index"));
});

test("inspectBackupFile: ZIP file with invalid schema payload", async () => {
  const zip = new JSZip();
  zip.file("kotori-metadata.json", JSON.stringify(validMetadata));
  zip.file("books.json", JSON.stringify([{ ...validBook, totalChapters: 0 }])); // invalid totalChapters < 1
  zip.file("chapters.json", JSON.stringify([validChapter]));

  const buffer = await zip.generateAsync({ type: "arraybuffer" });
  const file = new File([buffer], "corrupt.kotori", { type: "application/octet-stream" });

  const result = await inspectBackupFile(file);
  assert.strictEqual(result.isValid, false);
  assert.strictEqual(result.books.length, 0);
  assert.ok(result.error?.includes("totalChapters"));
});

test("inspectBackupFile: corrupt non-JSON, non-ZIP file", async () => {
  const file = new File(["This is not a backup file"], "corrupt.txt", { type: "text/plain" });
  const result = await inspectBackupFile(file);
  assert.strictEqual(result.isValid, false);
  assert.ok(result.error !== undefined);
});
