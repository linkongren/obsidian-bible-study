import { Editor, Notice } from "obsidian";
import { EditorView, keymap } from "@codemirror/view";
import { Prec } from "@codemirror/state";
import { parseReference, parseMultiReference } from "./reference-modal";
import { loadBook, getVerses, getVerse } from "./bible-data";
import type { VerseData, BibleReference, BibleStudySettings } from "./types";

/** 格式化多段经文的引用标签 */
function formatMultiLabel(refs: BibleReference[]): string {
  const parts = refs.map(r => `${r.chapter}:${r.startVerse}${r.endVerse ? `-${r.endVerse}` : ''}`);
  return `${refs[0].bookName} ${parts.join(', ')}`;
}

/** 仅格式化经文正文（不含引用标题），保留前面的 *引用* */
function formatVerseOnly(verses: VerseData[], indent = ""): string {
  return '\n' + verses.map(v => `${indent}> 〔${v.verse}〕${v.text}`).join('\n');
}

/**
 * 计算块引用要缩进到的列：与列表项内容的实际起始列对齐（含 marker 后的多余空格），
 * 使 Obsidian 把块引用识别为列表项的子块，且首行不产生额外缩进。
 * 例："- 内容" -> "  "，"1. 内容" -> "   "，普通行 -> ""。Tab 按 4 空格展开。
 */
function getListIndent(lineText: string): string {
  const m = lineText.match(/^(\s*)(?:[-*+]|\d+[.)])(?:\s+\[[ xX]\]\s+|\s+)/);
  if (!m) return "";
  return " ".repeat(m[0].replace(/\t/g, "    ").length);
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

/** 从编辑器光标向前查找 -ref 模式 */
function findTriggerRef(editor: Editor): { refText: string; from: number; to: number } | null {
  const cursor = editor.getCursor();
  const line = editor.getLine(cursor.line);
  const fullRefRe = /([-！])([一-鿿a-zA-Z]+)\s*([\d：:\s,，\-–—]+)/g;
  let m;
  while ((m = fullRefRe.exec(line)) !== null) {
    const refEnd = m.index + m[0].length;
    if (cursor.ch >= m.index && cursor.ch <= refEnd) {
      const refText = m[2] + " " + m[3];
      const triggerPos = m[0].indexOf(m[1]);
      return { refText, from: m.index + triggerPos, to: refEnd };
    }
  }
  return null;
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
        editor.replaceRange(formatVerseOnly(verses, getListIndent(editor.getLine(cursor.line))), cursor);
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
      editor.replaceRange(`*${label}*`, { line: cursor.line, ch: trigger.from }, { line: cursor.line, ch: trigger.to });
      return true;
    }
  }

  return false;
}

/**
 * 查找标签行下方紧邻的经节引用块（连续 "> 〔n〕..." 行）。
 * 返回块结尾位置、缩进与最后一节所在行，找不到返回 null。
 * 遇到第一个非引用行即停止，避免误绑下方其他块。
 */
function findVerseBlock(view: EditorView, lineNumber: number): { end: number; indent: string; lastLine: number } | null {
  let n = lineNumber + 1;
  let lastEnd = -1;
  let indent = "";
  let lastLine = -1;
  while (n <= view.state.doc.lines) {
    const l = view.state.doc.line(n);
    if (/^\s*>\s*〔\d+〕/.test(l.text)) {
      if (lastLine < 0) {
        const im = l.text.match(/^(\s*)>/);
        if (im) indent = im[1];
      }
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

  const lineText = view.state.doc.line(lineNumber).text;
  view.dispatch({
    changes: { from: to, insert: formatVerseOnly(verses, getListIndent(lineText)) },
    selection: { anchor: to, head: to },
  });
  return true;
}

/** 范围扩展一节（5:6 -> 5:6-7），并追加下一节经文 */
function extendBlockByOne(view: EditorView, settings: BibleStudySettings, refs: BibleReference[], from: number, to: number, block: { end: number; indent: string }): boolean {
  const last = refs[refs.length - 1];
  const newEnd = last.endVerse !== undefined ? last.endVerse + 1 : last.startVerse + 1;

  const bookData = loadBook(settings.defaultVersion, last.bookId);
  if (!bookData) return false;
  const verse = getVerse(bookData, last.chapter, newEnd);
  if (!verse) return false;

  const extended: BibleReference = { ...last, endVerse: newEnd };
  const newRefs = [...refs.slice(0, -1), extended];
  const newLabel = formatMultiLabel(newRefs);
  const newBracketEnd = from + newLabel.length + 2;

  view.dispatch({
    changes: [
      { from, to, insert: `*${newLabel}*` },
      { from: block.end, insert: `\n${block.indent}> 〔${verse.verse}〕${verse.text}` },
    ],
    selection: { anchor: newBracketEnd, head: newBracketEnd },
  });
  return true;
}

/** "+"：没有经文块则首次插入；已有块则范围扩展一节并追加下一节 */
function tryPlus(view: EditorView, settings: BibleStudySettings, refText: string, from: number, to: number, lineNumber: number): boolean {
  const refs = parseMultiReference(refText);
  if (refs.length === 0) return false;

  const block = findVerseBlock(view, lineNumber);
  if (block) return extendBlockByOne(view, settings, refs, from, to, block);
  return tryInsertVerse(view, settings, refText, from, to, lineNumber);
}

/**
 * "-"：范围退回一节（5:6-8 -> 5:6-7），并删除最后一节经文。
 * 多段引用时，最后一段收缩到单节后再按一次则删除该段。
 */
function tryMinus(view: EditorView, settings: BibleStudySettings, refText: string, from: number, to: number, lineNumber: number): boolean {
  const refs = parseMultiReference(refText);
  if (refs.length === 0) return false;
  const block = findVerseBlock(view, lineNumber);
  if (!block) return false;

  const last = refs[refs.length - 1];
  let newRefs: BibleReference[];

  if (last.endVerse !== undefined) {
    const newEnd = last.endVerse - 1;
    if (newEnd >= last.startVerse) {
      newRefs = [...refs.slice(0, -1), newEnd === last.startVerse ? { ...last, endVerse: undefined } : { ...last, endVerse: newEnd }];
    } else if (refs.length > 1) {
      newRefs = refs.slice(0, -1);
    } else {
      return true; // 只有一段且已到单节，无法再减
    }
  } else if (refs.length > 1) {
    newRefs = refs.slice(0, -1);
  } else {
    return true; // 只有一段单节，无法再减
  }

  // 删除块中最后一节所在行（连同其后的换行），避免与后续正文粘连
  const lastLine = view.state.doc.line(block.lastLine);
  const deleteFrom = lastLine.from;
  const deleteTo = Math.min(lastLine.to + 1, view.state.doc.length);

  const newLabel = formatMultiLabel(newRefs);
  const newBracketEnd = from + newLabel.length + 2;

  view.dispatch({
    changes: [
      { from, to, insert: `*${newLabel}*` },
      { from: deleteFrom, to: deleteTo, insert: "" },
    ],
    selection: { anchor: newBracketEnd, head: newBracketEnd },
  });
  return true;
}

/** Tab/Enter/+/‑ 展开处理逻辑，动态读取设置 */
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

    // 光标在 *引用* 内或后面
    const starRe = /\*([^*]+)\*/g;
    let starMatch;
    while ((starMatch = starRe.exec(fullLine)) !== null) {
      if (fullLine[starMatch.index - 1] === "*") continue;
      const end = starMatch.index + starMatch[0].length;
      if (posInLine >= starMatch.index && posInLine <= end) {
        const from = line.from + starMatch.index;
        const to = line.from + end;
        const refText = starMatch[1].trim();
        if (action === "plus") {
          tryPlus(view, settings, refText, from, to, line.number);
          return true; // 吞掉按键，避免输入字面 "+"
        }
        if (action === "minus") {
          tryMinus(view, settings, refText, from, to, line.number);
          return true; // 吞掉按键，避免输入字面 "-"
        }
        if (!findVerseBlock(view, line.number)) return tryInsertVerse(view, settings, refText, from, to, line.number);
        return false;
      }
    }

    // 光标在 -ref 内或后面（仅 Enter/Tab 触发转换）
    if (action === "enter") {
      const fullRefRe = /([-！])([一-鿿a-zA-Z]+)\s*([\d：:\s,，\-–—]+)/g;
      let refM;
      while ((refM = fullRefRe.exec(fullLine)) !== null) {
        const refEnd = refM.index + refM[0].length;
        if (posInLine >= refM.index && posInLine <= refEnd) {
          const refText = refM[2] + " " + refM[3];
          const refs = parseMultiReference(refText);
          if (refs.length > 0) {
            const label = formatMultiLabel(refs);
            const triggerPos = refM[0].indexOf(refM[1]);
            const from = line.from + refM.index + triggerPos;
            view.dispatch({ changes: { from, to: line.from + refEnd, insert: `*${label}*` } });
            new Notice(label);
            return true;
          }
        }
      }
    }

    return false;
  };
}

export function createTabExpandExtension(getSettings: () => BibleStudySettings) {
  return Prec.highest(keymap.of([
    { key: "Tab", run: makeExpandHandler(getSettings, "enter", "Tab") },
    { key: "Enter", run: makeExpandHandler(getSettings, "enter", "Enter") },
    { key: "+", run: makeExpandHandler(getSettings, "plus", "+") },
    { key: "-", run: makeExpandHandler(getSettings, "minus", "-") },
  ]));
}
