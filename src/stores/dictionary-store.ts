import { create } from "zustand";
import type { DictionaryStatus } from "@/services/dictionary-service";
import {
  type SearchHistoryItem,
  type VocabularyItem,
  addSearchHistory,
  removeSearchHistoryItem,
  addVocabularyItem,
  removeVocabularyItem,
  updateVocabularyItem,
  exportToCsv,
  exportToAnkiTsv,
} from "@/services/vocabulary-service";

const STORAGE_KEY_HISTORY = "kotori_search_history_v1";
const STORAGE_KEY_VOCAB = "kotori_vocabulary_bookmarks_v1";

function loadInitialHistory(): SearchHistoryItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_HISTORY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function loadInitialVocab(): VocabularyItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_VOCAB);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function persistHistory(history: SearchHistoryItem[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(history));
  } catch {
    // Quota exceeded or private browsing
  }
}

function persistVocab(vocab: VocabularyItem[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY_VOCAB, JSON.stringify(vocab));
  } catch {
    // Quota exceeded or private browsing
  }
}

interface DictionaryState {
  // null until the first successful status fetch - readiness is unknown, not "not ready".
  status: DictionaryStatus | null;
  setStatus: (status: DictionaryStatus) => void;

  // Search history
  searchHistory: SearchHistoryItem[];
  addHistory: (query: string) => void;
  removeHistory: (query: string) => void;
  clearHistory: () => void;

  // Vocabulary bookmarks
  vocabularyList: VocabularyItem[];
  addBookmark: (item: Omit<VocabularyItem, "id" | "createdAt" | "updatedAt">) => void;
  removeBookmark: (id: string) => void;
  updateBookmark: (id: string, updates: Partial<Pick<VocabularyItem, "notes" | "tags" | "meanings" | "jlpt">>) => void;
  exportCsv: () => string;
  exportAnki: () => string;
}

// Dictionary readiness lives here rather than inside a component because the only thing that used
// to track it was the reader's settings drawer, which is unmounted whenever it is closed - taking
// its poller and its state with it. Keeping it in a store lets the always-mounted prewarmer own the
// polling while any component (reader notice, settings panel) reads the same value.
export const useDictionaryStore = create<DictionaryState>((set, get) => ({
  status: null,
  setStatus: (status) => set({ status }),

  searchHistory: loadInitialHistory(),
  addHistory: (query) => {
    set((state) => {
      const nextHistory = addSearchHistory(state.searchHistory, query);
      persistHistory(nextHistory);
      return { searchHistory: nextHistory };
    });
  },
  removeHistory: (query) => {
    set((state) => {
      const nextHistory = removeSearchHistoryItem(state.searchHistory, query);
      persistHistory(nextHistory);
      return { searchHistory: nextHistory };
    });
  },
  clearHistory: () => {
    persistHistory([]);
    set({ searchHistory: [] });
  },

  vocabularyList: loadInitialVocab(),
  addBookmark: (item) => {
    set((state) => {
      const { list: nextList } = addVocabularyItem(state.vocabularyList, item);
      persistVocab(nextList);
      return { vocabularyList: nextList };
    });
  },
  removeBookmark: (id) => {
    set((state) => {
      const nextList = removeVocabularyItem(state.vocabularyList, id);
      persistVocab(nextList);
      return { vocabularyList: nextList };
    });
  },
  updateBookmark: (id, updates) => {
    set((state) => {
      const nextList = updateVocabularyItem(state.vocabularyList, id, updates);
      persistVocab(nextList);
      return { vocabularyList: nextList };
    });
  },
  exportCsv: () => exportToCsv(get().vocabularyList),
  exportAnki: () => exportToAnkiTsv(get().vocabularyList),
}));
