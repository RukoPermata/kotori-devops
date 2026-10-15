"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  X,
  HardDriveDownload,
  HardDriveUpload,
  FileArchive,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  ArrowUpRight,
  Plus,
  Check,
  Loader2,
  Library,
  BookOpen,
  Calendar,
} from "lucide-react";
import {
  exportFullBackup,
  inspectBackupFile,
  applyBackupRestore,
  type BackupInspectionResult,
} from "@/services/backup-service";
import type { BookMeta, ReadingProgress } from "@/types/book";

interface BackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: "ID" | "EN";
  totalBooks: number;
  currentBooks?: BookMeta[];
  currentProgresses?: Record<string, ReadingProgress | undefined>;
  onSuccessRestore: () => void;
  onToast: (message: string, type?: "success" | "error" | "delete" | "reset") => void;
  initialTab?: "export" | "import";
}

const TRANSLATIONS = {
  ID: {
    title: "Cadangkan & Pulihkan",
    subtitle: "Amankan atau pulihkan novel, bab, posisi baca, dan pengaturan Anda.",
    tabExport: "Cadangkan (Export)",
    tabImport: "Pulihkan (Import)",

    // Export section
    exportHeading: "Pilih Novel untuk Dicadangkan",
    exportDesc:
      "Novel yang dicentang beserta bab, cover, progres baca, dan pengaturan akan dikompresi ke file .kotori.",
    exportSelectedCount: (selected: number, total: number) =>
      `${selected} dari ${total} novel dipilih`,
    exportButton: (count: number) => `Unduh Cadangan (${count} Novel)`,
    exporting: (percent: number) => `Mengompres Data (${percent}%)...`,
    exportSuccess: (file: string) => `Cadangan berhasil diunduh: ${file}`,
    selectAll: "Pilih Semua",
    deselectAll: "Batal Pilih",
    noBooksAvailable: "Belum ada novel di perpustakaan lokal Anda.",

    // Import section
    importHeading: "Pilih Novel untuk Dipulihkan",
    importDropText: "Pilih file .kotori atau .json cadangan",
    importDropSub: "Klik atau seret file ke area ini untuk memeriksa isinya",
    inspecting: "Memeriksa file cadangan...",
    previewHeading: "Ringkasan Data Cadangan",
    previewBooks: (count: number) => `${count} Novel`,
    previewChapters: (count: number) => `${count} Bab`,
    previewProgress: (count: number) => `${count} Posisi Baca`,
    novelsListHeading: "Pilih Novel untuk Dipulihkan",
    unread: "Belum dibaca",
    badgeNew: "Baru",
    badgeAhead: "Progres Maju",
    badgeBehind: "Lokal Lebih Maju",
    badgeIdentical: "Sama",
    currentLabel: "Lokal",
    backupLabel: "Cadangan",
    keepNewerCheckbox: "Pertahankan progres lokal jika saat ini lebih maju (Rekomendasi)",
    keepNewerDesc:
      "Novel yang sudah dibaca lebih jauh di perangkat ini tidak akan ditimpa mundur oleh cadangan lama.",
    restoreButton: (count: number) => `Pulihkan ${count} Novel Terpilih`,
    restoring: "Memulihkan data ke perpustakaan...",
    restoreSuccess: (count: number) =>
      `Berhasil memulihkan ${count} novel beserta progres bacanya!`,
    invalidFile: "File cadangan tidak valid atau rusak.",
    noSelectedRestore: "Centang minimal 1 novel untuk dipulihkan.",
    noSelectedExport: "Centang minimal 1 novel untuk dicadangkan.",
    cancel: "Batal",
    close: "Tutup",
    changeFile: "Ganti File",
  },
  EN: {
    title: "Backup & Restore",
    subtitle: "Safeguard or restore novels, chapters, reading progress, and settings.",
    tabExport: "Backup (Export)",
    tabImport: "Restore (Import)",

    // Export section
    exportHeading: "Select Novels to Backup",
    exportDesc:
      "Selected novels along with chapters, covers, reading progress, and reader settings will be compressed into a .kotori file.",
    exportSelectedCount: (selected: number, total: number) =>
      `${selected} of ${total} novels selected`,
    exportButton: (count: number) => `Download Backup (${count} Novels)`,
    exporting: (percent: number) => `Compressing Data (${percent}%)...`,
    exportSuccess: (file: string) => `Backup downloaded successfully: ${file}`,
    selectAll: "Select All",
    deselectAll: "Deselect All",
    noBooksAvailable: "No novels available in your local library.",

    // Import section
    importHeading: "Select Novels to Restore",
    importDropText: "Select a .kotori or .json backup file",
    importDropSub: "Click or drag your file here to inspect contents",
    inspecting: "Inspecting backup file...",
    previewHeading: "Backup Summary",
    previewBooks: (count: number) => `${count} Novels`,
    previewChapters: (count: number) => `${count} Chapters`,
    previewProgress: (count: number) => `${count} Reading Positions`,
    novelsListHeading: "Select Novels to Restore",
    unread: "Unread",
    badgeNew: "New",
    badgeAhead: "Progress Ahead",
    badgeBehind: "Local is Ahead",
    badgeIdentical: "Same",
    currentLabel: "Local",
    backupLabel: "Backup",
    keepNewerCheckbox: "Keep local progress if currently further ahead (Recommended)",
    keepNewerDesc:
      "Novels you've read further on this device won't be rolled back by an older backup.",
    restoreButton: (count: number) => `Restore ${count} Selected Novels`,
    restoring: "Restoring data to library...",
    restoreSuccess: (count: number) =>
      `Successfully restored ${count} novels with reading progress!`,
    invalidFile: "Invalid or corrupted backup file.",
    noSelectedRestore: "Select at least 1 novel to restore.",
    noSelectedExport: "Select at least 1 novel to export.",
    cancel: "Cancel",
    close: "Close",
    changeFile: "Change File",
  },
};

/**
 * Custom checkbox component matching Kotori's design language.
 * Clean, smooth rounded corners, primary theme color, and accessible.
 */
function KotoriCheckbox({
  checked,
  onChange,
  disabled = false,
  size = 18,
}: {
  checked: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  size?: number;
}) {
  return (
    <div
      role="checkbox"
      aria-checked={checked}
      tabIndex={disabled ? -1 : 0}
      onClick={(e) => {
        e.stopPropagation();
        if (!disabled && onChange) onChange(!checked);
      }}
      onKeyDown={(e) => {
        if (!disabled && (e.key === " " || e.key === "Enter")) {
          e.preventDefault();
          e.stopPropagation();
          if (onChange) onChange(!checked);
        }
      }}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: "6px",
        border: checked
          ? "1.5px solid var(--kb-primary)"
          : "1.5px solid var(--kb-border)",
        backgroundColor: checked ? "var(--kb-primary)" : "var(--kb-surface)",
        color: "#ffffff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "all 0.18s cubic-bezier(0.4, 0, 0.2, 1)",
        boxShadow: checked ? "0 2px 6px rgba(99, 102, 241, 0.3)" : "none",
        outline: "none",
      }}
    >
      {checked && (
        <Check
          style={{
            width: `${Math.round(size * 0.68)}px`,
            height: `${Math.round(size * 0.68)}px`,
            strokeWidth: 3,
          }}
        />
      )}
    </div>
  );
}

export function BackupModal({
  isOpen,
  onClose,
  language,
  totalBooks,
  currentBooks = [],
  currentProgresses = {},
  onSuccessRestore,
  onToast,
  initialTab = "export",
}: BackupModalProps) {
  const [activeTab, setActiveTab] = useState<"export" | "import">(initialTab);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  // Checkbox selection for Export tab
  const [selectedExportIds, setSelectedExportIds] = useState<Set<string>>(new Set());

  // State for Import tab
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isInspecting, setIsInspecting] = useState(false);
  const [inspectionResult, setInspectionResult] = useState<BackupInspectionResult | null>(null);
  const [selectedRestoreIds, setSelectedRestoreIds] = useState<Set<string>>(new Set());
  const [preserveNewer, setPreserveNewer] = useState(true);
  const [isRestoring, setIsRestoring] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const t = TRANSLATIONS[language];

  // Initialize export selection and active tab when modal opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setSelectedExportIds(new Set(currentBooks.map((b) => b.id)));
    } else {
      setSelectedFile(null);
      setInspectionResult(null);
      setSelectedRestoreIds(new Set());
      setIsExporting(false);
      setIsRestoring(false);
    }
  }, [isOpen, initialTab, currentBooks]);

  // Handle ESC key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Export selection helpers
  const toggleExportBook = (id: string) => {
    const next = new Set(selectedExportIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedExportIds(next);
  };

  const toggleSelectAllExport = () => {
    if (selectedExportIds.size === currentBooks.length) {
      setSelectedExportIds(new Set());
    } else {
      setSelectedExportIds(new Set(currentBooks.map((b) => b.id)));
    }
  };

  // Restore selection helpers
  const toggleRestoreBook = (id: string) => {
    const next = new Set(selectedRestoreIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedRestoreIds(next);
  };

  const toggleSelectAllRestore = () => {
    if (!inspectionResult) return;
    if (selectedRestoreIds.size === inspectionResult.books.length) {
      setSelectedRestoreIds(new Set());
    } else {
      setSelectedRestoreIds(new Set(inspectionResult.books.map((b) => b.id)));
    }
  };

  const handleExport = async () => {
    if (isExporting) return;
    if (selectedExportIds.size === 0) {
      onToast(t.noSelectedExport, "error");
      return;
    }

    setIsExporting(true);
    setExportProgress(0);

    try {
      const { fileName } = await exportFullBackup(
        Array.from(selectedExportIds),
        (percent) => {
          setExportProgress(percent);
        }
      );
      onToast(t.exportSuccess(fileName), "success");
      onClose();
    } catch (err) {
      console.error(err);
      onToast(
        language === "ID" ? "Gagal mencadangkan data perpustakaan." : "Failed to export library.",
        "error"
      );
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileChange = async (file: File) => {
    setSelectedFile(file);
    setIsInspecting(true);
    setInspectionResult(null);

    try {
      const result = await inspectBackupFile(file);
      setInspectionResult(result);
      if (result.isValid) {
        setSelectedRestoreIds(new Set(result.books.map((b) => b.id)));
      } else {
        onToast(result.error || t.invalidFile, "error");
      }
    } catch (err) {
      console.error(err);
      onToast(t.invalidFile, "error");
    } finally {
      setIsInspecting(false);
    }
  };

  const handleRestore = async () => {
    if (!inspectionResult || !inspectionResult.isValid || isRestoring) return;
    if (selectedRestoreIds.size === 0) {
      onToast(t.noSelectedRestore, "error");
      return;
    }

    setIsRestoring(true);

    try {
      const { restoredBooks } = await applyBackupRestore(inspectionResult, {
        selectedBookIds: Array.from(selectedRestoreIds),
        preserveNewerLocalProgress: preserveNewer,
        currentProgresses,
        currentBooks,
      });
      onToast(t.restoreSuccess(restoredBooks), "success");
      onSuccessRestore();
      onClose();
    } catch (err) {
      console.error(err);
      onToast(
        language === "ID" ? "Gagal memulihkan perpustakaan." : "Failed to restore library.",
        "error"
      );
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <div
      className="kb-feedback-overlay kb-modal-active"
      onClick={onClose}
      style={{
        zIndex: 110,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
    >
      <style>{`
        .kb-backup-scroll {
          scrollbar-width: thin;
          scrollbar-color: var(--kb-border) transparent;
        }
        .kb-backup-scroll::-webkit-scrollbar {
          width: 6px;
        }
        .kb-backup-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .kb-backup-scroll::-webkit-scrollbar-thumb {
          background: var(--kb-border);
          border-radius: 4px;
        }
        .kb-backup-scroll::-webkit-scrollbar-thumb:hover {
          background: var(--kb-text-muted);
        }
        .kb-chip-scroll {
          overflow-x: auto;
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .kb-chip-scroll::-webkit-scrollbar {
          display: none;
        }
        @media (max-width: 640px) {
          .kb-backup-content-modal {
            padding: 18px 14px !important;
            max-height: 94vh !important;
            border-radius: 18px !important;
          }
          .kb-backup-book-item {
            padding: 8px 10px !important;
            gap: 8px !important;
          }
        }
      `}</style>

      <div
        className="kb-feedback-content kb-backup-content-modal"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: "580px",
          width: "100%",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          padding: "24px 22px",
          borderRadius: "20px",
          backgroundColor: "var(--kb-surface)",
          border: "1px solid var(--kb-border)",
          boxShadow: "0 24px 48px -12px rgba(0,0,0,0.35)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label={t.close}
          style={{
            position: "absolute",
            top: "16px",
            right: "16px",
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
            transition: "all 0.15s ease",
            zIndex: 2,
          }}
        >
          <X style={{ width: "16px", height: "16px" }} />
        </button>

        {/* Modal Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            marginBottom: "4px",
            flexShrink: 0,
            paddingRight: "36px",
          }}
        >
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "12px",
              backgroundColor: "var(--kb-primary-light)",
              color: "var(--kb-primary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <FileArchive style={{ width: "20px", height: "20px" }} />
          </div>
          <div>
            <h2
              style={{
                fontSize: "18px",
                fontWeight: 800,
                color: "var(--kb-text)",
                margin: 0,
                letterSpacing: "-0.02em",
                lineHeight: 1.2,
              }}
            >
              {t.title}
            </h2>
            <p
              style={{
                fontSize: "12px",
                color: "var(--kb-text-secondary)",
                margin: "3px 0 0",
                lineHeight: 1.35,
              }}
            >
              {t.subtitle}
            </p>
          </div>
        </div>

        {/* Tab Switch Controls */}
        <div
          style={{
            display: "flex",
            padding: "4px",
            backgroundColor: "var(--kb-bg-secondary)",
            borderRadius: "12px",
            border: "1px solid var(--kb-border)",
            margin: "14px 0 14px",
            gap: "4px",
            flexShrink: 0,
          }}
        >
          <button
            onClick={() => setActiveTab("export")}
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              padding: "8px 12px",
              fontSize: "13px",
              fontWeight: 700,
              borderRadius: "9px",
              border: "none",
              backgroundColor: activeTab === "export" ? "var(--kb-surface)" : "transparent",
              color: activeTab === "export" ? "var(--kb-primary)" : "var(--kb-text-secondary)",
              boxShadow: activeTab === "export" ? "0 2px 8px rgba(0,0,0,0.06)" : "none",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            <HardDriveDownload style={{ width: "15px", height: "15px" }} />
            <span>{t.tabExport}</span>
          </button>

          <button
            onClick={() => setActiveTab("import")}
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              padding: "8px 12px",
              fontSize: "13px",
              fontWeight: 700,
              borderRadius: "9px",
              border: "none",
              backgroundColor: activeTab === "import" ? "var(--kb-surface)" : "transparent",
              color: activeTab === "import" ? "var(--kb-primary)" : "var(--kb-text-secondary)",
              boxShadow: activeTab === "import" ? "0 2px 8px rgba(0,0,0,0.06)" : "none",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            <HardDriveUpload style={{ width: "15px", height: "15px" }} />
            <span>{t.tabImport}</span>
          </button>
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: EXPORT SECTION                                                     */}
        {/* ========================================================================= */}
        {activeTab === "export" && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "10px",
              flex: 1,
              minHeight: 0,
              overflow: "hidden",
            }}
          >
            {currentBooks.length === 0 ? (
              <div
                style={{
                  padding: "36px 16px",
                  borderRadius: "14px",
                  backgroundColor: "var(--kb-bg-secondary)",
                  border: "1px dashed var(--kb-border)",
                  textAlign: "center",
                  color: "var(--kb-text-secondary)",
                  fontSize: "13px",
                  margin: "auto 0",
                }}
              >
                {t.noBooksAvailable}
              </div>
            ) : (
              <>
                {/* Header row: counter and select all button */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "0 2px",
                    flexShrink: 0,
                  }}
                >
                  <span
                    style={{
                      fontSize: "12px",
                      fontWeight: 700,
                      color: "var(--kb-text)",
                    }}
                  >
                    {t.exportSelectedCount(selectedExportIds.size, currentBooks.length)}
                  </span>

                  <button
                    onClick={toggleSelectAllExport}
                    style={{
                      border: "none",
                      backgroundColor: "transparent",
                      color: "var(--kb-primary)",
                      fontSize: "12px",
                      fontWeight: 700,
                      cursor: "pointer",
                      padding: "2px 6px",
                      borderRadius: "6px",
                      transition: "background-color 0.15s ease",
                    }}
                  >
                    {selectedExportIds.size === currentBooks.length ? t.deselectAll : t.selectAll}
                  </button>
                </div>

                {/* Scrollable Novel List with Custom Styled Checkboxes */}
                <div
                  className="kb-backup-scroll"
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                    flex: "1 1 auto",
                    minHeight: "120px",
                    maxHeight: "min(360px, 48vh)",
                    overflowY: "auto",
                    paddingRight: "4px",
                  }}
                >
                  {currentBooks.map((book) => {
                    const isChecked = selectedExportIds.has(book.id);
                    const prog = currentProgresses[book.id];
                    const percent = prog
                      ? Math.min(
                          100,
                          Math.round(
                            ((prog.chapterIndex + prog.scrollPosition) / Math.max(book.totalChapters, 1)) *
                              100
                          )
                        )
                      : 0;

                    return (
                      <div
                        key={book.id}
                        className="kb-backup-book-item"
                        onClick={() => toggleExportBook(book.id)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                          padding: "10px 12px",
                          borderRadius: "12px",
                          backgroundColor: isChecked ? "var(--kb-bg-secondary)" : "transparent",
                          border: isChecked
                            ? "1px solid rgba(99, 102, 241, 0.4)"
                            : "1px solid var(--kb-border-subtle)",
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                        }}
                      >
                        {/* Custom Kotori Checkbox */}
                        <KotoriCheckbox
                          checked={isChecked}
                          onChange={() => toggleExportBook(book.id)}
                          size={18}
                        />

                        {/* Cover thumbnail */}
                        <div
                          style={{
                            width: "34px",
                            height: "46px",
                            borderRadius: "6px",
                            overflow: "hidden",
                            backgroundColor: "var(--kb-surface)",
                            flexShrink: 0,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            border: "1px solid var(--kb-border-subtle)",
                          }}
                        >
                          {book.coverUrl ? (
                            <img
                              src={book.coverUrl}
                              alt={book.title}
                              style={{ width: "100%", height: "100%", objectFit: "cover" }}
                            />
                          ) : (
                            <BookOpen
                              style={{ width: "14px", height: "14px", color: "var(--kb-text-muted)" }}
                            />
                          )}
                        </div>

                        {/* Title & Info */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              fontSize: "12.5px",
                              fontWeight: 700,
                              color: "var(--kb-text)",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                            title={book.title}
                          >
                            {book.title}
                          </div>
                          <div
                            style={{
                              fontSize: "11px",
                              color: "var(--kb-text-secondary)",
                              display: "flex",
                              alignItems: "center",
                              gap: "6px",
                              marginTop: "3px",
                            }}
                          >
                            <span>
                              {book.totalChapters} {language === "ID" ? "Bab" : "Ch"}
                            </span>
                            <span style={{ opacity: 0.35 }}>•</span>
                            <span
                              style={{
                                color: prog ? "var(--kb-primary)" : "var(--kb-text-muted)",
                                fontWeight: prog ? 650 : 400,
                              }}
                            >
                              {prog ? `Bab ${prog.chapterIndex + 1} (${percent}%)` : t.unread}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Compression Progress Bar */}
                {isExporting && (
                  <div style={{ width: "100%", marginTop: "2px", flexShrink: 0 }}>
                    <div
                      style={{
                        height: "5px",
                        width: "100%",
                        backgroundColor: "var(--kb-bg-secondary)",
                        borderRadius: "10px",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          width: `${exportProgress}%`,
                          backgroundColor: "var(--kb-primary)",
                          transition: "width 0.2s ease",
                        }}
                      />
                    </div>
                    <span
                      style={{
                        fontSize: "11px",
                        color: "var(--kb-text-muted)",
                        marginTop: "4px",
                        display: "block",
                        textAlign: "right",
                      }}
                    >
                      {t.exporting(exportProgress)}
                    </span>
                  </div>
                )}

                {/* Export Action Button (Always visible at bottom) */}
                <div style={{ paddingTop: "4px", flexShrink: 0 }}>
                  <button
                    onClick={handleExport}
                    disabled={isExporting || selectedExportIds.size === 0}
                    style={{
                      width: "100%",
                      padding: "11px 16px",
                      fontSize: "13.5px",
                      fontWeight: 700,
                      borderRadius: "12px",
                      border: "none",
                      backgroundColor:
                        isExporting || selectedExportIds.size === 0
                          ? "var(--kb-bg-secondary)"
                          : "var(--kb-primary)",
                      color:
                        isExporting || selectedExportIds.size === 0
                          ? "var(--kb-text-muted)"
                          : "#ffffff",
                      cursor:
                        isExporting || selectedExportIds.size === 0 ? "not-allowed" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                      boxShadow:
                        isExporting || selectedExportIds.size === 0
                          ? "none"
                          : "0 4px 14px rgba(99,102,241,0.25)",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {isExporting ? (
                      <>
                        <Loader2
                          style={{ width: "16px", height: "16px", animation: "spin 1s linear infinite" }}
                        />
                        <span>{t.exporting(exportProgress)}</span>
                      </>
                    ) : (
                      <>
                        <HardDriveDownload style={{ width: "16px", height: "16px" }} />
                        <span>{t.exportButton(selectedExportIds.size)}</span>
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: IMPORT SECTION                                                     */}
        {/* ========================================================================= */}
        {activeTab === "import" && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "10px",
              flex: 1,
              minHeight: 0,
              overflow: "hidden",
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".kotori,.json"
              style={{ display: "none" }}
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileChange(e.target.files[0]);
                }
              }}
            />

            {/* Drop / Select Area if no file loaded */}
            {!selectedFile ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{
                  padding: "36px 18px",
                  borderRadius: "14px",
                  border: "2px dashed var(--kb-border)",
                  backgroundColor: "var(--kb-bg-secondary)",
                  textAlign: "center",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  margin: "auto 0",
                }}
              >
                <div
                  style={{
                    width: "44px",
                    height: "44px",
                    borderRadius: "12px",
                    backgroundColor: "var(--kb-primary-light)",
                    color: "var(--kb-primary)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 10px",
                  }}
                >
                  <HardDriveUpload style={{ width: "22px", height: "22px" }} />
                </div>
                <div
                  style={{
                    fontSize: "13.5px",
                    fontWeight: 700,
                    color: "var(--kb-text)",
                    marginBottom: "4px",
                  }}
                >
                  {t.importDropText}
                </div>
                <p style={{ fontSize: "11.5px", color: "var(--kb-text-secondary)", margin: 0 }}>
                  {t.importDropSub}
                </p>
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                  flex: 1,
                  minHeight: 0,
                  overflow: "hidden",
                }}
              >
                {/* Active File Header */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "8px 12px",
                    borderRadius: "10px",
                    backgroundColor: "var(--kb-bg-secondary)",
                    border: "1px solid var(--kb-border)",
                    flexShrink: 0,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      overflow: "hidden",
                      minWidth: 0,
                    }}
                  >
                    <FileArchive
                      style={{
                        width: "16px",
                        height: "16px",
                        color: "var(--kb-primary)",
                        flexShrink: 0,
                      }}
                    />
                    <span
                      style={{
                        fontSize: "12px",
                        fontWeight: 700,
                        color: "var(--kb-text)",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                      title={selectedFile.name}
                    >
                      {selectedFile.name}
                    </span>
                  </div>

                  <button
                    onClick={() => {
                      setSelectedFile(null);
                      setInspectionResult(null);
                      setSelectedRestoreIds(new Set());
                    }}
                    style={{
                      border: "none",
                      backgroundColor: "transparent",
                      color: "var(--kb-text-muted)",
                      cursor: "pointer",
                      padding: "4px",
                      borderRadius: "6px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                    title={t.changeFile}
                  >
                    <X style={{ width: "14px", height: "14px" }} />
                  </button>
                </div>

                {isInspecting ? (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                      padding: "36px 0",
                      fontSize: "12.5px",
                      color: "var(--kb-text-secondary)",
                      flex: 1,
                    }}
                  >
                    <Loader2
                      style={{ width: "16px", height: "16px", animation: "spin 1s linear infinite" }}
                    />
                    <span>{t.inspecting}</span>
                  </div>
                ) : inspectionResult && inspectionResult.isValid ? (
                  <>
                    {/* Summary Stat Pills (NO EMOJIS, Clean Lucide SVG Icons) */}
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        alignItems: "center",
                        gap: "6px",
                        padding: "8px 10px",
                        borderRadius: "10px",
                        backgroundColor: "var(--kb-bg-secondary)",
                        border: "1px solid var(--kb-border-subtle)",
                        fontSize: "11px",
                        color: "var(--kb-text)",
                        flexShrink: 0,
                      }}
                    >
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          padding: "2px 6px",
                          borderRadius: "6px",
                          backgroundColor: "var(--kb-surface)",
                          fontWeight: 650,
                        }}
                      >
                        <Library
                          style={{
                            width: "12px",
                            height: "12px",
                            color: "var(--kb-text-secondary)",
                          }}
                        />
                        {t.previewBooks(inspectionResult.books.length)}
                      </span>

                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          padding: "2px 6px",
                          borderRadius: "6px",
                          backgroundColor: "var(--kb-surface)",
                          fontWeight: 650,
                        }}
                      >
                        <BookOpen
                          style={{
                            width: "12px",
                            height: "12px",
                            color: "var(--kb-text-secondary)",
                          }}
                        />
                        {t.previewChapters(inspectionResult.chapters.length)}
                      </span>

                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          padding: "2px 6px",
                          borderRadius: "6px",
                          backgroundColor: "var(--kb-surface)",
                          fontWeight: 650,
                          color: "#10b981",
                        }}
                      >
                        <CheckCircle2 style={{ width: "12px", height: "12px" }} />
                        {t.previewProgress(inspectionResult.progress.length)}
                      </span>

                      {inspectionResult.metadata?.exportedAt && (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            padding: "2px 6px",
                            borderRadius: "6px",
                            backgroundColor: "var(--kb-surface)",
                            color: "var(--kb-text-muted)",
                            marginLeft: "auto",
                          }}
                        >
                          <Calendar style={{ width: "11px", height: "11px" }} />
                          {new Date(inspectionResult.metadata.exportedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>

                    {/* Novel List Controls: Selection counter & Select All */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "2px 2px 0",
                        flexShrink: 0,
                      }}
                    >
                      <span
                        style={{
                          fontSize: "12px",
                          fontWeight: 700,
                          color: "var(--kb-text)",
                        }}
                      >
                        {t.exportSelectedCount(
                          selectedRestoreIds.size,
                          inspectionResult.books.length
                        )}
                      </span>

                      <button
                        onClick={toggleSelectAllRestore}
                        style={{
                          border: "none",
                          backgroundColor: "transparent",
                          color: "var(--kb-primary)",
                          fontSize: "12px",
                          fontWeight: 700,
                          cursor: "pointer",
                          padding: "2px 6px",
                          borderRadius: "6px",
                          transition: "background-color 0.15s ease",
                        }}
                      >
                        {selectedRestoreIds.size === inspectionResult.books.length
                          ? t.deselectAll
                          : t.selectAll}
                      </button>
                    </div>

                    {/* Scrollable Novel List Cards with Individual Checkboxes */}
                    <div
                      className="kb-backup-scroll"
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "8px",
                        flex: "1 1 auto",
                        minHeight: "120px",
                        maxHeight: "min(340px, 44vh)",
                        overflowY: "auto",
                        paddingRight: "4px",
                      }}
                    >
                      {inspectionResult.books.map((book) => {
                        const isChecked = selectedRestoreIds.has(book.id);
                        const prog = inspectionResult.progress.find((p) => p.bookId === book.id);
                        const chIdx = prog ? prog.chapterIndex : 0;
                        const chapter = inspectionResult.chapters.find(
                          (c) => c.bookId === book.id && c.index === chIdx
                        );
                        const chapterName = chapter?.title
                          ? chapter.title
                          : `${language === "ID" ? "Bab" : "Chapter"} ${chIdx + 1}`;
                        const backupPercent = prog
                          ? Math.min(
                              100,
                              Math.round(
                                ((prog.chapterIndex + prog.scrollPosition) /
                                  Math.max(book.totalChapters, 1)) *
                                  100
                              )
                            )
                          : 0;

                        // Compare against existing local book & progress
                        const localBook = currentBooks.find(
                          (b) =>
                            b.id === book.id ||
                            b.title.trim().toLowerCase() === book.title.trim().toLowerCase()
                        );
                        const localProg = localBook ? currentProgresses[localBook.id] : undefined;
                        const isNewBook = !localBook;

                        const localScore = localProg
                          ? localProg.chapterIndex + localProg.scrollPosition
                          : -1;
                        const backupScore = prog ? prog.chapterIndex + prog.scrollPosition : -1;

                        let comparisonStatus: "new" | "ahead" | "behind" | "same" = "same";
                        if (isNewBook) {
                          comparisonStatus = "new";
                        } else if (backupScore > localScore) {
                          comparisonStatus = "ahead";
                        } else if (localScore > backupScore) {
                          comparisonStatus = "behind";
                        } else {
                          comparisonStatus = "same";
                        }

                        const localPercent = localProg
                          ? Math.min(
                              100,
                              Math.round(
                                ((localProg.chapterIndex + localProg.scrollPosition) /
                                  Math.max(localBook!.totalChapters, 1)) *
                                  100
                              )
                            )
                          : 0;

                        // Try to find chapter title for local progress if available
                        const localChapter = localProg
                          ? inspectionResult.chapters.find(
                              (c) => c.bookId === book.id && c.index === localProg.chapterIndex
                            )
                          : undefined;
                        const localChapterName = localProg
                          ? localChapter?.title ||
                            `${language === "ID" ? "Bab" : "Chapter"} ${localProg.chapterIndex + 1}`
                          : "";

                        return (
                          <div
                            key={book.id}
                            className="kb-backup-book-item"
                            onClick={() => toggleRestoreBook(book.id)}
                            style={{
                              display: "flex",
                              alignItems: "flex-start",
                              gap: "10px",
                              padding: "10px 12px",
                              borderRadius: "12px",
                              backgroundColor: isChecked ? "var(--kb-bg-secondary)" : "transparent",
                              border: isChecked
                                ? comparisonStatus === "behind"
                                  ? "1px solid rgba(245, 158, 11, 0.45)"
                                  : "1px solid rgba(99, 102, 241, 0.35)"
                                : "1px solid var(--kb-border-subtle)",
                              cursor: "pointer",
                              opacity: isChecked ? 1 : 0.55,
                              transition: "all 0.15s ease",
                            }}
                          >
                            {/* Checkbox (Aligned at top with title) */}
                            <div style={{ paddingTop: "2px" }}>
                              <KotoriCheckbox
                                checked={isChecked}
                                onChange={() => toggleRestoreBook(book.id)}
                                size={18}
                              />
                            </div>

                            {/* Cover thumbnail */}
                            <div
                              style={{
                                width: "34px",
                                height: "48px",
                                borderRadius: "6px",
                                overflow: "hidden",
                                backgroundColor: "var(--kb-surface)",
                                flexShrink: 0,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                border: "1px solid var(--kb-border-subtle)",
                              }}
                            >
                              {book.coverUrl ? (
                                <img
                                  src={book.coverUrl}
                                  alt={book.title}
                                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                />
                              ) : (
                                <BookOpen
                                  style={{
                                    width: "14px",
                                    height: "14px",
                                    color: "var(--kb-text-muted)",
                                  }}
                                />
                              )}
                            </div>

                            {/* Content & Comparison details */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              {/* Title + Clean Status Badge */}
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                  gap: "8px",
                                  flexWrap: "wrap",
                                }}
                              >
                                <div
                                  style={{
                                    fontSize: "12.5px",
                                    fontWeight: 700,
                                    color: "var(--kb-text)",
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    flex: "1 1 180px",
                                  }}
                                  title={book.title}
                                >
                                  {book.title}
                                </div>

                                <span
                                  style={{
                                    fontSize: "10px",
                                    fontWeight: 700,
                                    padding: "2px 7px",
                                    borderRadius: "6px",
                                    whiteSpace: "nowrap",
                                    flexShrink: 0,
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "3.5px",
                                    backgroundColor:
                                      comparisonStatus === "new"
                                        ? "rgba(16, 185, 129, 0.12)"
                                        : comparisonStatus === "ahead"
                                        ? "rgba(99, 102, 241, 0.12)"
                                        : comparisonStatus === "behind"
                                        ? "rgba(245, 158, 11, 0.16)"
                                        : "rgba(148, 163, 184, 0.12)",
                                    color:
                                      comparisonStatus === "new"
                                        ? "#10b981"
                                        : comparisonStatus === "ahead"
                                        ? "var(--kb-primary)"
                                        : comparisonStatus === "behind"
                                        ? "#d97706"
                                        : "var(--kb-text-muted)",
                                  }}
                                >
                                  {comparisonStatus === "new" && (
                                    <>
                                      <Plus style={{ width: "10px", height: "10px" }} />
                                      <span>{t.badgeNew}</span>
                                    </>
                                  )}
                                  {comparisonStatus === "ahead" && (
                                    <>
                                      <ArrowUpRight style={{ width: "10px", height: "10px" }} />
                                      <span>{t.badgeAhead}</span>
                                    </>
                                  )}
                                  {comparisonStatus === "behind" && (
                                    <>
                                      <AlertTriangle style={{ width: "10px", height: "10px" }} />
                                      <span>{t.badgeBehind}</span>
                                    </>
                                  )}
                                  {comparisonStatus === "same" && (
                                    <>
                                      <Check style={{ width: "10px", height: "10px" }} />
                                      <span>{t.badgeIdentical}</span>
                                    </>
                                  )}
                                </span>
                              </div>

                              {/* Responsive Progress Comparison (Stacked Rows with Horizontal Scrollable Text) */}
                              <div
                                style={{
                                  display: "flex",
                                  flexDirection: "column",
                                  gap: "3px",
                                  marginTop: "5px",
                                }}
                              >
                                {!isNewBook ? (
                                  <>
                                    {/* Local Progress Row */}
                                    <div
                                      style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "6px",
                                        fontSize: "11px",
                                        minWidth: 0,
                                      }}
                                    >
                                      <span
                                        style={{
                                          padding: "1px 6px",
                                          borderRadius: "4px",
                                          fontSize: "10px",
                                          fontWeight: 700,
                                          backgroundColor:
                                            comparisonStatus === "behind"
                                              ? "rgba(245, 158, 11, 0.18)"
                                              : "var(--kb-surface)",
                                          color:
                                            comparisonStatus === "behind"
                                              ? "#d97706"
                                              : "var(--kb-text-secondary)",
                                          border: "1px solid var(--kb-border-subtle)",
                                          flexShrink: 0,
                                          lineHeight: 1.3,
                                        }}
                                      >
                                        {t.currentLabel}
                                      </span>

                                      <div
                                        className="kb-chip-scroll"
                                        style={{
                                          display: "flex",
                                          alignItems: "center",
                                          gap: "4px",
                                          minWidth: 0,
                                          color:
                                            comparisonStatus === "behind"
                                              ? "var(--kb-text)"
                                              : "var(--kb-text-secondary)",
                                          fontWeight: comparisonStatus === "behind" ? 650 : 400,
                                          whiteSpace: "nowrap",
                                        }}
                                        title={
                                          localProg
                                            ? `${localChapterName} (${localPercent}%)`
                                            : t.unread
                                        }
                                      >
                                        <span>
                                          {localProg
                                            ? `${localChapterName} (${localPercent}%)`
                                            : t.unread}
                                        </span>
                                      </div>
                                    </div>

                                    {/* Backup Progress Row */}
                                    <div
                                      style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "6px",
                                        fontSize: "11px",
                                        minWidth: 0,
                                      }}
                                    >
                                      <span
                                        style={{
                                          padding: "1px 6px",
                                          borderRadius: "4px",
                                          fontSize: "10px",
                                          fontWeight: 700,
                                          backgroundColor:
                                            comparisonStatus === "ahead"
                                              ? "var(--kb-primary-light)"
                                              : "var(--kb-surface)",
                                          color:
                                            comparisonStatus === "ahead"
                                              ? "var(--kb-primary)"
                                              : "var(--kb-text-secondary)",
                                          border: "1px solid var(--kb-border-subtle)",
                                          flexShrink: 0,
                                          lineHeight: 1.3,
                                        }}
                                      >
                                        {t.backupLabel}
                                      </span>

                                      <div
                                        className="kb-chip-scroll"
                                        style={{
                                          display: "flex",
                                          alignItems: "center",
                                          gap: "4px",
                                          minWidth: 0,
                                          color:
                                            comparisonStatus === "ahead"
                                              ? "var(--kb-text)"
                                              : "var(--kb-text-secondary)",
                                          fontWeight: comparisonStatus === "ahead" ? 650 : 400,
                                          whiteSpace: "nowrap",
                                        }}
                                        title={
                                          prog ? `${chapterName} (${backupPercent}%)` : t.unread
                                        }
                                      >
                                        <span>
                                          {prog ? `${chapterName} (${backupPercent}%)` : t.unread}
                                        </span>
                                      </div>
                                    </div>
                                  </>
                                ) : (
                                  <div
                                    style={{
                                      fontSize: "11px",
                                      color: "var(--kb-text-secondary)",
                                      display: "flex",
                                      alignItems: "center",
                                      gap: "6px",
                                    }}
                                  >
                                    <span>
                                      {book.totalChapters} {language === "ID" ? "Bab" : "Ch"}
                                    </span>
                                    <span style={{ opacity: 0.35 }}>•</span>
                                    <span
                                      style={{
                                        color: prog ? "var(--kb-primary)" : "var(--kb-text-muted)",
                                        fontWeight: prog ? 600 : 400,
                                        whiteSpace: "nowrap",
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                      }}
                                    >
                                      {prog ? `${chapterName} (${backupPercent}%)` : t.unread}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Smart Preservation Option Checkbox */}
                    <div
                      onClick={() => setPreserveNewer(!preserveNewer)}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "10px",
                        marginTop: "2px",
                        padding: "9px 12px",
                        borderRadius: "10px",
                        backgroundColor: "var(--kb-bg-secondary)",
                        border: "1px solid var(--kb-border-subtle)",
                        cursor: "pointer",
                        fontSize: "12px",
                        color: "var(--kb-text)",
                        lineHeight: 1.4,
                        flexShrink: 0,
                      }}
                    >
                      <div style={{ paddingTop: "1px" }}>
                        <KotoriCheckbox
                          checked={preserveNewer}
                          onChange={(val) => setPreserveNewer(val)}
                          size={18}
                        />
                      </div>
                      <div style={{ flex: 1 }}>
                        <span style={{ fontWeight: 650 }}>{t.keepNewerCheckbox}</span>
                        <p
                          style={{
                            margin: "1px 0 0",
                            fontSize: "11px",
                            color: "var(--kb-text-secondary)",
                            lineHeight: 1.35,
                          }}
                        >
                          {t.keepNewerDesc}
                        </p>
                      </div>
                    </div>

                    {/* Restore Action Button (Always pinned at bottom) */}
                    <div style={{ paddingTop: "2px", flexShrink: 0 }}>
                      <button
                        onClick={handleRestore}
                        disabled={isRestoring || selectedRestoreIds.size === 0}
                        style={{
                          width: "100%",
                          padding: "11px 16px",
                          fontSize: "13.5px",
                          fontWeight: 700,
                          borderRadius: "12px",
                          border: "none",
                          backgroundColor:
                            isRestoring || selectedRestoreIds.size === 0
                              ? "var(--kb-bg-secondary)"
                              : "var(--kb-primary)",
                          color:
                            isRestoring || selectedRestoreIds.size === 0
                              ? "var(--kb-text-muted)"
                              : "#ffffff",
                          cursor:
                            isRestoring || selectedRestoreIds.size === 0 ? "not-allowed" : "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "8px",
                          boxShadow:
                            isRestoring || selectedRestoreIds.size === 0
                              ? "none"
                              : "0 4px 14px rgba(99,102,241,0.25)",
                          transition: "all 0.15s ease",
                        }}
                      >
                        {isRestoring ? (
                          <>
                            <Loader2
                              style={{
                                width: "16px",
                                height: "16px",
                                animation: "spin 1s linear infinite",
                              }}
                            />
                            <span>{t.restoring}</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 style={{ width: "16px", height: "16px" }} />
                            <span>{t.restoreButton(selectedRestoreIds.size)}</span>
                          </>
                        )}
                      </button>
                    </div>
                  </>
                ) : (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "12px",
                      borderRadius: "10px",
                      backgroundColor: "rgba(239, 68, 68, 0.1)",
                      fontSize: "12px",
                      color: "#ef4444",
                    }}
                  >
                    <AlertCircle style={{ width: "15px", height: "15px", flexShrink: 0 }} />
                    <span>{inspectionResult?.error || t.invalidFile}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
