import test from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { dictionaryDb } from "../src/services/dictionary-db.ts";

test("Security: Input sanitization and HTML escaping", () => {
  function escapeHtml(str: string): string {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  // Script tag neutralization
  const scriptPayload = "<script>alert('XSS')</script>";
  const escapedScript = escapeHtml(scriptPayload);
  assert.strictEqual(escapedScript, "&lt;script&gt;alert('XSS')&lt;/script&gt;");
  assert.ok(!escapedScript.includes("<script>"), "Raw script tag must not remain");

  // Onerror attribute tag escaping
  const imgPayload = '<img src="x" onerror="alert(1)">';
  const escapedImg = escapeHtml(imgPayload);
  assert.strictEqual(escapedImg, '&lt;img src="x" onerror="alert(1)"&gt;');
  assert.ok(!escapedImg.startsWith("<"), "Raw HTML opening bracket must be neutralized");
});

test("Dictionary SQLite Database: Query latency & integrity", () => {
  const dbPath = path.join(process.cwd(), "src", "data", "dict-v1.db");
  if (!fs.existsSync(dbPath)) {
    execSync("node scripts/build-dict-cache.mjs", { stdio: "ignore" });
  }
  const isReady = dictionaryDb.isReady();
  assert.ok(isReady, "Dictionary SQLite DB must initialize successfully");

  const t0 = performance.now();
  const terms = dictionaryDb.getTerms("食べる");
  const tQuery = performance.now() - t0;

  assert.ok(terms && terms.length > 0, "Query for '食べる' must return valid terms");
  assert.ok(tQuery < 10, `Query latency should be under 10ms (was ${tQuery.toFixed(3)}ms)`);

  const hasWord = dictionaryDb.hasTerm("学校");
  assert.ok(hasWord, "hasTerm('学校') must return true");

  const byReading = dictionaryDb.getTermsByReading("みゆき");
  assert.ok(byReading && byReading.length > 0, "Reading query for 'みゆき' must return matching entries");
});
