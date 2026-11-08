import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import { useReaderStore } from "../src/stores/reader-store.ts";
import { DEFAULT_READER_SETTINGS } from "../src/types/book.ts";
import {
  adjustReaderFontSize,
  getFontSizeForShortcut,
  readerFocusReducer,
} from "../src/lib/reader/reader-helpers.ts";

const initialState = useReaderStore.getState();
afterEach(() => useReaderStore.setState(initialState, true));

type ShortcutEvent = Parameters<typeof getFontSizeForShortcut>[1];
function keyEvent(key: string, overrides: Partial<ShortcutEvent> = {}): ShortcutEvent {
  return {
    key, code: "", shiftKey: false, ctrlKey: false, metaKey: false, altKey: false,
    isComposing: false, defaultPrevented: false, ...overrides,
  };
}

function prepareReader() {
  const book = {
    id: "book-1", title: "Kotori", author: "Author", language: "ja", coverUrl: null,
    fileSize: 100, totalChapters: 2, uploadedAt: 1, lastReadAt: 2,
  };
  const chapters = [0, 1].map((index) => ({
    id: `chapter-${index}`, bookId: book.id, index, title: `Chapter ${index}`, htmlContent: "<p>Text</p>",
  }));
  useReaderStore.getState().setBook(book, chapters);
  useReaderStore.getState().setCurrentChapter(1);
  useReaderStore.getState().setScrollPosition(0.6);
  useReaderStore.getState().setSettings({
    writingMode: "horizontal", theme: "sepia", fontFamily: "serif", fontSize: 30,
    lineHeight: 2.5, letterSpacing: 2, margin: "wide", readerWidth: "full",
    ttsSpeed: 1.5, enableDictionary: false, dictTrigger: "hover", lockChapterNav: true,
  });
  return useReaderStore.getState();
}

test("Reader reset: existing settings action restores every default and preserves book/progress", () => {
  const before = prepareReader();
  before.setSettings(DEFAULT_READER_SETTINGS);
  const after = useReaderStore.getState();

  assert.deepEqual(after.settings, {
    writingMode: "vertical", theme: "dark", fontFamily: "var(--font-noto-serif-jp), serif",
    fontSize: 18, lineHeight: 1.9, letterSpacing: 0, margin: "normal", readerWidth: "medium",
    ttsSpeed: 1, enableDictionary: true, dictTrigger: "click", lockChapterNav: false,
  });
  assert.deepEqual(after.settings, DEFAULT_READER_SETTINGS);
  assert.notEqual(after.settings, DEFAULT_READER_SETTINGS);
  const { settings: previousSettings, ...previousRest } = before;
  const { settings: nextSettings, ...nextRest } = after;
  assert.notDeepEqual(previousSettings, nextSettings);
  assert.deepEqual(nextRest, previousRest);
  assert.equal(after.book, before.book);
  assert.equal(after.chapters, before.chapters);
});

test("Font shortcut: + increases by exactly 1px through the existing settings action", () => {
  const before = prepareReader();
  const fontSize = getFontSizeForShortcut(before.settings.fontSize, keyEvent("+"), null);
  assert.equal(fontSize, 31);
  before.setSettings({ fontSize: fontSize! });
  assert.deepEqual(useReaderStore.getState(), { ...before, settings: { ...before.settings, fontSize: 31 } });
});

test("Font shortcut: - decreases by exactly 1px", () => {
  assert.equal(getFontSizeForShortcut(18, keyEvent("-"), null), 17);
});

test("Font shortcut: accepts Shift+= and the browser's normalized + key", () => {
  assert.equal(getFontSizeForShortcut(18, keyEvent("=", { shiftKey: true, code: "Equal" }), null), 19);
  assert.equal(getFontSizeForShortcut(18, keyEvent("+", { shiftKey: true, code: "Equal" }), null), 19);
});

test("Font shortcut: supports numpad add and subtract", () => {
  assert.equal(getFontSizeForShortcut(18, keyEvent("+", { code: "NumpadAdd" }), null), 19);
  assert.equal(getFontSizeForShortcut(18, keyEvent("-", { code: "NumpadSubtract" }), null), 17);
  assert.equal(getFontSizeForShortcut(18, keyEvent("Unidentified", { code: "NumpadAdd" }), null), 19);
  assert.equal(getFontSizeForShortcut(18, keyEvent("Unidentified", { code: "NumpadSubtract" }), null), 17);
});

test("Font size: shared panel/shortcut calculation clamps to 12–36px", () => {
  assert.equal(adjustReaderFontSize(12, -1), 12);
  assert.equal(adjustReaderFontSize(36, 1), 36);
  assert.equal(adjustReaderFontSize(12, 1), 13);
  assert.equal(adjustReaderFontSize(36, -1), 35);
  assert.equal(getFontSizeForShortcut(12, keyEvent("-"), null), 12);
  assert.equal(getFontSizeForShortcut(36, keyEvent("+"), null), 36);
});

test("Font shortcut: ignores unrelated keys and unshifted =", () => {
  for (const key of ["=", "_", "a", "ArrowLeft", "ArrowRight", "Escape", " "]) {
    assert.equal(getFontSizeForShortcut(18, keyEvent(key), null), null, key);
  }
});

for (const modifier of ["ctrlKey", "metaKey", "altKey"] as const) {
  test(`Font shortcut: ignores ${modifier}, including Shift and numpad combinations`, () => {
    for (const event of [keyEvent("+"), keyEvent("-"), keyEvent("=", { shiftKey: true }), keyEvent("+", { code: "NumpadAdd" })]) {
      assert.equal(getFontSizeForShortcut(18, { ...event, [modifier]: true }, null), null);
    }
  });
}

for (const tagName of ["INPUT", "TEXTAREA", "SELECT"]) {
  test(`Font shortcut: ignores ${tagName} targets`, () => {
    for (const key of ["+", "-"]) {
      assert.equal(getFontSizeForShortcut(18, keyEvent(key), { tagName, isContentEditable: false }), null);
    }
  });
}

test("Font shortcut: ignores contenteditable elements and their editable descendants", () => {
  for (const tagName of ["DIV", "SPAN"]) {
    assert.equal(getFontSizeForShortcut(18, keyEvent("+"), { tagName, isContentEditable: true }), null);
  }
  assert.equal(getFontSizeForShortcut(18, keyEvent("+"), { tagName: "DIV", isContentEditable: false }), 19);
});

test("Font shortcut: ignores IME composition and already handled events", () => {
  assert.equal(getFontSizeForShortcut(18, keyEvent("+", { isComposing: true }), null), null);
  assert.equal(getFontSizeForShortcut(18, keyEvent("-", { defaultPrevented: true }), null), null);
});

test("Focus Mode: local toggle activates/deactivates without changing reader settings or progress", () => {
  const before = prepareReader();
  const active = readerFocusReducer(false, "toggle");
  assert.equal(active, true);
  assert.equal(readerFocusReducer(active, "toggle"), false);
  assert.equal(useReaderStore.getState(), before);
});

test("Focus Mode: exit action used by Escape and exit button is idempotent", () => {
  const before = prepareReader();
  assert.equal(readerFocusReducer(true, "exit"), false);
  assert.equal(readerFocusReducer(false, "exit"), false);
  assert.equal(useReaderStore.getState(), before);
});
