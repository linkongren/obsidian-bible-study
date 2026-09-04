import { BookData, ChapterData, VerseData } from "./types";
import { BIBLE_DATA_BASE64 } from "./bible-data-bundle";

const dataCache: Map<string, BookData> = new Map();
let _ready = false;
let _initPromise: Promise<void> | null = null;

function decodeBase64(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function parseCompact(raw: string): void {
  const parsed: unknown = JSON.parse(raw);
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return;
  const compact = parsed as Record<string, unknown>;
  for (const bookId of Object.keys(compact)) {
    const entry = compact[bookId];
    if (!Array.isArray(entry) || typeof entry[1] !== "string" || !Array.isArray(entry[2])) continue;
    const bookName = entry[1];
    const chArr = entry[2].filter((chapter): chapter is [number, string[]] =>
      Array.isArray(chapter) && typeof chapter[0] === "number" && Array.isArray(chapter[1]) &&
      chapter[1].every(verse => verse === null || typeof verse === "string")
    );
    const chapters: ChapterData[] = chArr.map(([chNum, vArr]) => {
      const verses: VerseData[] = [];
      for (let i = 1; i < vArr.length; i++) {
        const v = vArr[i];
        if (v) verses.push({ verse: i, text: v });
      }
      return { chapter: chNum, verses };
    });
    dataCache.set(`cuv/${bookId}`, { book: bookName, bookId, chapters });
  }
  _ready = true;
}

/** Initialize — decompress and parse bundled data */
export function initBibleData(): Promise<void> {
  if (_ready) return Promise.resolve();
  if (_initPromise) return _initPromise;

  _initPromise = (async () => {
    const bytes = decodeBase64(BIBLE_DATA_BASE64);
    const buffer = new ArrayBuffer(bytes.byteLength);
    new Uint8Array(buffer).set(bytes);
    const blob = new Blob([buffer]);
    const ds = new DecompressionStream("gzip");
    const stream = blob.stream().pipeThrough(ds);
    const json = await new Response(stream).text();
    parseCompact(json);
  })();

  return _initPromise;
}

export function isDataReady(): boolean {
  return _ready;
}

export function loadBook(version: string, bookId: string): BookData | null {
  return dataCache.get(`${version}/${bookId}`) ?? null;
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

export function formatVersePlain(bookName: string, chapter: number, verses: VerseData[]): string {
  const lines = verses.map(v => `〔${v.verse}〕${v.text}`);
  const heading = `> **${bookName} ${chapter}:${verses[0].verse}${verses.length > 1 ? `-${verses[verses.length - 1].verse}` : ""}**`;
  return heading + '\n> \n> ' + lines.join('\n> ');
}

export function clearCache(): void {
  dataCache.clear();
  _ready = false;
  _initPromise = null;
}
