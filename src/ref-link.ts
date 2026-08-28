import { EditorView, Decoration, DecorationSet, ViewPlugin, ViewUpdate } from "@codemirror/view";
import { createPlainReferenceRegExp, parseMultiReference, plainRefRange } from "./reference-parser";

const LINK_CLASS = "bible-ref-link";

const STAR_LINK_RE = /\*([^*]+)\*/g;
const PLAIN_LINK_RE = createPlainReferenceRegExp();

export function createRefLinkExtension(
  onClickRef: (refText: string) => void
) {
  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;

      constructor(view: EditorView) { this.decorations = this.buildDecorations(view); }

      update(update: ViewUpdate) {
        if (update.docChanged || update.viewportChanged) this.decorations = this.buildDecorations(update.view);
      }

      buildDecorations(view: EditorView): DecorationSet {
        const decorations: { from: number; to: number; value: Decoration }[] = [];
        for (const range of view.visibleRanges) {
          const text = view.state.doc.sliceString(range.from, range.to);

          let match: RegExpExecArray | null;
          STAR_LINK_RE.lastIndex = 0;
          while ((match = STAR_LINK_RE.exec(text)) !== null) {
            const inside = match[1].trim();
            if (parseMultiReference(inside).length > 0) {
              decorations.push({
                from: range.from + match.index,
                to: range.from + match.index + match[0].length,
                value: Decoration.mark({ class: LINK_CLASS, attributes: { "data-bible-ref": inside, "title": "" } }),
              });
            }
          }

          // 普通文本引用：马太福音 5:6，借助书名字典避免误匹配
          PLAIN_LINK_RE.lastIndex = 0;
          while ((match = PLAIN_LINK_RE.exec(text)) !== null) {
            const r = plainRefRange(match);
            if (parseMultiReference(r.refText).length === 0) continue;
            decorations.push({
              from: range.from + r.start,
              to: range.from + r.end,
              value: Decoration.mark({ class: LINK_CLASS, attributes: { "data-bible-ref": r.refText, "title": "" } }),
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
        click: (e: MouseEvent, view: EditorView) => {
          const t = e.target as HTMLElement | null;
          let refText: string | null = null;
          // 1) 直接命中的引用 span
          const el = t?.closest?.("." + LINK_CLASS) as HTMLElement | null;
          if (el) refText = el.getAttribute("data-bible-ref");
          // 2) 兜底：行首/文本节点等边界情况按点击坐标定位
          if (!refText && t && view.dom.contains(t)) {
            const pos = view.posAtCoords({ x: e.clientX, y: e.clientY });
            if (pos !== null) {
              const node = view.domAtPos(pos).node as HTMLElement;
              const refEl = node?.closest?.("." + LINK_CLASS) as HTMLElement | null;
              refText = refEl?.getAttribute("data-bible-ref") ?? null;
            }
          }
          if (refText) {
            e.preventDefault();
            e.stopPropagation();
            onClickRef(refText);
            return true;
          }
          return false;
        },
      },
    }
  );
}
