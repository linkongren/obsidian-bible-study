/**
 * 内联引用展开
 * 在编辑器中输入 :约3:16 然后按 Tab，直接将引用替换为经文
 */

import { Editor, Notice } from "obsidian";
import { EditorView, keymap } from "@codemirror/view";
import { Prec } from "@codemirror/state";
import { parseReference } from "./reference-modal";
import { loadBook, getVerses, formatVersePlain } from "./bible-data";
import { BibleStudySettings } from "./types";

/**
 * 匹配 :ref 或 ;ref 模式的正则
 * 组1: 触发符 (: 或 ;)
 * 组2: 引用文本 (书名+章:节)
 *
 * 支持格式：
 *   :约3:16     :约翰福音 3:16     :yuehan 3:16-18
 */
const REF_PATTERN = /(?:^|[\s([{（【『「])([:;])([一-鿿a-zA-Z]+)\s*(\d+)[：:](\d+)(?:[-–—](\d+))?$/;

/**
 * 从编辑器光标位置向前查找内联引用模式
 */
export function findRefBeforeCursor(editor: Editor): { ref: string; from: number; to: number } | null {
  const cursor = editor.getCursor();
  const line = editor.getLine(cursor.line);
  const before = line.slice(0, cursor.ch);

  const match = before.match(REF_PATTERN);
  if (!match) return null;

  // match[1]=触发符, match[2]=书名, match[3]=章, match[4]=节, match[5]=结束节
  const refText = match[2] + " " + match[3] + ":" + match[4] + (match[5] ? "-" + match[5] : "");
  const triggerLen = match[1].length;
  const totalLen = match[0].length;

  return {
    ref: refText,
    from: cursor.ch - totalLen,
    to: cursor.ch,
  };
}

/**
 * 执行内联展开（Ctrl+Shift+B 命令调用）
 */
export async function doExpand(
  editor: Editor,
  settings: BibleStudySettings,
  adapter: any
): Promise<boolean> {
  const found = findRefBeforeCursor(editor);
  if (!found) return false;

  const ref = parseReference(found.ref);
  if (!ref) return false;

  const bookData = await loadBook(settings.defaultVersion, ref.bookId, adapter);
  if (!bookData) return false;

  const verses = getVerses(bookData, ref.chapter, ref.startVerse, ref.endVerse);
  if (verses.length === 0) return false;

  const formatted = formatVersePlain(ref.bookName, ref.chapter, verses);

  const cursor = editor.getCursor();
  editor.replaceRange(formatted, { line: cursor.line, ch: found.from }, cursor);

  new Notice(`${ref.bookName} ${ref.chapter}:${ref.startVerse}${ref.endVerse ? `-${ref.endVerse}` : ''}`);
  return true;
}

/**
 * 创建 CodeMirror 扩展：Tab 键触发内联展开
 */
export function createTabExpandExtension(
  settings: BibleStudySettings,
  adapter: any
) {
  return Prec.highest(
    keymap.of([{
      key: "Tab",
      run: (view: EditorView): boolean => {
        const pos = view.state.selection.main.head;
        const line = view.state.doc.lineAt(pos);
        const before = line.text.slice(0, pos - line.from);

        const match = before.match(REF_PATTERN);
        if (!match) return false;

        // match[2]=书名, match[3]=章, match[4]=节, match[5]=结束节
        const bookName = match[2];
        const chapter = match[3];
        const verse = match[4];
        const endVerse = match[5] || undefined;

        const refText = bookName + " " + chapter + ":" + verse + (endVerse ? "-" + endVerse : "");
        const ref = parseReference(refText);
        if (!ref) return false;

        // 替换范围：从触发符 : 到光标位置
        const from = line.from + match.index!;

        loadBook(settings.defaultVersion, ref.bookId, adapter).then((bookData) => {
          if (!bookData) {
            new Notice(`未找到「${ref.bookName}」的经文数据`);
            return;
          }
          const verses = getVerses(bookData, ref.chapter, ref.startVerse, ref.endVerse);
          if (verses.length === 0) {
            new Notice(`未找到经文 ${ref.bookName} ${ref.chapter}:${ref.startVerse}`);
            return;
          }

          const formatted = formatVersePlain(ref.bookName, ref.chapter, verses);

          view.dispatch({
            changes: { from, to: pos, insert: formatted },
          });

          new Notice(
            `${ref.bookName} ${ref.chapter}:${ref.startVerse}${ref.endVerse ? `-${ref.endVerse}` : ''}`
          );
        });

        return true; // 拦截 Tab
      },
    }])
  );
}
