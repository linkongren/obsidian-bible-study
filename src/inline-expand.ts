import { Editor, Notice } from "obsidian";
import { EditorView, keymap } from "@codemirror/view";
import { Prec } from "@codemirror/state";
import { parseReference, parseMultiReference } from "./reference-modal";
import { loadBook, getVerses } from "./bible-data";
import type { VerseData, BibleReference } from "./types";
import { BibleStudySettings } from "./types";

/** 格式化多段经文的引用标签 */
function formatMultiLabel(refs: BibleReference[]): string {
  const parts = refs.map(r => `${r.chapter}:${r.startVerse}${r.endVerse ? `-${r.endVerse}` : ''}`);
  return `${refs[0].bookName} ${parts.join(', ')}`;
}

/** 仅格式化经文正文（不含引用标题），保留前面的 *引用* */
function formatVerseOnly(verses: VerseData[]): string {
  return '\n> ' + verses.map(v => `〔${v.verse}〕${v.text}`).join('\n> ');
}

/** 加载并拼接多段经文的全部经节 */
function loadMultiVerses(settings: BibleStudySettings, refs: BibleReference[]): VerseData[] | null {
  const all: VerseData[] = [];
  for (const ref of refs) {
    const bookData = loadBook(settings.defaultVersion, ref.bookId);
    if (!bookData) return null;
    const verses = getVerses(bookData, ref.chapter, ref.startVerse, ref.endVerse);
    if (verses.length === 0) return null;
    all.push(...verses);
  }
  return all;
}

/** -ref 模式：捕获 -书卷 后面的全部内容，交给 parseMultiReference 解析 */
const REF_TRIGGER_RE = /(?:^|[\s([{（【『「])([-！])([一-鿿a-zA-Z]+)\s*([\d：:\s,，\-–—]+)$/;

/** *ref* 模式：*约翰福音 3:16* */
const STAR_PATTERN = /\*([^*]+)\*$/;

/**
 * 从编辑器光标向前查找 -ref 模式
 */
function findTriggerRef(editor: Editor): { refText: string; from: number; to: number } | null {
  const cursor = editor.getCursor();
  const line = editor.getLine(cursor.line);
  const before = line.slice(0, cursor.ch);
  const match = before.match(REF_TRIGGER_RE);
  if (!match) return null;
  const refText = match[2] + " " + match[3];
  const triggerPos = match[0].indexOf(match[1]);
  return { refText, from: cursor.ch - match[0].length + triggerPos, to: cursor.ch };
}

/**
 * 从编辑器光标向前查找 *引用* 模式
 */
function findBracketRef(editor: Editor): { refText: string; from: number; to: number } | null {
  const cursor = editor.getCursor();
  const line = editor.getLine(cursor.line);
  const before = line.slice(0, cursor.ch);
  const match = before.match(STAR_PATTERN);
  if (!match) return null;
  const refText = match[1].trim();
  if (!refText) return null;
  const ref = parseReference(refText);
  if (!ref) return null;
  return { refText, from: cursor.ch - match[0].length, to: cursor.ch };
}

export function findRefBeforeCursor(editor: Editor): { ref: string; from: number; to: number } | null {
  const result = findTriggerRef(editor) || findBracketRef(editor);
  if (!result) return null;
  return { ref: result.refText, from: result.from, to: result.to };
}

export function doExpand(editor: Editor, settings: BibleStudySettings): boolean {
  const bracket = findBracketRef(editor);
  if (bracket) {
    const refs = parseMultiReference(bracket.refText);
    if (refs.length > 0) {
      const verses = loadMultiVerses(settings, refs);
      if (verses) {
        const cursor = editor.getCursor();
        editor.replaceRange(formatVerseOnly(verses), cursor);
        new Notice(formatMultiLabel(refs));
        return true;
      }
    }
  }

  const trigger = findTriggerRef(editor);
  if (trigger) {
    const refs = parseMultiReference(trigger.refText);
    if (refs.length > 0) {
      const label = formatMultiLabel(refs);
      const cursor = editor.getCursor();
      editor.replaceRange(`*${label}*`, { line: cursor.line, ch: trigger.from }, cursor);
      return true;
    }
  }

  return false;
}

function endVerseLabel(ref: { bookName: string; chapter: number; startVerse: number; endVerse?: number }): string {
  return `${ref.bookName} ${ref.chapter}:${ref.startVerse}${ref.endVerse ? `-${ref.endVerse}` : ''}`;
}

/** Tab/Enter 展开处理逻辑 */
function makeExpandHandler(settings: BibleStudySettings) {
  return (view: EditorView): boolean => {
  const pos = view.state.selection.main.head;
  const line = view.state.doc.lineAt(pos);
  const before = line.text.slice(0, pos - line.from);

  // 步骤2：光标前是 *引用*，追加经文
  const bracketMatch = before.match(STAR_PATTERN);
  if (bracketMatch) {
    const refs = parseMultiReference(bracketMatch[1].trim());
    if (refs.length > 0) {
      const verses = loadMultiVerses(settings, refs);
      if (verses) {
        view.dispatch({ changes: { from: pos, insert: formatVerseOnly(verses) } });
        new Notice(formatMultiLabel(refs));
        return true;
      }
    }
  }

  // 步骤1：光标前是 -ref，替换为 [标准引用]
  const refMatch = before.match(REF_TRIGGER_RE);
  if (refMatch) {
    const refText = refMatch[2] + " " + refMatch[3];
    const refs = parseMultiReference(refText);
    if (refs.length > 0) {
      const label = formatMultiLabel(refs);
      const triggerPos = refMatch[0].indexOf(refMatch[1]);
      const from = line.from + refMatch.index! + triggerPos;
      view.dispatch({ changes: { from, to: pos, insert: `*${label}*` } });
      return true;
    }
  }

  return false;
  };
}

export function createTabExpandExtension(settings: BibleStudySettings) {
  const handler = makeExpandHandler(settings);
  const keys: { key: string; run: ReturnType<typeof makeExpandHandler> }[] = [];
  if (settings.expandKey === "tab" || settings.expandKey === "both") keys.push({ key: "Tab", run: handler });
  if (settings.expandKey === "enter" || settings.expandKey === "both") keys.push({ key: "Enter", run: handler });

  return Prec.highest(keymap.of(keys));
}
