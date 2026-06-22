/** 经文数据结构 */

export interface VerseData {
  verse: number;
  text: string;
}

export interface ChapterData {
  chapter: number;
  verses: VerseData[];
}

export interface BookData {
  book: string;       // 中文全名，如 "创世记"
  bookId: string;     // 英文缩写 ID，如 "gen"
  chapters: ChapterData[];
}

/** 解析后的经文引用 */
export interface BibleReference {
  bookId: string;
  bookName: string;
  chapter: number;
  startVerse: number;
  endVerse?: number;
}

/** 书卷元信息 */
export interface BookMeta {
  id: string;         // 英文缩写
  name: string;       // 中文全名
  abbr: string;       // 中文简称
  nameEn: string;     // 英文全名
  chapters: number;   // 总章数
  testament: 'old' | 'new';
  pinyin: string;     // 拼音全拼（无空格），如 "yuehanfuyin"
  pinyinAbbr: string; // 拼音首字母，如 "yhfy"
}

/** 插件设置 */
export interface BibleStudySettings {
  defaultVersion: string;
  verseFormat: 'full' | 'short';
  showVerseNumbers: boolean;
  fontSize: number;
}

export const DEFAULT_SETTINGS: BibleStudySettings = {
  defaultVersion: 'cuv',
  verseFormat: 'full',
  showVerseNumbers: true,
  fontSize: 14,
};

/** 译本元信息 */
export interface VersionMeta {
  id: string;
  name: string;
  language: string;
}
