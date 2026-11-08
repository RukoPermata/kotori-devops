import DOMPurify from "dompurify";
import { CURRENT_VERSION } from "../data/changelog.ts";
import type { BookMeta, Chapter, ReadingProgress, ReaderSettings } from "../types/book.ts";
import type { JSZipObject } from "jszip";
import {
  validateBackupFile,
  validateZipArchive,
  validateDecompressedSize,
  validateCollectionLimits,
  validateStructure,
  validateBackupRelations,
  BackupValidationError,
} from "./backup-validation.ts";

export interface BackupMetadata {
  appName: string;
  version: string;
  exportedAt: string;
  totalBooks: number;
  totalChapters: number;
  totalProgress: number;
}

export interface BackupInspectionResult {
  isValid: boolean;
  metadata?: BackupMetadata;
  books: BookMeta[];
  chapters: Chapter[];
  progress: ReadingProgress[];
  settings?: ReaderSettings;
  preferences?: {
    theme?: string;
    language?: string;
    viewMode?: string;
  };
  error?: string;
}

/**
 * Exports the entire library (or selected books) into a compressed .kotori file.
 */
export async function exportFullBackup(
  selectedBookIds?: string[],
  onProgress?: (percent: number) => void
): Promise<{ fileName: string; totalBooks: number }> {
  // Dynamically import JSZip and storage so they don't inflate initial bundle or block testing
  const [JSZipModule, storage] = await Promise.all([
    import("jszip"),
    import("./book-storage"),
  ]);
  const JSZip = JSZipModule.default;
  const { getAllBooks, getAllProgress, getSettings, getChapters, getAllChapters } = storage;
  const zip = new JSZip();
  const [allBooks, allProgress, settings] = await Promise.all([
    getAllBooks(),
    getAllProgress(),
    getSettings(),
  ]);

  const books = selectedBookIds && selectedBookIds.length > 0
    ? allBooks.filter((b) => selectedBookIds.includes(b.id))
    : allBooks;

  const selectedIdsSet = new Set(books.map((b) => b.id));

  // Memory-efficient chapter fetching: fetch only chapters for selected books
  let chapters: Chapter[];
  if (selectedBookIds && selectedBookIds.length > 0) {
    const chapterArrays = await Promise.all(
      selectedBookIds.map((bId) => getChapters(bId))
    );
    chapters = chapterArrays.flat();
  } else {
    chapters = await getAllChapters();
  }

  const progress = allProgress.filter((p) => selectedIdsSet.has(p.bookId));

  const preferences = {
    theme: typeof window !== "undefined" ? localStorage.getItem("kotoba-theme") : "dark",
    language: typeof window !== "undefined" ? localStorage.getItem("kotoba-language") : "EN",
    viewMode: typeof window !== "undefined" ? localStorage.getItem("kotoba-view-mode") : "shelf",
  };

  const metadata: BackupMetadata = {
    appName: "Kotori",
    version: CURRENT_VERSION,
    exportedAt: new Date().toISOString(),
    totalBooks: books.length,
    totalChapters: chapters.length,
    totalProgress: progress.length,
  };

  zip.file("kotori-metadata.json", JSON.stringify(metadata, null, 2));
  zip.file("books.json", JSON.stringify(books));
  zip.file("chapters.json", JSON.stringify(chapters));
  zip.file("progress.json", JSON.stringify(progress));
  zip.file("settings.json", JSON.stringify({ reader: settings, app: preferences }));

  const blob = await zip.generateAsync(
    {
      type: "blob",
      compression: "DEFLATE",
      compressionOptions: { level: 6 },
    },
    (meta) => {
      if (onProgress) {
        onProgress(Math.round(meta.percent));
      }
    }
  );

  const now = new Date();
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const fileName = `kotori-backup-${dateStr}.kotori`;

  // Trigger download via anchor element
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  return { fileName, totalBooks: books.length };
}

/**
 * Inspects an uploaded .kotori or .json backup file and returns its parsed contents.
 */
export async function inspectBackupFile(file: File): Promise<BackupInspectionResult> {
  // Validate file size and name limits first
  try {
    validateBackupFile(file);
  } catch (err) {
    return {
      isValid: false,
      books: [],
      chapters: [],
      progress: [],
      error: err instanceof Error ? err.message : String(err),
    };
  }

  const JSZip = (await import("jszip")).default;

  // 1. Try treating as .kotori / ZIP archive
  let zip: InstanceType<typeof JSZip> | null = null;
  try {
    const data = typeof file.arrayBuffer === "function" ? await file.arrayBuffer() : file;
    zip = await JSZip.loadAsync(data);
  } catch {
    // Not a valid zip; will attempt JSON fallback below
  }

  if (zip) {
    try {
      validateZipArchive(zip);

      // Pre-check uncompressed sizes from zip headers if available
      let precomputedSize = 0;
      for (const entry of Object.values(zip.files)) {
        if (entry && typeof entry === "object" && "_data" in (entry as unknown as Record<string, unknown>)) {
          const dataObj = (entry as unknown as Record<string, unknown>)._data;
          if (dataObj && typeof dataObj === "object" && "uncompressedSize" in (dataObj as Record<string, unknown>)) {
            const sz = (dataObj as Record<string, unknown>).uncompressedSize;
            if (typeof sz === "number") {
              precomputedSize = validateDecompressedSize(precomputedSize, sz);
            }
          }
        }
      }

      const metaFile = zip.file("kotori-metadata.json");
      const booksFile = zip.file("books.json");
      const chaptersFile = zip.file("chapters.json");
      const progressFile = zip.file("progress.json");
      const settingsFile = zip.file("settings.json");

      if (!booksFile || !chaptersFile) {
        throw new Error("Missing books.json or chapters.json in backup archive.");
      }

      let totalUncompressedBytes = 0;
      const readZipEntryText = async (entry: JSZipObject | null) => {
        if (!entry) return "";
        const text = await entry.async("text");
        const bytes = typeof Buffer !== "undefined"
          ? Buffer.byteLength(text, "utf8")
          : new TextEncoder().encode(text).length;
        totalUncompressedBytes = validateDecompressedSize(totalUncompressedBytes, bytes);
        return text;
      };

      const booksText = await readZipEntryText(booksFile);
      const chaptersText = await readZipEntryText(chaptersFile);
      const books = JSON.parse(booksText) as BookMeta[];
      const chapters = JSON.parse(chaptersText) as Chapter[];

      let progress: ReadingProgress[] = [];
      if (progressFile) {
        const progressText = await readZipEntryText(progressFile);
        progress = JSON.parse(progressText) as ReadingProgress[];
      }

      let settings: ReaderSettings | undefined;
      let preferences: BackupInspectionResult["preferences"];
      if (settingsFile) {
        const settingsText = await readZipEntryText(settingsFile);
        const parsedSettings = JSON.parse(settingsText);
        settings = parsedSettings.reader;
        preferences = parsedSettings.app;
      }

      let metadata: BackupMetadata | undefined;
      if (metaFile) {
        const metaText = await readZipEntryText(metaFile);
        metadata = JSON.parse(metaText) as BackupMetadata;
      }

      validateCollectionLimits({ books, chapters });

      const structure = validateStructure({
        books,
        chapters,
        progress,
        settings,
        metadata,
      });

      if (!structure.isValid) {
        return {
          isValid: false,
          books: [],
          chapters: [],
          progress: [],
          error: structure.error,
        };
      }

      const relations = validateBackupRelations({
        books,
        chapters,
        progress,
        metadata,
      });

      if (!relations.isValid) {
        return {
          isValid: false,
          books: [],
          chapters: [],
          progress: [],
          error: relations.error,
        };
      }

      return {
        isValid: true,
        metadata,
        books,
        chapters,
        progress,
        settings,
        preferences,
      };
    } catch (zipErr: unknown) {
      return {
        isValid: false,
        books: [],
        chapters: [],
        progress: [],
        error: zipErr instanceof Error ? zipErr.message : String(zipErr),
      };
    }
  }

  // 2. Fallback: Check if user uploaded a raw .json backup file
  try {
    const text = await file.text();
    const parsed = JSON.parse(text);

    if (Array.isArray(parsed.books)) {
      const books = (parsed.books ?? []) as BookMeta[];
      const chapters = (parsed.chapters ?? []) as Chapter[];
      const progress = (parsed.progress ?? []) as ReadingProgress[];
      const settings = parsed.settings?.reader as ReaderSettings | undefined;
      const metadata = parsed.metadata as BackupMetadata | undefined;

      validateCollectionLimits({ books, chapters });

      const structure = validateStructure({
        books,
        chapters,
        progress,
        settings,
        metadata,
      });

      if (!structure.isValid) {
        return {
          isValid: false,
          books: [],
          chapters: [],
          progress: [],
          error: structure.error,
        };
      }

      const relations = validateBackupRelations({
        books,
        chapters,
        progress,
        metadata,
      });

      if (!relations.isValid) {
        return {
          isValid: false,
          books: [],
          chapters: [],
          progress: [],
          error: relations.error,
        };
      }

      return {
        isValid: true,
        metadata,
        books,
        chapters,
        progress,
        settings,
        preferences: parsed.settings?.app,
      };
    }
  } catch (jsonErr: unknown) {
    if (jsonErr instanceof BackupValidationError) {
      return {
        isValid: false,
        books: [],
        chapters: [],
        progress: [],
        error: jsonErr.message,
      };
    }
    // not a JSON either
  }

  return {
    isValid: false,
    books: [],
    chapters: [],
    progress: [],
    error: "File backup tidak valid atau rusak. Pastikan file berformat .kotori atau .json backup.",
  };
}

/**
 * Restores parsed backup contents into IndexedDB and localStorage.
 */
export async function applyBackupRestore(
  data: BackupInspectionResult,
  options?: {
    selectedBookIds?: string[];
    preserveNewerLocalProgress?: boolean;
    currentProgresses?: Record<string, ReadingProgress | undefined>;
    currentBooks?: BookMeta[];
  }
): Promise<{ restoredBooks: number }> {
  if (!data.isValid || !data.books.length) {
    throw new Error(data.error || "Data backup tidak valid untuk dipulihkan.");
  }

  const relations = validateBackupRelations({
    books: data.books,
    chapters: data.chapters,
    progress: data.progress,
    metadata: data.metadata,
  });

  if (!relations.isValid) {
    throw new Error(relations.error || "Data backup tidak valid untuk dipulihkan.");
  }

  const selectedSet =
    options?.selectedBookIds && options.selectedBookIds.length > 0
      ? new Set(options.selectedBookIds)
      : new Set(data.books.map((b) => b.id));

  const booksToRestore = data.books.filter((b) => selectedSet.has(b.id));
  const chaptersToRestore = data.chapters.filter((c) => selectedSet.has(c.bookId));
  const progressPool = data.progress.filter((p) => selectedSet.has(p.bookId));

  let finalProgress = [...progressPool];

  if (options?.preserveNewerLocalProgress && options.currentProgresses) {
    finalProgress = booksToRestore
      .map((book) => {
        const backupProg = progressPool.find((p) => p.bookId === book.id);
        const currentBook = options.currentBooks?.find(
          (b) =>
            b.id === book.id ||
            b.title.trim().toLowerCase() === book.title.trim().toLowerCase()
        );
        const localProg = currentBook
          ? options.currentProgresses?.[currentBook.id]
          : undefined;

        if (!localProg) return backupProg;
        if (!backupProg) return localProg;

        const localScore = localProg.chapterIndex + localProg.scrollPosition;
        const backupScore = backupProg.chapterIndex + backupProg.scrollPosition;

        // If local progress is further ahead, retain local reading position
        if (localScore > backupScore) {
          return {
            ...localProg,
            bookId: book.id,
          };
        }

        return backupProg;
      })
      .filter((p): p is ReadingProgress => Boolean(p));
  }

  // Sanitize all chapter HTML contents to prevent XSS from tampered backup files
  const sanitizedChapters = chaptersToRestore.map((ch) => ({
    ...ch,
    htmlContent: DOMPurify.sanitize(ch.htmlContent || "", {
      USE_PROFILES: { html: true, svg: true },
      ADD_TAGS: ["ruby", "rt", "rp", "svg", "image", "g", "path", "p", "div", "span"],
      ADD_ATTR: [
        "epub:type",
        "xlink:href",
        "href",
        "viewBox",
        "preserveAspectRatio",
        "width",
        "height",
        "x",
        "y",
        "src",
        "alt",
      ],
    }),
  }));

  const { restoreLibrary } = await import("./book-storage");
  await restoreLibrary({
    books: booksToRestore,
    chapters: sanitizedChapters,
    progress: finalProgress,
    settings: data.settings,
  });

  if (typeof window !== "undefined") {
    localStorage.setItem("kotoba-has-books", "true");

    if (data.preferences?.theme) {
      localStorage.setItem("kotoba-theme", data.preferences.theme);
      document.documentElement.setAttribute("data-theme", data.preferences.theme);
    }
    if (data.preferences?.language) {
      localStorage.setItem("kotoba-language", data.preferences.language);
    }
    if (data.preferences?.viewMode) {
      localStorage.setItem("kotoba-view-mode", data.preferences.viewMode);
    }
  }

  return { restoredBooks: booksToRestore.length };
}

