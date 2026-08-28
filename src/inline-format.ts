import type { VerseData } from "./types";

/**
 * 计算经文行缩进。
 * - 列表项：内容列 + Tab（下一层）
 * - Tab/半角空格缩进的普通行：原缩进 + Tab
 * - 全角空格段落：沿用原缩进
 * - 顶格：两个全角空格
 */
export function getVerseIndent(lineText: string): string {
  const list = lineText.match(/^(\s*)(?:[-*+]|\d+[.)])(?:\s+\[[ xX]\]\s+|\s+)/);
  if (list) return " ".repeat(list[0].replace(/\t/g, "    ").length) + "\t";

  const lead = lineText.match(/^\s*/)?.[0] ?? "";
  if (!lead) return "\u3000\u3000";
  if (/^[\u3000]+$/.test(lead)) return lead;
  return lead + "\t";
}

/** 以缩进段落格式展开经文，不包含节号或引用块标记。 */
export function formatVerseParagraphs(verses: VerseData[], referenceLine: string): string {
  const indent = getVerseIndent(referenceLine);
  return "\n" + verses.map(verse => `${indent}${verse.text}`).join("\n");
}

/** 判断候选行是否具有插件为该引用行生成的精确缩进。 */
export function isExpandedVerseLine(referenceLine: string, candidateLine: string): boolean {
  if (!candidateLine.trim()) return false;
  const lead = candidateLine.match(/^\s*/)?.[0] ?? "";
  return lead === getVerseIndent(referenceLine);
}
