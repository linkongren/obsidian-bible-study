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
  const compact = JSON.parse(raw) as Record<string, [string, string, Array<[number, string[]]>]>;
  for (const [bookId, bookData] of Object.entries(compact)) {
    const bookName = bookData[1];
    const chArr = bookData[2];
    const chapters: ChapterData[] = chArr.map(([chNum, vArr]) => {
      const verses: VerseData[] = [];
      for (let i = 1; i < vArr.length; i++) {
        if (vArr[i]) verses.push({ verse: i, text: vArr[i] });
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
    const blob = new Blob([bytes.buffer as ArrayBuffer]);
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
}
