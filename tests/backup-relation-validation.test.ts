import test from "node:test";
import assert from "node:assert";
import JSZip from "jszip";
import type { BookMeta, Chapter, ReadingProgress } from "../src/types/book.ts";
import {
  validateBackupRelations,
  type BackupMetadata,
} from "../src/services/backup-validation.ts";
import { inspectBackupFile, applyBackupRestore } from "../src/services/backup-service.ts";

function createMockBook(
  id: string,
  totalChapters: number,
  overrides?: Partial<BookMeta>
): BookMeta {
  return {
    id,
    title: `Book ${id}`,
    author: "Test Author",
    language: "ja",
    coverUrl: null,
    fileSize: 1024,
    totalChapters,
    uploadedAt: 1700000000000,
    lastReadAt: null,
    ...overrides,
  };
}

function createMockChapter(
  id: string,
  bookId: string,
  index: number,
  overrides?: Partial<Chapter>
): Chapter {
  return {
    id,
    bookId,
    index,
    title: `Chapter ${index + 1}`,
    htmlContent: `<p>Content for chapter ${index + 1}</p>`,
    ...overrides,
  };
}

function createMockProgress(
  bookId: string,
  chapterIndex: number,
  overrides?: Partial<ReadingProgress>
): ReadingProgress {
  return {
    bookId,
    chapterIndex,
    scrollPosition: 0.5,
    lastReadAt: 1700000001000,
    ...overrides,
  };
}

test("Validation: Strictly reject duplicate book.id", () => {
  const books = [
    createMockBook("book-1", 1),
    createMockBook("book-1", 1, { title: "Duplicate Book 1" }),
  ];
  const chapters = [createMockChapter("ch-1", "book-1", 0)];

  const res = validateBackupRelations({ books, chapters });
  assert.strictEqual(res.isValid, false);
  assert.ok(
    res.error?.includes("Duplicate book ID found"),
    `Expected duplicate book error, got: ${res.error}`
  );
});

test("Validation: Strictly reject duplicate chapter.id", () => {
  const books = [createMockBook("book-1", 2)];
  const chapters = [
    createMockChapter("ch-dup", "book-1", 0),
    createMockChapter("ch-dup", "book-1", 1),
  ];

  const res = validateBackupRelations({ books, chapters });
  assert.strictEqual(res.isValid, false);
  assert.ok(
    res.error?.includes("Duplicate chapter ID found"),
    `Expected duplicate chapter ID error, got: ${res.error}`
  );
});

test("Validation: Strictly reject duplicate composite key (chapter.bookId, chapter.index)", () => {
  const books = [createMockBook("book-1", 2)];
  const chapters = [
    createMockChapter("ch-1", "book-1", 0),
    createMockChapter("ch-2", "book-1", 0), // Same bookId and index 0
  ];

  const res = validateBackupRelations({ books, chapters });
  assert.strictEqual(res.isValid, false);
  assert.ok(
    res.error?.includes("Duplicate chapter composite key"),
    `Expected duplicate composite key error, got: ${res.error}`
  );
});

test("Validation: Strictly reject duplicate progress.bookId", () => {
  const books = [createMockBook("book-1", 2)];
  const chapters = [
    createMockChapter("ch-1", "book-1", 0),
    createMockChapter("ch-2", "book-1", 1),
  ];
  const progress = [
    createMockProgress("book-1", 0),
    createMockProgress("book-1", 1),
  ];

  const res = validateBackupRelations({ books, chapters, progress });
  assert.strictEqual(res.isValid, false);
  assert.ok(
    res.error?.includes("Duplicate progress for book ID found"),
    `Expected duplicate progress error, got: ${res.error}`
  );
});

test("Validation: Strictly reject orphan chapter (nonexistent bookId)", () => {
  const books = [createMockBook("book-1", 1)];
  const chapters = [
    createMockChapter("ch-1", "book-1", 0),
    createMockChapter("ch-orphan", "nonexistent-book", 0),
  ];

  const res = validateBackupRelations({ books, chapters });
  assert.strictEqual(res.isValid, false);
  assert.ok(
    res.error?.includes("Orphan chapter found"),
    `Expected orphan chapter error, got: ${res.error}`
  );
});

test("Validation: Strictly reject orphan progress (nonexistent bookId)", () => {
  const books = [createMockBook("book-1", 1)];
  const chapters = [createMockChapter("ch-1", "book-1", 0)];
  const progress = [createMockProgress("ghost-book", 0)];

  const res = validateBackupRelations({ books, chapters, progress });
  assert.strictEqual(res.isValid, false);
  assert.ok(
    res.error?.includes("Orphan progress found"),
    `Expected orphan progress error, got: ${res.error}`
  );
});

test("Validation: Strictly reject book with 0 chapters", () => {
  const books = [
    createMockBook("book-empty", 0, { title: "Empty Book" }),
  ];
  const chapters: Chapter[] = [];

  const res = validateBackupRelations({ books, chapters });
  assert.strictEqual(res.isValid, false);
  assert.ok(
    res.error?.includes("0 chapters"),
    `Expected 0 chapters error, got: ${res.error}`
  );
});

test("Validation: Strictly reject chapter.index >= book.totalChapters", () => {
  const books = [createMockBook("book-1", 1)];
  // totalChapters is 1, so index can only be 0. Index 1 is out of bounds.
  const chapters = [createMockChapter("ch-1", "book-1", 1)];

  const res = validateBackupRelations({ books, chapters });
  assert.strictEqual(res.isValid, false);
  assert.ok(
    res.error?.includes("out of bounds"),
    `Expected chapter index out of bounds error, got: ${res.error}`
  );
});

test("Validation: Strictly reject chapters count !== book.totalChapters", () => {
  const books = [createMockBook("book-1", 3)];
  // Book claims 3 chapters, but only provides 2 chapters
  const chapters = [
    createMockChapter("ch-1", "book-1", 0),
    createMockChapter("ch-2", "book-1", 1),
  ];

  const res = validateBackupRelations({ books, chapters });
  assert.strictEqual(res.isValid, false);
  assert.ok(
    res.error?.includes("Chapter count mismatch"),
    `Expected chapter count mismatch error, got: ${res.error}`
  );
});

test("Validation: Strictly reject progress.chapterIndex >= book.totalChapters", () => {
  const books = [createMockBook("book-1", 2)];
  const chapters = [
    createMockChapter("ch-1", "book-1", 0),
    createMockChapter("ch-2", "book-1", 1),
  ];
  // Valid chapterIndex is 0 or 1. Index 2 is out of bounds.
  const progress = [createMockProgress("book-1", 2)];

  const res = validateBackupRelations({ books, chapters, progress });
  assert.strictEqual(res.isValid, false);
  assert.ok(
    res.error?.includes("Progress chapterIndex 2") && res.error?.includes("out of bounds"),
    `Expected progress chapterIndex out of bounds error, got: ${res.error}`
  );
});

test("Validation: Strictly reject metadata totalBooks mismatch", () => {
  const books = [createMockBook("book-1", 1)];
  const chapters = [createMockChapter("ch-1", "book-1", 0)];
  const metadata: BackupMetadata = {
    appName: "Kotori",
    version: "1.2.0",
    exportedAt: new Date().toISOString(),
    totalBooks: 99, // Mismatched (actual 1)
    totalChapters: 1,
    totalProgress: 0,
  };

  const res = validateBackupRelations({ books, chapters, metadata });
  assert.strictEqual(res.isValid, false);
  assert.ok(
    res.error?.includes("Metadata totalBooks mismatch"),
    `Expected metadata totalBooks mismatch error, got: ${res.error}`
  );
});

test("Validation: Strictly reject metadata totalChapters mismatch", () => {
  const books = [createMockBook("book-1", 1)];
  const chapters = [createMockChapter("ch-1", "book-1", 0)];
  const metadata: BackupMetadata = {
    appName: "Kotori",
    version: "1.2.0",
    exportedAt: new Date().toISOString(),
    totalBooks: 1,
    totalChapters: 99, // Mismatched (actual 1)
    totalProgress: 0,
  };

  const res = validateBackupRelations({ books, chapters, metadata });
  assert.strictEqual(res.isValid, false);
  assert.ok(
    res.error?.includes("Metadata totalChapters mismatch"),
    `Expected metadata totalChapters mismatch error, got: ${res.error}`
  );
});

test("Validation: Strictly reject metadata totalProgress mismatch", () => {
  const books = [createMockBook("book-1", 1)];
  const chapters = [createMockChapter("ch-1", "book-1", 0)];
  const progress = [createMockProgress("book-1", 0)];
  const metadata: BackupMetadata = {
    appName: "Kotori",
    version: "1.2.0",
    exportedAt: new Date().toISOString(),
    totalBooks: 1,
    totalChapters: 1,
    totalProgress: 99, // Mismatched (actual 1)
  };

  const res = validateBackupRelations({ books, chapters, progress, metadata });
  assert.strictEqual(res.isValid, false);
  assert.ok(
    res.error?.includes("Metadata totalProgress mismatch"),
    `Expected metadata totalProgress mismatch error, got: ${res.error}`
  );
});

test("Validation: Multi-book valid payload with matching chapters, progress, and metadata", () => {
  const books = [
    createMockBook("book-a", 2, { title: "Book Alpha" }),
    createMockBook("book-b", 3, { title: "Book Beta" }),
  ];
  const chapters = [
    createMockChapter("ch-a1", "book-a", 0),
    createMockChapter("ch-a2", "book-a", 1),
    createMockChapter("ch-b1", "book-b", 0),
    createMockChapter("ch-b2", "book-b", 1),
    createMockChapter("ch-b3", "book-b", 2),
  ];
  const progress = [
    createMockProgress("book-a", 1),
    createMockProgress("book-b", 0),
  ];
  const metadata: BackupMetadata = {
    appName: "Kotori",
    version: "1.2.0",
    exportedAt: new Date().toISOString(),
    totalBooks: 2,
    totalChapters: 5,
    totalProgress: 2,
  };

  const res = validateBackupRelations({ books, chapters, progress, metadata });
  assert.strictEqual(res.isValid, true);
  assert.strictEqual(res.error, undefined);
});

test("Integration: inspectBackupFile with invalid raw JSON relations returns isValid: false", async () => {
  const invalidJsonPayload = {
    metadata: {
      appName: "Kotori",
      version: "1.2.0",
      exportedAt: new Date().toISOString(),
      totalBooks: 1,
      totalChapters: 1,
      totalProgress: 0,
    },
    books: [createMockBook("b1", 1)],
    chapters: [createMockChapter("ch-orphan", "nonexistent-book", 0)],
  };

  const file = new File(
    [JSON.stringify(invalidJsonPayload)],
    "backup-invalid.json",
    { type: "application/json" }
  );

  const inspected = await inspectBackupFile(file);
  assert.strictEqual(inspected.isValid, false);
  assert.strictEqual(inspected.books.length, 0);
  assert.strictEqual(inspected.chapters.length, 0);
  assert.ok(
    inspected.error?.includes("Orphan chapter found"),
    `Expected orphan chapter error from inspectBackupFile, got: ${inspected.error}`
  );
});

test("Integration: inspectBackupFile with invalid ZIP relations returns isValid: false", async () => {
  const zip = new JSZip();

  const books = [createMockBook("b1", 3)];
  // Only 1 chapter provided while totalChapters is 3
  const chapters = [createMockChapter("ch1", "b1", 0)];
  const metadata: BackupMetadata = {
    appName: "Kotori",
    version: "1.2.0",
    exportedAt: new Date().toISOString(),
    totalBooks: 1,
    totalChapters: 1,
    totalProgress: 0,
  };

  zip.file("kotori-metadata.json", JSON.stringify(metadata));
  zip.file("books.json", JSON.stringify(books));
  zip.file("chapters.json", JSON.stringify(chapters));

  const zipBuffer = await zip.generateAsync({ type: "arraybuffer" });
  const file = new File([zipBuffer], "backup-invalid.kotori", {
    type: "application/octet-stream",
  });

  const inspected = await inspectBackupFile(file);
  assert.strictEqual(inspected.isValid, false);
  assert.strictEqual(inspected.books.length, 0);
  assert.strictEqual(inspected.chapters.length, 0);
  assert.ok(
    inspected.error?.includes("Chapter count mismatch"),
    `Expected chapter count mismatch error from inspectBackupFile, got: ${inspected.error}`
  );
});

test("Integration: applyBackupRestore throws error on relational validation failure", async () => {
  const invalidData = {
    isValid: true, // Marked as true initially, but corrupted content
    books: [createMockBook("book-corrupt", 2)],
    chapters: [createMockChapter("ch-1", "book-corrupt", 0)], // Only 1 chapter instead of 2
    progress: [],
  };

  await assert.rejects(
    async () => {
      await applyBackupRestore(invalidData);
    },
    (err: Error) => {
      return (
        err instanceof Error &&
        err.message.includes("Chapter count mismatch")
      );
    }
  );
});

