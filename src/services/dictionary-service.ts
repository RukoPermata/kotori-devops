import { openDB, IDBPDatabase } from "idb";
import { getBaseForms } from "@/lib/japanese/deinflector";

export interface DictDefinition {
  dictName: string;
  expression: string;
  reading: string;
  meanings: string[];
  tags?: string[];
  rules?: string;
  score?: number;
  jlpt?: string;
  deinflectionRules?: string[];
  // One representative example sentence (Japanese with inline "漢字[かんじ]" furigana markup, plus
  // its translation), extracted from the dictionary's own structured-content instead of stripped.
  example?: { japanese: string; translation: string };
  // Alternate spellings/forms for the same word (e.g. その日 / 其の日).
  forms?: string[];
  // Per-dictionary frequency rank (lower = more common), from term_meta_bank "freq" data (e.g. JPDB).
  frequency?: { dictName: string; rank: number; display: string }[];
  // NHK-style pitch accent drop position (mora index, 0 = heiban/flat).
  pitchPosition?: number;
}

export interface KanjiDetail {
  kanji: string;
  onyomi: string[];
  kunyomi: string[];
  meanings: string[];
  strokeCount?: number;
  grade?: number;
  jlpt?: string;
}

export interface LookupResult {
  query: string;
  reading: string;
  terms: DictDefinition[];
  kanjiList: KanjiDetail[];
  segmentedWords: {
    text: string;
    reading?: string;
    meanings: string[];
    dictName?: string;
  }[];
  // Position where `query` begins within the original (possibly padded-chunk) request string -
  // used to re-locate the resolved word in the DOM for the scanned-word highlight overlay.
  focusedStart?: number;
  // Length of the raw surface-form text that matched at focusedStart - can differ from
  // `terms[0].expression.length` when the match came from deinflection (e.g. surface form
  // "食べさせられて" vs dictionary headword "食べる"). Used for accurate highlight width.
  focusedLength?: number;
  // False when the server answered before its index finished building. Such a response looks
  // exactly like a genuine miss (`terms: []`), so it must never be cached.
  indexReady?: boolean;
}

export interface DictionaryStatus {
  isReady: boolean;
  isBuilding: boolean;
  totalTerms: number;
  totalKanji: number;
}

export interface CustomDictionaryMeta {
  name: string;
  filename: string;
  size: number;
  uploadedAt: number;
}

const DB_NAME = "kotoba-custom-dictionaries";
const DB_VERSION = 3;

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDictDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("dictionaries")) {
          db.createObjectStore("dictionaries", { keyPath: "name" });
        }
        if (!db.objectStoreNames.contains("offline-cache")) {
          db.createObjectStore("offline-cache", { keyPath: "queryKey" });
        }
        if (!db.objectStoreNames.contains("offline-terms")) {
          db.createObjectStore("offline-terms", { keyPath: "expression" });
        }
        if (!db.objectStoreNames.contains("offline-kanji")) {
          db.createObjectStore("offline-kanji", { keyPath: "kanji" });
        }
      },
    });
  }
  return dbPromise;
}

class DictionaryService {
  // Ultra-lightweight 50-item LRU Cache in Client Memory
  private cache = new Map<string, LookupResult>();
  // Secondary cache keyed by the resolved primary term's expression, so a repeat tap on the
  // same word - even via a raw chunk string that differs slightly by cursor offset - can still
  // hit cache if that exact expression string is looked up again (e.g. a drag-selection of the
  // bare word, or a re-lookup triggered from within the popup itself).
  private expressionCache = new Map<string, LookupResult>();

  clearMemoryCache() {
    this.cache.clear();
    this.expressionCache.clear();
  }

  /**
   * Search dictionary via ultra-fast lightweight Server API.
   * `pos` is the click/hover point's offset within `text`, when `text` is a padded chunk
   * (not an exact selection) - it tells the server to resolve just the single word under
   * the cursor instead of every word segmented out of the whole chunk.
   */
  async lookup(text: string, pos?: number): Promise<LookupResult> {
    const cleanText = text.trim().substring(0, 50); // Enforce max 50 characters limit for 60 FPS speed
    if (!cleanText) {
      return { query: "", reading: "", terms: [], kanjiList: [], segmentedWords: [] };
    }

    const cacheKey = pos !== undefined ? `${cleanText}::${pos}` : cleanText;

    // Check LRU Cache (0ms instant)
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }
    if (this.expressionCache.has(cleanText)) {
      return this.expressionCache.get(cleanText)!;
    }

    try {
      const url = pos !== undefined
        ? `/api/dictionary/lookup?q=${encodeURIComponent(cleanText)}&pos=${pos}`
        : `/api/dictionary/lookup?q=${encodeURIComponent(cleanText)}`;
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Dictionary lookup responded with status ${res.status}`);
      }
      const data: LookupResult = await res.json();
      // A result produced while the server index was still building is empty for every word, and
      // is indistinguishable from a real miss. Caching it would keep that word broken for the rest
      // of the session even after the index finishes, so return it without storing anything.
      if (data.indexReady === false) {
        return data;
      }

      // Store in LRU Cache
      if (this.cache.size >= 50) {
        const firstKey = this.cache.keys().next().value;
        if (firstKey) this.cache.delete(firstKey);
      }
      this.cache.set(cacheKey, data);

      const primaryExpression = data.terms[0]?.expression;
      if (primaryExpression && primaryExpression !== cleanText) {
        if (this.expressionCache.size >= 50) {
          const firstKey = this.expressionCache.keys().next().value;
          if (firstKey) this.expressionCache.delete(firstKey);
        }
        this.expressionCache.set(primaryExpression, data);
      }

      // Persist in client IndexedDB for offline access
      getDictDB()
        .then((db) => {
          db.put("offline-cache", { ...data, queryKey: cacheKey });
        })
        .catch(() => {});

      return data;
    } catch (err) {
      console.warn("Dictionary network lookup failed, checking offline cache:", err);
      try {
        const db = await getDictDB();
        const offlineRecord = await db.get("offline-cache", cacheKey);
        if (offlineRecord) {
          return offlineRecord as LookupResult;
        }

        // Offline terms lookup
        if (db.objectStoreNames.contains("offline-terms")) {
          const candidates = [cleanText, ...getBaseForms(cleanText).map((b) => b.word)];
          for (const cand of candidates) {
            const entry = await db.get("offline-terms", cand);
            if (entry && entry.terms && entry.terms.length > 0) {
              const matchedTerms: DictDefinition[] = entry.terms;
              const matchedKanji: KanjiDetail[] = [];
              const kanjiChars = Array.from(new Set(cleanText.match(/[\u4e00-\u9faf]/g) || []));
              if (db.objectStoreNames.contains("offline-kanji")) {
                for (const k of kanjiChars) {
                  const kObj = await db.get("offline-kanji", k);
                  if (kObj) matchedKanji.push(kObj);
                }
              }

              const result: LookupResult = {
                query: cleanText,
                reading: matchedTerms[0]?.reading || cleanText,
                terms: matchedTerms,
                kanjiList: matchedKanji,
                segmentedWords: [
                  {
                    text: cand,
                    reading: matchedTerms[0]?.reading,
                    meanings: matchedTerms[0]?.meanings || [],
                    dictName: matchedTerms[0]?.dictName || "Kamus Offline",
                  },
                ],
                focusedStart: 0,
                focusedLength: cleanText.length,
                indexReady: true,
              };

              await db.put("offline-cache", { ...result, queryKey: cacheKey }).catch(() => {});
              return result;
            }
          }
        }
      } catch {
        // IndexedDB offline read failed
      }

      const isActuallyOffline = typeof navigator !== "undefined" && navigator.onLine === false;
      return {
        query: cleanText,
        reading: cleanText,
        terms: [
          {
            dictName: isActuallyOffline ? "Offline" : "Error",
            expression: cleanText,
            reading: cleanText,
            meanings: [
              isActuallyOffline
                ? "Mode offline aktif. Kata ini belum tersimpan di memori perangkat Anda. Hubungkan kembali internet untuk mencari kata baru."
                : "Gagal menghubungi server kamus. Periksa status server atau coba beberapa saat lagi.",
            ],
          },
        ],
        kanjiList: [],
        segmentedWords: [],
      };
    }
  }

  async loadZipDictionary(file: Blob | File, filename?: string): Promise<void> {
    const db = await getDictDB();
    const name = filename || (file instanceof File ? file.name : "Kamus Custom.zip");
    const arrayBuffer = await file.arrayBuffer();
    const record = {
      name,
      filename: name,
      size: file.size,
      uploadedAt: Date.now(),
      data: arrayBuffer,
    };
    await db.put("dictionaries", record);
    this.cache.clear();
  }

  async getCustomDictionaries(): Promise<CustomDictionaryMeta[]> {
    try {
      const db = await getDictDB();
      const all = await db.getAll("dictionaries");
      return all.map((item) => ({
        name: item.name,
        filename: item.filename,
        size: item.size,
        uploadedAt: item.uploadedAt,
      }));
    } catch {
      return [];
    }
  }

  async deleteCustomDictionary(name: string): Promise<void> {
    try {
      const db = await getDictDB();
      await db.delete("dictionaries", name);
      this.cache.clear();
    } catch (err) {
      console.warn("Delete custom dictionary error:", err);
    }
  }
  async getOfflinePackStatus(): Promise<{ isDownloaded: boolean; termCount: number; kanjiCount: number; downloadedAt?: number }> {
    try {
      const db = await getDictDB();
      const meta = await db.get("offline-cache", "__OFFLINE_PACK_METADATA__");
      if (meta && meta.isDownloaded) {
        return {
          isDownloaded: true,
          termCount: meta.termCount || 0,
          kanjiCount: meta.kanjiCount || 0,
          downloadedAt: meta.downloadedAt,
        };
      }
      return { isDownloaded: false, termCount: 0, kanjiCount: 0 };
    } catch {
      return { isDownloaded: false, termCount: 0, kanjiCount: 0 };
    }
  }

  async downloadOfflinePack(
    onProgress?: (percent: number, step: string) => void
  ): Promise<{ success: boolean; error?: string }> {
    try {
      onProgress?.(15, "Mengunduh leksikon kamus...");
      const res = await fetch("/api/dictionary/pack?limit=15000");
      if (!res.ok) {
        throw new Error(`Server status ${res.status}`);
      }

      onProgress?.(45, "Memproses paket kamus...");
      const data = await res.json();
      const terms: [string, DictDefinition[]][] = data.terms || [];
      const kanji: [string, KanjiDetail][] = data.kanji || [];

      onProgress?.(70, "Menyimpan ke IndexedDB lokal...");
      const db = await getDictDB();
      const tx = db.transaction(["offline-terms", "offline-kanji", "offline-cache"], "readwrite");
      const termStore = tx.objectStore("offline-terms");
      const kanjiStore = tx.objectStore("offline-kanji");
      const cacheStore = tx.objectStore("offline-cache");

      await termStore.clear();
      await kanjiStore.clear();

      for (const [expr, termList] of terms) {
        termStore.put({ expression: expr, terms: termList });
      }

      for (const [, kObj] of kanji) {
        kanjiStore.put(kObj);
      }

      await cacheStore.put({
        queryKey: "__OFFLINE_PACK_METADATA__",
        isDownloaded: true,
        termCount: terms.length,
        kanjiCount: kanji.length,
        downloadedAt: Date.now(),
      });

      await tx.done;
      this.clearMemoryCache();
      onProgress?.(100, "Kamus offline siap digunakan!");
      return { success: true };
    } catch (err) {
      console.error("[DictionaryService] downloadOfflinePack error:", err);
      return { success: false, error: err instanceof Error ? err.message : "Gagal mengunduh" };
    }
  }

  async deleteOfflinePack(): Promise<void> {
    try {
      const db = await getDictDB();
      const tx = db.transaction(["offline-terms", "offline-kanji", "offline-cache"], "readwrite");
      await tx.objectStore("offline-terms").clear();
      await tx.objectStore("offline-kanji").clear();
      await tx.objectStore("offline-cache").delete("__OFFLINE_PACK_METADATA__");
      await tx.done;
      this.clearMemoryCache();
    } catch (err) {
      console.warn("Delete offline pack error:", err);
    }
  }

  // Returns null when the status could not be fetched, so callers can keep showing the last known
  // state instead of a guess. Reporting a made-up "ready" here used to mask real outages, and a
  // made-up "not ready" would disable the dictionary on a momentary network blip.
  async getStatus(): Promise<DictionaryStatus | null> {
    try {
      const res = await fetch("/api/dictionary/lookup?status=1");
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }

  hasLoadedDictionaries(): boolean {
    return true;
  }
}

export const dictionaryService = new DictionaryService();
