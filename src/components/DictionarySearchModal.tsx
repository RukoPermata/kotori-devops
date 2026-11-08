"use client";

import { useEffect, useRef, useState } from "react";
import { Search, X, History, Bookmark, Download, Trash2 } from "lucide-react";
import { useDictionaryStore } from "@/stores/dictionary-store";
import { dictionaryService, LookupResult } from "@/services/dictionary-service";
import { DictionaryResults } from "@/components/DictionaryResults";

interface DictionarySearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  language?: "ID" | "EN";
}

const DEBOUNCE_MS = 300;

/**
 * Standalone "type a word, get a definition" search - the same dictionary index the reader's
 * tap-to-lookup popup uses (see DictionaryResults), but reachable without a book open. Requested
 * by a user who kept alt-tabbing to Yomitan just to check a word they weren't currently reading.
 */
export function DictionarySearchModal({ isOpen, onClose, language = "ID" }: DictionarySearchModalProps) {
  const [query, setQuery] = useState("");
  const [lookupData, setLookupData] = useState<LookupResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTheme, setCurrentTheme] = useState<"dark" | "light" | "sepia">("dark");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchHistory = useDictionaryStore((s) => s.searchHistory);
  const addHistory = useDictionaryStore((s) => s.addHistory);
  const removeHistory = useDictionaryStore((s) => s.removeHistory);
  const clearHistory = useDictionaryStore((s) => s.clearHistory);
  const vocabularyList = useDictionaryStore((s) => s.vocabularyList);
  const removeBookmark = useDictionaryStore((s) => s.removeBookmark);
  const exportCsv = useDictionaryStore((s) => s.exportCsv);
  const exportAnki = useDictionaryStore((s) => s.exportAnki);

  const handleDownloadFile = (content: string, filename: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportCsv = () => {
    const csv = exportCsv();
    handleDownloadFile(csv, `kotori-vocabulary-${Date.now()}.csv`, "text/csv;charset=utf-8;");
  };

  const handleExportAnki = () => {
    const anki = exportAnki();
    handleDownloadFile(anki, `kotori-anki-${Date.now()}.txt`, "text/tab-separated-values;charset=utf-8;");
  };


  useEffect(() => {
    if (typeof document !== "undefined") {
      const activeTheme = document.documentElement.getAttribute("data-theme") as "dark" | "light" | "sepia" | null;
      if (activeTheme === "light" || activeTheme === "dark" || activeTheme === "sepia") {
        setCurrentTheme(activeTheme);
        return;
      }
      const saved = localStorage.getItem("kotoba-theme") as "dark" | "light" | "sepia" | null;
      if (saved) setCurrentTheme(saved);
    }
  }, [isOpen]);
  // Reset on every open so a stale query/result from the last session doesn't flash before typing.
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setLookupData(null);
      setIsLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = query.trim();
    if (!trimmed) {
      setLookupData(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    debounceRef.current = setTimeout(() => {
      dictionaryService.lookup(trimmed).then((res) => {
        setLookupData(res);
        setIsLoading(false);
        if (res.terms && res.terms.length > 0) {
          addHistory(trimmed);
        }
      });
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, addHistory]);

  return (
    <div
      className={`kb-feedback-overlay ${isOpen ? "kb-modal-active" : ""}`}
      onClick={onClose}
    >
      <div
        className="kb-feedback-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: "480px" }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          aria-label={language === "ID" ? "Tutup" : "Close"}
          style={{
            position: "absolute",
            top: "18px",
            right: "18px",
            width: "32px",
            height: "32px",
            borderRadius: "10px",
            border: "none",
            backgroundColor: "var(--kb-bg-secondary)",
            color: "var(--kb-text-secondary)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 0.2s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "var(--kb-border)";
            e.currentTarget.style.color = "var(--kb-text)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "var(--kb-bg-secondary)";
            e.currentTarget.style.color = "var(--kb-text-secondary)";
          }}
        >
          <X style={{ width: "16px", height: "16px" }} />
        </button>

        {/* Title */}
        <h2 style={{ fontSize: "22px", fontWeight: 800, marginBottom: "8px", color: "var(--kb-text)", paddingRight: "40px", letterSpacing: "-0.02em" }}>
          {language === "ID" ? "Cari Kamus" : "Dictionary Search"}
        </h2>
        <p style={{ fontSize: "13px", color: "var(--kb-text-secondary)", lineHeight: 1.6, marginBottom: "20px" }}>
          {language === "ID"
            ? "Cari arti kata bahasa Jepang langsung, tanpa perlu buka buku."
            : "Look up a Japanese word directly, no book required."}
        </p>

        {/* Search input */}
        <div style={{ position: "relative", marginBottom: "16px" }}>
          <Search
            style={{
              position: "absolute",
              left: "14px",
              top: "50%",
              transform: "translateY(-50%)",
              width: "16px",
              height: "16px",
              color: "var(--kb-text-muted)",
              pointerEvents: "none",
            }}
          />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={language === "ID" ? "Ketik kata bahasa Jepang..." : "Type a Japanese word..."}
            className="kb-premium-input"
            style={{
              width: "100%",
              padding: "12px 16px 12px 40px",
              fontSize: "14px",
              borderRadius: "12px",
              backgroundColor: "var(--kb-bg)",
              color: "var(--kb-text)",
              outline: "none",
              fontFamily: "inherit",
            }}
          />
        </div>

        {/* Results area - adapts seamlessly to current theme */}
        {query.trim() ? (
          <div
            style={{
              minHeight: "280px",
              maxHeight: "50vh",
              borderRadius: "16px",
              backgroundColor:
                currentTheme === "light"
                  ? "var(--kb-bg-secondary)"
                  : currentTheme === "sepia"
                  ? "var(--kb-bg-secondary)"
                  : "rgba(15, 23, 42, 0.94)",
              border: "1px solid var(--kb-border)",
              color: "var(--kb-text)",
              padding: "16px",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
              overflow: "hidden",
            }}
          >
            <DictionaryResults
              selectedText={query.trim()}
              lookupData={lookupData}
              isLoading={isLoading}
              theme={currentTheme}
              onClose={onClose}
            />
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px", maxHeight: "55vh", overflowY: "auto" }}>
            {/* Search History Section */}
            {searchHistory.length > 0 && (
              <div style={{ backgroundColor: "var(--kb-bg-secondary)", borderRadius: "14px", padding: "12px 14px", border: "1px solid var(--kb-border)" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", fontWeight: 700, color: "var(--kb-text-secondary)" }}>
                    <History style={{ width: "13px", height: "13px" }} />
                    {language === "ID" ? "Riwayat Pencarian" : "Recent Searches"}
                  </div>
                  <button
                    onClick={clearHistory}
                    title={language === "ID" ? "Hapus riwayat" : "Clear history"}
                    style={{ background: "none", border: "none", color: "var(--kb-text-muted)", fontSize: "11px", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
                  >
                    <Trash2 style={{ width: "11px", height: "11px" }} />
                    {language === "ID" ? "Bersihkan" : "Clear"}
                  </button>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                  {searchHistory.slice(0, 10).map((item) => (
                    <div
                      key={item.query}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        backgroundColor: "var(--kb-bg)",
                        padding: "4px 8px 4px 10px",
                        borderRadius: "8px",
                        fontSize: "12px",
                        border: "1px solid var(--kb-border)",
                        cursor: "pointer",
                      }}
                      onClick={() => setQuery(item.query)}
                    >
                      <span style={{ color: "var(--kb-text)" }}>{item.query}</span>
                      {item.count > 1 && (
                        <span style={{ fontSize: "10px", color: "var(--kb-text-muted)", backgroundColor: "var(--kb-bg-secondary)", padding: "1px 4px", borderRadius: "4px" }}>
                          {item.count}
                        </span>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeHistory(item.query);
                        }}
                        style={{ background: "none", border: "none", padding: "0 2px", color: "var(--kb-text-muted)", cursor: "pointer", display: "flex", alignItems: "center" }}
                      >
                        <X style={{ width: "10px", height: "10px" }} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Saved Vocabulary Section */}
            <div style={{ backgroundColor: "var(--kb-bg-secondary)", borderRadius: "14px", padding: "12px 14px", border: "1px solid var(--kb-border)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", fontWeight: 700, color: "var(--kb-text-secondary)" }}>
                  <Bookmark style={{ width: "13px", height: "13px" }} />
                  {language === "ID" ? "Kosakata Tersimpan" : "Saved Vocabulary"} ({vocabularyList.length})
                </div>
                {vocabularyList.length > 0 && (
                  <div style={{ display: "flex", gap: "6px" }}>
                    <button
                      onClick={handleExportCsv}
                      title="Export CSV (RFC 4180)"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                        padding: "3px 8px",
                        fontSize: "11px",
                        borderRadius: "6px",
                        backgroundColor: "var(--kb-bg)",
                        border: "1px solid var(--kb-border)",
                        color: "var(--kb-text)",
                        cursor: "pointer",
                      }}
                    >
                      <Download style={{ width: "11px", height: "11px" }} />
                      CSV
                    </button>
                    <button
                      onClick={handleExportAnki}
                      title="Export Anki TSV"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                        padding: "3px 8px",
                        fontSize: "11px",
                        borderRadius: "6px",
                        backgroundColor: "var(--kb-bg)",
                        border: "1px solid var(--kb-border)",
                        color: "var(--kb-text)",
                        cursor: "pointer",
                      }}
                    >
                      <Download style={{ width: "11px", height: "11px" }} />
                      Anki
                    </button>
                  </div>
                )}
              </div>

              {vocabularyList.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "6px", maxHeight: "200px", overflowY: "auto" }}>
                  {vocabularyList.map((item) => (
                    <div
                      key={item.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "6px 8px",
                        borderRadius: "8px",
                        backgroundColor: "var(--kb-bg)",
                        border: "1px solid var(--kb-border)",
                        fontSize: "12px",
                        cursor: "pointer",
                      }}
                      onClick={() => setQuery(item.expression)}
                    >
                      <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
                        <span style={{ fontWeight: 700, color: "var(--kb-text)" }}>{item.expression}</span>
                        <span style={{ fontSize: "11px", color: "var(--kb-text-secondary)" }}>{item.reading}</span>
                        {item.jlpt && (
                          <span style={{ fontSize: "10px", padding: "1px 4px", borderRadius: "4px", backgroundColor: "rgba(59, 130, 246, 0.15)", color: "#3b82f6" }}>
                            {item.jlpt}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeBookmark(item.id);
                        }}
                        style={{ background: "none", border: "none", color: "var(--kb-text-muted)", cursor: "pointer", display: "flex", alignItems: "center" }}
                      >
                        <Trash2 style={{ width: "12px", height: "12px" }} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: "center", padding: "16px 0", color: "var(--kb-text-muted)", fontSize: "12px" }}>
                  {language === "ID"
                    ? "Belum ada kosakata yang disimpan. Klik ikon bookmark pada hasil kamus untuk menyimpan."
                    : "No saved vocabulary yet. Click the bookmark icon on lookup results to save words."}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
