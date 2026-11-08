import test from "node:test";
import assert from "node:assert/strict";
import {
  clearFeedbackDraft,
  emptyFeedbackDraft,
  FEEDBACK_CATEGORIES,
  FEEDBACK_DRAFT_KEY,
  getFeedbackCategoryLabel,
  getFeedbackPreview,
  parseFeedbackDraft,
  readFeedbackDraft,
  saveFeedbackDraft,
} from "../src/lib/feedback.ts";

function memoryStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() { return values.size; },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => Array.from(values.keys())[index] ?? null,
    removeItem: (key) => { values.delete(key); },
    setItem: (key, value) => { values.set(key, value); },
  };
}

test("draft: saves and restores category, message, and contact", () => {
  const storage = memoryStorage();
  const draft = { category: "dictionary" as const, message: "Wrong meaning", contact: "reader" };
  saveFeedbackDraft(storage, draft);
  assert.deepEqual(readFeedbackDraft(storage), draft);
});

test("draft: starts empty when no draft exists", () => {
  assert.deepEqual(readFeedbackDraft(memoryStorage()), emptyFeedbackDraft());
});

test("draft: clearing removes the stored draft", () => {
  const storage = memoryStorage();
  saveFeedbackDraft(storage, { ...emptyFeedbackDraft(), message: "hello" });
  clearFeedbackDraft(storage);
  assert.equal(storage.getItem(FEEDBACK_DRAFT_KEY), null);
});

test("draft: malformed or invalid data is reported", () => {
  for (const raw of ["{", "null", '{"category":"bad","message":"hi","contact":""}', '{"category":"idea","message":42,"contact":""}']) {
    assert.throws(() => parseFeedbackDraft(raw));
  }
});

test("draft: oversized fields are rejected", () => {
  assert.throws(() => parseFeedbackDraft(JSON.stringify({ ...emptyFeedbackDraft(), message: "x".repeat(1001) })));
  assert.throws(() => parseFeedbackDraft(JSON.stringify({ ...emptyFeedbackDraft(), contact: "x".repeat(101) })));
});

test("draft: storage failures are not hidden", () => {
  const storage = memoryStorage();
  storage.setItem = () => { throw new Error("storage unavailable"); };
  assert.throws(() => saveFeedbackDraft(storage, emptyFeedbackDraft()), /storage unavailable/);
});

test("preview: includes the selected dictionary category and message", () => {
  assert.deepEqual(getFeedbackPreview({ category: "dictionary", message: "bad entry", contact: "reader" }),
    { category: "dictionary", message: "bad entry", contact: "reader" });
});

test("preview: trims surrounding whitespace as the API does", () => {
  const preview = getFeedbackPreview({ category: "bug", message: "  broken  ", contact: "  user  " });
  assert.equal(preview.message, "broken");
  assert.equal(preview.contact, "user");
});

test("preview: preserves multiline text and literal HTML", () => {
  assert.equal(getFeedbackPreview({ ...emptyFeedbackDraft(), message: "first\n<script>test</script>" }).message,
    "first\n<script>test</script>");
});

test("preview: empty contact remains empty for anonymous display", () => {
  assert.equal(getFeedbackPreview({ ...emptyFeedbackDraft(), contact: "  " }).contact, "");
});

test("category: dictionary errors have their own API label", () => {
  assert.equal(getFeedbackCategoryLabel("dictionary"), "📚 Kesalahan Kamus");
});

test("category: dictionary is selectable alongside the original categories", () => {
  assert.deepEqual(FEEDBACK_CATEGORIES, ["idea", "bug", "dictionary", "love"]);
});

test("category: existing labels remain unchanged", () => {
  assert.equal(getFeedbackCategoryLabel("bug"), "🐞 Lapor Bug / Error");
  assert.equal(getFeedbackCategoryLabel("idea"), "💡 Ide Fitur Baru");
  assert.equal(getFeedbackCategoryLabel("love"), "❤️ Apresiasi / Lainnya");
});

test("category: unknown categories keep the existing fallback", () => {
  assert.equal(getFeedbackCategoryLabel("unknown"), "❤️ Apresiasi / Lainnya");
});
