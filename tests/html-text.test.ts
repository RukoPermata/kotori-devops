import test from "node:test";
import assert from "node:assert";
import {
  countKanji,
  countReadableChars,
  decodeHtmlEntities,
  htmlToPlainText,
} from "../src/lib/text/html-text.ts";

test("HTML text: nested tags leave only their text", () => {
  assert.strictEqual(
    htmlToPlainText("<div><p>Hello <strong>world</strong></p></div>"),
    "Hello world"
  );
});

test("HTML text: an attribute containing '>' does not break tag stripping", () => {
  assert.strictEqual(
    htmlToPlainText('<p title="a > b">Visible text</p>'),
    "Visible text"
  );
});

test("HTML text: script and style contents are excluded", () => {
  const html = `<p>Before</p><script>alert("x > y")</script><style>.a{color:red}</style><p>After</p>`;
  assert.strictEqual(htmlToPlainText(html), "Before\nAfter");
});

test("HTML text: comments are excluded", () => {
  assert.strictEqual(
    htmlToPlainText("<p>One</p><!-- hidden <b>bold</b> --><p>Two</p>"),
    "One\nTwo"
  );
});

test("HTML text: ruby annotations are removed but the base text remains", () => {
  assert.strictEqual(
    htmlToPlainText("<ruby>漢<rt>かん</rt><rp>(</rp></ruby>字"),
    "漢字"
  );
});

test("HTML text: named entities are decoded exactly once", () => {
  assert.strictEqual(decodeHtmlEntities("&amp; &lt; &gt; &quot; &nbsp;"), "& < > \" \u00A0");
  assert.strictEqual(decodeHtmlEntities("&amp;lt;"), "&lt;");
});

test("HTML text: decimal and hexadecimal numeric entities are decoded", () => {
  assert.strictEqual(decodeHtmlEntities("&#12354;&#x3042;"), "ああ");
  assert.strictEqual(decodeHtmlEntities("&#x1F600;"), "😀");
});

test("HTML text: malformed and unclosed tags do not throw", () => {
  assert.strictEqual(htmlToPlainText("<p>Hello <b>world"), "Hello world");
  assert.strictEqual(htmlToPlainText("text < not a tag > more"), "text < not a tag > more");
});

test("HTML text: block tags and breaks become separators", () => {
  assert.strictEqual(
    htmlToPlainText("<p>Line one</p><p>Line two</p>Tail<br>Next"),
    "Line one\nLine two\nTail\nNext"
  );
});

test("HTML text: whitespace is collapsed and trimmed", () => {
  assert.strictEqual(
    htmlToPlainText("  \n <div>  spaced   out  </div> \n\n"),
    "spaced out"
  );
});

test("HTML text: uppercase tags are handled", () => {
  assert.strictEqual(
    htmlToPlainText("<SCRIPT>bad()</SCRIPT><P>Good</P>"),
    "Good"
  );
});

test("HTML text: readable character count ignores whitespace and counts code points", () => {
  assert.strictEqual(countReadableChars("<p>日本 語</p>"), 3);
  assert.strictEqual(countReadableChars("<p>😀 a</p>"), 2);
  assert.strictEqual(countReadableChars(""), 0);
  assert.strictEqual(countReadableChars("<p></p>"), 0);
});

test("HTML text: kanji counting ignores kana, latin, and punctuation", () => {
  assert.strictEqual(countKanji("日本語のテキスト abc。"), 3);
  assert.strictEqual(countKanji("かなだけ"), 0);
  assert.strictEqual(countKanji(""), 0);
});
