export const FEEDBACK_CATEGORIES = ["idea", "bug", "dictionary", "love"] as const;
export type FeedbackCategory = (typeof FEEDBACK_CATEGORIES)[number];

export interface FeedbackDraft {
  category: FeedbackCategory;
  message: string;
  contact: string;
}

export const FEEDBACK_DRAFT_KEY = "kotori_feedback_draft";

export function emptyFeedbackDraft(): FeedbackDraft {
  return { category: "idea", message: "", contact: "" };
}

function isFeedbackCategory(value: unknown): value is FeedbackCategory {
  return FEEDBACK_CATEGORIES.some((category) => category === value);
}

export function parseFeedbackDraft(raw: string): FeedbackDraft {
  const value: unknown = JSON.parse(raw);
  if (
    !value ||
    typeof value !== "object" ||
    !("category" in value) ||
    !isFeedbackCategory(value.category) ||
    !("message" in value) ||
    typeof value.message !== "string" ||
    value.message.length > 1000 ||
    !("contact" in value) ||
    typeof value.contact !== "string" ||
    value.contact.length > 100
  ) {
    throw new Error("Invalid feedback draft");
  }
  return {
    category: value.category,
    message: value.message,
    contact: value.contact,
  };
}

export function readFeedbackDraft(storage: Storage): FeedbackDraft {
  const saved = storage.getItem(FEEDBACK_DRAFT_KEY);
  return saved === null ? emptyFeedbackDraft() : parseFeedbackDraft(saved);
}

export function saveFeedbackDraft(storage: Storage, draft: FeedbackDraft): void {
  storage.setItem(FEEDBACK_DRAFT_KEY, JSON.stringify(draft));
}

export function clearFeedbackDraft(storage: Storage): void {
  storage.removeItem(FEEDBACK_DRAFT_KEY);
}

export function getFeedbackCategoryLabel(category: unknown): string {
  switch (category) {
    case "bug": return "🐞 Lapor Bug / Error";
    case "idea": return "💡 Ide Fitur Baru";
    case "dictionary": return "📚 Kesalahan Kamus";
    default: return "❤️ Apresiasi / Lainnya";
  }
}

export function getFeedbackPreview(draft: FeedbackDraft): FeedbackDraft {
  return {
    category: draft.category,
    message: draft.message.trim(),
    contact: draft.contact.trim(),
  };
}
