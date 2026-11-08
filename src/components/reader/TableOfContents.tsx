"use client";

import { useState, useEffect, useRef } from "react";
import { X, BookOpen, Check, Search } from "lucide-react";
import type { Chapter } from "@/types/book";

interface TableOfContentsProps {
  chapters: Chapter[];
  currentIndex: number;
  onSelect: (index: number) => void;
  onClose: () => void;
}

export default function TableOfContents({
  chapters,
  currentIndex,
  onSelect,
  onClose,
}: TableOfContentsProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [focusedIndex, setFocusedIndex] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const filteredChapters = chapters
    .map((chapter, index) => ({ chapter, originalIndex: index }))
    .filter(({ chapter, originalIndex }) => {
      if (searchQuery.trim() === "") return true;
      
      const isNumber = /^\d+$/.test(searchQuery.trim());
      if (isNumber) {
        return (originalIndex + 1).toString().startsWith(searchQuery.trim());
      }
      
      return chapter.title.toLowerCase().includes(searchQuery.toLowerCase());
    });


  useEffect(() => {
    setFocusedIndex(0);
  }, [searchQuery]);

  useEffect(() => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setFocusedIndex((prev) => (prev < filteredChapters.length - 1 ? prev + 1 : prev));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setFocusedIndex((prev) => (prev > 0 ? prev - 1 : prev));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (filteredChapters.length > 0) {
          onSelect(filteredChapters[focusedIndex].originalIndex);
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [filteredChapters, focusedIndex, onSelect, onClose]);

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 50,
          backgroundColor: "var(--kb-overlay)",
          backdropFilter: "blur(2px)",
        }}
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div
        style={{
          position: "fixed",
          left: 0,
          top: 0,
          bottom: 0,
          zIndex: 50,
          width: "380px",
          maxWidth: "85vw",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "var(--kb-surface)",
          borderRight: "1px solid var(--kb-border)",
          boxShadow: "8px 0 36px rgba(0,0,0,0.2)",
          color: "var(--kb-text)",
          overflowY: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            position: "sticky",
            top: 0,
            zIndex: 10,
            display: "flex",
            height: "60px",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 24px",
            backgroundColor: "var(--kb-surface)",
            borderBottom: "1px solid var(--kb-border)",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "10px",
                backgroundColor: "var(--kb-primary-light)",
                color: "var(--kb-primary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <BookOpen style={{ width: "16px", height: "16px" }} />
            </span>
            <h2 style={{ fontSize: "16px", fontWeight: 800, letterSpacing: "-0.01em" }}>
              Table of Contents
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "10px",
              border: "none",
              backgroundColor: "transparent",
              color: "var(--kb-text-muted)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--kb-surface-hover)")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
          >
            <X style={{ width: "18px", height: "18px" }} />
          </button>
        </div>

        {/* Search Bar (Fitur Pencarian & Jump) */}
        <div style={{ padding: "12px 24px", backgroundColor: "var(--kb-bg-secondary)", borderBottom: "1px solid var(--kb-border-subtle)", flexShrink: 0 }}>
          <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
            <Search style={{ position: "absolute", left: "12px", width: "16px", height: "16px", color: "var(--kb-text-muted)" }} />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search title or jump to number (e.g. 15)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 12px 10px 36px",
                borderRadius: "8px",
                border: "1px solid var(--kb-border)",
                backgroundColor: "var(--kb-surface)",
                color: "var(--kb-text)",
                fontSize: "13px",
                outline: "none",
              }}
            />
          </div>
        </div>

        {/* Subheader */}
        <div
          style={{
            padding: "8px 24px",
            fontSize: "11px",
            fontWeight: 800,
            letterSpacing: "0.05em",
            textTransform: "uppercase",
            backgroundColor: "var(--kb-bg-secondary)",
            color: "var(--kb-text-muted)",
            borderBottom: "1px solid var(--kb-border-subtle)",
            flexShrink: 0,
          }}
        >
          {filteredChapters.length} {filteredChapters.length === 1 ? "Result" : "Results"}
        </div>

        {/* Chapter List */}
        <div style={{ padding: "12px", flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "4px" }}>
          {filteredChapters.map(({ chapter, originalIndex }, arrayIndex) => {
            const isCurrentChapter = originalIndex === currentIndex;
            const isFocused = arrayIndex === focusedIndex;

            return (
              <button
                key={chapter.id}
                onClick={() => onSelect(originalIndex)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  borderRadius: "12px",
                  padding: "12px 16px",
                  textAlign: "left",
                  fontSize: "14px",
                  fontWeight: isCurrentChapter ? 700 : 500,
                  // Ubah warna background jika sedang di-hover oleh keyboard
                  backgroundColor: isCurrentChapter ? "var(--kb-primary-light)" : isFocused ? "var(--kb-surface-hover)" : "transparent",
                  color: isCurrentChapter ? "var(--kb-primary)" : "var(--kb-text)",
                  // Tambahkan border khusus jika di-highlight keyboard
                  border: isFocused ? "1px solid var(--kb-primary-light)" : isCurrentChapter ? "1px solid var(--kb-primary)" : "1px solid transparent",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  width: "100%",
                  boxSizing: "border-box",
                }}
                onMouseEnter={() => setFocusedIndex(arrayIndex)}
              >
                <span
                  style={{
                    width: "28px",
                    height: "28px",
                    borderRadius: "8px",
                    flexShrink: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "12px",
                    fontWeight: 700,
                    fontFamily: "monospace",
                    backgroundColor: isCurrentChapter ? "var(--kb-primary)" : "var(--kb-bg-secondary)",
                    color: isCurrentChapter ? "white" : "var(--kb-text-muted)",
                  }}
                >
                  {originalIndex + 1}
                </span>

                <span
                  style={{
                    flex: 1,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {chapter.title}
                </span>

                {isCurrentChapter && (
                  <Check
                    style={{
                      width: "16px",
                      height: "16px",
                      flexShrink: 0,
                      color: "var(--kb-primary)",
                      strokeWidth: 2.5,
                      marginLeft: "8px",
                    }}
                  />
                )}
              </button>
            );
          })}
          
          {filteredChapters.length === 0 && (
            <div style={{ padding: "24px", textAlign: "center", color: "var(--kb-text-muted)", fontSize: "13px" }}>
              Chapter tidak ditemukan.
            </div>
          )}
        </div>
      </div>
    </>
  );
}