/**
 * Reader DOM, Range, and Text helper utilities.
 */

export function extractTextAndFurigana(
  container: HTMLElement,
  range?: Range | null,
  selection?: Selection | null
): { baseText: string; explicitFurigana: string } {
  let baseText = "";
  let explicitFurigana = "";

  try {
    const clone = container.cloneNode(true) as HTMLElement;

    // Extract explicit furigana from <rt> tags
    const rtElements = clone.querySelectorAll("rt");
    if (rtElements.length > 0) {
      const furiganaParts: string[] = [];
      rtElements.forEach((rt) => {
        const text = rt.textContent?.trim();
        if (text) furiganaParts.push(text);
      });
      explicitFurigana = furiganaParts.join("");
    }

    // Remove <rt> and <rp> elements to get clean base text
    clone.querySelectorAll("rt, rp").forEach((el) => el.remove());
    baseText = clone.textContent?.replace(/\s+/g, "").trim() || "";
  } catch {
    baseText = container.textContent?.replace(/\s+/g, "").trim() || "";
  }

  return {
    baseText: baseText || (selection ? selection.toString().trim() : ""),
    explicitFurigana,
  };
}

export function findTextRange(container: HTMLElement, targetText: string): Range | null {
  if (!container || !targetText) return null;

  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  let currentNode: Node | null;

  while ((currentNode = walker.nextNode())) {
    const content = currentNode.textContent;
    if (content && content.includes(targetText)) {
      const startOffset = content.indexOf(targetText);
      const range = document.createRange();
      range.setStart(currentNode, startOffset);
      range.setEnd(currentNode, startOffset + targetText.length);
      return range;
    }
  }

  // Fallback: search across multiple adjacent text nodes
  const fullText = container.textContent || "";
  const fullIndex = fullText.indexOf(targetText);
  if (fullIndex === -1) return null;

  let charCount = 0;
  let startNode: Node | null = null;
  let startOffset = 0;
  let endNode: Node | null = null;
  let endOffset = 0;

  const walker2 = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  while ((currentNode = walker2.nextNode())) {
    const textLen = currentNode.textContent?.length || 0;
    if (!startNode && charCount + textLen > fullIndex) {
      startNode = currentNode;
      startOffset = fullIndex - charCount;
    }
    if (startNode && charCount + textLen >= fullIndex + targetText.length) {
      endNode = currentNode;
      endOffset = fullIndex + targetText.length - charCount;
      break;
    }
    charCount += textLen;
  }

  if (startNode && endNode) {
    const range = document.createRange();
    range.setStart(startNode, startOffset);
    range.setEnd(endNode, endOffset);
    return range;
  }

  return null;
}

export function findNearestTextRects(
  container: HTMLElement,
  targetText: string,
  nearLeft: number,
  nearTop: number
): Array<{ left: number; top: number; width: number; height: number }> | null {
  if (!targetText) return null;

  let best: { dist: number; rects: DOMRect[] } | null = null;
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  let node: Node | null;

  while ((node = walker.nextNode())) {
    const content = node.textContent;
    if (!content) continue;
    let from = content.indexOf(targetText);
    while (from !== -1) {
      try {
        const range = document.createRange();
        range.setStart(node, from);
        range.setEnd(node, from + targetText.length);
        const box = range.getBoundingClientRect();
        const dist = Math.hypot(box.left - nearLeft, box.top - nearTop);
        if (!best || dist < best.dist) {
          best = { dist, rects: Array.from(range.getClientRects()) };
        }
        if (dist < 2) break;
      } catch {
        // Skip invalid occurrences
      }
      from = content.indexOf(targetText, from + 1);
    }
    if (best && best.dist < 2) break;
  }

  if (!best) return null;
  return best.rects.map((r) => ({
    left: r.left,
    top: r.top,
    width: Math.max(r.width, 4),
    height: Math.max(r.height, 4),
  }));
}

export function usesNegativeScrollLeft(el: HTMLElement): boolean {
  const original = el.scrollLeft;
  el.scrollLeft = -1;
  const isNegative = el.scrollLeft < 0;
  el.scrollLeft = original;
  return isNegative;
}

export function getPlainTextLength(html: string): number {
  if (typeof document === "undefined") return 0;
  const el = document.createElement("div");
  el.innerHTML = html;
  return (el.textContent || "").length;
}
