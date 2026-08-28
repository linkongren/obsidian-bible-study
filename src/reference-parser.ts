import { findBook, buildPlainBookPattern, buildPlainFullBookPattern } from "./book-names";
import type { BibleReference, BookMeta } from "./types";

/**
 * 普通文本引用中章节部分的精确匹配模式。
 * 支持 5:6、5 6、5 6 8、5:6-8、5:6, 5:9-10、1: 1 2 等格式。
 */
export const PLAIN_VERSE_PATTERN = String.raw`(?:\d{1,3}[^\S\n]*[：:][^\S\n]*\d{1,3}(?:(?:[^\S\n]*[-–—][^\S\n]*|[^\S\n]+)\d{1,3})?(?:[^\S\n]*[,，][^\S\n]*(?:(?:\d{1,3}[^\S\n]*[：:][^\S\n]*)?\d{1,3})(?:(?:[^\S\n]*[-–—][^\S\n]*|[^\S\n]+)\d{1,3})?)*|\d{1,3}[^\S\n]+\d{1,3}(?:[^\S\n]+\d{1,3})?(?:[^\S\n]*[,，][^\S\n]*(?:\d{1,3}[^\S\n]+)?\d{1,3}(?:[^\S\n]+\d{1,3})?)*)(?![-\p{N}]|[^\S\n]+\p{N})`;

/** 创建独立正则实例，避免带 g 标志的 lastIndex 在调用方之间共享。 */
export function createPlainReferenceRegExp(): RegExp {
  const fullBookPattern = buildPlainFullBookPattern();
  const bookPattern = buildPlainBookPattern();
  return new RegExp(
    `((?<![*\\-！])(?:${fullBookPattern})|(?<![\\p{L}\\p{N}_*\\-！])(?:${bookPattern}))[^\\S\\n]*(${PLAIN_VERSE_PATTERN})`,
    "giu"
  );
}

/**
 * 根据普通文本引用的正则匹配结果计算引用文本及精确位置。
 * 结束位置使用原始匹配长度，正确处理无空格、多空格和 Tab 分隔。
 */
export function plainRefRange(match: RegExpExecArray): { refText: string; start: number; end: number } {
  const start = match.index;
  const end = start + match[0].length;
  return { refText: match[1] + " " + match[2], start, end };
}

export function parseReference(input: string): BibleReference | null {
  const results = parseMultiReference(input);
  return results.length > 0 ? results[0] : null;
}

/** 把解析结果格式化为统一的完整书名引用。 */
export function formatReferenceLabel(refs: BibleReference[]): string {
  if (refs.length === 0) return "";
  const parts = refs.map(ref =>
    `${ref.chapter}:${ref.startVerse}${ref.endVerse !== undefined ? `-${ref.endVerse}` : ""}`
  );
  return `${refs[0].bookName} ${parts.join(", ")}`;
}

/** 解析逗号分隔的多段引用，如 "约 3:16,3:17-18,4:1"。 */
export function parseMultiReference(input: string): BibleReference[] {
  const trimmed = input.trim();
  if (!trimmed) return [];

  const bookMatch = trimmed.match(/^([一-鿿a-zA-Z0-9]+)\s+(.+)$/);
  if (bookMatch) {
    const book = findBook(bookMatch[1]);
    if (book) return parseVerseRanges(book, bookMatch[2]);
  }

  const compactMatch = trimmed.match(/^([一-鿿a-zA-Z0-9]+?)(\d+.+)$/);
  if (!compactMatch) return [];
  const book = findBook(compactMatch[1]);
  return book ? parseVerseRanges(book, compactMatch[2]) : [];
}

function isValidChapter(book: BookMeta, chapter: number): boolean {
  return chapter >= 1 && chapter <= book.chapters;
}

function isValidVerseRange(startVerse: number, endVerse?: number): boolean {
  return startVerse >= 1 && (endVerse === undefined || endVerse > startVerse);
}

/** 解析章:节列表部分。 */
function parseVerseRanges(book: BookMeta, rangesStr: string): BibleReference[] {
  const results: BibleReference[] = [];
  const parts = rangesStr.split(/[,，]/);

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    let match = trimmed.match(/^(\d+)\s*[：:]\s*(\d+)(?:\s*[-–—]\s*(\d+)|\s+(\d+))?$/);
    if (match) {
      const chapter = parseInt(match[1], 10);
      const startVerse = parseInt(match[2], 10);
      const endVerseText = match[3] || match[4];
      const endVerse = endVerseText ? parseInt(endVerseText, 10) : undefined;
      if (!isValidChapter(book, chapter) || !isValidVerseRange(startVerse, endVerse)) continue;
      results.push({ bookId: book.id, bookName: book.name, chapter, startVerse, endVerse });
      continue;
    }

    match = trimmed.match(/^(\d+)\s+(\d+)(?:\s+(\d+))?$/);
    if (match) {
      const chapter = parseInt(match[1], 10);
      const startVerse = parseInt(match[2], 10);
      const endVerse = match[3] ? parseInt(match[3], 10) : undefined;
      if (!isValidChapter(book, chapter) || !isValidVerseRange(startVerse, endVerse)) continue;
      results.push({ bookId: book.id, bookName: book.name, chapter, startVerse, endVerse });
      continue;
    }

    match = trimmed.match(/^(\d+)$/);
    if (match && results.length > 0) {
      const verse = parseInt(match[1], 10);
      if (verse < 1) continue;
      results.push({
        bookId: book.id,
        bookName: book.name,
        chapter: results[results.length - 1].chapter,
        startVerse: verse,
      });
      continue;
    }

    match = trimmed.match(/^(\d+)\s*[-–—]\s*(\d+)$/);
    if (match && results.length > 0) {
      const startVerse = parseInt(match[1], 10);
      const endVerse = parseInt(match[2], 10);
      if (!isValidVerseRange(startVerse, endVerse)) continue;
      results.push({
        bookId: book.id,
        bookName: book.name,
        chapter: results[results.length - 1].chapter,
        startVerse,
        endVerse,
      });
    }
  }

  return results;
}
