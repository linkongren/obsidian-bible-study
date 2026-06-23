import { Editor, Notice } from "obsidian";
import { EditorView, keymap } from "@codemirror/view";
import { Prec } from "@codemirror/state";
import { parseReference } from "./reference-modal";
import { loadBook, getVerses, formatVersePlain } from "./bible-data";
import { BibleStudySettings } from "./types";

const REF_PATTERN = /(?:^|[\s([{（【『「])([-])([一-鿿a-zA-Z]+)\s*(\d+)[：:](\d+)(?:[-–—](\d+))?$/;

export function findRefBeforeCursor(editor: Editor): { ref: string; from: number; to: number } | null {
  const cursor = editor.getCursor();
  const line = editor.getLine(cursor.line);
  const before = line.slice(0, cursor.ch);

  const match = before.match(REF_PATTERN);
  if (!match) return null;

  const refText = match[2] + " " + match[3] + ":" + match[4] + (match[5] ? "-" + match[5] : "");
  const totalLen = match[0].length;

  return {
    ref: refText,
    from: cursor.ch - totalLen,
    to: cursor.ch,
  };
}

export function doExpand(
  editor: Editor,
  settings: BibleStudySettings
): boolean {
  const found = findRefBeforeCursor(editor);
  if (!found) return false;

  const ref = parseReference(found.ref);
  if (!ref) return false;

  const bookData = loadBook(settings.defaultVersion, ref.bookId);
  if (!bookData) return false;

  const verses = getVerses(bookData, ref.chapter, ref.startVerse, ref.endVerse);
  if (verses.length === 0) return false;

  const formatted = formatVersePlain(ref.bookName, ref.chapter, verses);

  const cursor = editor.getCursor();
  editor.replaceRange(formatted, { line: cursor.line, ch: found.from }, cursor);

  new Notice(`${ref.bookName} ${ref.chapter}:${ref.startVerse}${ref.endVerse ? `-${ref.endVerse}` : ''}`);
  return true;
}

export function createTabExpandExtension(
  settings: BibleStudySettings
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

        const bookName = match[2];
        const chapter = match[3];
        const verse = match[4];
        const endVerse = match[5] || undefined;

        const refText = bookName + " " + chapter + ":" + verse + (endVerse ? "-" + endVerse : "");
        const ref = parseReference(refText);
        if (!ref) return false;

        const from = line.from + match.index!;

        const bookData = loadBook(settings.defaultVersion, ref.bookId);
        if (!bookData) {
          new Notice(`未找到「${ref.bookName}」的经文数据`);
          return true;
        }
        const verses = getVerses(bookData, ref.chapter, ref.startVerse, ref.endVerse);
        if (verses.length === 0) {
          new Notice(`未找到经文 ${ref.bookName} ${ref.chapter}:${ref.startVerse}`);
          return true;
        }

        const formatted = formatVersePlain(ref.bookName, ref.chapter, verses);

        view.dispatch({
          changes: { from, to: pos, insert: formatted },
        });

        new Notice(
          `${ref.bookName} ${ref.chapter}:${ref.startVerse}${ref.endVerse ? `-${ref.endVerse}` : ''}`
        );

        return true;
      },
    }])
  );
}
