import { BookData, ChapterData, VerseData } from "./types";
import { Notice } from "obsidian";

interface VaultAdapter {
  read(path: string): Promise<string>;
  exists(path: string): Promise<boolean>;
  write(path: string, data: string): Promise<void>;
}

const dataCache: Map<string, BookData> = new Map();
let _adapter: VaultAdapter | null = null;
let _pluginDir: string | null = null;
let _downloadStarted = false;
let _downloadPromise: Promise<boolean> | null = null;

const DATA_URL = "https://github.com/linkongren/obsidian-bible-study/releases/latest/download/bible-data.json";

export function initBibleData(adapter: VaultAdapter, pluginDir: string): Promise<boolean> {
  _adapter = adapter;
  _pluginDir = pluginDir;

  if (_downloadPromise) return _downloadPromise;
  _downloadPromise = doInit();
  return _downloadPromise;
}

async function doInit(): Promise<boolean> {
  if (_downloadStarted) return true;
  _downloadStarted = true;

  const filePath = _pluginDir + "bible-data.json";

  // Check if data file exists locally
  if (_adapter && await _adapter.exists(filePath)) {
    return loadFromFile(filePath);
  }

  // Download from GitHub Release
  new Notice("正在下载圣经数据（仅首次需要）...");
  try {
    const resp = await fetch(DATA_URL);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const text = await resp.text();
    if (_adapter) await _adapter.write(filePath, text);
    new Notice("圣经数据下载完成");
    return loadFromFile(filePath);
  } catch {
    new Notice("圣经数据下载失败，请检查网络后重新加载");
    return false;
  }
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

/** Get book data (synchronous) */
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
