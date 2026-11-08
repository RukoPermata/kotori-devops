"use client";

import { useEffect, useState } from "react";
import { dictionaryService, LookupResult } from "@/services/dictionary-service";
import { useReaderStore } from "@/stores/reader-store";
import { DictionaryResults } from "@/components/DictionaryResults";

interface SelectionPopupProps {
  selectedText: string;
  explicitFurigana?: string;
  // Anchor rect to dock the popup against (a character's or selection's bounding rect, viewport-
  // relative) - NOT a raw click pixel, so the popup's position stays stable regardless of exactly
  // where within a glyph the pointer landed.
  position: { x: number; y: number; width: number; height: number };
  chunkPos?: number;
  onClose: () => void;
  onResolve?: (result: LookupResult) => void;
}

// Dock the popup against the anchor rect's edges (like Yomitan's side panel) - never against a
// raw click pixel, so clicking the same character at its edge vs. its middle vs. its start always
// yields the same popup position. Height is a FIXED value (capped only by the viewport, never by
// content) so the popup is a consistent size regardless of how much a given word's entry has to
// say - overflowing content scrolls internally instead of resizing the popup. Recomputed each
// time a new word is looked up (see the effect below), so the popup moves to the newly
// clicked/hovered word instead of staying stuck at the first word's spot.
//
// Wide viewports dock the panel beside the word; narrow ones stack it below (or above) instead,
// since there is no sideways room there and docking would cover the word being read.
function getPopupThemeStyles(theme: "dark" | "light" | "sepia") {
  if (theme === "light") {
    return {
      bg: "rgba(255, 255, 255, 0.98)",
      border: "rgba(0, 0, 0, 0.12)",
      shadow: "0 16px 40px rgba(0, 0, 0, 0.12)",
      text: "#0f172a",
      scrollThumb: "rgba(0, 0, 0, 0.2)",
      scrollThumbHover: "rgba(0, 0, 0, 0.38)",
    };
  }
  if (theme === "sepia") {
    return {
      bg: "rgba(244, 239, 228, 0.98)",
      border: "rgba(120, 80, 40, 0.2)",
      shadow: "0 16px 40px rgba(60, 40, 20, 0.16)",
      text: "#2c1c0d",
      scrollThumb: "rgba(61, 40, 23, 0.25)",
      scrollThumbHover: "rgba(61, 40, 23, 0.45)",
    };
  }
  return {
    bg: "rgba(15, 23, 42, 0.96)",
    border: "rgba(255, 255, 255, 0.14)",
    shadow: "0 16px 48px rgba(0, 0, 0, 0.5)",
    text: "#ffffff",
    scrollThumb: "rgba(255, 255, 255, 0.22)",
    scrollThumbHover: "rgba(255, 255, 255, 0.42)",
  };
}

function computeLayout(
  anchor: { x: number; y: number; width: number; height: number },
  writingMode: "vertical" | "horizontal" = "vertical"
) {
  const margin = 16;
  const offset = 12;
  const popupWidth = Math.min(390, window.innerWidth - margin * 2);
  const maxPanelHeight = Math.min(360, window.innerHeight - margin * 2);

  const anchorRight = anchor.x + anchor.width;
  const anchorBottom = anchor.y + anchor.height;

  let left: number;
  let top: number;
  let panelHeight = maxPanelHeight;

  if (writingMode === "vertical") {
    // Tategaki (Vertical): Text runs top-to-bottom, lines advance RIGHT to LEFT.
    // Natural Yomitan placement: Dock to the LEFT of the vertical word column.
    const spaceLeft = anchor.x - offset;
    const spaceRight = window.innerWidth - anchorRight - offset;

    if (spaceLeft >= popupWidth + margin) {
      left = anchor.x - popupWidth - offset;
    } else if (spaceRight >= popupWidth + margin) {
      left = anchorRight + offset;
    } else {
      left = Math.max(margin, Math.min(anchor.x + anchor.width / 2 - popupWidth / 2, window.innerWidth - popupWidth - margin));
    }

    // Align vertically with the top of the word
    top = anchor.y;
    if (top + panelHeight > window.innerHeight - margin) {
      top = Math.max(margin, window.innerHeight - margin - panelHeight);
    }

    // Narrow screens (cannot fit beside the column): stack below/above word
    const isNarrow = spaceLeft < popupWidth + margin && spaceRight < popupWidth + margin;
    if (isNarrow) {
      const spaceBelow = window.innerHeight - anchorBottom - offset - margin;
      const spaceAbove = anchor.y - offset - margin;
      if (spaceBelow >= 180) {
        panelHeight = Math.min(maxPanelHeight, spaceBelow);
        top = anchorBottom + offset;
      } else if (spaceAbove >= 180) {
        panelHeight = Math.min(maxPanelHeight, spaceAbove);
        top = anchor.y - offset - panelHeight;
      } else {
        panelHeight = Math.max(140, Math.min(maxPanelHeight, spaceBelow));
        top = anchorBottom + offset;
      }
    }
  } else {
    // Yokogaki (Horizontal): Text flows left-to-right, lines flow DOWNWARD.
    // Center popup directly under (or above) the selected word
    left = anchor.x + anchor.width / 2 - popupWidth / 2;

    const spaceBelow = window.innerHeight - anchorBottom - offset - margin;
    const spaceAbove = anchor.y - offset - margin;
    if (spaceBelow >= 180) {
      panelHeight = Math.min(maxPanelHeight, spaceBelow);
      top = anchorBottom + offset;
    } else if (spaceAbove >= 180) {
      panelHeight = Math.min(maxPanelHeight, spaceAbove);
      top = anchor.y - offset - panelHeight;
    } else if (spaceBelow >= spaceAbove) {
      panelHeight = Math.max(120, Math.min(maxPanelHeight, spaceBelow));
      top = anchorBottom + offset;
    } else {
      panelHeight = Math.max(120, Math.min(maxPanelHeight, spaceAbove));
      top = anchor.y - offset - panelHeight;
    }
  }

  // Hard clamp inside viewport
  top = Math.max(margin, Math.min(top, window.innerHeight - panelHeight - margin));
  left = Math.max(margin, Math.min(left, window.innerWidth - popupWidth - margin));

  return { left, top, popupWidth, panelHeight };
}

export function SelectionPopup({ selectedText, explicitFurigana, position, chunkPos, onClose, onResolve }: SelectionPopupProps) {
  const { settings } = useReaderStore();
  const theme = settings?.theme || "dark";
  const writingMode = settings?.writingMode || "vertical";
  const ttsRate = settings?.ttsSpeed ?? 0.8;
  const themeStyles = getPopupThemeStyles(theme);

  const [lookupData, setLookupData] = useState<LookupResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [layout, setLayout] = useState(() => computeLayout(position, writingMode));

  // Reposition when a genuinely new word is looked up, and again when the reader refines the
  // anchor from the hovered character to the resolved word's full box (see onDictResolve) - that
  // second pass is what keeps the popup clear of the whole word in vertical text. `position` is
  // set once per lookup, so this does not jitter mid-lookup.
  useEffect(() => {
    setLayout(computeLayout(position, writingMode));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedText, chunkPos, position, writingMode]);

  // Rotating a phone flips which side has room - and can flip the layout between the beside-the-word
  // and below-the-word arrangements entirely - so the placement has to be recomputed on resize.
  useEffect(() => {
    const onResize = () => setLayout(computeLayout(position, writingMode));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [position, writingMode]);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    dictionaryService.lookup(selectedText, chunkPos).then((res) => {
      if (isMounted) {
        setLookupData(res);
        setIsLoading(false);
        onResolve?.(res);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [selectedText, chunkPos]);

  // Audio pronunciation via Web Speech API uses the reader's ttsSpeed setting
  if (!selectedText.trim()) return null;

  const { left, top, popupWidth, panelHeight } = layout;

  return (
    <div
      data-selection-popup="true"
      className="selection-popup"
      style={{
        position: "fixed",
        left: `${left}px`,
        top: `${top}px`,
        width: `${popupWidth}px`,
        height: `${panelHeight}px`,
        zIndex: 100,
        borderRadius: "16px",
        backgroundColor: themeStyles.bg,
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        border: `1px solid ${themeStyles.border}`,
        boxShadow: themeStyles.shadow,
        color: themeStyles.text,
        padding: "14px",
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        overflow: "hidden",
        animation: "fadeIn 0.12s ease-out",
        userSelect: "text",
        WebkitUserSelect: "text",
      }}
      onClick={(e) => e.stopPropagation()}
      onWheel={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}
    >
      <DictionaryResults
        selectedText={selectedText}
        explicitFurigana={explicitFurigana}
        chunkPos={chunkPos}
        lookupData={lookupData}
        isLoading={isLoading}
        ttsRate={ttsRate}
        theme={theme}
        onClose={onClose}
      />
    </div>
  );
}
