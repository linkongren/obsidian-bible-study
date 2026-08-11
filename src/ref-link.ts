import { EditorView, Decoration, DecorationSet, ViewPlugin, ViewUpdate } from "@codemirror/view";
import { parseMultiReference } from "./reference-modal";
import { buildPlainBookPattern } from "./book-names";

const LINK_CLASS = "bible-ref-link";

const TRIGGER_LINK_RE = /([-！])([一-鿿a-zA-Z]+)\s*([\d：:\s,，\-–—]+)/g;
const STAR_LINK_RE = /\*([^*]+)\*/g;
const PLAIN_LINK_RE = new RegExp(`(^|[^\\p{L}\\p{N}*\\-！])(${buildPlainBookPattern()})\\s+([\\d：:\\s,，\\-–—]+)`, "gu");

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

          TRIGGER_LINK_RE.lastIndex = 0;
          let match: RegExpExecArray | null;
          while ((match = TRIGGER_LINK_RE.exec(text)) !== null) {
            const refText = match[2] + " " + match[3];
            if (parseMultiReference(refText).length === 0) continue;
            decorations.push({
              from: range.from + match.index,
              to: range.from + match.index + match[0].length,
              value: Decoration.mark({ class: LINK_CLASS, attributes: { "data-bible-ref": refText, "title": "" } }),
            });
          }

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

          // 普通文本引用：马太福音 5:6（不带 * 或 -），借助书名字典避免误匹配
          PLAIN_LINK_RE.lastIndex = 0;
          while ((match = PLAIN_LINK_RE.exec(text)) !== null) {
            const rest = match[3].replace(/[\s,，、；;]+$/, "");
            const refText = match[2] + " " + rest;
            if (parseMultiReference(refText).length === 0) continue;
            const start = range.from + match.index + match[1].length;
            const end = start + match[2].length + 1 + rest.length;
            decorations.push({
              from: start,
              to: end,
              value: Decoration.mark({ class: LINK_CLASS, attributes: { "data-bible-ref": refText, "title": "" } }),
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
        click: (e: MouseEvent) => {
          const el = (e.target as HTMLElement).closest("." + LINK_CLASS) as HTMLElement;
          if (el) {
            const refText = el.getAttribute("data-bible-ref");
            if (refText) { e.preventDefault(); e.stopPropagation(); onClickRef(refText); return true; }
          }
          return false;
        },
      },
    }
  );
}
