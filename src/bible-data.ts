import { requestUrl } from "obsidian";
import { BookData, ChapterData, VerseData } from "./types";

interface VaultAdapter {
  read(path: string): Promise<string>;
  exists(path: string): Promise<boolean>;
  write(path: string, data: string): Promise<void>;
}

const dataCache: Map<string, BookData> = new Map();
let _adapter: VaultAdapter | null = null;
let _pluginDir: string | null = null;

const DATA_URL = "https://github.com/linkongren/obsidian-bible-study/releases/latest/download/bible-data.json";

/** Initialize — only checks local cache, does NOT auto-download */
export async function initBibleData(adapter: VaultAdapter, pluginDir: string): Promise<void> {
  _adapter = adapter;
  _pluginDir = pluginDir;

  const filePath = pluginDir + "bible-data.json";
  if (await adapter.exists(filePath)) {
    await loadFromFile(filePath);
  }
}

/** Download Bible data (manual trigger) */
export async function downloadBibleData(
  onProgress: (msg: string, done: boolean) => void
): Promise<boolean> {
  const filePath = _pluginDir + "bible-data.json";

  // Already loaded
  if (dataCache.size > 0) {
    onProgress("圣经数据已就绪", true);
    return true;
  }

  onProgress("正在下载圣经数据...", false);
  try {
    const resp = await requestUrl({ url: DATA_URL });
    if (resp.status !== 200) throw new Error(`HTTP ${resp.status}`);
    const text = resp.text;
    if (_adapter) await _adapter.write(filePath, text);
    await loadFromFile(filePath);
    const mb = (text.length / 1024 / 1024).toFixed(1);
    onProgress(`圣经数据下载完成 (${mb}MB)`, true);
    return true;
  } catch {
    onProgress("下载失败，请检查网络", true);
    return false;
  }
}

/** Check if data is ready */
export function isDataReady(): boolean {
  return dataCache.size > 0;
}

async function loadFromFile(filePath: string): Promise<boolean> {
  try {
    const raw = await _adapter!.read(filePath);
    const all = JSON.parse(raw) as Record<string, BookData>;
    dataCache.clear();
    for (const [id, book] of Object.entries(all)) {
      dataCache.set(`cuv/${id}`, book);
    }
    return true;
  } catch {
    return false;
  }
}

export function loadBook(version: string, bookId: string): BookData | null {
  const cacheKey = `${version}/${bookId}`;
  if (dataCache.has(cacheKey)) {
    return dataCache.get(cacheKey)!;
  }
  return null;
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
