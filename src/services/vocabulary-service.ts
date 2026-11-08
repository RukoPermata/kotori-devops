/**
 * Vocabulary & Search History Service
 *
 * Implements:
 * 1. Search History Manager (FIFO/LRU buffer limit, deduplication, frequency counting).
 * 2. Vocabulary Bookmarks & Tagging System (CRUD, tag filtering, duplicate merging).
 * 3. Anki & CSV Exporters (RFC 4180 compliant).
 * 4. DevSecOps CSV Formula Injection Sanitizer (STRIDE Tampering/Elevation of Privilege mitigation).
 */

export interface SearchHistoryItem {
  query: string;
  timestamp: number;
  count: number;
}

export interface VocabularyItem {
  id: string;
  expression: string;
  reading: string;
  meanings: string[];
  tags: string[];
  notes?: string;
  jlpt?: string;
  createdAt: number;
  updatedAt: number;
}

export interface VocabularyFilterOptions {
  query?: string;
  tag?: string;
  jlpt?: string;
}

export const DEFAULT_MAX_HISTORY = 50;

// Characters that trigger formula execution in spreadsheet software (Excel, LibreOffice, Google Sheets)
const CSV_FORMULA_INJECTION_PREFIXES = ["=", "+", "-", "@", "\t", "\r"];

/**
 * DevSecOps Mitigation: Sanitizes cell content against CSV/Formula Injection (STRIDE Tampering).
 * Prepends a single quote `'` if the cell begins with formula execution characters,
 * and escapes double quotes according to RFC 4180.
 */
export function sanitizeCsvCell(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  let str = String(value);

  // Strip leading carriage returns or tabs that can conceal formula prefixes
  str = str.replace(/^[\t\r]+/, "");

  // If first character is a dangerous formula indicator, prepend single quote
  if (CSV_FORMULA_INJECTION_PREFIXES.some((prefix) => str.startsWith(prefix))) {
    str = `'${str}`;
  }

  // If contains delimiter, quote, or newline, escape double quotes and wrap in quotes
  if (str.includes(",") || str.includes("\t") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

/**
 * Adds or updates a search query in history.
 * - Trims whitespace; ignores empty inputs.
 * - Deduplicates: existing items move to index 0 with incremented count and updated timestamp.
 * - Bounds array to maxItems (FIFO capacity).
 */
export function addSearchHistory(
  history: SearchHistoryItem[],
  query: string,
  maxItems: number = DEFAULT_MAX_HISTORY
): SearchHistoryItem[] {
  const trimmed = query.trim();
  if (!trimmed) {
    return [...history];
  }

  const existingIndex = history.findIndex(
    (item) => item.query.toLowerCase() === trimmed.toLowerCase()
  );

  let newCount = 1;
  const filtered = history.filter((_, idx) => {
    if (idx === existingIndex) {
      newCount = history[idx].count + 1;
      return false;
    }
    return true;
  });

  const newItem: SearchHistoryItem = {
    query: trimmed,
    timestamp: Date.now(),
    count: newCount,
  };

  const updated = [newItem, ...filtered];
  return updated.slice(0, Math.max(1, maxItems));
}

/**
 * Removes an item from search history by query.
 */
export function removeSearchHistoryItem(
  history: SearchHistoryItem[],
  query: string
): SearchHistoryItem[] {
  const target = query.trim().toLowerCase();
  return history.filter((item) => item.query.toLowerCase() !== target);
}

/**
 * Generates a stable deterministic ID for a vocabulary entry.
 */
export function generateVocabularyId(expression: string, reading: string): string {
  return `${expression.trim()}__${reading.trim()}`.toLowerCase();
}

/**
 * Normalizes tags: removes empty values, trims, deduplicates case-insensitively.
 */
export function normalizeTags(tags: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const tag of tags) {
    const clean = tag.trim();
    if (clean && !seen.has(clean.toLowerCase())) {
      seen.add(clean.toLowerCase());
      result.push(clean);
    }
  }
  return result;
}

/**
 * Adds a vocabulary bookmark.
 * - Merges tags and updates notes/meanings if the word already exists.
 */
export function addVocabularyItem(
  list: VocabularyItem[],
  input: Omit<VocabularyItem, "id" | "createdAt" | "updatedAt">
): { list: VocabularyItem[]; item: VocabularyItem } {
  const expression = input.expression.trim();
  const reading = input.reading.trim();
  if (!expression) {
    throw new Error("Vocabulary expression cannot be empty");
  }

  const id = generateVocabularyId(expression, reading);
  const existingIndex = list.findIndex((item) => item.id === id);
  const now = Date.now();

  if (existingIndex >= 0) {
    const existing = list[existingIndex];
    const mergedTags = normalizeTags([...existing.tags, ...input.tags]);
    const mergedMeanings = Array.from(new Set([...existing.meanings, ...input.meanings]));
    const updatedItem: VocabularyItem = {
      ...existing,
      meanings: mergedMeanings,
      tags: mergedTags,
      notes: input.notes !== undefined ? input.notes : existing.notes,
      jlpt: input.jlpt || existing.jlpt,
      updatedAt: now,
    };

    const nextList = [...list];
    nextList[existingIndex] = updatedItem;
    return { list: nextList, item: updatedItem };
  }

  const newItem: VocabularyItem = {
    id,
    expression,
    reading,
    meanings: input.meanings,
    tags: normalizeTags(input.tags),
    notes: input.notes || "",
    jlpt: input.jlpt,
    createdAt: now,
    updatedAt: now,
  };

  return { list: [newItem, ...list], item: newItem };
}

/**
 * Updates an existing vocabulary bookmark.
 */
export function updateVocabularyItem(
  list: VocabularyItem[],
  id: string,
  updates: Partial<Pick<VocabularyItem, "notes" | "tags" | "meanings" | "jlpt">>
): VocabularyItem[] {
  return list.map((item) => {
    if (item.id !== id) return item;

    return {
      ...item,
      notes: updates.notes !== undefined ? updates.notes : item.notes,
      tags: updates.tags ? normalizeTags(updates.tags) : item.tags,
      meanings: updates.meanings || item.meanings,
      jlpt: updates.jlpt !== undefined ? updates.jlpt : item.jlpt,
      updatedAt: Date.now(),
    };
  });
}

/**
 * Deletes a vocabulary item by ID.
 */
export function removeVocabularyItem(list: VocabularyItem[], id: string): VocabularyItem[] {
  return list.filter((item) => item.id !== id);
}

/**
 * Filters vocabulary list by text query, tag, or JLPT level.
 */
export function filterVocabulary(
  list: VocabularyItem[],
  options: VocabularyFilterOptions
): VocabularyItem[] {
  return list.filter((item) => {
    if (options.tag) {
      const targetTag = options.tag.toLowerCase();
      const hasTag = item.tags.some((t) => t.toLowerCase() === targetTag);
      if (!hasTag) return false;
    }

    if (options.jlpt && item.jlpt?.toLowerCase() !== options.jlpt.toLowerCase()) {
      return false;
    }

    if (options.query) {
      const q = options.query.toLowerCase().trim();
      const matchExpression = item.expression.toLowerCase().includes(q);
      const matchReading = item.reading.toLowerCase().includes(q);
      const matchMeanings = item.meanings.some((m) => m.toLowerCase().includes(q));
      const matchNotes = item.notes?.toLowerCase().includes(q);
      if (!matchExpression && !matchReading && !matchMeanings && !matchNotes) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Exports vocabulary items to CSV format.
 * Includes RFC 4180 escaping and STRIDE formula injection sanitization.
 */
export function exportToCsv(items: VocabularyItem[]): string {
  const headers = ["expression", "reading", "meanings", "tags", "notes", "jlpt", "createdAt"];
  const rows = items.map((item) => [
    sanitizeCsvCell(item.expression),
    sanitizeCsvCell(item.reading),
    sanitizeCsvCell(item.meanings.join("; ")),
    sanitizeCsvCell(item.tags.join("; ")),
    sanitizeCsvCell(item.notes || ""),
    sanitizeCsvCell(item.jlpt || ""),
    sanitizeCsvCell(new Date(item.createdAt).toISOString()),
  ]);

  return [headers.join(","), ...rows.map((row) => row.join(","))].join("\r\n");
}

/**
 * Exports vocabulary items to Anki-compatible TSV format.
 * Format: Expression \t Reading \t Meanings \t Tags \t Notes
 */
export function exportToAnkiTsv(items: VocabularyItem[]): string {
  const headers = ["#expression", "reading", "meanings", "tags", "notes"];
  const rows = items.map((item) => [
    sanitizeCsvCell(item.expression),
    sanitizeCsvCell(item.reading),
    sanitizeCsvCell(item.meanings.join("; ")),
    sanitizeCsvCell(item.tags.join(" ")), // Anki uses space-separated tags
    sanitizeCsvCell(item.notes || ""),
  ]);

  return [headers.join("\t"), ...rows.map((row) => row.join("\t"))].join("\n");
}
