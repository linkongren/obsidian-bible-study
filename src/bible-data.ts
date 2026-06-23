/**
 * 圣经数据管理器
 * 负责加载、缓存和管理圣经经文数据
 */

import { BookData, ChapterData, VerseData } from "./types";

/** 数据缓存：{ 版本/书卷ID -> BookData } */
const dataCache: Map<string, BookData> = new Map();

/** 插件数据目录，由主插件设置 */
let _pluginDir: string | null = null;

export function setPluginDir(dir: string) {
  _pluginDir = dir;
}

function getPluginDir(): string {
  return _pluginDir || ".obsidian/plugins/bible-study/";
}

/**
 * 从 JSON 文件加载某卷书的经文数据
 */
export async function loadBook(
  version: string,
  bookId: string,
  adapter: { read: (path: string) => Promise<string>; exists: (path: string) => Promise<boolean> }
): Promise<BookData | null> {
  const cacheKey = `${version}/${bookId}`;

  if (dataCache.has(cacheKey)) {
    return dataCache.get(cacheKey)!;
  }

  const pluginDir = getPluginDir();
  const filePath = `${pluginDir}data/${version}/${bookId}.json`;

  try {
    const exists = await adapter.exists(filePath);
    if (!exists) {
      console.warn(`Bible Study: 数据文件不存在: ${filePath}`);
      return null;
    }

    const raw = await adapter.read(filePath);
    const data: BookData = JSON.parse(raw) as BookData;
    dataCache.set(cacheKey, data);
    return data;
  } catch (e) {
    console.error(`Bible Study: 加载书卷失败 ${bookId}:`, e);
    return null;
  }
}

/**
 * 获取某章经文
 */
export function getChapter(
  bookData: BookData,
  chapter: number
): ChapterData | null {
  return bookData.chapters.find(c => c.chapter === chapter) ?? null;
}

/**
 * 获取某节经文
 */
export function getVerse(
  bookData: BookData,
  chapter: number,
  verse: number
): VerseData | null {
  const ch = getChapter(bookData, chapter);
  if (!ch) return null;
  return ch.verses.find(v => v.verse === verse) ?? null;
}

/**
 * 获取多节经文（范围或列表）
 */
export function getVerses(
  bookData: BookData,
  chapter: number,
  startVerse: number,
  endVerse?: number
): VerseData[] {
  const ch = getChapter(bookData, chapter);
  if (!ch) return [];

  if (endVerse !== undefined) {
    return ch.verses.filter(
      v => v.verse >= startVerse && v.verse <= endVerse
    );
  }

  return ch.verses.filter(v => v.verse === startVerse);
}

/**
 * 格式化经文为显示文本
 */
export function formatVerseDisplay(
  verses: VerseData[],
  options: {
    showNumbers?: boolean;
    format?: 'full' | 'short';
  } = {}
): string {
  const { showNumbers = true, format = 'full' } = options;

  return verses.map(v => {
    if (showNumbers) {
      return `**${v.verse}** ${v.text}`;
    }
    return v.text;
  }).join(format === 'full' ? '\n\n' : ' ');
}

/**
 * 格式化经文为纯文本（插入到笔记中）
 */
export function formatVersePlain(
  bookName: string,
  chapter: number,
  verses: VerseData[]
): string {
  const lines = verses.map(v => `〔${v.verse}〕${v.text}`);
  const heading = `> **${bookName} ${chapter}:${verses[0].verse}${verses.length > 1 ? `-${verses[verses.length - 1].verse}` : ""}**`;
  return heading + '\n> \n> ' + lines.join('\n> ');
}

/**
 * 检查某卷书的数据是否可用
 */
export async function isDataAvailable(
  version: string,
  bookId: string,
  adapter: { exists: (path: string) => Promise<boolean> }
): Promise<boolean> {
  const pluginDir = getPluginDir();
  const filePath = `${pluginDir}data/${version}/${bookId}.json`;
  try {
    return await adapter.exists(filePath);
  } catch {
    return false;
  }
}

/**
 * 清除缓存
 */
export function clearCache(): void {
  dataCache.clear();
}

/**
 * 预加载多卷书（可选的后台缓存预热）
 */
export async function preloadBooks(
  version: string,
  bookIds: string[],
  adapter: { read: (path: string) => Promise<string>; exists: (path: string) => Promise<boolean> }
): Promise<void> {
  await Promise.all(bookIds.map(id => loadBook(version, id, adapter)));
}
