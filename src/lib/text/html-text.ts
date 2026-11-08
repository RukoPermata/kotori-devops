const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: "\"",
  apos: "'",
  nbsp: "\u00A0",
  copy: "\u00A9",
  reg: "\u00AE",
  hellip: "\u2026",
  mdash: "\u2014",
  ndash: "\u2013",
  laquo: "\u00AB",
  raquo: "\u00BB",
  ldquo: "\u201C",
  rdquo: "\u201D",
  lsquo: "\u2018",
  rsquo: "\u2019",
  middot: "\u00B7",
  bull: "\u2022",
  yen: "\u00A5",
  times: "\u00D7",
  divide: "\u00F7",
  deg: "\u00B0",
};

const BLOCK_TAGS = new Set([
  "address", "article", "aside", "blockquote", "dd", "div", "dl", "dt",
  "fieldset", "figcaption", "figure", "footer", "form", "h1", "h2", "h3",
  "h4", "h5", "h6", "header", "hr", "li", "main", "nav", "ol", "p", "pre",
  "section", "table", "tbody", "td", "tfoot", "th", "thead", "tr", "ul",
]);

export function decodeHtmlEntities(text: string): string {
  return text.replace(/&(#[xX]?[0-9a-fA-F]+|[a-zA-Z][a-zA-Z0-9]+);/g, (match, entity: string) => {
    if (entity[0] === "#") {
      const hexadecimal = entity[1] === "x" || entity[1] === "X";
      const code = Number.parseInt(entity.slice(hexadecimal ? 2 : 1), hexadecimal ? 16 : 10);
      if (!Number.isFinite(code) || code <= 0 || code > 0x10ffff) return match;
      try {
        return String.fromCodePoint(code);
      } catch {
        return match;
      }
    }

    const named = NAMED_ENTITIES[entity.toLowerCase()];
    return named === undefined ? match : named;
  });
}

function tagName(tagBody: string): string {
  const match = /^\/?\s*([a-zA-Z][a-zA-Z0-9:-]*)/.exec(tagBody);
  return match ? match[1].toLowerCase() : "";
}

function stripTags(html: string): string {
  let output = "";
  let index = 0;
  const length = html.length;

  while (index < length) {
    const open = html.indexOf("<", index);
    if (open === -1) {
      output += html.slice(index);
      break;
    }

    output += html.slice(index, open);

    // A "<" that cannot start markup (e.g. "a < b") is literal text, not a broken tag.
    const next = html[open + 1];
    if (!next || !/[a-zA-Z/!?]/.test(next)) {
      output += "<";
      index = open + 1;
      continue;
    }

    if (html.startsWith("<!--", open)) {
      const end = html.indexOf("-->", open + 4);
      if (end === -1) break;
      index = end + 3;
      continue;
    }

    let cursor = open + 1;
    let quote: string | null = null;
    for (; cursor < length; cursor++) {
      const char = html[cursor];
      if (quote) {
        if (char === quote) quote = null;
      } else if (char === "\"" || char === "'") {
        quote = char;
      } else if (char === ">") {
        break;
      }
    }

    if (cursor >= length) break;

    const body = html.slice(open + 1, cursor);
    const name = tagName(body);
    const closing = body.startsWith("/");
    const selfClosing = body.endsWith("/");

    if (!closing && !selfClosing && (name === "script" || name === "style")) {
      const lower = html.toLowerCase();
      const close = lower.indexOf(`</${name}`, cursor + 1);
      if (close === -1) break;
      const closeEnd = html.indexOf(">", close);
      if (closeEnd === -1) break;
      index = closeEnd + 1;
      output += " ";
      continue;
    }

    if (!closing && !selfClosing && (name === "rt" || name === "rp")) {
      const lower = html.toLowerCase();
      const close = lower.indexOf(`</${name}`, cursor + 1);
      if (close === -1) break;
      const closeEnd = html.indexOf(">", close);
      if (closeEnd === -1) break;
      index = closeEnd + 1;
      continue;
    }

    if (name === "br" || BLOCK_TAGS.has(name)) {
      output += "\n";
    }

    index = cursor + 1;
  }

  return output;
}

function normalizeWhitespace(text: string): string {
  return text
    .replace(/\u00A0/g, " ")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t\f\v]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

export function htmlToPlainText(html: string): string {
  if (typeof html !== "string" || html.length === 0) return "";
  return normalizeWhitespace(decodeHtmlEntities(stripTags(html)));
}

export function countReadableChars(html: string): number {
  return Array.from(htmlToPlainText(html).replace(/\s+/g, "")).length;
}

export function countKanji(text: string): number {
  if (typeof text !== "string" || text.length === 0) return 0;
  return text.match(/[\u3400-\u4DBF\u4E00-\u9FFF]/g)?.length ?? 0;
}
