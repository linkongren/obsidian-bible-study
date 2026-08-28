import { Editor, Notice } from "obsidian";
import { EditorView, keymap } from "@codemirror/view";
import { Prec } from "@codemirror/state";
import { createPlainReferenceRegExp, formatReferenceLabel, parseReference, parseMultiReference, plainRefRange } from "./reference-parser";
import { formatVerseParagraphs, getVerseIndent, isExpandedVerseLine } from "./inline-format";
import { loadBook, getVerses, getVerse } from "./bible-data";
import type { VerseData, BibleReference, BibleStudySettings } from "./types";

/** 普通文本引用（书名+章节）正则：马太福音 5:6 */
const PLAIN_REF_RE = createPlainReferenceRegExp();

/** 格式化多段经文的引用标签 */
const formatMultiLabel = formatReferenceLabel;

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

/** 从编辑器光标查找 *引用* 模式（光标在片段内或后面都可以） */
function findBracketRef(editor: Editor): { refText: string; from: number; to: number } | null {
  const cursor = editor.getCursor();
  const line = editor.getLine(cursor.line);
  const re = /\*([^*]+)\*/g;
  let match;
  while ((match = re.exec(line)) !== null) {
    // 跳过 **加粗** 内部的 *xxx*，避免误判
    if (line[match.index - 1] === "*") continue;
    const end = match.index + match[0].length;
    if (cursor.ch >= match.index && cursor.ch <= end) {
      const refText = match[1].trim();
      if (!refText) continue;
      const ref = parseReference(refText);
      if (!ref) continue;
      return { refText, from: match.index, to: end };
    }
  }
  return null;
}

export function findRefBeforeCursor(editor: Editor): { ref: string; from: number; to: number } | null {
  const result = findBracketRef(editor);
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
        editor.replaceRange(formatVerseParagraphs(verses, editor.getLine(cursor.line)), cursor);
        new Notice(formatMultiLabel(refs));
        return true;
      }
    }
  }

  return false;
}

/**
 * 查找标签行下方紧邻的经文块（全角空格缩进，或比引用行更深的缩进行）。
 * 返回块结尾位置、缩进与最后一行所在行，找不到返回 null。
 */
function findVerseBlock(view: EditorView, lineNumber: number): { end: number; indent: string; lastLine: number } | null {
  const refText = view.state.doc.line(lineNumber).text;
  const expected = getVerseIndent(refText);
  let n = lineNumber + 1;
  let lastEnd = -1;
  let indent = "";
  let lastLine = -1;
  while (n <= view.state.doc.lines) {
    const l = view.state.doc.line(n);
    const lead = l.text.match(/^\s*/)?.[0] ?? "";
    if (isExpandedVerseLine(refText, l.text) && lead === expected) {
      if (lastLine < 0) indent = lead;
      lastEnd = l.to;
      lastLine = n;
      n++;
    } else {
      break;
    }
  }
  if (lastLine < 0) return null;
  return { end: lastEnd, indent, lastLine };
}

/** 首次插入：在当前 *引用* 标签下方插入对应经文，光标留在标签上 */
function tryInsertVerse(view: EditorView, settings: BibleStudySettings, refText: string, from: number, to: number, lineNumber: number): boolean {
  const refs = parseMultiReference(refText);
  if (refs.length === 0) return false;
  const verses = loadMultiVerses(settings, refs);
  if (!verses) return false;

  const line = view.state.doc.line(lineNumber);
  // 引用后同一行还有非空白内容时，插入经文会破坏布局，拒绝块展开
  if (line.text.slice(to - line.from).trim().length > 0) return false;

  view.dispatch({
    changes: { from: to, insert: formatVerseParagraphs(verses, line.text) },
    selection: { anchor: to, head: to },
  });
  return true;
}

/** 范围扩展一节（5:6 -> 5:6-7），并追加下一节经文。wrapped=true 时用 *...* 包裹 */
function extendBlockByOne(view: EditorView, settings: BibleStudySettings, refs: BibleReference[], from: number, to: number, block: { end: number; indent: string }, wrapped: boolean): boolean {
  const last = refs[refs.length - 1];
  const newEnd = last.endVerse !== undefined ? last.endVerse + 1 : last.startVerse + 1;

  const bookData = loadBook(settings.defaultVersion, last.bookId);
  if (!bookData) return false;
  const verse = getVerse(bookData, last.chapter, newEnd);
  if (!verse) return false;

  const extended: BibleReference = { ...last, endVerse: newEnd };
  const newRefs = [...refs.slice(0, -1), extended];
  const newLabel = formatMultiLabel(newRefs);
  const insertLabel = wrapped ? `*${newLabel}*` : newLabel;
  const newLabelEnd = from + insertLabel.length;

  view.dispatch({
    changes: [
      { from, to, insert: insertLabel },
      { from: block.end, insert: `\n${block.indent}${verse.text}` },
    ],
    selection: { anchor: newLabelEnd, head: newLabelEnd },
  });
  return true;
}

/** "+"：没有经文块时只扩展引用范围；已有块时同步追加下一节经文 */
function tryPlus(view: EditorView, settings: BibleStudySettings, refText: string, from: number, to: number, lineNumber: number, wrapped: boolean): boolean {
  const refs = parseMultiReference(refText);
  if (refs.length === 0) return false;

  const block = findVerseBlock(view, lineNumber);
  if (block) return extendBlockByOne(view, settings, refs, from, to, block, wrapped);

  const last = refs[refs.length - 1];
  const newEnd = last.endVerse !== undefined ? last.endVerse + 1 : last.startVerse + 1;
  const bookData = loadBook(settings.defaultVersion, last.bookId);
  if (!bookData || !getVerse(bookData, last.chapter, newEnd)) return false;

  const extended: BibleReference = { ...last, endVerse: newEnd };
  const newLabel = formatMultiLabel([...refs.slice(0, -1), extended]);
  const insertLabel = wrapped ? `*${newLabel}*` : newLabel;
  const newLabelEnd = from + insertLabel.length;

  view.dispatch({
    changes: { from, to, insert: insertLabel },
    selection: { anchor: newLabelEnd, head: newLabelEnd },
  });
  return true;
}

/**
 * "-"：范围退回一节（5:6-8 -> 5:6-7），并删除最后一节经文。
 * 多段引用时，最后一段收缩到单节后再按一次则删除该段。
 */
function tryMinus(view: EditorView, settings: BibleStudySettings, refText: string, from: number, to: number, lineNumber: number, wrapped: boolean): boolean {
  const refs = parseMultiReference(refText);
  if (refs.length === 0) return false;
  const block = findVerseBlock(view, lineNumber);

  const last = refs[refs.length - 1];
  let newRefs: BibleReference[];

  if (last.endVerse !== undefined) {
    const newEnd = last.endVerse - 1;
    if (newEnd >= last.startVerse) {
      newRefs = [...refs.slice(0, -1), newEnd === last.startVerse ? { ...last, endVerse: undefined } : { ...last, endVerse: newEnd }];
    } else if (refs.length > 1) {
      newRefs = refs.slice(0, -1);
    } else {
      return true;
    }
  } else if (refs.length > 1) {
    newRefs = refs.slice(0, -1);
  } else {
    return true;
  }

  const newLabel = formatMultiLabel(newRefs);
  const insertLabel = wrapped ? `*${newLabel}*` : newLabel;
  const newLabelEnd = from + insertLabel.length;
  const changes: Array<{ from: number; to: number; insert: string }> = [
    { from, to, insert: insertLabel },
  ];

  if (block) {
    // 已展开经文时，同步删除经文块中的最后一节
    const lastLine = view.state.doc.line(block.lastLine);
    changes.push({
      from: lastLine.from,
      to: Math.min(lastLine.to + 1, view.state.doc.length),
      insert: "",
    });
  }

  view.dispatch({
    changes,
    selection: { anchor: newLabelEnd, head: newLabelEnd },
  });
  return true;
}

function findAdjustableRef(editor: Editor): { refText: string; from: number; to: number; wrapped: boolean } | null {
  const cursor = editor.getCursor();
  const line = editor.getLine(cursor.line);
  const bracket = findBracketRef(editor);
  if (bracket) return { ...bracket, wrapped: true };

  PLAIN_REF_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = PLAIN_REF_RE.exec(line)) !== null) {
    const ref = plainRefRange(match);
    if (cursor.ch >= ref.start && cursor.ch <= ref.end) {
      return { refText: ref.refText, from: ref.start, to: ref.end, wrapped: false };
    }
  }
  return null;
}

function findEditorVerseBlock(editor: Editor, lineNumber: number): { lastLine: number; indent: string } | null {
  const refLine = editor.getLine(lineNumber);
  const expected = getVerseIndent(refLine);
  let lastLine = -1;
  for (let n = lineNumber + 1; n < editor.lineCount(); n++) {
    const text = editor.getLine(n);
    const lead = text.match(/^\s*/)?.[0] ?? "";
    if (!isExpandedVerseLine(refLine, text) || lead !== expected) break;
    lastLine = n;
  }
  return lastLine < 0 ? null : { lastLine, indent: expected };
}

/** 调整光标所在经文范围，供桌面快捷键、命令面板和移动工具栏共用。 */
export function adjustReferenceRange(editor: Editor, settings: BibleStudySettings, direction: "plus" | "minus"): boolean {
  const target = findAdjustableRef(editor);
  if (!target) return false;
  const refs = parseMultiReference(target.refText);
  if (refs.length === 0) return false;

  const cursor = editor.getCursor();
  const block = findEditorVerseBlock(editor, cursor.line);
  const last = refs[refs.length - 1];
  let newRefs: BibleReference[];

  if (direction === "plus") {
    const newEnd = last.endVerse !== undefined ? last.endVerse + 1 : last.startVerse + 1;
    const bookData = loadBook(settings.defaultVersion, last.bookId);
    const verse = bookData ? getVerse(bookData, last.chapter, newEnd) : null;
    if (!verse) return false;
    newRefs = [...refs.slice(0, -1), { ...last, endVerse: newEnd }];
    if (block) {
      const endText = editor.getLine(block.lastLine);
      editor.replaceRange(`\n${block.indent}${verse.text}`, { line: block.lastLine, ch: endText.length });
    }
  } else if (last.endVerse !== undefined) {
    const newEnd = last.endVerse - 1;
    newRefs = [...refs.slice(0, -1), newEnd === last.startVerse
      ? { ...last, endVerse: undefined }
      : { ...last, endVerse: newEnd }];
  } else if (refs.length > 1) {
    newRefs = refs.slice(0, -1);
  } else {
    return false;
  }

  if (direction === "minus" && block) {
    const lastLineText = editor.getLine(block.lastLine);
    if (block.lastLine + 1 < editor.lineCount()) {
      editor.replaceRange("", { line: block.lastLine, ch: 0 }, { line: block.lastLine + 1, ch: 0 });
    } else {
      const previous = editor.getLine(block.lastLine - 1);
      editor.replaceRange("", { line: block.lastLine - 1, ch: previous.length }, { line: block.lastLine, ch: lastLineText.length });
    }
  }

  const label = formatMultiLabel(newRefs);
  const replacement = target.wrapped ? `*${label}*` : label;
  editor.replaceRange(replacement, { line: cursor.line, ch: target.from }, { line: cursor.line, ch: target.to });
  editor.setCursor({ line: cursor.line, ch: target.from + replacement.length });
  return true;
}

/** Tab/Enter 展开处理逻辑，动态读取设置 */
function makeExpandHandler(getSettings: () => BibleStudySettings, action: "enter" | "plus" | "minus", key: string) {
  return (view: EditorView): boolean => {
    const settings = getSettings();
    if (!settings.inlineExpandEnabled) return false;

    // expandKey 控制 Tab/Enter 是否触发展开
    if (action === "enter") {
      if (settings.expandKey === "tab" && key !== "Tab") return false;
      if (settings.expandKey === "enter" && key !== "Enter") return false;
    }

    const pos = view.state.selection.main.head;
    const line = view.state.doc.lineAt(pos);
    const posInLine = pos - line.from;
    const fullLine = line.text;

    // 光标在 *引用* 内或后面（兼容旧格式）
    const starRe = /\*([^*]+)\*/g;
    let starMatch;
    while ((starMatch = starRe.exec(fullLine)) !== null) {
      if (fullLine[starMatch.index - 1] === "*") continue;
      const end = starMatch.index + starMatch[0].length;
      if (posInLine >= starMatch.index && posInLine <= end) {
        const from = line.from + starMatch.index;
        const to = line.from + end;
        const refText = starMatch[1].trim();
        return handleRefAction(view, settings, action, refText, from, to, line.number, true);
      }
    }

    // 普通文本引用（书名+章节）
    PLAIN_REF_RE.lastIndex = 0;
    let p;
    while ((p = PLAIN_REF_RE.exec(fullLine)) !== null) {
      if (p[0].includes("\n")) continue;
      const r = plainRefRange(p);
      const refs = parseMultiReference(r.refText);
      if (refs.length === 0) continue;
      const from = line.from + r.start;
      const to = line.from + r.end;
      if (posInLine >= r.start && posInLine <= r.end) {
        const label = formatMultiLabel(refs);
        if (action === "plus" || action === "minus") {
          // 简写状态下作为普通字符输入；仅完整规范格式启用范围快捷键
          if (r.refText !== label) return false;
          return handleRefAction(view, settings, action, r.refText, from, to, line.number, false);
        }
        if (r.refText !== label) {
          view.dispatch({
            changes: { from, to, insert: label },
            selection: { anchor: from + label.length, head: from + label.length },
          });
          return true;
        }
        return handleRefAction(view, settings, "enter", r.refText, from, to, line.number, false);
      }
    }

    return false;
  };
}

/** 根据动作处理引用（wrapped=true 表示 *...* 包裹格式） */
function handleRefAction(view: EditorView, settings: BibleStudySettings, action: "enter" | "plus" | "minus", refText: string, from: number, to: number, lineNumber: number, wrapped: boolean): boolean {
  if (action === "plus") return tryPlus(view, settings, refText, from, to, lineNumber, wrapped);
  if (action === "minus") return tryMinus(view, settings, refText, from, to, lineNumber, wrapped);
  if (!findVerseBlock(view, lineNumber)) return tryInsertVerse(view, settings, refText, from, to, lineNumber);
  return false;
}

export function createTabExpandExtension(getSettings: () => BibleStudySettings) {
  return Prec.highest(keymap.of([
    { key: "Tab", run: makeExpandHandler(getSettings, "enter", "Tab") },
    { key: "Enter", run: makeExpandHandler(getSettings, "enter", "Enter") },
  ]));
}
