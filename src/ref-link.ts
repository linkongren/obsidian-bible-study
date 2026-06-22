/**
 * 编辑器内经文引用链接装饰 + 悬停预览
 * - :约3:16 显示为可点击链接
 * - 点击 → 跳转到圣经面板
 * - 悬停 → 弹出经文预览
 */

import { EditorView, Decoration, DecorationSet, ViewPlugin, ViewUpdate } from "@codemirror/view";
import { parseReference } from "./reference-modal";
import { loadBook, getVerses } from "./bible-data";

/** CSS class */
const LINK_CLASS = "bible-ref-link";

/** 匹配 :ref 或 ;ref */
const REF_LINK_RE = /(?:^|[\s([{（【『「])([:;])([一-鿿a-zA-Z]+)\s*(\d+)[：:](\d+)(?:[-–—](\d+))?/g;

/** 预览缓存 */
const previewCache = new Map<string, string>();

/** 当前显示的 tooltip 元素 */
let currentTooltip: HTMLElement | null = null;
let hoverTimer: ReturnType<typeof setTimeout> | null = null;

function extractRef(match: RegExpExecArray): { refText: string; start: number; end: number } {
  const bookName = match[2];
  const chapter = match[3];
  const verse = match[4];
  const endVerse = match[5] || undefined;
  const refText = bookName + " " + chapter + ":" + verse + (endVerse ? "-" + endVerse : "");
  const fullStart = match.index!;
  const fullEnd = fullStart + match[0].length;
  return { refText, start: fullStart, end: fullEnd };
}

function hideTooltip() {
  if (hoverTimer) { clearTimeout(hoverTimer); hoverTimer = null; }
  if (currentTooltip) {
    currentTooltip.remove();
    currentTooltip = null;
  }
}

function showTooltip(el: HTMLElement) {
  hideTooltip();

  const refText = el.getAttribute("data-bible-ref");
  const bookId = el.getAttribute("data-book-id");
  if (!refText) return;

  // 创建 tooltip
  const tip = document.createElement("div");
  tip.className = "bible-ref-tooltip";

  // 从缓存取或显示加载中
  const cacheKey = refText;
  if (previewCache.has(cacheKey)) {
    tip.innerHTML = previewCache.get(cacheKey)!;
  } else {
    tip.innerHTML = '<div class="bible-ref-tooltip-loading">加载中…</div>';
    // 异步加载
    loadPreview(refText, bookId).then((html) => {
      if (html && currentTooltip === tip) {
        tip.innerHTML = html;
        // 重新定位（内容变了高度可能变化）
        positionTooltip(tip, el);
      }
      if (html) previewCache.set(cacheKey, html);
    });
  }

  document.body.appendChild(tip);
  currentTooltip = tip;
  positionTooltip(tip, el);

  // 绑定事件
  tip.addEventListener("mouseenter", () => {
    if (hoverTimer) clearTimeout(hoverTimer);
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

  // 不超出右边界
  if (left + tipWidth > window.innerWidth - 10) {
    left = window.innerWidth - tipWidth - 10;
  }
  if (left < 10) left = 10;

  // 如果下方空间不够，放上面
  if (top + tipMaxHeight > window.innerHeight - 10) {
    top = rect.top - tipMaxHeight - 6;
  }

  tip.style.left = left + "px";
  tip.style.top = top + "px";
}

async function loadPreview(refText: string, bookIdHint?: string | null): Promise<string | null> {
  try {
    const ref = parseReference(refText);
    if (!ref) return null;

    // 从全局 adapter 获取（通过 window 暴露）
    const adapter = (window as any).__bibleAdapter;
    if (!adapter) return null;

    const bookData = await loadBook("cuv", ref.bookId, adapter);
    if (!bookData) return null;

    const verses = getVerses(bookData, ref.chapter, ref.startVerse, ref.endVerse);
    if (verses.length === 0) return null;

    const header = `<div class="bible-ref-tooltip-header">${ref.bookName} ${ref.chapter}:${ref.startVerse}${ref.endVerse ? '-' + ref.endVerse : ''}</div>`;
    const bodyLines = verses.map(v =>
      `<div class="bible-ref-tooltip-verse"><span class="bible-ref-tooltip-vn">${v.verse}</span>${escapeHtml(v.text)}</div>`
    ).join("");
    const body = `<div class="bible-ref-tooltip-body">${bodyLines}</div>`;

    return header + body;
  } catch {
    return null;
  }
}

function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

/** 缓存限制 */
function trimCache() {
  if (previewCache.size > 200) {
    const keys = [...previewCache.keys()];
    for (let i = 0; i < 50; i++) previewCache.delete(keys[i]);
  }
}

export function createRefLinkExtension(
  onClickRef: (refText: string) => void,
  vaultAdapter: any
) {
  // 暴露 adapter 给异步加载使用
  (window as any).__bibleAdapter = vaultAdapter;

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

        mouseover: (e: MouseEvent, _view: EditorView) => {
          const target = e.target as HTMLElement;
          const el = target.closest("." + LINK_CLASS) as HTMLElement;
          if (el) {
            // 延迟显示，避免快速划过
            hoverTimer = setTimeout(() => {
              showTooltip(el);
            }, 300);
          }
        },

        mouseout: (e: MouseEvent, _view: EditorView) => {
          const target = e.target as HTMLElement;
          const related = (e as any).relatedTarget as HTMLElement;
          // 如果鼠标移到了 tooltip 上，不隐藏
          if (related && (related.closest(".bible-ref-tooltip") || related.closest("." + LINK_CLASS))) {
            return;
          }
          if (target.closest("." + LINK_CLASS)) {
            if (hoverTimer) clearTimeout(hoverTimer);
            // 延迟隐藏
            hoverTimer = setTimeout(() => {
              hideTooltip();
            }, 200);
          }
        },
      },
    }
  );

  return refLinkPlugin;
}
