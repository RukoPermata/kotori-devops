import {
  getAllBooks,
  getAllChapters,
  getChapters,
  getAllProgress,
  getSettings,
  restoreLibrary,
} from "./book-storage";
import DOMPurify from "dompurify";
import { CURRENT_VERSION } from "@/data/changelog";
import type { BookMeta, Chapter, ReadingProgress, ReaderSettings } from "@/types/book";

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
  // Dynamically import JSZip so it doesn't inflate the initial landing page bundle
  const JSZip = (await import("jszip")).default;
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
  const JSZip = (await import("jszip")).default;

  // 1. Try treating as .kotori / ZIP archive
  try {
    const zip = await JSZip.loadAsync(file);

    const metaFile = zip.file("kotori-metadata.json");
    const booksFile = zip.file("books.json");
    const chaptersFile = zip.file("chapters.json");
    const progressFile = zip.file("progress.json");
    const settingsFile = zip.file("settings.json");

    if (!booksFile || !chaptersFile) {
      throw new Error("Missing books.json or chapters.json in backup archive.");
    }

    const booksText = await booksFile.async("text");
    const chaptersText = await chaptersFile.async("text");
    const books = JSON.parse(booksText) as BookMeta[];
    const chapters = JSON.parse(chaptersText) as Chapter[];

    let progress: ReadingProgress[] = [];
    if (progressFile) {
      const progressText = await progressFile.async("text");
      progress = JSON.parse(progressText) as ReadingProgress[];
    }

    let settings: ReaderSettings | undefined;
    let preferences: BackupInspectionResult["preferences"];
    if (settingsFile) {
      const settingsText = await settingsFile.async("text");
      const parsedSettings = JSON.parse(settingsText);
      settings = parsedSettings.reader;
      preferences = parsedSettings.app;
    }

    let metadata: BackupMetadata | undefined;
    if (metaFile) {
      const metaText = await metaFile.async("text");
      metadata = JSON.parse(metaText) as BackupMetadata;
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
  } catch (zipErr) {
    // 2. Fallback: Check if user uploaded a raw .json backup file
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);

      if (Array.isArray(parsed.books)) {
        return {
          isValid: true,
          metadata: parsed.metadata,
          books: parsed.books || [],
          chapters: parsed.chapters || [],
          progress: parsed.progress || [],
          settings: parsed.settings?.reader,
          preferences: parsed.settings?.app,
        };
      }
    } catch {
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
    throw new Error("Data backup tidak valid untuk dipulihkan.");
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

