import test from "node:test";
import assert from "node:assert";
import JSZip from "jszip";
import {
  BACKUP_LIMITS,
  BackupValidationError,
  validateBackupFile,
  validateZipArchive,
  validateDecompressedSize,
  validateCollectionLimits,
} from "../src/services/backup-validation.ts";
import { inspectBackupFile } from "../src/services/backup-service.ts";

test("Backup Limits: Constant values match security specifications", () => {
  assert.strictEqual(BACKUP_LIMITS.MAX_BACKUP_FILE_SIZE, 150 * 1024 * 1024);
  assert.strictEqual(BACKUP_LIMITS.MAX_RAW_JSON_SIZE, 100 * 1024 * 1024);
  assert.strictEqual(BACKUP_LIMITS.MAX_ZIP_ENTRIES, 10);
  assert.strictEqual(BACKUP_LIMITS.MAX_UNCOMPRESSED_SIZE, 300 * 1024 * 1024);
  assert.strictEqual(BACKUP_LIMITS.MAX_BOOKS_COUNT, 500);
  assert.strictEqual(BACKUP_LIMITS.MAX_CHAPTERS_COUNT, 25000);
  assert.strictEqual(BACKUP_LIMITS.MAX_CHAPTERS_PER_BOOK, 2000);
  assert.strictEqual(BACKUP_LIMITS.MAX_CHAPTER_CONTENT_BYTES, 5 * 1024 * 1024);
  assert.deepStrictEqual([...BACKUP_LIMITS.ALLOWED_ZIP_FILENAMES], [
    "kotori-metadata.json",
    "books.json",
    "chapters.json",
    "progress.json",
    "settings.json",
  ]);
});

test("validateBackupFile: Empty file and invalid file checks", () => {
  // Reject 0-byte file
  assert.throws(
    () => validateBackupFile({ name: "backup.kotori", size: 0 }),
    (err: unknown) => err instanceof BackupValidationError && /kosong/i.test((err as Error).message)
  );

  assert.throws(
    () => validateBackupFile({ name: "backup.json", size: 0 }),
    (err: unknown) => err instanceof BackupValidationError && /kosong/i.test((err as Error).message)
  );

  // Reject negative size
  assert.throws(
    () => validateBackupFile({ name: "backup.kotori", size: -1 }),
    (err: unknown) => err instanceof BackupValidationError
  );

  // Reject invalid file object
  assert.throws(
    () => validateBackupFile(null as unknown as { size: number }),
    (err: unknown) => err instanceof BackupValidationError
  );
});

test("validateBackupFile: File size boundaries for zip and raw JSON", () => {
  // .kotori / zip allowed up to 150MB
  assert.doesNotThrow(() =>
    validateBackupFile({ name: "backup.kotori", size: 150 * 1024 * 1024 })
  );

  assert.throws(
    () => validateBackupFile({ name: "backup.kotori", size: 150 * 1024 * 1024 + 1 }),
    (err: unknown) => err instanceof BackupValidationError && /melebihi batas/i.test((err as Error).message)
  );

  // Without filename, defaults to 150MB limit
  assert.doesNotThrow(() =>
    validateBackupFile({ size: 150 * 1024 * 1024 })
  );
  assert.throws(
    () => validateBackupFile({ size: 150 * 1024 * 1024 + 1 }),
    (err: unknown) => err instanceof BackupValidationError
  );

  // .json allowed up to 100MB
  assert.doesNotThrow(() =>
    validateBackupFile({ name: "my-library.json", size: 100 * 1024 * 1024 })
  );

  assert.throws(
    () => validateBackupFile({ name: "my-library.json", size: 100 * 1024 * 1024 + 1 }),
    (err: unknown) => err instanceof BackupValidationError && /JSON/i.test((err as Error).message)
  );
});

test("validateZipArchive: Entries count and whitelist validation", () => {
  // Valid zip structure with allowed filenames
  const validZip = {
    files: {
      "kotori-metadata.json": {},
      "books.json": {},
      "chapters.json": {},
      "progress.json": {},
      "settings.json": {},
    },
  };
  assert.strictEqual(validateZipArchive(validZip), true);

  // Excess entries (> 10 entries)
  const tooManyEntries: Record<string, unknown> = {};
  for (let i = 0; i < 11; i++) {
    tooManyEntries[`file-${i}.json`] = {};
  }
  assert.throws(
    () => validateZipArchive({ files: tooManyEntries }),
    (err: unknown) => err instanceof BackupValidationError && /melebihi batas/i.test((err as Error).message)
  );

  // Disallowed entry name
  const disallowedEntry = {
    files: {
      "books.json": {},
      "malicious_script.js": {},
    },
  };
  assert.throws(
    () => validateZipArchive(disallowedEntry),
    (err: unknown) => err instanceof BackupValidationError && /tidak dikenal/i.test((err as Error).message)
  );
});

test("validateZipArchive: Path traversal and directory rejection", () => {
  // Directory traversal with ".."
  assert.throws(
    () => validateZipArchive({ files: { "../books.json": {} } }),
    (err: unknown) => err instanceof BackupValidationError && /Path traversal/i.test((err as Error).message)
  );

  // Absolute path with "/"
  assert.throws(
    () => validateZipArchive({ files: { "/books.json": {} } }),
    (err: unknown) => err instanceof BackupValidationError && /Path traversal/i.test((err as Error).message)
  );

  // Windows backslash "\\"
  assert.throws(
    () => validateZipArchive({ files: { "sub\\books.json": {} } }),
    (err: unknown) => err instanceof BackupValidationError && /Path traversal/i.test((err as Error).message)
  );

  // Windows drive letter ":"
  assert.throws(
    () => validateZipArchive({ files: { "C:books.json": {} } }),
    (err: unknown) => err instanceof BackupValidationError && /Path traversal/i.test((err as Error).message)
  );

  // Directory entry ending with "/"
  assert.throws(
    () => validateZipArchive({ files: { "books.json/": {} } }),
    (err: unknown) => err instanceof BackupValidationError && /Path traversal/i.test((err as Error).message)
  );

  // Directory flag set
  assert.throws(
    () => validateZipArchive({ files: { "books.json": { dir: true } } }),
    (err: unknown) => err instanceof BackupValidationError && /Path traversal/i.test((err as Error).message)
  );
});

test("validateDecompressedSize: Size tracking and 300MB limit", () => {
  // Accumulated under limit
  const updated = validateDecompressedSize(100 * 1024 * 1024, 150 * 1024 * 1024);
  assert.strictEqual(updated, 250 * 1024 * 1024);

  // Exactly 300MB is allowed
  assert.strictEqual(
    validateDecompressedSize(250 * 1024 * 1024, 50 * 1024 * 1024),
    300 * 1024 * 1024
  );

  // Over 300MB is rejected
  assert.throws(
    () => validateDecompressedSize(300 * 1024 * 1024, 1),
    (err: unknown) => err instanceof BackupValidationError && /Total ukuran dekompresi/i.test((err as Error).message)
  );

  // Negative size input
  assert.throws(
    () => validateDecompressedSize(-1, 100),
    (err: unknown) => err instanceof BackupValidationError
  );
});

test("validateCollectionLimits: Books count limit (MAX_BOOKS_COUNT = 500)", () => {
  // 500 books allowed
  const books500 = Array.from({ length: 500 }, (_, i) => ({ id: `b-${i}`, title: `Book ${i}` }));
  assert.strictEqual(validateCollectionLimits({ books: books500 }), true);

  // 501 books rejected
  const books501 = Array.from({ length: 501 }, (_, i) => ({ id: `b-${i}`, title: `Book ${i}` }));
  assert.throws(
    () => validateCollectionLimits({ books: books501 }),
    (err: unknown) => err instanceof BackupValidationError && /Jumlah buku/i.test((err as Error).message)
  );
});

test("validateCollectionLimits: Chapters count limit (MAX_CHAPTERS_COUNT = 25000)", () => {
  // 25000 chapters across books
  const chapters25000 = Array.from({ length: 25000 }, (_, i) => ({
    id: `ch-${i}`,
    bookId: `b-${Math.floor(i / 1000)}`,
    htmlContent: "test content",
  }));
  assert.strictEqual(validateCollectionLimits({ chapters: chapters25000 }), true);

  // 25001 chapters rejected
  const chapters25001 = Array.from({ length: 25001 }, (_, i) => ({
    id: `ch-${i}`,
    bookId: `b-${Math.floor(i / 1000)}`,
    htmlContent: "test content",
  }));
  assert.throws(
    () => validateCollectionLimits({ chapters: chapters25001 }),
    (err: unknown) => err instanceof BackupValidationError && /Jumlah bab/i.test((err as Error).message)
  );
});

test("validateCollectionLimits: Chapters per book limit (MAX_CHAPTERS_PER_BOOK = 2000)", () => {
  // 2000 chapters in one book allowed
  const chapters2000 = Array.from({ length: 2000 }, (_, i) => ({
    id: `ch-${i}`,
    bookId: "single-book",
    htmlContent: "content",
  }));
  assert.strictEqual(validateCollectionLimits({ chapters: chapters2000 }), true);

  // 2001 chapters in one book rejected
  const chapters2001 = Array.from({ length: 2001 }, (_, i) => ({
    id: `ch-${i}`,
    bookId: "single-book",
    htmlContent: "content",
  }));
  assert.throws(
    () => validateCollectionLimits({ chapters: chapters2001 }),
    (err: unknown) => err instanceof BackupValidationError && /melebihi batas maksimal \(2000 bab per buku\)/i.test((err as Error).message)
  );
});

test("validateCollectionLimits: Chapter content size limit (MAX_CHAPTER_CONTENT_BYTES = 5MB)", () => {
  // Content <= 5MB allowed
  const safeContent = "a".repeat(5 * 1024 * 1024);
  assert.strictEqual(
    validateCollectionLimits({
      chapters: [{ id: "ch-1", bookId: "b-1", title: "Chapter 1", htmlContent: safeContent }],
    }),
    true
  );

  // Content > 5MB rejected
  const oversizedContent = "a".repeat(5 * 1024 * 1024 + 1024);
  assert.throws(
    () =>
      validateCollectionLimits({
        chapters: [{ id: "ch-1", bookId: "b-1", title: "Oversized Chapter", htmlContent: oversizedContent }],
      }),
    (err: unknown) => err instanceof BackupValidationError && /Ukuran konten bab/i.test((err as Error).message)
  );
});

test("inspectBackupFile Integration: Limit validation triggers during backup inspection", async () => {
  // 1. Empty file inspection
  const emptyFile = new File([], "empty-backup.kotori");
  const emptyResult = await inspectBackupFile(emptyFile);
  assert.strictEqual(emptyResult.isValid, false);
  assert.ok(/kosong/i.test(emptyResult.error || ""));

  // 2. Oversized file (mocked size property)
  const oversizedFile = {
    name: "big-backup.kotori",
    size: 200 * 1024 * 1024,
    text: async () => "",
  } as unknown as File;
  const oversizedResult = await inspectBackupFile(oversizedFile);
  assert.strictEqual(oversizedResult.isValid, false);
  assert.ok(/melebihi batas/i.test(oversizedResult.error || ""));

  // 3. Zip with disallowed filename
  const badZip = new JSZip();
  badZip.file("books.json", JSON.stringify([]));
  badZip.file("chapters.json", JSON.stringify([]));
  badZip.file("unauthorized.exe", "evil");
  const badZipBuffer = await badZip.generateAsync({ type: "uint8array" });
  const badZipFile = new File([badZipBuffer as unknown as BlobPart], "bad.kotori", { type: "application/zip" });
  const badResult = await inspectBackupFile(badZipFile);
  assert.strictEqual(badResult.isValid, false);
  assert.ok(/tidak dikenal/i.test(badResult.error || ""));

  // 4. Zip with path traversal
  const traversalZip = new JSZip();
  traversalZip.file("books.json", JSON.stringify([]));
  traversalZip.file("chapters.json", JSON.stringify([]));
  traversalZip.file("../books.json", JSON.stringify([]));
  const traversalZipBuffer = await traversalZip.generateAsync({ type: "uint8array" });
  const traversalFile = new File([traversalZipBuffer as unknown as BlobPart], "traversal.kotori", { type: "application/zip" });
  const traversalResult = await inspectBackupFile(traversalFile);
  assert.strictEqual(traversalResult.isValid, false);
  assert.ok(/path traversal/i.test(traversalResult.error || ""));

  // 5. Valid zip inspection
  const validZip = new JSZip();
  const validBook = {
    id: "b1",
    title: "Test Book",
    author: "Test Author",
    language: "ja",
    coverUrl: null,
    fileSize: 1024,
    totalChapters: 1,
    uploadedAt: 1700000000000,
    lastReadAt: null,
  };
  const validChapter = {
    id: "c1",
    bookId: "b1",
    index: 0,
    title: "Ch1",
    htmlContent: "<p>Hello</p>",
  };
  validZip.file("books.json", JSON.stringify([validBook]));
  validZip.file("chapters.json", JSON.stringify([validChapter]));
  const validZipBuffer = await validZip.generateAsync({ type: "uint8array" });
  const validFile = new File([validZipBuffer as unknown as BlobPart], "valid.kotori", { type: "application/zip" });
  const validResult = await inspectBackupFile(validFile);
  assert.strictEqual(validResult.isValid, true);
  assert.strictEqual(validResult.books.length, 1);
  assert.strictEqual(validResult.chapters.length, 1);

  // 6. Zip with collection exceeding book limit (> 500 books)
  const excessiveBooksZip = new JSZip();
  const tooManyBooks = Array.from({ length: 501 }, (_, i) => ({ id: `b-${i}`, title: `Book ${i}` }));
  excessiveBooksZip.file("books.json", JSON.stringify(tooManyBooks));
  excessiveBooksZip.file("chapters.json", JSON.stringify([]));
  const excessZipBuffer = await excessiveBooksZip.generateAsync({ type: "uint8array" });
  const excessZipFile = new File([excessZipBuffer as unknown as BlobPart], "excess-books.kotori", { type: "application/zip" });
  const excessResult = await inspectBackupFile(excessZipFile);
  assert.strictEqual(excessResult.isValid, false);
  assert.ok(/Jumlah buku/i.test(excessResult.error || ""));

  // 7. Zip with oversized chapter content (> 5MB)
  const oversizedChapterZip = new JSZip();
  oversizedChapterZip.file("books.json", JSON.stringify([{ id: "b1", title: "Test Book" }]));
  oversizedChapterZip.file("chapters.json", JSON.stringify([
    { id: "c1", bookId: "b1", title: "Huge Chapter", htmlContent: "x".repeat(5 * 1024 * 1024 + 100) },
  ]));
  const oversizedZipBuffer = await oversizedChapterZip.generateAsync({ type: "uint8array" });
  const oversizedZipFile = new File([oversizedZipBuffer as unknown as BlobPart], "oversized-chapter.kotori", { type: "application/zip" });
  const oversizedChapterResult = await inspectBackupFile(oversizedZipFile);
  assert.strictEqual(oversizedChapterResult.isValid, false);
  assert.ok(/Ukuran konten bab/i.test(oversizedChapterResult.error || ""));

  // 8. Raw JSON backup inspection (valid and limit violation)
  const validJsonContent = JSON.stringify({
    metadata: {
      appName: "Kotori",
      version: "1.2.0",
      exportedAt: "2026-11-08T12:00:00.000Z",
      totalBooks: 1,
      totalChapters: 1,
      totalProgress: 0,
    },
    books: [{ ...validBook, title: "JSON Book" }],
    chapters: [{ ...validChapter, htmlContent: "test" }],
  });
  const validJsonFile = new File([validJsonContent], "backup.json", { type: "application/json" });
  const validJsonResult = await inspectBackupFile(validJsonFile);
  assert.strictEqual(validJsonResult.isValid, true);
  assert.strictEqual(validJsonResult.books.length, 1);

  const invalidJsonContent = JSON.stringify({
    metadata: { appName: "Kotori", version: "1.2.0" },
    books: Array.from({ length: 501 }, (_, i) => ({ id: `b-${i}` })),
    chapters: [],
  });
  const invalidJsonFile = new File([invalidJsonContent], "too-many-books.json", { type: "application/json" });
  const invalidJsonResult = await inspectBackupFile(invalidJsonFile);
  assert.strictEqual(invalidJsonResult.isValid, false);
  assert.ok(/Jumlah buku/i.test(invalidJsonResult.error || ""));
});
