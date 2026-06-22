/**
 * 圣经书卷名称映射表
 * 支持：中文全名、中文简称、英文名、英文缩写、拼音全拼、拼音首字母
 */

import { BookMeta } from "./types";

/**
 * 和合本 66 卷书元数据
 * 按圣经正典顺序排列：旧约 39 卷 + 新约 27 卷
 */
export const BOOKS: BookMeta[] = [
  // ===== 旧约 (Old Testament) =====
  { id: "gen",  name: "创世记",       abbr: "创",   nameEn: "Genesis",         chapters: 50, testament: "old", pinyin: "chuangshiji",   pinyinAbbr: "csj" },
  { id: "exo",  name: "出埃及记",     abbr: "出",   nameEn: "Exodus",           chapters: 40, testament: "old", pinyin: "chuaijiji",     pinyinAbbr: "cajj" },
  { id: "lev",  name: "利未记",       abbr: "利",   nameEn: "Leviticus",        chapters: 27, testament: "old", pinyin: "liweiji",       pinyinAbbr: "lwj" },
  { id: "num",  name: "民数记",       abbr: "民",   nameEn: "Numbers",          chapters: 36, testament: "old", pinyin: "minshuji",      pinyinAbbr: "msj" },
  { id: "deu",  name: "申命记",       abbr: "申",   nameEn: "Deuteronomy",      chapters: 34, testament: "old", pinyin: "shenmingji",    pinyinAbbr: "smj" },
  { id: "jos",  name: "约书亚记",     abbr: "书",   nameEn: "Joshua",           chapters: 24, testament: "old", pinyin: "yueshuyaji",    pinyinAbbr: "ysyj" },
  { id: "jdg",  name: "士师记",       abbr: "士",   nameEn: "Judges",           chapters: 21, testament: "old", pinyin: "shishiji",      pinyinAbbr: "ssj" },
  { id: "rut",  name: "路得记",       abbr: "得",   nameEn: "Ruth",             chapters: 4,  testament: "old", pinyin: "ludeji",        pinyinAbbr: "ldj" },
  { id: "1sa",  name: "撒母耳记上",   abbr: "撒上", nameEn: "1 Samuel",         chapters: 31, testament: "old", pinyin: "samuerjishang", pinyinAbbr: "smejs" },
  { id: "2sa",  name: "撒母耳记下",   abbr: "撒下", nameEn: "2 Samuel",         chapters: 24, testament: "old", pinyin: "samuerjixia",   pinyinAbbr: "smejx" },
  { id: "1ki",  name: "列王纪上",     abbr: "王上", nameEn: "1 Kings",          chapters: 22, testament: "old", pinyin: "liewangjishang", pinyinAbbr: "lwjs" },
  { id: "2ki",  name: "列王纪下",     abbr: "王下", nameEn: "2 Kings",          chapters: 25, testament: "old", pinyin: "liewangjixia",  pinyinAbbr: "lwjx" },
  { id: "1ch",  name: "历代志上",     abbr: "代上", nameEn: "1 Chronicles",     chapters: 29, testament: "old", pinyin: "lidaizhishang", pinyinAbbr: "ldzs" },
  { id: "2ch",  name: "历代志下",     abbr: "代下", nameEn: "2 Chronicles",     chapters: 36, testament: "old", pinyin: "lidaizhixia",   pinyinAbbr: "ldzx" },
  { id: "ezr",  name: "以斯拉记",     abbr: "拉",   nameEn: "Ezra",             chapters: 10, testament: "old", pinyin: "yisilaji",      pinyinAbbr: "yslj" },
  { id: "neh",  name: "尼希米记",     abbr: "尼",   nameEn: "Nehemiah",         chapters: 13, testament: "old", pinyin: "niximiji",      pinyinAbbr: "nxmj" },
  { id: "est",  name: "以斯帖记",     abbr: "斯",   nameEn: "Esther",           chapters: 10, testament: "old", pinyin: "yisitieji",     pinyinAbbr: "ystj" },
  { id: "job",  name: "约伯记",       abbr: "伯",   nameEn: "Job",              chapters: 42, testament: "old", pinyin: "yueboji",       pinyinAbbr: "ybj" },
  { id: "psa",  name: "诗篇",         abbr: "诗",   nameEn: "Psalms",           chapters: 150, testament: "old", pinyin: "shipian",       pinyinAbbr: "sp" },
  { id: "pro",  name: "箴言",         abbr: "箴",   nameEn: "Proverbs",         chapters: 31, testament: "old", pinyin: "zhenyan",       pinyinAbbr: "zy" },
  { id: "ecc",  name: "传道书",       abbr: "传",   nameEn: "Ecclesiastes",     chapters: 12, testament: "old", pinyin: "chuandaoshu",   pinyinAbbr: "cds" },
  { id: "sng",  name: "雅歌",         abbr: "歌",   nameEn: "Song of Solomon",  chapters: 8,  testament: "old", pinyin: "yage",          pinyinAbbr: "yg" },
  { id: "isa",  name: "以赛亚书",     abbr: "赛",   nameEn: "Isaiah",           chapters: 66, testament: "old", pinyin: "yisaiyashu",    pinyinAbbr: "ysys" },
  { id: "jer",  name: "耶利米书",     abbr: "耶",   nameEn: "Jeremiah",         chapters: 52, testament: "old", pinyin: "yelimishu",     pinyinAbbr: "ylms" },
  { id: "lam",  name: "耶利米哀歌",   abbr: "哀",   nameEn: "Lamentations",     chapters: 5,  testament: "old", pinyin: "yelimiaige",    pinyinAbbr: "ylmg" },
  { id: "ezk",  name: "以西结书",     abbr: "结",   nameEn: "Ezekiel",          chapters: 48, testament: "old", pinyin: "yixijieshu",    pinyinAbbr: "yxjs" },
  { id: "dan",  name: "但以理书",     abbr: "但",   nameEn: "Daniel",           chapters: 12, testament: "old", pinyin: "danyilishu",    pinyinAbbr: "dyls" },
  { id: "hos",  name: "何西阿书",     abbr: "何",   nameEn: "Hosea",            chapters: 14, testament: "old", pinyin: "hexiashu",      pinyinAbbr: "hxs" },
  { id: "jol",  name: "约珥书",       abbr: "珥",   nameEn: "Joel",             chapters: 3,  testament: "old", pinyin: "yueershu",      pinyinAbbr: "yes" },
  { id: "amo",  name: "阿摩司书",     abbr: "摩",   nameEn: "Amos",             chapters: 9,  testament: "old", pinyin: "amosishu",      pinyinAbbr: "amss" },
  { id: "oba",  name: "俄巴底亚书",   abbr: "俄",   nameEn: "Obadiah",          chapters: 1,  testament: "old", pinyin: "ebadiyashu",    pinyinAbbr: "ebdys" },
  { id: "jon",  name: "约拿书",       abbr: "拿",   nameEn: "Jonah",            chapters: 4,  testament: "old", pinyin: "yuenashu",      pinyinAbbr: "yns" },
  { id: "mic",  name: "弥迦书",       abbr: "弥",   nameEn: "Micah",            chapters: 7,  testament: "old", pinyin: "mijiashu",      pinyinAbbr: "mjs" },
  { id: "nam",  name: "那鸿书",       abbr: "鸿",   nameEn: "Nahum",            chapters: 3,  testament: "old", pinyin: "nahongshu",     pinyinAbbr: "nhs" },
  { id: "hab",  name: "哈巴谷书",     abbr: "哈",   nameEn: "Habakkuk",         chapters: 3,  testament: "old", pinyin: "habagushu",     pinyinAbbr: "hbgs" },
  { id: "zep",  name: "西番雅书",     abbr: "番",   nameEn: "Zephaniah",        chapters: 3,  testament: "old", pinyin: "xifanyashu",    pinyinAbbr: "xfys" },
  { id: "hag",  name: "哈该书",       abbr: "该",   nameEn: "Haggai",           chapters: 2,  testament: "old", pinyin: "hagaishu",      pinyinAbbr: "hgs" },
  { id: "zec",  name: "撒迦利亚书",   abbr: "亚",   nameEn: "Zechariah",        chapters: 14, testament: "old", pinyin: "sajialiyashu",  pinyinAbbr: "sjlys" },
  { id: "mal",  name: "玛拉基书",     abbr: "玛",   nameEn: "Malachi",          chapters: 4,  testament: "old", pinyin: "malajishu",     pinyinAbbr: "mljs" },

  // ===== 新约 (New Testament) =====
  { id: "mat",  name: "马太福音",     abbr: "太",   nameEn: "Matthew",          chapters: 28, testament: "new", pinyin: "mataifuyin",    pinyinAbbr: "mtfy" },
  { id: "mrk",  name: "马可福音",     abbr: "可",   nameEn: "Mark",             chapters: 16, testament: "new", pinyin: "makefuyin",     pinyinAbbr: "mkfy" },
  { id: "luk",  name: "路加福音",     abbr: "路",   nameEn: "Luke",             chapters: 24, testament: "new", pinyin: "lujiafuyin",    pinyinAbbr: "ljfy" },
  { id: "jhn",  name: "约翰福音",     abbr: "约",   nameEn: "John",             chapters: 21, testament: "new", pinyin: "yuehanfuyin",   pinyinAbbr: "yhfy" },
  { id: "act",  name: "使徒行传",     abbr: "徒",   nameEn: "Acts",             chapters: 28, testament: "new", pinyin: "shituxingzhuan", pinyinAbbr: "stxz" },
  { id: "rom",  name: "罗马书",       abbr: "罗",   nameEn: "Romans",           chapters: 16, testament: "new", pinyin: "luomashu",      pinyinAbbr: "lms" },
  { id: "1co",  name: "哥林多前书",   abbr: "林前", nameEn: "1 Corinthians",    chapters: 16, testament: "new", pinyin: "gelinduoqianshu", pinyinAbbr: "gldqs" },
  { id: "2co",  name: "哥林多后书",   abbr: "林后", nameEn: "2 Corinthians",    chapters: 13, testament: "new", pinyin: "gelinduohoushu", pinyinAbbr: "gldhs" },
  { id: "gal",  name: "加拉太书",     abbr: "加",   nameEn: "Galatians",        chapters: 6,  testament: "new", pinyin: "jialaitaishu",  pinyinAbbr: "jlts" },
  { id: "eph",  name: "以弗所书",     abbr: "弗",   nameEn: "Ephesians",        chapters: 6,  testament: "new", pinyin: "yifusuoshu",    pinyinAbbr: "yfss" },
  { id: "php",  name: "腓立比书",     abbr: "腓",   nameEn: "Philippians",      chapters: 4,  testament: "new", pinyin: "feilibishu",    pinyinAbbr: "flbs" },
  { id: "col",  name: "歌罗西书",     abbr: "西",   nameEn: "Colossians",       chapters: 4,  testament: "new", pinyin: "geluoxishu",    pinyinAbbr: "glxs" },
  { id: "1th",  name: "帖撒罗尼迦前书", abbr: "帖前", nameEn: "1 Thessalonians", chapters: 5, testament: "new", pinyin: "tiesaluonijiaqianshu", pinyinAbbr: "tslnjqs" },
  { id: "2th",  name: "帖撒罗尼迦后书", abbr: "帖后", nameEn: "2 Thessalonians", chapters: 3, testament: "new", pinyin: "tiesaluonijiahoushu", pinyinAbbr: "tslnjhs" },
  { id: "1ti",  name: "提摩太前书",   abbr: "提前", nameEn: "1 Timothy",        chapters: 6,  testament: "new", pinyin: "timotaiqianshu", pinyinAbbr: "tmtqs" },
  { id: "2ti",  name: "提摩太后书",   abbr: "提后", nameEn: "2 Timothy",        chapters: 4,  testament: "new", pinyin: "timotaihoushu", pinyinAbbr: "tmths" },
  { id: "tit",  name: "提多书",       abbr: "多",   nameEn: "Titus",            chapters: 3,  testament: "new", pinyin: "tiduoshu",      pinyinAbbr: "tds" },
  { id: "phm",  name: "腓利门书",     abbr: "门",   nameEn: "Philemon",         chapters: 1,  testament: "new", pinyin: "feilimenshu",   pinyinAbbr: "flms" },
  { id: "heb",  name: "希伯来书",     abbr: "来",   nameEn: "Hebrews",          chapters: 13, testament: "new", pinyin: "xibolaihe",     pinyinAbbr: "xbls" },
  { id: "jas",  name: "雅各书",       abbr: "雅",   nameEn: "James",            chapters: 5,  testament: "new", pinyin: "yageshu",       pinyinAbbr: "ygs" },
  { id: "1pe",  name: "彼得前书",     abbr: "彼前", nameEn: "1 Peter",          chapters: 5,  testament: "new", pinyin: "bideqianshu",   pinyinAbbr: "bdqs" },
  { id: "2pe",  name: "彼得后书",     abbr: "彼后", nameEn: "2 Peter",          chapters: 3,  testament: "new", pinyin: "bidehoushu",    pinyinAbbr: "bdhs" },
  { id: "1jn",  name: "约翰一书",     abbr: "约一", nameEn: "1 John",           chapters: 5,  testament: "new", pinyin: "yuehanyishu",   pinyinAbbr: "yhys" },
  { id: "2jn",  name: "约翰二书",     abbr: "约二", nameEn: "2 John",           chapters: 1,  testament: "new", pinyin: "yuehanershu",   pinyinAbbr: "yhes" },
  { id: "3jn",  name: "约翰三书",     abbr: "约三", nameEn: "3 John",           chapters: 1,  testament: "new", pinyin: "yuehansanshu",  pinyinAbbr: "yhss" },
  { id: "jud",  name: "犹大书",       abbr: "犹",   nameEn: "Jude",             chapters: 1,  testament: "new", pinyin: "youdashu",      pinyinAbbr: "yds" },
  { id: "rev",  name: "启示录",       abbr: "启",   nameEn: "Revelation",       chapters: 22, testament: "new", pinyin: "qishilu",       pinyinAbbr: "qsl" },
];

/**
 * 构建搜索索引
 */
const buildSearchIndex = (): Map<string, BookMeta> => {
  const index = new Map<string, BookMeta>();

  for (const book of BOOKS) {
    // 中文全名
    index.set(book.name.toLowerCase(), book);
    // 中文简称
    index.set(book.abbr.toLowerCase(), book);
    // 英文全名
    index.set(book.nameEn.toLowerCase(), book);
    // 英文缩写 ID
    index.set(book.id.toLowerCase(), book);
    // 拼音全拼
    index.set(book.pinyin.toLowerCase(), book);
    // 拼音首字母
    index.set(book.pinyinAbbr.toLowerCase(), book);

    // 常见别名
    const aliases = getAliases(book);
    for (const alias of aliases) {
      index.set(alias.toLowerCase(), book);
    }
  }

  return index;
};

/**
 * 获取书卷的常见别名
 */
function getAliases(book: BookMeta): string[] {
  const aliases: string[] = [];

  // "创世纪"（习惯加"纪"字）
  if (book.name.endsWith("记")) {
    aliases.push(book.name.replace("记", "纪"));
  }

  return aliases;
}

/** 全局搜索索引 */
const searchIndex = buildSearchIndex();

/**
 * 模糊搜索书卷名
 * 支持：中文全名/简称、英文名/缩写、拼音全拼/首字母、前缀匹配
 *
 * 示例：
 *   "约翰福音" / "约" / "John" / "jhn"
 *   "yuehanfuyin" / "yhfy" / "yuehan" / "yh"
 */
export function findBook(query: string): BookMeta | null {
  const q = query.trim().toLowerCase();
  if (!q) return null;

  // 1. 精确匹配（索引查找）
  const exact = searchIndex.get(q);
  if (exact) return exact;

  // 2. 中文前缀匹配
  for (const book of BOOKS) {
    if (book.name.startsWith(query) || book.abbr.startsWith(query)) {
      return book;
    }
  }

  // 3. 中文包含匹配
  for (const book of BOOKS) {
    if (book.name.includes(query)) {
      return book;
    }
  }

  // 4. 英文名前缀匹配
  for (const book of BOOKS) {
    if (book.nameEn.toLowerCase().startsWith(q)) {
      return book;
    }
  }

  // 5. 英文缩写包含匹配（如 "jn" -> "jhn"）
  for (const book of BOOKS) {
    if (book.id.includes(q)) {
      return book;
    }
  }

  // 6. 拼音全拼前缀匹配（如 "yuehan" -> "yuehanfuyin"）
  for (const book of BOOKS) {
    if (book.pinyin.startsWith(q)) {
      return book;
    }
  }

  // 7. 拼音首字母前缀匹配（如 "yh" -> "yhfy"）
  for (const book of BOOKS) {
    if (book.pinyinAbbr.startsWith(q)) {
      return book;
    }
  }

  // 8. 拼音包含匹配（如 "han" -> "yuehanfuyin"）
  for (const book of BOOKS) {
    if (book.pinyin.includes(q)) {
      return book;
    }
  }

  return null;
}

/**
 * 获取所有书卷（用于下拉选择）
 */
export function getAllBooks(testament?: 'old' | 'new'): BookMeta[] {
  if (testament) {
    return BOOKS.filter(b => b.testament === testament);
  }
  return [...BOOKS];
}

/**
 * 获取某卷书的总章数
 */
export function getChapterCount(bookId: string): number {
  const book = BOOKS.find(b => b.id === bookId);
  return book ? book.chapters : 0;
}
