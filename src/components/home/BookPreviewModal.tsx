"use client";

import React from "react";
import { BookOpen, User, X } from "lucide-react";
import type { BookMeta, Chapter, ReadingProgress } from "@/types/book";

export interface BookPreviewModalProps {
  previewBook: BookMeta | null;
  previewPhase: "none" | "idle" | "tucked" | "tucking" | "centering" | "opening" | "flipping" | "zooming";
  previewChapter: Chapter | null;
  previewChapters: Chapter[];
  progress: ReadingProgress | undefined;
  language: "ID" | "EN";
  isLandscapeImg: boolean;
  onClose: () => void;
  onRead: (book: BookMeta) => void;
  onImageLoad: (e: React.SyntheticEvent<HTMLImageElement>) => void;
}

export function BookPreviewModal({
  previewBook,
  previewPhase,
  previewChapter,
  previewChapters,
  progress,
  language,
  isLandscapeImg,
  onClose,
  onRead,
  onImageLoad,
}: BookPreviewModalProps) {
  if (!previewBook || previewPhase === "none") return null;

  const progressPercent = progress
    ? Math.round(
      ((progress.chapterIndex + progress.scrollPosition) /
        Math.max(previewBook.totalChapters, 1)) *
      100
    )
    : 0;

  const hasProgress = progressPercent > 0;
  const lastReadChapter = progress
    ? `${language === "ID" ? "Bab" : "Chapter"} ${progress.chapterIndex + 1}`
    : null;

  const numFlips = progress ? Math.min(progress.chapterIndex, 10) : 0;

  // Dynamic book thickness scaled by total chapters (min 4px for short books, max 14px for thick books)
  const totalChapters = previewBook.totalChapters || 15;
  const maxThickness = Math.min(Math.max(Math.round(totalChapters * 0.35), 4), 14);

  const currentChapterIndex = progress ? progress.chapterIndex : 0;
  const readRatio = totalChapters > 0 ? Math.min(currentChapterIndex / totalChapters, 1) : 0;

  const isOpen = previewPhase === "opening" || previewPhase === "flipping" || previewPhase === "zooming";

  // Calculate left & right stack depth dynamically
  const leftStackDepth = isOpen ? Math.round(maxThickness * readRatio) : 0;
  const rightStackDepth = isOpen ? Math.max(maxThickness - leftStackDepth, 1) : maxThickness;

  // Multi-layered paper stack shadow generator (horizontal only to avoid top/bottom corner protrusions)
  const getPaperStackShadow = (depth: number, side: "right" | "left") => {
    if (depth <= 0) return "none";
    const layers: string[] = [];
    const sign = side === "right" ? 1 : -1;
    for (let d = 1; d <= depth; d++) {
      const color = d % 2 === 0 ? "#cbd5e1" : "#f8fafc";
      layers.push(`${d * sign}px 0px 0px ${color}`);
    }
    layers.push(`${(depth + 3) * sign}px 2px 12px rgba(0, 0, 0, 0.22)`);
    return layers.join(", ");
  };

  const getChapterMeta = (ch: Chapter | undefined, indexFallback: number) => {
    if (!ch) {
      return {
        title: `${language === "ID" ? "Bab" : "Chapter"} ${indexFallback + 1}`,
        heading: null as string | null,
        image: null as string | null,
        excerpt: null as string | null,
      };
    }

    const defaultTitle = `${language === "ID" ? "Bab" : "Chapter"} ${(ch.index ?? indexFallback) + 1}`;

    let title = ch.title && !/^Chapter \d+$/i.test(ch.title) && !/^Bab \d+$/i.test(ch.title)
      ? ch.title.trim()
      : defaultTitle;

    const rawText = ch.htmlContent
      ? ch.htmlContent
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
      : "";

    let heading: string | null = null;
    let bodyText = rawText;

    // Search for dash subheadings, Japanese chapter, or special headers
    const dashMatch = rawText.match(/([―—–-]{1,4}[^-―—–\n]{1,40}[-―—–]{1,4})/);
    const jpMatch = rawText.match(/(第\s*[\d０-９一二三四五六七八九十百千]+\s*[話章節幕][^\n<]{0,60})/);
    const specialMatch = rawText.match(/(プロローグ|エピローグ|序章|終章|転章|幕間|あとがき|【[^】]+】)/);

    const matchedHeader = dashMatch?.[1] || jpMatch?.[1] || specialMatch?.[1];

    if (matchedHeader) {
      heading = matchedHeader.trim();
      const matchIdx = rawText.indexOf(matchedHeader);
      if (matchIdx !== -1) {
        bodyText = rawText.slice(matchIdx + matchedHeader.length).trim();
      }
    }

    const excerpt = bodyText ? (bodyText.length > 180 ? bodyText.slice(0, 180) + "..." : bodyText) : null;

    let imgMatch = ch.htmlContent?.match(/<img[^>]+(?:src|data-src)=["']([^"']+)["']/i);
    if (!imgMatch) {
      imgMatch = ch.htmlContent?.match(/<image[^>]+(?:xlink:href|href)=["']([^"']+)["']/i);
    }
    if (!imgMatch && ch.htmlContent) {
      try {
        const parserDoc = new DOMParser().parseFromString(ch.htmlContent, "text/html");
        const imgEl = parserDoc.querySelector("img[src], image[xlink\\:href], image[href], svg image");
        if (imgEl) {
          const src = imgEl.getAttribute("src") || imgEl.getAttribute("xlink:href") || imgEl.getAttribute("href");
          if (src) {
            imgMatch = [imgEl.outerHTML, src];
          }
        }
      } catch (e) { }
    }

    const image = imgMatch ? imgMatch[1] : null;

    return { title, heading, image, excerpt };
  };

  const targetChapterIndex = progress ? progress.chapterIndex : 0;
  const currentChapterMeta = getChapterMeta(previewChapter || previewChapters[targetChapterIndex], targetChapterIndex);
  const chapterTitle = currentChapterMeta.title;
  const chapterHeading = currentChapterMeta.heading;
  const chapterImgSrc = currentChapterMeta.image;
  const textPreview = currentChapterMeta.excerpt;

  const isActive = previewPhase !== "tucked" && previewPhase !== "zooming";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 300,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        maxWidth: "100vw",
        backgroundColor: isActive ? "rgba(15, 23, 42, 0.75)" : "rgba(15, 23, 42, 0)",
        backdropFilter: isActive ? "blur(12px)" : "blur(0px)",
        WebkitBackdropFilter: isActive ? "blur(12px)" : "blur(0px)",
        transition: "background-color 0.5s ease, backdrop-filter 0.5s ease, -webkit-backdrop-filter 0.5s ease",
      }}
      onClick={onClose}
    >
      {/* White Zoom Overlay */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          backgroundColor: "#ffffff",
          opacity: previewPhase === "zooming" ? 1 : 0,
          pointerEvents: "none",
          transition: "opacity 0.6s ease-in-out",
          zIndex: 320,
        }}
      />

      {/* Modal Container */}
      <div
        className={`kb-preview-container kb-preview-phase-${previewPhase}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Paper B (Preview Page) */}
        <div className="kb-preview-paper-b" style={{ padding: "18px 20px" }}>
          <div>
            <h4
              style={{
                fontSize: "15px",
                fontWeight: 800,
                color: "var(--kb-text)",
                lineHeight: 1.4,
                marginBottom: "4px",
                letterSpacing: "-0.01em",
              }}
            >
              {previewBook.title}
            </h4>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "12px",
                color: "var(--kb-text-secondary)",
                marginBottom: "10px",
              }}
            >
              <User style={{ width: "13px", height: "13px", opacity: 0.7 }} />
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {previewBook.author || (language === "ID" ? "Penulis Tidak Diketahui" : "Unknown Author")}
              </span>
            </div>


            {/* Chapter Preview Meta Box */}
            <div
              className="kb-preview-status-box"
              style={{
                padding: "14px 16px",
                borderRadius: "14px",
                backgroundColor: "var(--kb-bg-secondary)",
                border: "1px solid var(--kb-border-subtle)",
                marginBottom: "14px",
                minHeight: "140px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
                  <p style={{ fontSize: "11.5px", fontWeight: 800, color: "var(--kb-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "160px" }}>
                    {chapterTitle}
                  </p>
                  <span style={{ fontSize: "10px", fontWeight: 700, padding: "2px 8px", borderRadius: "6px", backgroundColor: "rgba(99,102,241,0.12)", color: "var(--kb-primary)", flexShrink: 0 }}>
                    {hasProgress ? `${progressPercent}%` : (language === "ID" ? "Baru" : "New")}
                  </span>
                </div>

                {chapterImgSrc ? (
                  isLandscapeImg ? (
                    /* Horizontal Landscape Image Layout (Maximized Clean Image) */
                    <div style={{ width: "100%", display: "flex", justifyContent: "center", alignItems: "center", paddingTop: "2px" }}>
                      <img
                        src={chapterImgSrc}
                        alt={chapterTitle}
                        onLoad={onImageLoad}
                        style={{
                          width: "100%",
                          maxHeight: "135px",
                          objectFit: "contain",
                          borderRadius: "8px",
                          border: "1px solid var(--kb-border-subtle)",
                        }}
                      />
                    </div>
                  ) : (
                    /* Vertical Portrait Image Layout (Side-by-Side) */
                    <div style={{ display: "flex", flexDirection: "row", gap: "12px", alignItems: "flex-start", width: "100%" }}>
                      <img
                        src={chapterImgSrc}
                        alt={chapterTitle}
                        onLoad={onImageLoad}
                        style={{ height: "135px", maxWidth: "85px", width: "auto", borderRadius: "6px", objectFit: "contain", flexShrink: 0 }}
                      />
                      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
                        {textPreview && (
                          <p className="kb-preview-excerpt-text" style={{ fontSize: "11px", color: "var(--kb-text-secondary)", lineHeight: 1.5, textAlign: "justify", display: "-webkit-box", WebkitLineClamp: 7, WebkitBoxOrient: "vertical", overflow: "hidden", fontFamily: "serif" }}>
                            {textPreview}
                          </p>
                        )}
                      </div>
                    </div>
                  )
                ) : (
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    {textPreview && (
                      <p className="kb-preview-excerpt-text" style={{ fontSize: "11px", color: "var(--kb-text-secondary)", lineHeight: 1.5, textAlign: "justify", display: "-webkit-box", WebkitLineClamp: 7, WebkitBoxOrient: "vertical", overflow: "hidden", fontFamily: "serif" }}>
                        {textPreview}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={() => onRead(previewBook)}
            style={{
              width: "100%",
              borderRadius: "14px",
              padding: "11px 16px",
              backgroundColor: "var(--kb-primary)",
              color: "white",
              fontSize: "13px",
              fontWeight: 700,
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              boxShadow: "0 4px 12px rgba(99,102,241,0.25)",
              transition: "transform 0.15s ease, opacity 0.15s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-1px)")}
            onMouseLeave={(e) => (e.currentTarget.style.transform = "none")}
          >
            <span>{hasProgress ? (language === "ID" ? "Lanjutkan Membaca" : "Continue Reading") : (language === "ID" ? "Mulai Membaca" : "Start Reading")}</span>
          </button>
        </div>

        {/* Book A */}
        <div className="kb-preview-book-a">
          {/* 3D Book Spine Wall */}
          <div
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              left: `-${maxThickness}px`,
              width: `${maxThickness}px`,
              background: "linear-gradient(to right, #0f172a 0%, #334155 45%, #1e293b 100%)",
              transformOrigin: "right center",
              transform: "rotateY(-90deg)",
              borderRadius: "3px 0 0 3px",
              boxShadow: "inset -2px 0 6px rgba(0,0,0,0.4)",
              zIndex: 4,
            }}
          />

          {/* Spine shadow overlay */}
          <div
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              left: 0,
              width: "10px",
              background: "linear-gradient(to right, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0) 100%)",
              zIndex: 4,
              pointerEvents: "none",
              borderRadius: "4px 0 0 4px",
            }}
          />

          {/* Right Page */}
          <div
            style={{
              position: "absolute",
              top: "3px",
              bottom: "3px",
              left: 0,
              right: `${rightStackDepth + 2}px`,
              backgroundColor: "#ffffff",
              borderRadius: "0 8px 8px 0",
              border: "1px solid #e2e8f0",
              borderLeft: "none",
              boxShadow: getPaperStackShadow(rightStackDepth, "right"),
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "16px 14px",
              color: "#0f172a",
              transform: isOpen ? "rotateY(2deg)" : "rotateY(0deg)",
              transformOrigin: "left center",
              backfaceVisibility: "hidden",
              zIndex: 1,
              overflow: "hidden",
              transition: "transform 0.6s cubic-bezier(0.25, 1, 0.5, 1), box-shadow 0.6s cubic-bezier(0.25, 1, 0.5, 1), right 0.6s ease",
            }}
          >
            {/* Center Spine Gutter Shadow */}
            <div
              style={{
                position: "absolute",
                top: 0,
                bottom: 0,
                left: 0,
                width: "28px",
                background: "linear-gradient(to right, rgba(0,0,0,0.22) 0%, rgba(0,0,0,0.06) 40%, transparent 100%)",
                pointerEvents: "none",
              }}
            />

            {/* Inner Page Content */}
            <div
              style={{
                width: "100%",
                height: "100%",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
                userSelect: "none",
              }}
            >
              <div style={{ width: "100%", textAlign: "center" }}>
                <div style={{ width: "24px", height: "3px", backgroundColor: "var(--kb-primary)", margin: "0 auto 6px auto" }} />
                <p style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--kb-primary)", marginBottom: "4px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {chapterTitle}
                </p>
              </div>

              {chapterHeading && (
                <div
                  style={{
                    fontSize: "11px",
                    fontWeight: 800,
                    letterSpacing: "0.06em",
                    color: "#64748b",
                    textAlign: "center",
                    paddingBottom: "8px",
                    borderBottom: "1px dashed #e2e8f0",
                    marginBottom: "10px",
                    textTransform: "uppercase",
                  }}
                >
                  {chapterHeading}
                </div>
              )}

              {chapterImgSrc ? (
                <div
                  style={{
                    flex: 1,
                    minHeight: 0,
                    width: "100%",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "hidden",
                    borderRadius: "6px",
                  }}
                >
                  <div
                    style={{
                      width: "100%",
                      height: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: "#f8fafc",
                      borderRadius: "6px",
                      overflow: "hidden",
                    }}
                  >
                    <img
                      src={chapterImgSrc}
                      alt={chapterTitle}
                      onLoad={onImageLoad}
                      style={{
                        width: isLandscapeImg ? "100%" : "auto",
                        height: isLandscapeImg ? "auto" : "100%",
                        maxWidth: "100%",
                        maxHeight: "100%",
                        objectFit: "contain",
                        display: "block",
                      }}
                    />
                  </div>
                </div>
              ) : textPreview ? (
                <div
                  style={{
                    flex: 1,
                    minHeight: 0,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "flex-start",
                    padding: "6px 2px",
                  }}
                >
                  <p
                    style={{
                      fontSize: "12px",
                      lineHeight: "1.8",
                      fontFamily: "'Noto Serif JP', 'Yu Mincho', serif",
                      color: "#334155",
                      display: "-webkit-box",
                      WebkitLineClamp: 8,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                      textIndent: "1em",
                      textAlign: "justify",
                    }}
                  >
                    {textPreview}
                  </p>
                </div>
              ) : (
                <div
                  style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#94a3b8",
                    textAlign: "center",
                    padding: "16px",
                  }}
                >
                  <BookOpen style={{ width: "24px", height: "24px", opacity: 0.4, marginBottom: "6px" }} />
                  <span style={{ fontSize: "11px", fontWeight: 600 }}>{chapterTitle}</span>
                </div>
              )}
            </div>

            {/* Bottom Page Number */}
            <div
              style={{
                fontSize: "10px",
                fontFamily: "monospace",
                color: "#94a3b8",
                fontWeight: 600,
                paddingTop: "6px",
                borderTop: "1px solid #f1f5f9",
                width: "100%",
                textAlign: "center",
              }}
            >
              {targetChapterIndex + 1} / {previewBook.totalChapters}
            </div>
          </div>

          {/* Flipping Pages */}
          {numFlips > 0 &&
            Array.from({ length: numFlips }).map((_, i) => {
              const delay = i * 90;
              const isFlipped = previewPhase === "zooming" || previewPhase === "flipping";

              const pageChIndex = Math.max(0, targetChapterIndex - numFlips + i);
              const pageMeta = getChapterMeta(previewChapters[pageChIndex], pageChIndex);

              return (
                <div
                  key={i}
                  style={{
                    position: "absolute",
                    top: "3px",
                    bottom: "3px",
                    left: 0,
                    right: 0,
                    transformOrigin: "left center",
                    transform: isFlipped ? "rotateY(-175deg)" : "rotateY(0deg)",
                    transition: `transform 0.65s cubic-bezier(0.25, 1, 0.5, 1) ${delay}ms`,
                    transformStyle: "preserve-3d",
                    zIndex: isFlipped ? 5 + i : 15 - i,
                    pointerEvents: "none",
                  }}
                >
                  {/* Front side of page i */}
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      backgroundColor: "#ffffff",
                      borderRadius: "0 8px 8px 0",
                      border: "1px solid #e2e8f0",
                      borderLeft: "none",
                      transformOrigin: "left center",
                      backfaceVisibility: "hidden",
                      WebkitBackfaceVisibility: "hidden",
                      boxShadow: "2px 0 8px rgba(0,0,0,0.06)",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      padding: "14px 12px",
                      overflow: "hidden",
                      color: "#0f172a",
                    }}
                  >
                    <div style={{ width: "100%", textAlign: "center" }}>
                      <p style={{ fontSize: "9px", fontWeight: 700, textTransform: "uppercase", color: "var(--kb-primary)", marginBottom: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {pageMeta.title}
                      </p>
                    </div>

                    {pageMeta.image ? (
                      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: "100%", gap: "4px", margin: "2px 0" }}>
                        <div style={{ width: "100%", display: "flex", justifyContent: "center", alignItems: "center" }}>
                          <img
                            src={pageMeta.image}
                            alt={pageMeta.title}
                            style={{
                              width: "100%",
                              maxHeight: (pageMeta.heading || pageMeta.excerpt) ? "130px" : "210px",
                              objectFit: "contain",
                              borderRadius: "4px",
                            }}
                          />
                        </div>
                        {(pageMeta.heading || pageMeta.excerpt) && (
                          <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "2px" }}>
                            {pageMeta.heading && (
                              <p style={{ fontSize: "9.5px", fontWeight: 700, color: "#0f172a", lineHeight: 1.25, textAlign: "center" }}>
                                {pageMeta.heading}
                              </p>
                            )}
                            {pageMeta.excerpt && (
                              <p style={{ fontSize: "9px", color: "#334155", lineHeight: 1.4, textAlign: "justify", display: "-webkit-box", WebkitLineClamp: pageMeta.heading ? 2 : 4, WebkitBoxOrient: "vertical", overflow: "hidden", fontFamily: "serif" }}>
                                {pageMeta.excerpt}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div style={{ width: "100%", margin: "2px 0", display: "flex", flexDirection: "column", gap: "3px" }}>
                        {pageMeta.heading && (
                          <p style={{ fontSize: "10px", fontWeight: 700, color: "#0f172a", lineHeight: 1.3, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                            {pageMeta.heading}
                          </p>
                        )}
                        {pageMeta.excerpt && (
                          <p style={{ fontSize: "10px", color: "#334155", lineHeight: 1.45, textAlign: "justify", display: "-webkit-box", WebkitLineClamp: pageMeta.heading ? 3 : 5, WebkitBoxOrient: "vertical", overflow: "hidden", fontFamily: "serif" }}>
                            {pageMeta.excerpt}
                          </p>
                        )}
                      </div>
                    )}

                    <div style={{ width: "100%", display: "flex", justifyContent: "space-between", fontSize: "8px", color: "#94a3b8" }}>
                      <span>Kotori</span>
                      <span>{pageChIndex + 1}</span>
                    </div>
                  </div>

                  {/* Back side of page i */}
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      backgroundColor: "#ffffff",
                      borderRadius: "8px 0 0 8px",
                      border: "1px solid #e2e8f0",
                      borderRight: "none",
                      transform: "rotateY(180deg)",
                      backfaceVisibility: "hidden",
                      WebkitBackfaceVisibility: "hidden",
                      boxShadow: "-2px 0 8px rgba(0,0,0,0.06)",
                      padding: "14px 12px",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      overflow: "hidden",
                      color: "#0f172a",
                    }}
                  >
                    <div style={{ width: "100%", textAlign: "center" }}>
                      <p style={{ fontSize: "9px", fontWeight: 700, textTransform: "uppercase", color: "var(--kb-primary)", marginBottom: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {pageMeta.title}
                      </p>
                    </div>

                    {pageMeta.heading && (
                      <p style={{ fontSize: "9.5px", fontWeight: 700, color: "#0f172a", lineHeight: 1.3, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                        {pageMeta.heading}
                      </p>
                    )}

                    {pageMeta.excerpt && (
                      <p style={{ fontSize: "9.5px", color: "#475569", lineHeight: 1.4, textAlign: "justify", display: "-webkit-box", WebkitLineClamp: pageMeta.heading ? 3 : 5, WebkitBoxOrient: "vertical", overflow: "hidden", fontFamily: "serif" }}>
                        {pageMeta.excerpt}
                      </p>
                    )}

                    <div style={{ width: "100%", display: "flex", justifyContent: "space-between", fontSize: "8px", color: "#94a3b8" }}>
                      <span>Kotori</span>
                      <span>{pageChIndex + 1}</span>
                    </div>

                    {/* Center Spine Gutter Shadow (Left Page Backside) */}
                    <div
                      style={{
                        position: "absolute",
                        top: 0,
                        bottom: 0,
                        right: 0,
                        width: "28px",
                        background: "linear-gradient(to left, rgba(0,0,0,0.22) 0%, rgba(0,0,0,0.06) 40%, transparent 100%)",
                        pointerEvents: "none",
                      }}
                    />
                  </div>
                </div>
              );
            })}

          {/* Front Cover Card */}
          <div
            className="kb-preview-cover"
            style={{
              position: "absolute",
              inset: 0,
              transformOrigin: "left center",
              transform:
                previewPhase === "opening" || previewPhase === "zooming" || previewPhase === "flipping"
                  ? "rotateY(-178deg)"
                  : "rotateY(0deg)",
              transition: "transform 1.0s cubic-bezier(0.25, 1, 0.5, 1)",
              transformStyle: "preserve-3d",
              zIndex: (previewPhase === "opening" || previewPhase === "flipping" || previewPhase === "zooming") ? 2 : 20,
            }}
          >
            {/* Cover front side */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: "0 8px 8px 0",
                overflow: "hidden",
                backgroundColor: "#1e293b",
                backfaceVisibility: "hidden",
                WebkitBackfaceVisibility: "hidden",
                boxShadow: getPaperStackShadow(rightStackDepth + 2, "right"),
              }}
            >
              {previewBook.coverUrl ? (
                <img
                  src={previewBook.coverUrl}
                  alt={previewBook.title}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <div
                  style={{
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "20px",
                    textAlign: "center",
                  }}
                >
                  <BookOpen style={{ width: "40px", height: "40px", color: "var(--kb-primary)" }} />
                  <span style={{ fontSize: "14px", fontWeight: 700, color: "white", marginTop: "12px" }}>
                    {previewBook.title}
                  </span>
                </div>
              )}
            </div>

            {/* Cover back side */}
            <div
              style={{
                position: "absolute",
                top: "3px",
                bottom: "3px",
                right: `${leftStackDepth}px`,
                width: `calc(100% - ${leftStackDepth}px)`,
                backgroundColor: "#f8fafc",
                borderRadius: "8px 0 0 8px",
                border: "1px solid #e2e8f0",
                borderRight: "none",
                transform: "rotateY(180deg)",
                backfaceVisibility: "hidden",
                WebkitBackfaceVisibility: "hidden",
                zIndex: 1,
                boxShadow: getPaperStackShadow(leftStackDepth, "left"),
                transition: "box-shadow 0.6s cubic-bezier(0.25, 1, 0.5, 1), right 0.6s ease",
                overflow: "hidden",
              }}
            >
              {/* Center Spine Gutter Shadow */}
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  bottom: 0,
                  right: 0,
                  width: "28px",
                  background: "linear-gradient(to left, rgba(0,0,0,0.22) 0%, rgba(0,0,0,0.06) 40%, transparent 100%)",
                  pointerEvents: "none",
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
