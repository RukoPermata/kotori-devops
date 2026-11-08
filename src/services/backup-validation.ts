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
