"use client";

import React, { useState, useEffect } from "react";
import { X, Sparkles, ShieldAlert, Heart, Send, BookOpen } from "lucide-react";
import {
  emptyFeedbackDraft,
  clearFeedbackDraft,
  FEEDBACK_CATEGORIES,
  getFeedbackPreview,
  readFeedbackDraft,
  saveFeedbackDraft,
  type FeedbackDraft,
} from "@/lib/feedback";

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: "ID" | "EN";
  onToast: (message: string, type?: "success" | "error" | "delete" | "reset") => void;
}

const TRANSLATIONS = {
  ID: {
    feedbackTitle: "Saran & Kritik untuk Kotori",
    feedbackDesc:
      "Kotori dibuat untuk mempermudah membaca & belajar bahasa Jepang. Bagikan ide fitur baru, lapor bug, atau berikan apresiasi kepada developer!",
    catBug: "Lapor Bug / Error",
    catIdea: "Ide Fitur Baru",
    catDictionary: "Kesalahan Kamus",
    catLove: "Apresiasi / Lainnya",
    msgPlaceholder:
      "Tuliskan saran, kritik, atau detail masalah yang Anda temukan di sini...",
    contactPlaceholder: "Opsional: IG / TikTok atau email Anda jika ingin dibalas",
    sendBtn: "Kirim Pesan",
    sendingBtn: "Mengirim...",
    previewBtn: "Lihat Preview",
    editBtn: "Kembali Mengedit",
    previewTitle: "Preview Feedback",
    previewMessage: "Pesan",
    previewContact: "Kontak",
    anonymous: "Anonim",
    draftInfo: "Draft disimpan di browser ini, termasuk kontak Anda.",
    draftError: "Draft tidak dapat dibaca atau disimpan di browser ini.",
    sendError: "Gagal mengirim feedback.",
    systemError: "Terjadi kesalahan sistem saat mengirim feedback.",
    feedbackSuccess:
      "Terima kasih! Saran & kritik Anda telah terkirim kepada developer.",
    close: "Tutup",
  },
  EN: {
    feedbackTitle: "Feedback & Suggestions",
    feedbackDesc:
      "Kotori is built to make reading Japanese easier. Share feature ideas, report bugs, or send appreciation to the developer!",
    catBug: "Report Bug",
    catIdea: "New Feature Idea",
    catDictionary: "Dictionary Error",
    catLove: "Appreciation / Other",
    msgPlaceholder:
      "Write your suggestion, feedback, or bug report details here...",
    contactPlaceholder:
      "Optional: Your IG / TikTok handle or email if you'd like a reply",
    sendBtn: "Send Feedback",
    sendingBtn: "Sending...",
    previewBtn: "Preview Feedback",
    editBtn: "Back to Editing",
    previewTitle: "Feedback Preview",
    previewMessage: "Message",
    previewContact: "Contact",
    anonymous: "Anonymous",
    draftInfo: "Your draft, including contact details, is saved in this browser.",
    draftError: "The draft could not be read or saved in this browser.",
    sendError: "Failed to send feedback.",
    systemError: "A system error occurred while sending feedback.",
    feedbackSuccess: "Thank you! Your feedback has been sent to the developer.",
    close: "Close",
  },
};

export function FeedbackModal({
  isOpen,
  onClose,
  language,
  onToast,
}: FeedbackModalProps) {
  const [draft, setDraft] = useState<FeedbackDraft>(emptyFeedbackDraft);
  const [draftError, setDraftError] = useState(false);
  const [isPreview, setIsPreview] = useState(false);
  const [hpWebsite, setHpWebsite] = useState("");
  const [openedAt, setOpenedAt] = useState<number>(Date.now());
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [isSending, setIsSending] = useState(false);

  const t = TRANSLATIONS[language];
  const { category, message, contact } = draft;
  const preview = getFeedbackPreview(draft);
  const categoryLabels = {
    idea: t.catIdea,
    bug: t.catBug,
    dictionary: t.catDictionary,
    love: t.catLove,
  };

  useEffect(() => {
    try {
      setDraft(readFeedbackDraft(localStorage));
    } catch (error) {
      console.error("Failed to restore feedback draft:", error);
      setDraftError(true);
    }
  }, []);

  const updateDraft = (next: FeedbackDraft) => {
    setDraft(next);
    try {
      saveFeedbackDraft(localStorage, next);
      setDraftError(false);
    } catch (error) {
      console.error("Failed to save feedback draft:", error);
      setDraftError(true);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    setOpenedAt(Date.now());
    setHpWebsite("");
    setIsPreview(false);
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);
  useEffect(() => {
    if (!isOpen) return;
    try {
      const lastSent = Number(localStorage.getItem("kotori_last_feedback_time") || 0);
      const elapsed = Math.floor((Date.now() - lastSent) / 1000);
      if (elapsed < 45) {
        setCooldownSeconds(45 - elapsed);
      } else {
        setCooldownSeconds(0);
      }
    } catch (error) {
      console.error("Failed to read feedback cooldown:", error);
      setDraftError(true);
    }
  }, [isOpen]);

  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const timer = setInterval(() => {
      setCooldownSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownSeconds]);

  if (!isOpen) return null;

  const handleSend = async () => {
    if (!message.trim() || isSending || cooldownSeconds > 0) return;
    setIsSending(true);

    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          message,
          contact,
          language,
          hpWebsite,
          clientTimestamp: openedAt,
        }),
      });

      if (res.ok) {
        const result = await res.json();
        if (result.processed === false) {
          onToast(t.sendError, "error");
          return;
        }
        setCooldownSeconds(45);
        onToast(t.feedbackSuccess, "success");
        try {
          localStorage.setItem("kotori_last_feedback_time", String(Date.now()));
          clearFeedbackDraft(localStorage);
          setDraft(emptyFeedbackDraft());
          setDraftError(false);
        } catch (error) {
          console.error("Failed to clear feedback draft:", error);
          setDraftError(true);
          onToast(t.draftError, "error");
        }
        onClose();
      } else {
        const data = await res.json().catch(() => ({}));
        onToast(data.error || t.sendError, "error");
      }
    } catch (err) {
      console.error(err);
      onToast(t.systemError, "error");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div
      className={`kb-feedback-overlay ${isOpen ? "kb-modal-active" : ""}`}
      onClick={onClose}
    >
      <div className="kb-feedback-content" onClick={(e) => e.stopPropagation()}>
        {/* Invisible honeypot for bot protection */}
        <div style={{ position: "absolute", left: "-9999px", opacity: 0, height: 0, width: 0, pointerEvents: "none" }} aria-hidden="true">
          <input
            type="text"
            name="user_website_hp"
            value={hpWebsite}
            onChange={(e) => setHpWebsite(e.target.value)}
            tabIndex={-1}
            autoComplete="off"
          />
        </div>
        {/* Close button */}
        <button
          onClick={onClose}
          aria-label={t.close}
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
            e.currentTarget.style.transform = "rotate(90deg)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "var(--kb-bg-secondary)";
            e.currentTarget.style.color = "var(--kb-text-secondary)";
            e.currentTarget.style.transform = "none";
          }}
        >
          <X style={{ width: "16px", height: "16px" }} />
        </button>

        {/* Title */}
        <h2
          style={{
            fontSize: "22px",
            fontWeight: 800,
            marginBottom: "8px",
            color: "var(--kb-text)",
            paddingRight: "40px",
            letterSpacing: "-0.02em",
          }}
        >
          {t.feedbackTitle}
        </h2>
        <p
          style={{
            fontSize: "13px",
            color: "var(--kb-text-secondary)",
            lineHeight: 1.6,
            marginBottom: "24px",
          }}
        >
          {t.feedbackDesc}
        </p>

        {!isPreview ? (
        <>
        {/* Category selector */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            padding: "4px",
            backgroundColor: "var(--kb-bg-secondary)",
            borderRadius: "14px",
            border: "1px solid var(--kb-border)",
            gap: "2px",
            marginBottom: "20px",
          }}
        >
          {FEEDBACK_CATEGORIES.map((cat) => {
            const label = categoryLabels[cat];
            const isActive = category === cat;

            let CategoryIcon = Sparkles;
            if (cat === "bug") CategoryIcon = ShieldAlert;
            if (cat === "dictionary") CategoryIcon = BookOpen;
            if (cat === "love") CategoryIcon = Heart;

            return (
              <button
                key={cat}
                onClick={() => updateDraft({ ...draft, category: cat })}
                disabled={isSending}
                aria-pressed={isActive}
                className="kb-feedback-category-btn"
                style={{
                  flex: 1,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  padding: "8px 12px",
                  fontSize: "12px",
                  fontWeight: 750,
                  borderRadius: "10px",
                  border: "none",
                  backgroundColor: isActive ? "var(--kb-surface)" : "transparent",
                  color: isActive
                    ? "var(--kb-primary)"
                    : "var(--kb-text-secondary)",
                  boxShadow: isActive
                    ? "0 2px 8px rgba(99,102,241,0.08), 0 1px 2px rgba(0,0,0,0.02)"
                    : "none",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
              >
                <CategoryIcon
                  style={{
                    width: "13px",
                    height: "13px",
                    color: isActive ? "var(--kb-primary)" : "inherit",
                  }}
                />
                <span>{label}</span>
              </button>
            );
          })}
        </div>

        {/* Message textarea */}
        <textarea
          value={message}
          onChange={(e) => updateDraft({ ...draft, message: e.target.value })}
          maxLength={1000}
          disabled={isSending}
          aria-label={t.previewMessage}
          placeholder={t.msgPlaceholder}
          className="kb-premium-input"
          style={{
            width: "100%",
            minHeight: "130px",
            padding: "14px 16px",
            fontSize: "13.5px",
            lineHeight: 1.6,
            borderRadius: "14px",
            backgroundColor: "var(--kb-bg)",
            color: "var(--kb-text)",
            outline: "none",
            resize: "none",
            fontFamily: "inherit",
            marginBottom: "14px",
          }}
        />

        {/* Contact input */}
        <input
          type="text"
          value={contact}
          onChange={(e) => updateDraft({ ...draft, contact: e.target.value })}
          maxLength={100}
          disabled={isSending}
          aria-label={t.previewContact}
          placeholder={t.contactPlaceholder}
          className="kb-premium-input"
          style={{
            width: "100%",
            padding: "12px 16px",
            fontSize: "13px",
            borderRadius: "12px",
            backgroundColor: "var(--kb-bg)",
            color: "var(--kb-text)",
            outline: "none",
            marginBottom: "24px",
            fontFamily: "inherit",
          }}
        />

        </>
        ) : (
          <div style={{ marginBottom: "20px", overflowWrap: "anywhere" }}>
            <h3>{t.previewTitle}</h3>
            <p><strong>{categoryLabels[preview.category]}</strong></p>
            <p><strong>{t.previewMessage}:</strong></p>
            <p style={{ whiteSpace: "pre-wrap" }}>{preview.message}</p>
            <p><strong>{t.previewContact}:</strong> {preview.contact || t.anonymous}</p>
          </div>
        )}
        <p role={draftError ? "alert" : undefined} style={{ fontSize: "12px", color: "var(--kb-text-secondary)", marginBottom: "12px" }}>
          {draftError ? t.draftError : t.draftInfo}
        </p>
        <button
          type="button"
          onClick={() => setIsPreview(!isPreview)}
          disabled={isSending || (!isPreview && !message.trim())}
          className="kb-premium-input"
          style={{ width: "100%", padding: "12px", marginBottom: "12px", cursor: "pointer" }}
        >
          {isPreview ? t.editBtn : t.previewBtn}
        </button>
        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={isSending || !message.trim() || cooldownSeconds > 0}
          style={{
            width: "100%",
            padding: "14px",
            fontSize: "14px",
            fontWeight: 750,
            borderRadius: "14px",
            border: "none",
            backgroundColor:
              isSending || !message.trim() || cooldownSeconds > 0
                ? "var(--kb-bg-secondary)"
                : "var(--kb-primary)",
            color:
              isSending || !message.trim() || cooldownSeconds > 0
                ? "var(--kb-text-muted)"
                : "#ffffff",
            cursor:
              isSending || !message.trim() || cooldownSeconds > 0 ? "not-allowed" : "pointer",
            boxShadow:
              isSending || !message.trim() || cooldownSeconds > 0
                ? "none"
                : "0 4px 16px rgba(99,102,241,0.3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            transition: "all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)",
          }}
          onMouseEnter={(e) => {
            if (!isSending && message.trim()) {
              e.currentTarget.style.transform = "translateY(-2px) scale(1.02)";
              e.currentTarget.style.boxShadow =
                "0 6px 20px rgba(99,102,241,0.4)";
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "none";
            e.currentTarget.style.boxShadow =
              isSending || !message.trim()
                ? "none"
                : "0 4px 16px rgba(99,102,241,0.3)";
          }}
        >
          <Send style={{ width: "14px", height: "14px" }} />
          <span>
            {isSending
              ? t.sendingBtn
              : cooldownSeconds > 0
              ? (language === "ID" ? `Tunggu ${cooldownSeconds}s...` : `Wait ${cooldownSeconds}s...`)
              : t.sendBtn}
          </span>
        </button>
      </div>
    </div>
  );
}
