import { EditorView, Decoration, DecorationSet, ViewPlugin, ViewUpdate } from "@codemirror/view";
import { parseReference } from "./reference-modal";
import { loadBook, getVerses } from "./bible-data";
import type { VerseData } from "./types";

interface PreviewCacheEntry {
  bookName: string;
  chapter: number;
  startVerse: number;
  endVerse?: number;
  verses: VerseData[];
}

const LINK_CLASS = "bible-ref-link";

const REF_LINK_RE = /(?:^|[\s([{（【『「])([-])([一-鿿a-zA-Z]+)\s*(\d+)[：:](\d+)(?:[-–—](\d+))?/g;

const previewCache = new Map<string, PreviewCacheEntry>();

let currentTooltip: HTMLElement | null = null;
let hoverTimer: number | null = null;

function extractRef(match: RegExpExecArray): { refText: string; start: number; end: number } {
  const bookName = match[2];
  const chapter = match[3];
  const verse = match[4];
  const endVerse = match[5] || undefined;
  const refText = bookName + " " + chapter + ":" + verse + (endVerse ? "-" + endVerse : "");
  const fullStart = match.index ?? 0;
  const fullEnd = fullStart + match[0].length;
  return { refText, start: fullStart, end: fullEnd };
}

function hideTooltip() {
  if (hoverTimer) { window.clearTimeout(hoverTimer); hoverTimer = null; }
  if (currentTooltip) {
    currentTooltip.remove();
    currentTooltip = null;
  }
}

function buildPreviewContent(tip: HTMLElement, data: PreviewCacheEntry) {
  tip.createEl("div", {
    cls: "bible-ref-tooltip-header",
    text: `${data.bookName} ${data.chapter}:${data.startVerse}${data.endVerse ? '-' + data.endVerse : ''}`
  });
  const body = tip.createEl("div", { cls: "bible-ref-tooltip-body" });
  for (const v of data.verses) {
    const verseRow = body.createEl("div", { cls: "bible-ref-tooltip-verse" });
    verseRow.createEl("span", { cls: "bible-ref-tooltip-vn", text: String(v.verse) });
    verseRow.createEl("span", { text: v.text });
  }
}

function showTooltip(el: HTMLElement, doc: Document) {
  hideTooltip();

  const refText = el.getAttribute("data-bible-ref");
  if (!refText) return;

  const tip = doc.createElement("div");
  tip.className = "bible-ref-tooltip";

  const cacheKey = refText;
  if (previewCache.has(cacheKey)) {
    buildPreviewContent(tip, previewCache.get(cacheKey)!);
  } else {
    tip.createEl("div", { cls: "bible-ref-tooltip-loading", text: "加载中…" });
    const data = loadPreview(refText);
    if (data) {
      tip.empty();
      buildPreviewContent(tip, data);
      previewCache.set(cacheKey, data);
    }
  }

  doc.body.appendChild(tip);
  currentTooltip = tip;
  positionTooltip(tip, el);

  tip.addEventListener("mouseenter", () => {
    if (hoverTimer) window.clearTimeout(hoverTimer);
  });
  tip.addEventListener("mouseleave", () => {
    hideTooltip();
  });
}

function positionTooltip(tip: HTMLElement, anchor: HTMLElement) {
  const rect = anchor.getBoundingClientRect();
  const tipWidth = 380;
  const tipMaxHeight = 260;

  let left = rect.left;
  let top = rect.bottom + 6;

  if (left + tipWidth > window.innerWidth - 10) {
    left = window.innerWidth - tipWidth - 10;
  }
  if (left < 10) left = 10;

  if (top + tipMaxHeight > window.innerHeight - 10) {
    top = rect.top - tipMaxHeight - 6;
  }

  tip.style.left = left + "px";
  tip.style.top = top + "px";
}

function loadPreview(refText: string): PreviewCacheEntry | null {
  const ref = parseReference(refText);
  if (!ref) return null;

  const bookData = loadBook("cuv", ref.bookId);
  if (!bookData) return null;

  const verses = getVerses(bookData, ref.chapter, ref.startVerse, ref.endVerse);
  if (verses.length === 0) return null;

  return {
    bookName: ref.bookName,
    chapter: ref.chapter,
    startVerse: ref.startVerse,
    endVerse: ref.endVerse,
    verses,
  };
}

export function createRefLinkExtension(
  onClickRef: (refText: string) => void
) {
  const refLinkPlugin = ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;

      constructor(view: EditorView) {
        this.decorations = this.buildDecorations(view);
      }

      update(update: ViewUpdate) {
        if (update.docChanged || update.viewportChanged) {
          this.decorations = this.buildDecorations(update.view);
        }
      }

      buildDecorations(view: EditorView): DecorationSet {
        const decorations: { from: number; to: number; value: Decoration }[] = [];
        const visibleRange = view.visibleRanges;
        if (visibleRange.length === 0) return Decoration.none;

        for (const range of visibleRange) {
          const text = view.state.doc.sliceString(range.from, range.to);
          REF_LINK_RE.lastIndex = 0;
          let match: RegExpExecArray | null;

          while ((match = REF_LINK_RE.exec(text)) !== null) {
            const { refText, start, end } = extractRef(match);

            decorations.push({
              from: range.from + start,
              to: range.from + end,
              value: Decoration.mark({
                class: LINK_CLASS,
                attributes: {
                  "data-bible-ref": refText,
                  "title": "",
                },
              }),
            });
          }
        }

        return Decoration.set(decorations, true);
      }

      destroy() {}
    },
    {
      decorations: (v) => v.decorations,
      eventHandlers: {
        click: (e: MouseEvent, _view: EditorView) => {
          const target = e.target as HTMLElement;
          const el = target.closest("." + LINK_CLASS) as HTMLElement;
          if (el) {
            const refText = el.getAttribute("data-bible-ref");
            if (refText) {
              e.preventDefault();
              e.stopPropagation();
              onClickRef(refText);
              return true;
            }
          }
          return false;
        },

        mouseover: (e: MouseEvent, view: EditorView) => {
          const target = e.target as HTMLElement;
          const el = target.closest("." + LINK_CLASS) as HTMLElement;
          if (el) {
            const doc = view.dom.ownerDocument;
            hoverTimer = window.setTimeout(() => {
              showTooltip(el, doc);
            }, 300);
          }
        },

        mouseout: (e: MouseEvent, view: EditorView) => {
          const target = e.target as HTMLElement;
          const related = e.relatedTarget as HTMLElement;
          if (related && (related.closest(".bible-ref-tooltip") || related.closest("." + LINK_CLASS))) {
            return;
          }
          if (target.closest("." + LINK_CLASS)) {
            if (hoverTimer) window.clearTimeout(hoverTimer);
            hoverTimer = window.setTimeout(() => {
              hideTooltip();
            }, 200);
          }
        },
      },
    }
  );

  return refLinkPlugin;
}
