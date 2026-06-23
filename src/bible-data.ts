import { BookData, ChapterData, VerseData } from "./types";
import { BIBLE_DATA } from "./bible-data-bundle";

/** Data cache: { version/bookId -> BookData } */
const dataCache: Map<string, BookData> = new Map();

/** Get book data (synchronous, from bundled data) */
export function loadBook(version: string, bookId: string): BookData | null {
  const cacheKey = `${version}/${bookId}`;
  if (dataCache.has(cacheKey)) {
    return dataCache.get(cacheKey)!;
  }
  const data: BookData | undefined = BIBLE_DATA[bookId];
  if (data) {
    dataCache.set(cacheKey, data);
  }
  return data ?? null;
}

export function getChapter(bookData: BookData, chapter: number): ChapterData | null {
  return bookData.chapters.find(c => c.chapter === chapter) ?? null;
}

export function getVerse(bookData: BookData, chapter: number, verse: number): VerseData | null {
  const ch = getChapter(bookData, chapter);
  if (!ch) return null;
  return ch.verses.find(v => v.verse === verse) ?? null;
}

export function getVerses(bookData: BookData, chapter: number, startVerse: number, endVerse?: number): VerseData[] {
  const ch = getChapter(bookData, chapter);
  if (!ch) return [];
  if (endVerse !== undefined) {
    return ch.verses.filter(v => v.verse >= startVerse && v.verse <= endVerse);
  }
  return ch.verses.filter(v => v.verse === startVerse);
}

export function formatVerseDisplay(verses: VerseData[], options: { showNumbers?: boolean; format?: 'full' | 'short' } = {}): string {
  const { showNumbers = true, format = 'full' } = options;
  return verses.map(v => {
    if (showNumbers) return `**${v.verse}** ${v.text}`;
    return v.text;
  }).join(format === 'full' ? '\n\n' : ' ');
}

export function formatVersePlain(bookName: string, chapter: number, verses: VerseData[]): string {
  const lines = verses.map(v => `〔${v.verse}〕${v.text}`);
  const heading = `> **${bookName} ${chapter}:${verses[0].verse}${verses.length > 1 ? `-${verses[verses.length - 1].verse}` : ""}**`;
  return heading + '\n> \n> ' + lines.join('\n> ');
}

export function clearCache(): void {
  dataCache.clear();
}
