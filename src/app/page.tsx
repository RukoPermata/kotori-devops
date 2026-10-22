"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { flushSync } from "react-dom";
import {
  BookOpen,
  Upload,
  Trash2,
  MoreVertical,
  Library,
  FileText,
  Search,
  Moon,
  Sun,
  Plus,
  User,
  Menu,
  X,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  LayoutGrid,
  Sparkles,
  MessageSquare,
  History,
  HardDriveDownload,
  HardDriveUpload,
  Globe,
  ExternalLink,
} from "lucide-react";
import dynamic from "next/dynamic";
import {
  getAllBooks,
  saveBook,
  deleteBook,
  getProgress,
  deleteProgress,
  getChapter,
  getChapters,
} from "@/services/book-storage";
import { formatFileSize, truncate } from "@/lib/utils";
import type { BookMeta, ReadingProgress, Chapter } from "@/types/book";
import { getSystemTheme } from "@/types/book";
import { Footer } from "@/components/Footer";
import { DictionarySearchFab } from "@/components/DictionarySearchFab";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { BookCard } from "@/components/home/BookCard";
import { BookPreviewModal } from "@/components/home/BookPreviewModal";
import { TRANSLATIONS } from "@/data/translations";
// Deferred out of the initial bundle - most page loads never open the search modal or upload a
// book, so their code (plus dictionary-service.ts / jszip+dompurify respectively) shouldn't ship
// on every visit.
const DictionarySearchModal = dynamic(
  () => import("@/components/DictionarySearchModal").then((m) => m.DictionarySearchModal),
  { ssr: false }
);
const ChangeLogModal = dynamic(
  () => import("@/components/ChangeLogModal").then((m) => m.ChangeLogModal),
  { ssr: false }
);
const FeedbackModal = dynamic(
  () => import("@/components/FeedbackModal").then((m) => m.FeedbackModal),
  { ssr: false }
);
const BackupModal = dynamic(
  () => import("@/components/BackupModal").then((m) => m.BackupModal),
  { ssr: false }
);

/* ===== Scroll Reveal Wrapper ===== */
function RevealSection({
  children,
  className = "kb-reveal",
  style,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  delay?: number;
}) {
  const [ref, isVisible] = useScrollReveal();
  return (
    <div
      ref={ref}
      className={`${className} ${isVisible ? "kb-visible" : ""}`}
      style={{ ...style, transitionDelay: delay ? `${delay}ms` : undefined }}
    >
      {children}
    </div>
  );
}


/* ===== Helper to Parse Series and Volume from Title ===== */
function parseSeriesAndVolume(title: string): { series: string; volume: number | null } {
  // Convert full-width numbers to half-width numbers and normalize all space characters
  let cleanTitle = title
    .replace(/\.epub$/i, "")
    .replace(/[０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xfee0))
    .replace(/[\s\u00a0\u3000]+/g, " ")
    .trim();

  // 1. Remove bracket contents like 【電子特典付き】, (z-library), etc.
  cleanTitle = cleanTitle.replace(/[【\[\(\{\uff08\uff3b].*?[】\]\)\}\uff09\uff3d]/g, "").trim();

  // 2. Parse volume numbers
  let volume: number | null = null;
  const patterns = [
    /\s+(?:volume|vol|v)\.?\s*(\d+)/i,          // Vol 1, Vol. 1, Volume 1, v1
    /\s+(\d+)\s*$/i,                           // "Sword Art Online 1" at the end
    /第?\s*(\d+)\s*巻/i,                       // 1巻, 第1巻
    /\b(\d+)\b/,                               // Any standalone number in the title
  ];

  for (const pattern of patterns) {
    const match = cleanTitle.match(pattern);
    if (match) {
      volume = parseInt(match[1], 10);
      cleanTitle = cleanTitle.replace(pattern, "").trim();
      break;
    }
  }

  // 3. Extract the clean series name (omit sub-volume subtitles / suffixes)
  // Split by full-width or half-width spaces
  const parts = cleanTitle.split(/[\s　]+/);
  if (parts.length > 1) {
    // If the first part contains Japanese characters (Kanji/Kana), we treat it as the main series name
    const hasJapanese = /[\u3040-\u30ff\u4e00-\u9faf]/.test(parts[0]);
    if (hasJapanese) {
      cleanTitle = parts[0];
    }
  }

  // Clean trailing punctuation/dashes
  cleanTitle = cleanTitle.replace(/\s*[-–—:：~～]\s*$/, "").trim();

  return { series: cleanTitle, volume };
}

export default function HomePage() {
  const router = useRouter();
  const [books, setBooks] = useState<BookMeta[]>([]);
  const [progresses, setProgresses] = useState<
    Record<string, ReadingProgress | undefined>
  >({});
  const [hasStoredBooks, setHasStoredBooks] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [language, setLanguage] = useState<"ID" | "EN">("EN");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"shelf" | "grid">("shelf");
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMenuAnimating, setIsMenuAnimating] = useState(false);
  const [previewBook, setPreviewBook] = useState<BookMeta | null>(null);
  const [previewChapter, setPreviewChapter] = useState<Chapter | null>(null);
  const [previewChapters, setPreviewChapters] = useState<Chapter[]>([]);
  const [previewPhase, setPreviewPhase] = useState<"none" | "idle" | "tucked" | "tucking" | "centering" | "opening" | "flipping" | "zooming">("none");
  const [isLandscapeImg, setIsLandscapeImg] = useState(false);

  // Modal states
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showDictionarySearch, setShowDictionarySearch] = useState(false);
  const [showChangeLog, setShowChangeLog] = useState(false);
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [showDomainNotice, setShowDomainNotice] = useState(false);
  const [backupInitialTab, setBackupInitialTab] = useState<"export" | "import">("export");

  useEffect(() => {
    setIsLandscapeImg(false);
    if (previewBook) {
      const progress = progresses[previewBook.id];
      const chIndex = progress ? progress.chapterIndex : 0;
      getChapter(previewBook.id, chIndex).then((ch) => {
        setPreviewChapter(ch ?? null);
      });
      getChapters(previewBook.id).then((chs) => {
        setPreviewChapters(chs || []);
      });
    } else {
      setPreviewChapter(null);
      setPreviewChapters([]);
    }
  }, [previewBook, progresses]);

  const openMobileMenu = () => {
    setIsMobileMenuOpen(true);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setIsMenuAnimating(true);
      });
    });
  };

  const closeMobileMenu = () => {
    setIsMenuAnimating(false);
    setTimeout(() => {
      setIsMobileMenuOpen(false);
    }, 280);
  };
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [resetConfirm, setResetConfirm] = useState<string | null>(null);
  const [pendingNonJapaneseBook, setPendingNonJapaneseBook] = useState<{
    book: BookMeta;
    chapters: Chapter[];
    remainingFiles: File[];
    updatedBooks: BookMeta[];
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [toasts, setToasts] = useState<Array<{
    id: number;
    message: string;
    type: "success" | "error" | "delete" | "reset";
    animatingOut: boolean;
  }>>([]);
  const toastIdRef = useRef(0);
  const toastTimersRef = useRef<Map<number, {
    timer: ReturnType<typeof setTimeout> | null;
    startTime: number;
    remainingTime: number;
  }>>(new Map());

  const dismissToast = useCallback((id: number) => {
    const info = toastTimersRef.current.get(id);
    if (info?.timer) {
      clearTimeout(info.timer);
    }
    toastTimersRef.current.delete(id);
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, animatingOut: true } : t)));
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 300);
  }, []);

  const pauseToastTimer = useCallback((id: number) => {
    const info = toastTimersRef.current.get(id);
    if (info && info.timer) {
      clearTimeout(info.timer);
      info.timer = null;
      const elapsed = Date.now() - info.startTime;
      info.remainingTime = Math.max(800, info.remainingTime - elapsed);
    }
  }, []);

  const resumeToastTimer = useCallback((id: number) => {
    const info = toastTimersRef.current.get(id);
    if (info && !info.timer && info.remainingTime > 0) {
      info.startTime = Date.now();
      info.timer = setTimeout(() => {
        dismissToast(id);
      }, info.remainingTime);
    }
  }, [dismissToast]);

  const showToast = useCallback((message: string, type: "success" | "error" | "delete" | "reset" = "success") => {
    const id = ++toastIdRef.current;
    setToasts((prev) => [...prev, { id, message, type, animatingOut: false }]);

    const remainingTime = 4000;
    const startTime = Date.now();
    const timer = setTimeout(() => {
      dismissToast(id);
    }, remainingTime);

    toastTimersRef.current.set(id, { timer, startTime, remainingTime });
  }, [dismissToast]);

  useEffect(() => {
    return () => {
      toastTimersRef.current.forEach((info) => {
        if (info.timer) clearTimeout(info.timer);
      });
      toastTimersRef.current.clear();
    };
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined" && localStorage.getItem("kotoba-has-books") === "true") {
      setHasStoredBooks(true);
    }
    loadBooks();
    const savedTheme = localStorage.getItem("kotoba-theme") as "light" | "dark" | null;
    const t = savedTheme || getSystemTheme();
    setTheme(t as "light" | "dark");
    document.documentElement.setAttribute("data-theme", t);

    const savedLang = localStorage.getItem("kotoba-language") as "ID" | "EN" | null;
    if (savedLang === "ID" || savedLang === "EN") {
      setLanguage(savedLang);
    } else {
      const browserLang = navigator.language || navigator.languages?.[0] || "";
      setLanguage(browserLang.toLowerCase().startsWith("id") ? "ID" : "EN");
    }

    const savedViewMode = localStorage.getItem("kotoba-view-mode") as "shelf" | "grid" | null;
    if (savedViewMode) setViewMode(savedViewMode);

    const isDomainNoticeDismissed = localStorage.getItem("kotori-domain-notice-dismissed");
    if (!isDomainNoticeDismissed) {
      setShowDomainNotice(true);
    }
  }, []);

  const handleLanguageChange = (lang: "ID" | "EN") => {
    setLanguage(lang);
    localStorage.setItem("kotoba-language", lang);
  };

  const t = TRANSLATIONS[language];

  const loadBooks = async () => {
    try {
      const allBooks = await getAllBooks();
      setBooks(allBooks);
      const hasBooks = allBooks.length > 0;
      setHasStoredBooks(hasBooks);
      if (typeof window !== "undefined") {
        localStorage.setItem("kotoba-has-books", hasBooks ? "true" : "false");
      }
      const progs: Record<string, ReadingProgress | undefined> = {};
      for (const book of allBooks) {
        progs[book.id] = await getProgress(book.id);
      }
      setProgresses(progs);
    } catch (error) {
      console.error("Failed to load books:", error);
    }
    setIsLoading(false);
  };

  const processUploadQueue = useCallback(
    async (queue: File[], currentUpdatedBooks: BookMeta[]) => {
      if (queue.length === 0) {
        setIsUploading(false);
        setUploadProgress("");
        await loadBooks();
        return;
      }

      const [file, ...remaining] = queue;
      try {
        setUploadProgress(t.uploadReading(truncate(file.name, 35)));
        const { parseEpub } = await import("@/services/epub-parser");
        const { book, chapters, isJapanese } = await parseEpub(file);

        const exists = currentUpdatedBooks.some(
          (b) =>
            b.title.toLowerCase().trim() === book.title.toLowerCase().trim() &&
            b.author.toLowerCase().trim() === book.author.toLowerCase().trim()
        );

        if (exists) {
          showToast(t.bookExists(truncate(book.title, 40)), "error");
          await processUploadQueue(remaining, currentUpdatedBooks);
          return;
        }

        if (!isJapanese) {
          // Pause upload and prompt confirmation
          setIsUploading(false);
          setUploadProgress("");
          setPendingNonJapaneseBook({
            book,
            chapters,
            remainingFiles: remaining,
            updatedBooks: currentUpdatedBooks,
          });
          return;
        }

        setUploadProgress(t.uploadSaving(truncate(book.title, 35)));
        await saveBook(book, chapters);
        currentUpdatedBooks.push(book);
        showToast(t.bookAdded(truncate(book.title, 40)), "success");
        await processUploadQueue(remaining, currentUpdatedBooks);
      } catch (error) {
        console.error(`Failed to parse ${file.name}:`, error);
        alert(`Failed to parse "${file.name}". Make sure it's a valid EPUB file.`);
        await processUploadQueue(remaining, currentUpdatedBooks);
      }
    },
    [loadBooks, showToast, t]
  );

  const handleUpload = useCallback(
    async (files: FileList | File[]) => {
      const fileArray = Array.from(files);
      const epubFiles = fileArray.filter(
        (f) => f.name.endsWith(".epub") || f.type === "application/epub+zip"
      );
      if (epubFiles.length === 0) {
        alert("Please select an EPUB file.");
        return;
      }
      setIsUploading(true);
      await processUploadQueue(epubFiles, [...books]);
    },
    [books, processUploadQueue]
  );

  const handleConfirmNonJapanese = async (accept: boolean) => {
    if (!pendingNonJapaneseBook) return;
    const { book, chapters, remainingFiles, updatedBooks } = pendingNonJapaneseBook;
    setPendingNonJapaneseBook(null);

    if (accept) {
      setIsUploading(true);
      try {
        setUploadProgress(t.uploadSaving(truncate(book.title, 35)));
        await saveBook(book, chapters);
        updatedBooks.push(book);
        showToast(t.bookAdded(truncate(book.title, 40)), "success");
      } catch (error) {
        console.error(`Failed to save ${book.title}:`, error);
        alert(`Failed to save "${book.title}".`);
      }
      await processUploadQueue(remainingFiles, updatedBooks);
    } else {
      if (remainingFiles.length > 0) {
        setIsUploading(true);
        await processUploadQueue(remainingFiles, updatedBooks);
      } else {
        await loadBooks();
      }
    }
  };

  const handleDelete = async (bookId: string) => {
    const book = books.find((b) => b.id === bookId);
    const bookTitle = book ? book.title : "";
    await deleteBook(bookId);
    setDeleteConfirm(null);
    await loadBooks();
    showToast(t.bookDeleted(truncate(bookTitle, 40)), "delete");
  };

  const handleResetProgress = async (bookId: string) => {
    const book = books.find((b) => b.id === bookId);
    const bookTitle = book ? book.title : "";
    try {
      await deleteProgress(bookId);
      setResetConfirm(null);
      await loadBooks();
      showToast(t.progressReset(truncate(bookTitle, 40)), "reset");
    } catch (error) {
      console.error("Failed to reset progress:", error);
      alert("Failed to reset reading progress.");
    }
  };

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    localStorage.setItem("kotoba-theme", newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
  };

  const changeViewMode = (newMode: "shelf" | "grid") => {
    if (typeof document !== "undefined" && (document as any).startViewTransition) {
      setIsTransitioning(true);
      const timer = setTimeout(() => {
        setIsTransitioning(false);
      }, 500);

      const transition = (document as any).startViewTransition(() => {
        flushSync(() => {
          setViewMode(newMode);
        });
        localStorage.setItem("kotoba-view-mode", newMode);
      });
      transition.finished
        .then(() => {
          clearTimeout(timer);
          setIsTransitioning(false);
        })
        .catch(() => {
          clearTimeout(timer);
          setIsTransitioning(false);
        });
    } else {
      setViewMode(newMode);
      localStorage.setItem("kotoba-view-mode", newMode);
    }
  };

  const handleBookClick = (book: BookMeta) => {
    setPreviewBook(book);
    setPreviewPhase("tucked");
    setTimeout(() => {
      setPreviewPhase("idle");
    }, 50);
  };

  const handleClosePreview = () => {
    if (previewPhase !== "idle") return;
    setPreviewPhase("tucked");
    setTimeout(() => {
      setPreviewBook(null);
      setPreviewPhase("none");
    }, 500);
  };

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    if (img.naturalWidth > img.naturalHeight) {
      setIsLandscapeImg(true);
    }
  };
  const startBookTransition = (book: BookMeta) => {
    setPreviewPhase("tucking");

    const progress = progresses[book.id];
    const chapterIndex = progress ? progress.chapterIndex : 0;

    setTimeout(() => {
      setPreviewPhase("centering");

      setTimeout(() => {
        setPreviewPhase("opening");

        if (chapterIndex > 0) {
          // Immediately start page flipping alongside cover opening (0ms delay)
          setPreviewPhase("flipping");

          const numFlips = Math.min(chapterIndex, 10);
          const flippingDuration = 400 + numFlips * 90;

          setTimeout(() => {
            setPreviewPhase("zooming");

            setTimeout(() => {
              router.push(`/reader/${book.id}`);
              setTimeout(() => {
                setPreviewBook(null);
                setPreviewPhase("none");
              }, 400);
            }, 500);
          }, flippingDuration);
        } else {
          // No chapters read -> skip flipping sequence
          setTimeout(() => {
            setPreviewPhase("zooming");

            setTimeout(() => {
              router.push(`/reader/${book.id}`);
              setTimeout(() => {
                setPreviewBook(null);
                setPreviewPhase("none");
              }, 400);
            }, 500);
          }, 500);
        }
      }, 400);
    }, 400);
  };

  const isEpubDragEvent = (e: React.DragEvent) => {
    if (!e.dataTransfer || !e.dataTransfer.items) return false;
    const items = Array.from(e.dataTransfer.items);
    if (items.length === 0) return false;
    return items.some((item) => {
      if (item.kind !== "file") return false;
      const type = item.type.toLowerCase();
      // Explicitly ignore images, videos, audio, pdf, text
      if (
        type.startsWith("image/") ||
        type.startsWith("video/") ||
        type.startsWith("audio/") ||
        type === "text/plain" ||
        type === "application/pdf"
      ) {
        return false;
      }
      if (type === "application/epub+zip" || type.includes("epub")) {
        return true;
      }
      return type === "";
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (isEpubDragEvent(e)) {
      setIsDragOver(true);
    } else {
      setIsDragOver(false);
    }
  };
  const handleDragLeave = (e: React.DragEvent) => {
    if (!e.relatedTarget || (e.relatedTarget as HTMLElement).nodeName === "HTML") {
      setIsDragOver(false);
    }
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files);
      const epubFiles = files.filter(
        (f) => f.name.toLowerCase().endsWith(".epub") || f.type === "application/epub+zip"
      );
      if (epubFiles.length > 0) {
        handleUpload(epubFiles);
      }
    }
  };

  const filteredBooks = books.filter(
    (b) =>
      b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.author.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const sortedFilteredBooks = useMemo(() => {
    return [...filteredBooks].sort((a, b) => {
      const { series: seriesA, volume: volA } = parseSeriesAndVolume(a.title);
      const { series: seriesB, volume: volB } = parseSeriesAndVolume(b.title);

      const seriesCompare = seriesA.localeCompare(seriesB, "ja");
      if (seriesCompare !== 0) return seriesCompare;

      if (volA === null && volB === null) return b.uploadedAt - a.uploadedAt;
      if (volA === null) return 1;
      if (volB === null) return -1;
      return volA - volB;
    });
  }, [filteredBooks]);

  const groupedShelves = useMemo(() => {
    if (viewMode === "grid" || searchQuery) return null;

    // Grouping by series
    const groups: Record<string, BookMeta[]> = {};
    for (const book of sortedFilteredBooks) {
      const { series } = parseSeriesAndVolume(book.title);
      const key = series.toLowerCase().trim();
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(book);
    }

    const shelves: { seriesName: string; books: BookMeta[] }[] = [];

    for (const key of Object.keys(groups)) {
      const groupBooks = groups[key];
      const seriesName = parseSeriesAndVolume(groupBooks[0].title).series;
      shelves.push({ seriesName, books: groupBooks });
    }

    // Sort shelves alphabetically by series name
    shelves.sort((a, b) => a.seriesName.localeCompare(b.seriesName, "ja"));

    return { shelves };
  }, [sortedFilteredBooks, viewMode, searchQuery]);

  return (
    <div
      className={isTransitioning ? "kb-view-transitioning" : ""}
      style={{
        minHeight: "100vh",
        backgroundColor: "var(--kb-bg)",
        color: "var(--kb-text)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* ===== Slim Domain Announcement Bar ===== */}
      <aside
        className="kb-domain-top-bar"
        aria-label="Pemberitahuan Migrasi Domain"
        style={{
          backgroundColor: "var(--kb-primary-light)",
          borderBottom: "1px solid rgba(99, 102, 241, 0.2)",
          color: "var(--kb-text)",
          position: "relative",
          zIndex: 60,
        }}
      >
        <div
          className="kb-domain-inner"
          style={{
            maxWidth: "1280px",
            margin: "0 auto",
            padding: "8px 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
          }}
        >
          <Globe
            style={{
              width: "15px",
              height: "15px",
              color: "var(--kb-primary)",
              flexShrink: 0,
              alignSelf: "flex-start",
              marginTop: "2px",
            }}
          />
          <div
            className="kb-domain-message"
            style={{
              fontSize: "12px",
              lineHeight: 1.5,
              color: "var(--kb-text)",
            }}
          >
            <span>
              {t.domainNoticeTextBefore}{" "}
              <a
                href="https://kotori.kaisaaru.dev"
                style={{
                  color: "var(--kb-primary)",
                  fontWeight: 800,
                  textDecoration: "underline",
                  textUnderlineOffset: "3px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "2px",
                  whiteSpace: "nowrap",
                }}
              >
                <span>{t.domainNoticeLinkNew}</span>
                <ExternalLink style={{ width: "11px", height: "11px" }} />
              </a>
              {t.domainNoticeTextMiddle}{" "}
              <a
                href="https://readkotori.vercel.app"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: "var(--kb-primary)",
                  fontWeight: 800,
                  textDecoration: "underline",
                  textUnderlineOffset: "3px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "2px",
                  whiteSpace: "nowrap",
                }}
              >
                <span>{t.domainNoticeLinkOld}</span>
                <ExternalLink style={{ width: "11px", height: "11px" }} />
              </a>
              {t.domainNoticeTextAfter}
            </span>
          </div>
        </div>
      </aside>

      {/* ===== Header ===== */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          width: "100%",
          backgroundColor: "var(--kb-toolbar-bg)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          borderBottom: "1px solid var(--kb-border)",
        }}
      >
        <div
          className="kb-header-inner"
          style={{
            maxWidth: "1320px",
            margin: "0 auto",
            height: "70px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 32px",
            gap: "16px",
          }}
        >
          {/* Mobile Hamburger Button (Left side on Mobile) */}
          <button
            className="kb-mobile-hamburger-btn"
            onClick={() => {
              if (isMobileMenuOpen) {
                closeMobileMenu();
              } else {
                openMobileMenu();
              }
            }}
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "12px",
              backgroundColor: "var(--kb-bg-secondary)",
              border: "1px solid var(--kb-border)",
              color: "var(--kb-text)",
              cursor: "pointer",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
            title="Menu Pengaturan"
          >
            {isMobileMenuOpen ? <X style={{ width: "20px", height: "20px" }} /> : <Menu style={{ width: "20px", height: "20px" }} />}
          </button>

          {/* Logo */}
          <div
            className="kb-logo-container"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              cursor: "pointer",
              flexShrink: 0,
            }}
            onClick={() => router.push("/")}
          >
            <Image
              src="/icon.png"
              alt="Kotori"
              width={36}
              height={36}
              preload
              fetchPriority="high"
              style={{
                objectFit: "contain",
                flexShrink: 0,
              }}
            />
            <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
              <h1 style={{ fontSize: "17px", fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.2, whiteSpace: "nowrap" }}>
                Kotori
              </h1>
              <p className="kb-logo-subtitle" style={{ fontSize: "12px", fontWeight: 500, color: "var(--kb-text-muted)", marginTop: "1px", whiteSpace: "nowrap" }}>
                {t.subtitle}
              </p>
            </div>
          </div>

          {/* Search Input (Desktop view in center, mobile view on line 2) */}
          <div
            className="kb-search-container"
            style={{
              position: "relative",
              display: "flex",
              alignItems: "center",
            }}
          >
            <Search
              style={{
                position: "absolute",
                left: "14px",
                width: "16px",
                height: "16px",
                color: "var(--kb-text-muted)",
                pointerEvents: "none",
              }}
            />
            <input
              type="text"
              placeholder={t.searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="kb-search-input"
              style={{
                height: "40px",
                width: "100%",
                paddingLeft: "42px",
                paddingRight: "16px",
                fontSize: "13px",
                backgroundColor: "var(--kb-bg-secondary)",
                border: "1px solid var(--kb-border)",
                color: "var(--kb-text)",
                borderRadius: "12px",
                outline: "none",
                transition: "all 0.2s ease",
              }}
            />
          </div>

          {/* Desktop Right side controls */}
          <div
            className="kb-desktop-controls"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              flexShrink: 0,
            }}
          >
            {/* Change Log Button */}
            <button
              onClick={() => setShowChangeLog(true)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "36px",
                height: "36px",
                borderRadius: "12px",
                backgroundColor: "var(--kb-bg-secondary)",
                color: "var(--kb-text)",
                border: "1px solid var(--kb-border)",
                cursor: "pointer",
                transition: "all 0.2s ease",
                flexShrink: 0,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--kb-surface-hover)")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "var(--kb-bg-secondary)")}
              title="Change Log"
              aria-label="Change Log"
            >
              <History style={{ width: "16px", height: "16px" }} />
            </button>

            {/* Backup & Restore Button */}
            <button
              onClick={() => {
                setBackupInitialTab("export");
                setShowBackupModal(true);
              }}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "36px",
                height: "36px",
                borderRadius: "12px",
                backgroundColor: "var(--kb-bg-secondary)",
                color: "var(--kb-text)",
                border: "1px solid var(--kb-border)",
                cursor: "pointer",
                transition: "all 0.2s ease",
                flexShrink: 0,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--kb-surface-hover)")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "var(--kb-bg-secondary)")}
              title={language === "ID" ? "Cadangkan & Pulihkan (Backup & Restore)" : "Backup & Restore Library"}
              aria-label="Backup & Restore"
            >
              <HardDriveDownload style={{ width: "16px", height: "16px" }} />
            </button>

            {/* Feedback Button */}
            <button
              onClick={() => setShowFeedbackModal(true)}
              className="kb-header-feedback-btn"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 14px",
                fontSize: "13px",
                fontWeight: 700,
                borderRadius: "12px",
                backgroundColor: "var(--kb-primary-light)",
                color: "var(--kb-primary)",
                border: "1px solid rgba(99,102,241,0.2)",
                cursor: "pointer",
                transition: "all 0.2s ease",
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "var(--kb-primary)";
                e.currentTarget.style.color = "#ffffff";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "var(--kb-primary-light)";
                e.currentTarget.style.color = "var(--kb-primary)";
              }}
              title={t.feedbackBtn}
            >
              <Sparkles style={{ width: "15px", height: "15px", flexShrink: 0 }} />
              <span className="kb-header-btn-label">{t.feedbackBtn}</span>
            </button>

            {/* Language Switcher (ID / EN) */}
            <div
              className="kb-lang-switcher"
              style={{
                display: "flex",
                alignItems: "center",
                backgroundColor: "var(--kb-bg-secondary)",
                border: "1px solid var(--kb-border)",
                borderRadius: "12px",
                padding: "3px",
                gap: "2px",
              }}
            >
              {(["ID", "EN"] as const).map((lang) => {
                const isActive = language === lang;
                return (
                  <button
                    key={lang}
                    onClick={() => handleLanguageChange(lang)}
                    style={{
                      padding: "5px 10px",
                      fontSize: "12px",
                      fontWeight: 800,
                      borderRadius: "8px",
                      backgroundColor: isActive ? "var(--kb-primary)" : "transparent",
                      color: isActive ? "#ffffff" : "var(--kb-text-secondary)",
                      border: "none",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                      boxShadow: isActive ? "0 2px 6px rgba(0,0,0,0.15)" : "none",
                    }}
                    title={`Ganti bahasa ke ${lang}`}
                  >
                    {lang}
                  </button>
                );
              })}
            </div>

            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "var(--kb-bg-secondary)",
                border: "1px solid var(--kb-border)",
                color: "var(--kb-text-secondary)",
                cursor: "pointer",
                flexShrink: 0,
                transition: "all 0.2s ease",
              }}
              title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            >
              {theme === "dark" ? (
                <Sun style={{ width: "18px", height: "18px" }} />
              ) : (
                <Moon style={{ width: "18px", height: "18px" }} />
              )}
            </button>

            {/* View mode toggle */}
            <button
              onClick={() => {
                changeViewMode(viewMode === "shelf" ? "grid" : "shelf");
              }}
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "var(--kb-bg-secondary)",
                border: "1px solid var(--kb-border)",
                color: "var(--kb-text-secondary)",
                cursor: "pointer",
                flexShrink: 0,
                transition: "all 0.2s ease",
              }}
              title={viewMode === "shelf" ? (language === "ID" ? "Ganti ke tampilan grid" : "Switch to grid view") : (language === "ID" ? "Ganti ke tampilan rak" : "Switch to bookshelf view")}
            >
              {viewMode === "shelf" ? (
                <LayoutGrid style={{ width: "18px", height: "18px" }} />
              ) : (
                <Library style={{ width: "18px", height: "18px" }} />
              )}
            </button>

            {/* Add Book Button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="kb-header-add-btn"
              style={{
                height: "40px",
                paddingLeft: "16px",
                paddingRight: "16px",
                backgroundColor: "var(--kb-primary)",
                color: "white",
                fontSize: "14px",
                fontWeight: 700,
                borderRadius: "12px",
                border: "none",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                whiteSpace: "nowrap",
                flexShrink: 0,
                boxShadow: "0 2px 10px rgba(99,102,241,0.3)",
                transition: "all 0.2s ease",
              }}
            >
              <Plus style={{ width: "16px", height: "16px", strokeWidth: 2.5 }} />
              <span className="kb-add-button-text">{t.addBook}</span>
            </button>
          </div>

          {/* Mobile Right Action Button (+ Add Book) */}
          <button
            className="kb-mobile-add-btn"
            onClick={() => fileInputRef.current?.click()}
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "12px",
              backgroundColor: "var(--kb-primary)",
              color: "white",
              alignItems: "center",
              justifyContent: "center",
              border: "none",
              cursor: "pointer",
              boxShadow: "0 2px 8px rgba(99,102,241,0.25)",
              flexShrink: 0,
            }}
            title={t.addBook}
          >
            <Plus style={{ width: "20px", height: "20px", strokeWidth: 2.5 }} />
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".epub"
            multiple
            onChange={(e) => {
              if (e.target.files) handleUpload(e.target.files);
              e.target.value = "";
            }}
            style={{ display: "none" }}
          />
        </div>
      </header>

      {/* ===== Mobile Slide-Over Drawer (Slide from Left + Backdrop Blur) ===== */}
      {isMobileMenuOpen && (
        <>
          {/* Backdrop Blur Overlay */}
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 90,
              backgroundColor: isMenuAnimating ? "rgba(0, 0, 0, 0.6)" : "rgba(0, 0, 0, 0)",
              backdropFilter: isMenuAnimating ? "blur(6px)" : "blur(0px)",
              WebkitBackdropFilter: isMenuAnimating ? "blur(6px)" : "blur(0px)",
              transition: "all 0.28s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
            onClick={closeMobileMenu}
          />

          {/* Slide-over Drawer Panel */}
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              bottom: 0,
              width: "290px",
              maxWidth: "80vw",
              zIndex: 100,
              backgroundColor: "var(--kb-surface)",
              borderRight: "1px solid var(--kb-border)",
              boxShadow: isMenuAnimating ? "8px 0 32px rgba(0,0,0,0.3)" : "none",
              display: "flex",
              flexDirection: "column",
              padding: "24px 20px",
              gap: "24px",
              overflowY: "auto",
              transform: isMenuAnimating ? "translateX(0)" : "translateX(-100%)",
              opacity: isMenuAnimating ? 1 : 0,
              transition: "transform 0.28s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.28s ease",
            }}
          >
            {/* Drawer Header (Logo + Close Button) */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                paddingBottom: "16px",
                borderBottom: "1px solid var(--kb-border-subtle)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <Image
                  src="/icon.png"
                  alt="Kotori"
                  width={32}
                  height={32}
                  style={{
                    objectFit: "contain",
                    flexShrink: 0,
                  }}
                />
                <span style={{ fontSize: "16px", fontWeight: 800, color: "var(--kb-text)" }}>
                  Kotori
                </span>
              </div>

              <button
                onClick={closeMobileMenu}
                aria-label={language === "ID" ? "Tutup Menu" : "Close Menu"}
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "8px",
                  backgroundColor: "var(--kb-bg-secondary)",
                  border: "1px solid var(--kb-border-subtle)",
                  color: "var(--kb-text)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                }}
              >
                <X style={{ width: "18px", height: "18px" }} />
              </button>
            </div>

            {/* Menu Sections */}
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {/* Change Log Action */}
              <button
                onClick={() => {
                  setShowChangeLog(true);
                  closeMobileMenu();
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "12px 16px",
                  borderRadius: "12px",
                  backgroundColor: "var(--kb-bg-secondary)",
                  border: "1px solid var(--kb-border)",
                  fontSize: "13px",
                  fontWeight: 700,
                  color: "var(--kb-text)",
                  cursor: "pointer",
                }}
              >
                <History style={{ width: "18px", height: "18px", color: "var(--kb-primary)" }} />
                <span>Change Log</span>
              </button>

              {/* Backup & Restore Action */}
              <button
                onClick={() => {
                  setBackupInitialTab("export");
                  setShowBackupModal(true);
                  closeMobileMenu();
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "12px 16px",
                  borderRadius: "12px",
                  backgroundColor: "var(--kb-bg-secondary)",
                  border: "1px solid var(--kb-border)",
                  fontSize: "13px",
                  fontWeight: 700,
                  color: "var(--kb-text)",
                  cursor: "pointer",
                }}
              >
                <HardDriveDownload style={{ width: "18px", height: "18px", color: "var(--kb-primary)" }} />
                <span>{language === "ID" ? "Cadangkan & Pulihkan" : "Backup & Restore"}</span>
              </button>

              {/* Bahasa Section */}
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <label style={{ fontSize: "12px", fontWeight: 700, letterSpacing: "0.05em", color: "var(--kb-text-secondary)", textTransform: "uppercase" }}>
                  {t.languageLabel}
                </label>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    backgroundColor: "var(--kb-bg-secondary)",
                    border: "1px solid var(--kb-border)",
                    borderRadius: "12px",
                    padding: "4px",
                    gap: "4px",
                  }}
                >
                  {(["ID", "EN"] as const).map((lang) => {
                    const isActive = language === lang;
                    return (
                      <button
                        key={lang}
                        onClick={() => handleLanguageChange(lang)}
                        style={{
                          flex: 1,
                          padding: "8px 0",
                          fontSize: "13px",
                          fontWeight: 800,
                          borderRadius: "8px",
                          backgroundColor: isActive ? "var(--kb-primary)" : "transparent",
                          color: isActive ? "#ffffff" : "var(--kb-text-secondary)",
                          border: "none",
                          cursor: "pointer",
                          transition: "all 0.2s ease",
                          textAlign: "center",
                        }}
                      >
                        {lang}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Mode Tema Section */}
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <label style={{ fontSize: "12px", fontWeight: 700, letterSpacing: "0.05em", color: "var(--kb-text-secondary)", textTransform: "uppercase" }}>
                  {t.themeLabel}
                </label>
                <button
                  onClick={toggleTheme}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "12px 16px",
                    borderRadius: "12px",
                    backgroundColor: "var(--kb-bg-secondary)",
                    border: "1px solid var(--kb-border)",
                    fontSize: "13px",
                    fontWeight: 700,
                    color: "var(--kb-text)",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    {theme === "dark" ? (
                      <Sun style={{ width: "18px", height: "18px", color: "#eab308" }} />
                    ) : (
                      <Moon style={{ width: "18px", height: "18px", color: "#6366f1" }} />
                    )}
                    <span>{theme === "dark" ? t.themeLight : t.themeDark}</span>
                  </div>
                </button>
              </div>

              {/* Tampilan Section */}
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <label style={{ fontSize: "12px", fontWeight: 700, letterSpacing: "0.05em", color: "var(--kb-text-secondary)", textTransform: "uppercase" }}>
                  {language === "ID" ? "Tampilan Perpustakaan" : "Library View"}
                </label>
                <button
                  onClick={() => {
                    changeViewMode(viewMode === "shelf" ? "grid" : "shelf");
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "12px 16px",
                    borderRadius: "12px",
                    backgroundColor: "var(--kb-bg-secondary)",
                    border: "1px solid var(--kb-border)",
                    fontSize: "13px",
                    fontWeight: 700,
                    color: "var(--kb-text)",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    {viewMode === "shelf" ? (
                      <>
                        <LayoutGrid style={{ width: "18px", height: "18px", color: "var(--kb-primary)" }} />
                        <span>{language === "ID" ? "Ganti ke Grid" : "Switch to Grid"}</span>
                      </>
                    ) : (
                      <>
                        <Library style={{ width: "18px", height: "18px", color: "var(--kb-primary)" }} />
                        <span>{language === "ID" ? "Ganti ke Rak Buku" : "Switch to Bookshelf"}</span>
                      </>
                    )}
                  </div>
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ===== Main Content ===== */}
      <main
        className="kb-main-container"
        style={{
          flex: 1,
          maxWidth: "1320px",
          width: "100%",
          margin: "0 auto",
          padding: "36px 32px 64px 32px",
        }}
      >
        {/* Drag & Drop Overlay */}
        {isDragOver && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 100,
              backgroundColor: "rgba(99, 102, 241, 0.9)",
              backdropFilter: "blur(12px)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              gap: "16px",
            }}
          >
            <Upload style={{ width: "64px", height: "64px" }} />
            <h2 style={{ fontSize: "24px", fontWeight: 800 }}>Drop EPUB File Here</h2>
          </div>
        )}

        {/* Uploading Status Overlay */}
        {isUploading && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 100,
              backgroundColor: "rgba(15, 23, 42, 0.6)",
              backdropFilter: "blur(8px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "24px",
              boxSizing: "border-box",
            }}
          >
            <div
              style={{
                backgroundColor: "var(--kb-surface)",
                borderRadius: "20px",
                padding: "32px 24px",
                boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.2)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "20px",
                maxWidth: "380px",
                width: "100%",
                boxSizing: "border-box",
                animation: "scaleIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards",
              }}
            >
              <div
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "50%",
                  border: "4px solid var(--kb-border)",
                  borderTopColor: "var(--kb-primary)",
                }}
                className="animate-spin"
              />
              <p
                style={{
                  fontSize: "14px",
                  fontWeight: 700,
                  color: "var(--kb-text)",
                  textAlign: "center",
                  margin: 0,
                  wordBreak: "break-word",
                  overflowWrap: "anywhere",
                  lineHeight: 1.5,
                }}
              >
                {uploadProgress || "Processing novel..."}
              </p>
            </div>
          </div>
        )}

        {/* Toast Notification Stack */}
        {toasts.length > 0 && (
          <div className="kb-toast-stack">
            {toasts.map((toastItem) => (
              <div
                key={toastItem.id}
                className="kb-toast"
                onMouseEnter={() => pauseToastTimer(toastItem.id)}
                onMouseLeave={() => resumeToastTimer(toastItem.id)}
                style={{
                  animation: toastItem.animatingOut
                    ? "toastOut 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards"
                    : "toastIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards",
                }}
              >
                {toastItem.type === "success" && (
                  <CheckCircle2 style={{ width: "18px", height: "18px", color: "#3b82f6", flexShrink: 0 }} />
                )}
                {toastItem.type === "delete" && (
                  <Trash2 style={{ width: "18px", height: "18px", color: "#ef4444", flexShrink: 0 }} />
                )}
                {toastItem.type === "reset" && (
                  <RotateCcw style={{ width: "18px", height: "18px", color: "#64748b", flexShrink: 0 }} />
                )}
                {toastItem.type === "error" && (
                  <AlertTriangle style={{ width: "18px", height: "18px", color: "#f59e0b", flexShrink: 0 }} />
                )}
                <span style={{ flex: 1, wordBreak: "break-word" }}>{toastItem.message}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    dismissToast(toastItem.id);
                  }}
                  className="kb-toast-close"
                  title="Close notification"
                >
                  <X style={{ width: "14px", height: "14px", strokeWidth: 2 }} />
                </button>

                {/* Bottom Progress Loading Bar */}
                <div
                  className="kb-toast-progress"
                  style={{
                    backgroundColor:
                      toastItem.type === "success"
                        ? "#3b82f6"
                        : toastItem.type === "delete"
                          ? "#ef4444"
                          : toastItem.type === "reset"
                            ? "#64748b"
                            : "#facc15",
                  }}
                />
              </div>
            ))}
          </div>
        )}

        {/* Loading State: only shown when library has stored books loading from database */}
        {isLoading && hasStoredBooks && (
          <div
            style={{
              minHeight: "50vh",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                border: "3px solid var(--kb-border)",
                borderTopColor: "var(--kb-primary)",
              }}
              className="animate-spin"
            />
          </div>
        )}

        {/* Empty State (No Books Uploaded Yet) */}
        {(!isLoading || !hasStoredBooks) && books.length === 0 && (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            style={{
              minHeight: "60vh",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "24px",
              border: "2px dashed var(--kb-border)",
              backgroundColor: "var(--kb-surface)",
              padding: "48px 24px",
              textAlign: "center",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
          >
            <div
              style={{
                width: "80px",
                height: "80px",
                borderRadius: "24px",
                backgroundColor: "var(--kb-primary-light)",
                color: "var(--kb-primary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "24px",
              }}
            >
              <Library style={{ width: "40px", height: "40px" }} />
            </div>
            <h2 style={{ fontSize: "22px", fontWeight: 800, marginBottom: "8px" }}>
              {t.noBooksYet}
            </h2>
            <p style={{ fontSize: "14px", color: "var(--kb-text-secondary)", maxWidth: "420px", lineHeight: 1.6, marginBottom: "8px" }}>
              {t.noBooksDesc}
            </p>
            <p style={{ fontSize: "13px", color: "var(--kb-text-secondary)", maxWidth: "440px", lineHeight: 1.6, marginBottom: "24px" }}>
              <span>{t.noBooksHintEmpty}</span>
              <a
                href="https://en.zlib.bz"
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                style={{
                  color: "var(--kb-primary)",
                  fontWeight: 600,
                  textDecoration: "underline",
                  textUnderlineOffset: "3px",
                }}
              >
                en.zlib.bz
              </a>
            </p>
            <button
              style={{
                padding: "12px 24px",
                backgroundColor: "var(--kb-primary)",
                color: "white",
                fontSize: "14px",
                fontWeight: 700,
                borderRadius: "14px",
                border: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                boxShadow: "0 4px 16px rgba(99,102,241,0.35)",
              }}
            >
              <Plus style={{ width: "18px", height: "18px" }} />
              <span>{t.addBook}</span>
            </button>
          </div>
        )}

        {/* Book Grid Area */}
        {!isLoading && books.length > 0 && filteredBooks.length > 0 && (
          <>
            <div
              style={{
                marginBottom: "28px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div>
                <h2 style={{ fontSize: "20px", fontWeight: 800, letterSpacing: "-0.01em" }}>
                  {searchQuery ? (language === "ID" ? "Hasil Pencarian" : "Search Results") : t.libraryTitle}
                </h2>
                <p style={{ fontSize: "13px", fontWeight: 500, color: "var(--kb-text-muted)", marginTop: "2px", display: "flex", alignItems: "center", flexWrap: "wrap", gap: "5px" }}>
                  <span>{filteredBooks.length} {language === "ID" ? "novel tersedia" : filteredBooks.length === 1 ? "novel available" : "novels available"}</span>
                  <span style={{ margin: "0 4px", opacity: 0.4 }}>•</span>
                  <Sparkles style={{ width: "13px", height: "13px", color: "var(--kb-primary)", display: "inline-block" }} />
                  <span style={{ color: "var(--kb-text-secondary)", fontWeight: 400 }}>{t.noBooksHintList}</span>
                  <a
                    href="https://en.zlib.bz"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      color: "var(--kb-primary)",
                      fontWeight: 600,
                      textDecoration: "underline",
                      textUnderlineOffset: "3px",
                    }}
                  >
                    en.zlib.bz
                  </a>
                </p>
              </div>
            </div>

            {groupedShelves ? (
              /* Bookshelf View */
              <div style={{ display: "flex", flexDirection: "column", gap: "40px" }}>
                {/* Visual Series Shelves */}
                {groupedShelves.shelves.map((shelf, shelfIdx) => (
                  <RevealSection key={shelf.seriesName} className="kb-reveal-left" delay={shelfIdx * 100}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                      <div style={{ display: "flex", alignItems: "baseline", gap: "10px", paddingLeft: "4px" }}>
                        <h3 style={{ fontSize: "18px", fontWeight: 800, color: "var(--kb-text)" }}>
                          {shelf.seriesName}
                        </h3>
                        <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--kb-text-muted)" }}>
                          {shelf.books.length} {language === "ID" ? "Volume" : "Volumes"}
                        </span>
                      </div>

                      {/* Visual Shelf Wrapper */}
                      <div style={{ position: "relative", paddingBottom: "16px" }}>
                        {/* Horizontal Scrolling Row */}
                        <div
                          style={{
                            display: "flex",
                            gap: "24px",
                            overflowX: "auto",
                            padding: "4px 4px 16px 4px",
                            scrollBehavior: "smooth",
                          }}
                          className="kb-shelf-row"
                        >
                          {shelf.books.map((book) => (
                            <div key={book.id} style={{ width: "190px", flexShrink: 0 }}>
                              <BookCard
                                book={book}
                                progress={progresses[book.id]}
                                onOpen={() => handleBookClick(book)}
                                onDelete={() => setDeleteConfirm(book.id)}
                                onResetProgress={() => setResetConfirm(book.id)}
                                t={t}
                              />
                            </div>
                          ))}
                        </div>

                        {/* Visual 3D Wood/Glass Shelf Bar */}
                        <div
                          style={{
                            position: "absolute",
                            bottom: "12px",
                            left: 0,
                            right: 0,
                            height: "8px",
                            borderRadius: "4px",
                            background: theme === "dark"
                              ? "linear-gradient(to bottom, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.05))"
                              : "linear-gradient(to bottom, rgba(15, 23, 42, 0.08), rgba(15, 23, 42, 0.03))",
                            borderBottom: theme === "dark" ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid rgba(15, 23, 42, 0.06)",
                            boxShadow: theme === "dark" ? "0 4px 10px rgba(0, 0, 0, 0.3)" : "0 4px 8px rgba(0, 0, 0, 0.08)",
                            pointerEvents: "none",
                          }}
                        />
                      </div>
                    </div>
                  </RevealSection>
                ))}
              </div>
            ) : (
              /* Grid View (Standard Flat Grid) */
              <div
                className="kb-book-grid"
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
                  gap: "24px",
                  alignItems: "start",
                }}
              >
                {sortedFilteredBooks.map((book, bookIdx) => (
                  <RevealSection key={book.id} className="kb-reveal-scale" delay={bookIdx * 60}>
                    <BookCard
                      book={book}
                      progress={progresses[book.id]}
                      onOpen={() => handleBookClick(book)}
                      onDelete={() => setDeleteConfirm(book.id)}
                      onResetProgress={() => setResetConfirm(book.id)}
                      t={t}
                    />
                  </RevealSection>
                ))}
              </div>
            )}
          </>
        )}

        {/* No Search Results */}
        {!isLoading && books.length > 0 && filteredBooks.length === 0 && searchQuery && (
          <div
            style={{
              minHeight: "40vh",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
            }}
          >
            <Search style={{ width: "48px", height: "48px", color: "var(--kb-text-muted)", marginBottom: "16px" }} />
            <p style={{ fontSize: "18px", fontWeight: 700 }}>{t.noMatchTitle}</p>
            <p style={{ fontSize: "14px", color: "var(--kb-text-muted)", marginTop: "4px" }}>
              {t.noMatchDesc(searchQuery)}
            </p>
          </div>
        )}
      </main>

      {/* ===== Community & Creator Banner ===== */}
      <div style={{ width: "100%" }}>
        <section
          style={{
            maxWidth: "1320px",
            margin: "0 auto 0",
            padding: "0 32px 48px",
            width: "100%",
          }}
        >
          <div
            style={{
              borderRadius: "24px",
              padding: "40px 32px",
              background: "linear-gradient(135deg, var(--kb-surface) 0%, rgba(99, 102, 241, 0.03) 100%)",
              border: "1px solid rgba(99, 102, 241, 0.12)",
              textAlign: "center",
              position: "relative",
              overflow: "hidden",
              boxShadow: "0 10px 30px -10px rgba(0,0,0,0.05), inset 0 1px 0 rgba(255,255,255,0.5)",
            }}
          >
            {/* Decorative background icon */}
            <Sparkles
              style={{
                position: "absolute",
                right: "-20px",
                bottom: "-20px",
                width: "180px",
                height: "180px",
                color: "var(--kb-primary)",
                opacity: 0.03,
                pointerEvents: "none",
                transform: "rotate(-15deg)",
              }}
            />
            <BookOpen
              style={{
                position: "absolute",
                left: "-20px",
                top: "-20px",
                width: "140px",
                height: "140px",
                color: "var(--kb-primary)",
                opacity: 0.02,
                pointerEvents: "none",
                transform: "rotate(12deg)",
              }}
            />

            {/* Badge */}
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 14px",
                borderRadius: "100px",
                backgroundColor: "var(--kb-primary-light)",
                color: "var(--kb-primary)",
                fontSize: "12px",
                fontWeight: 700,
                marginBottom: "16px",
              }}
            >
              <Sparkles style={{ width: "13px", height: "13px" }} />
              <span>Kotori Community</span>
            </div>

            <h3
              style={{
                fontSize: "24px",
                fontWeight: 800,
                marginBottom: "12px",
                letterSpacing: "-0.02em",
                color: "var(--kb-text)",
              }}
            >
              {t.communityTitle}
            </h3>

            <p
              style={{
                fontSize: "14px",
                color: "var(--kb-text-secondary)",
                maxWidth: "520px",
                margin: "0 auto 24px",
                lineHeight: 1.6,
              }}
            >
              {t.communityDesc}
            </p>

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "12px",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              {/* Feedback button */}
              <button
                onClick={() => setShowFeedbackModal(true)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "10px 20px",
                  borderRadius: "12px",
                  backgroundColor: "var(--kb-primary)",
                  color: "white",
                  fontSize: "13px",
                  fontWeight: 700,
                  border: "none",
                  cursor: "pointer",
                  boxShadow: "0 4px 14px rgba(99, 102, 241, 0.3)",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = "0 6px 20px rgba(99, 102, 241, 0.4)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "none";
                  e.currentTarget.style.boxShadow = "0 4px 14px rgba(99, 102, 241, 0.3)";
                }}
              >
                <MessageSquare style={{ width: "14px", height: "14px" }} />
                <span>{t.feedbackBtn}</span>
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* Footer */}
      <div style={{ width: "100%" }}>
        <Footer language={language} />
      </div>

      {/* Feedback Modal */}
      <FeedbackModal
        isOpen={showFeedbackModal}
        onClose={() => setShowFeedbackModal(false)}
        language={language}
        onToast={showToast}
      />

      {/* Floating Dictionary Search Button - bottom-right, always reachable regardless of
                  scroll position, replacing the old toolbar/mobile-menu entry points. */}
      <DictionarySearchFab
        onClick={() => setShowDictionarySearch(true)}
        language={language}
        bottom="24px"
      />

      {/* Dictionary Search Modal */}
      <DictionarySearchModal
        isOpen={showDictionarySearch}
        onClose={() => setShowDictionarySearch(false)}
        language={language}
      />

      {/* Change Log Modal */}
      <ChangeLogModal
        isOpen={showChangeLog}
        onClose={() => setShowChangeLog(false)}
        language={language}
      />

      {/* Backup & Restore Modal */}
      <BackupModal
        isOpen={showBackupModal}
        onClose={() => setShowBackupModal(false)}
        language={language}
        totalBooks={books.length}
        currentBooks={books}
        currentProgresses={progresses}
        initialTab={backupInitialTab}
        onSuccessRestore={() => {
          loadBooks();
        }}
        onToast={showToast}
      />

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (() => {
        const book = books.find((b) => b.id === deleteConfirm);
        const displayTitle = book ? truncate(book.title, 45) : "";
        return (
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 200,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "16px",
              backgroundColor: "var(--kb-overlay)",
              backdropFilter: "blur(6px)",
            }}
            onClick={() => setDeleteConfirm(null)}
          >
            <div
              style={{
                width: "100%",
                maxWidth: "380px",
                borderRadius: "24px",
                padding: "28px",
                backgroundColor: "var(--kb-surface)",
                border: "1px solid var(--kb-border)",
                boxShadow: "0 24px 64px rgba(0,0,0,0.25)",
                animation: "scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 style={{ fontSize: "18px", fontWeight: 800, marginBottom: "8px" }}>{t.deleteConfirmTitle}</h3>
              <p style={{ fontSize: "14px", color: "var(--kb-text-secondary)", lineHeight: 1.5, marginBottom: "24px" }}>
                {t.deleteConfirmDescWithTitle(displayTitle)}
              </p>
              <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
                <button
                  onClick={() => setDeleteConfirm(null)}
                  style={{
                    borderRadius: "12px",
                    padding: "10px 20px",
                    fontSize: "14px",
                    fontWeight: 600,
                    color: "var(--kb-text-secondary)",
                    backgroundColor: "var(--kb-bg-secondary)",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  {t.cancel}
                </button>
                <button
                  onClick={() => handleDelete(deleteConfirm)}
                  style={{
                    borderRadius: "12px",
                    padding: "10px 20px",
                    fontSize: "14px",
                    fontWeight: 600,
                    color: "white",
                    backgroundColor: "var(--kb-danger)",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  {t.delete}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Reset Progress Confirmation Modal */}
      {resetConfirm && (() => {
        const book = books.find((b) => b.id === resetConfirm);
        const displayTitle = book ? truncate(book.title, 45) : "";
        return (
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 200,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "16px",
              backgroundColor: "var(--kb-overlay)",
              backdropFilter: "blur(6px)",
            }}
            onClick={() => setResetConfirm(null)}
          >
            <div
              style={{
                width: "100%",
                maxWidth: "380px",
                borderRadius: "24px",
                padding: "28px",
                backgroundColor: "var(--kb-surface)",
                border: "1px solid var(--kb-border)",
                boxShadow: "0 24px 64px rgba(0,0,0,0.25)",
                animation: "scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 style={{ fontSize: "18px", fontWeight: 800, marginBottom: "8px" }}>{t.resetConfirmTitle}</h3>
              <p style={{ fontSize: "14px", color: "var(--kb-text-secondary)", lineHeight: 1.5, marginBottom: "24px" }}>
                {t.resetConfirmDesc(displayTitle)}
              </p>
              <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
                <button
                  onClick={() => setResetConfirm(null)}
                  style={{
                    borderRadius: "12px",
                    padding: "10px 20px",
                    fontSize: "14px",
                    fontWeight: 600,
                    color: "var(--kb-text-secondary)",
                    backgroundColor: "var(--kb-bg-secondary)",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  {t.cancel}
                </button>
                <button
                  onClick={() => handleResetProgress(resetConfirm)}
                  style={{
                    borderRadius: "12px",
                    padding: "10px 20px",
                    fontSize: "14px",
                    fontWeight: 600,
                    color: "white",
                    backgroundColor: "#64748b",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  Reset
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Non-Japanese Novel Confirmation Modal */}
      {pendingNonJapaneseBook && (() => {
        const displayTitle = truncate(pendingNonJapaneseBook.book.title, 45);
        return (
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 200,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "16px",
              backgroundColor: "var(--kb-overlay)",
              backdropFilter: "blur(6px)",
            }}
            onClick={() => handleConfirmNonJapanese(false)}
          >
            <div
              style={{
                width: "100%",
                maxWidth: "420px",
                borderRadius: "24px",
                padding: "28px",
                backgroundColor: "var(--kb-surface)",
                border: "1px solid var(--kb-border)",
                boxShadow: "0 24px 64px rgba(0,0,0,0.25)",
                animation: "scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "14px",
                  backgroundColor: "rgba(234, 179, 8, 0.12)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "16px",
                  color: "#eab308",
                }}
              >
                <AlertTriangle style={{ width: "24px", height: "24px" }} />
              </div>
              <h3 style={{ fontSize: "18px", fontWeight: 800, marginBottom: "8px" }}>
                {t.nonJapaneseWarningTitle}
              </h3>
              <p
                style={{
                  fontSize: "14px",
                  color: "var(--kb-text-secondary)",
                  lineHeight: 1.6,
                  marginBottom: "24px",
                  whiteSpace: "pre-line",
                }}
              >
                {t.nonJapaneseWarningDesc(displayTitle)}
              </p>
              <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
                <button
                  onClick={() => handleConfirmNonJapanese(false)}
                  style={{
                    borderRadius: "12px",
                    padding: "10px 18px",
                    fontSize: "14px",
                    fontWeight: 600,
                    color: "var(--kb-text-secondary)",
                    backgroundColor: "var(--kb-bg-secondary)",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  {t.nonJapaneseCancelBtn}
                </button>
                <button
                  onClick={() => handleConfirmNonJapanese(true)}
                  style={{
                    borderRadius: "12px",
                    padding: "10px 18px",
                    fontSize: "14px",
                    fontWeight: 600,
                    color: "white",
                    backgroundColor: "var(--kb-accent)",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  {t.nonJapaneseConfirmBtn}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Book Preview Modal */}
      <BookPreviewModal
        previewBook={previewBook}
        previewPhase={previewPhase}
        previewChapter={previewChapter}
        previewChapters={previewChapters}
        progress={previewBook ? progresses[previewBook.id] : undefined}
        language={language}
        isLandscapeImg={isLandscapeImg}
        onClose={handleClosePreview}
        onRead={startBookTransition}
        onImageLoad={handleImageLoad}
      />
    </div>
  );
}

