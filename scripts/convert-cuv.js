/**
 * 将 thiagobodruk/bible 格式的 CUV JSON 转换为插件所需格式
 *
 * 输入：data/cuv/raw_cuv.json（从 GitHub 下载的原始数据）
 * 输出：data/cuv/{bookId}.json（每卷书一个文件）
 *
 * 用法：node scripts/convert-cuv.js
 */

const fs = require("fs");
const path = require("path");

const OUTPUT_DIR = path.join(__dirname, "..", "data", "cuv");
const RAW_FILE = path.join(OUTPUT_DIR, "raw_cuv.json");

// 插件中的书卷列表（按圣经正典顺序）
const BOOKS = [
  { id: "gen", name: "创世记", chapters: 50 },
  { id: "exo", name: "出埃及记", chapters: 40 },
  { id: "lev", name: "利未记", chapters: 27 },
  { id: "num", name: "民数记", chapters: 36 },
  { id: "deu", name: "申命记", chapters: 34 },
  { id: "jos", name: "约书亚记", chapters: 24 },
  { id: "jdg", name: "士师记", chapters: 21 },
  { id: "rut", name: "路得记", chapters: 4 },
  { id: "1sa", name: "撒母耳记上", chapters: 31 },
  { id: "2sa", name: "撒母耳记下", chapters: 24 },
  { id: "1ki", name: "列王纪上", chapters: 22 },
  { id: "2ki", name: "列王纪下", chapters: 25 },
  { id: "1ch", name: "历代志上", chapters: 29 },
  { id: "2ch", name: "历代志下", chapters: 36 },
  { id: "ezr", name: "以斯拉记", chapters: 10 },
  { id: "neh", name: "尼希米记", chapters: 13 },
  { id: "est", name: "以斯帖记", chapters: 10 },
  { id: "job", name: "约伯记", chapters: 42 },
  { id: "psa", name: "诗篇", chapters: 150 },
  { id: "pro", name: "箴言", chapters: 31 },
  { id: "ecc", name: "传道书", chapters: 12 },
  { id: "sng", name: "雅歌", chapters: 8 },
  { id: "isa", name: "以赛亚书", chapters: 66 },
  { id: "jer", name: "耶利米书", chapters: 52 },
  { id: "lam", name: "耶利米哀歌", chapters: 5 },
  { id: "ezk", name: "以西结书", chapters: 48 },
  { id: "dan", name: "但以理书", chapters: 12 },
  { id: "hos", name: "何西阿书", chapters: 14 },
  { id: "jol", name: "约珥书", chapters: 3 },
  { id: "amo", name: "阿摩司书", chapters: 9 },
  { id: "oba", name: "俄巴底亚书", chapters: 1 },
  { id: "jon", name: "约拿书", chapters: 4 },
  { id: "mic", name: "弥迦书", chapters: 7 },
  { id: "nam", name: "那鸿书", chapters: 3 },
  { id: "hab", name: "哈巴谷书", chapters: 3 },
  { id: "zep", name: "西番雅书", chapters: 3 },
  { id: "hag", name: "哈该书", chapters: 2 },
  { id: "zec", name: "撒迦利亚书", chapters: 14 },
  { id: "mal", name: "玛拉基书", chapters: 4 },
  { id: "mat", name: "马太福音", chapters: 28 },
  { id: "mrk", name: "马可福音", chapters: 16 },
  { id: "luk", name: "路加福音", chapters: 24 },
  { id: "jhn", name: "约翰福音", chapters: 21 },
  { id: "act", name: "使徒行传", chapters: 28 },
  { id: "rom", name: "罗马书", chapters: 16 },
  { id: "1co", name: "哥林多前书", chapters: 16 },
  { id: "2co", name: "哥林多后书", chapters: 13 },
  { id: "gal", name: "加拉太书", chapters: 6 },
  { id: "eph", name: "以弗所书", chapters: 6 },
  { id: "php", name: "腓立比书", chapters: 4 },
  { id: "col", name: "歌罗西书", chapters: 4 },
  { id: "1th", name: "帖撒罗尼迦前书", chapters: 5 },
  { id: "2th", name: "帖撒罗尼迦后书", chapters: 3 },
  { id: "1ti", name: "提摩太前书", chapters: 6 },
  { id: "2ti", name: "提摩太后书", chapters: 4 },
  { id: "tit", name: "提多书", chapters: 3 },
  { id: "phm", name: "腓利门书", chapters: 1 },
  { id: "heb", name: "希伯来书", chapters: 13 },
  { id: "jas", name: "雅各书", chapters: 5 },
  { id: "1pe", name: "彼得前书", chapters: 5 },
  { id: "2pe", name: "彼得后书", chapters: 3 },
  { id: "1jn", name: "约翰一书", chapters: 5 },
  { id: "2jn", name: "约翰二书", chapters: 1 },
  { id: "3jn", name: "约翰三书", chapters: 1 },
  { id: "jud", name: "犹大书", chapters: 1 },
  { id: "rev", name: "启示录", chapters: 22 },
];

// 中文字符和标点的 Unicode 范围
const CJK_RANGES = [
  [0x4E00, 0x9FFF],   // CJK Unified Ideographs
  [0x3400, 0x4DBF],   // CJK Unified Ideographs Extension A
  [0xF900, 0xFAFF],   // CJK Compatibility Ideographs
  [0x3000, 0x303F],   // CJK Symbols and Punctuation
  [0xFF00, 0xFFEF],   // Halfwidth and Fullwidth Forms
  [0x2000, 0x206F],   // General Punctuation (includes some CJK-related)
];

function isCJKOrPunct(codePoint) {
  for (const [start, end] of CJK_RANGES) {
    if (codePoint >= start && codePoint <= end) return true;
  }
  return false;
}

/**
 * 清理经文文本：移除中文字间多余空格
 */
function cleanVerseText(text) {
  if (!text) return "";

  const chars = [...text];  // 按 code point 拆分
  const result = [];
  let prevWasCJK = false;

  for (const ch of chars) {
    const cp = ch.codePointAt(0);
    const isCJK = isCJKOrPunct(cp);
    const isSpace = (cp === 0x20 || cp === 0x3000);  // 半角 or 全角空格

    // 如果前一个是 CJK 字符/标点，且当前是空格，跳过它
    if (isSpace && prevWasCJK) {
      continue;
    }
    // 如果当前是空格且下一个也是 CJK，也跳过
    // (通过延迟判断：记录空格位置，看后面是否是CJK)

    if (!isSpace) {
      result.push(ch);
      prevWasCJK = isCJK;
    } else if (!prevWasCJK) {
      // 空格前面不是 CJK，保留（极少情况）
      result.push(ch);
      prevWasCJK = false;
    }
    // else: 跳过空格（prevWasCJK && isSpace）
  }

  return result.join("").trim();
}

function versesCount(book) {
  let count = 0;
  for (const ch of book.chapters) {
    count += ch.verses.length;
  }
  return count;
}

/**
 * 主转换函数
 */
function main() {
  console.log("========================================");
  console.log("  CUV 数据格式转换工具");
  console.log("  输入: raw_cuv.json");
  console.log("  输出: 66 个独立书卷文件");
  console.log("========================================\n");

  if (!fs.existsSync(RAW_FILE)) {
    console.error("未找到 raw_cuv.json，请先下载数据");
    process.exit(1);
  }

  console.log("读取原始数据...");
  let raw = fs.readFileSync(RAW_FILE, "utf8");
  raw = raw.replace(/^﻿/, "");  // 移除 BOM

  let bibleData;
  try {
    bibleData = JSON.parse(raw);
  } catch (e) {
    console.error("JSON 解析失败:", e.message);
    process.exit(1);
  }

  if (!Array.isArray(bibleData) || bibleData.length !== 66) {
    console.error("数据格式异常：期望 66 卷书，实际 " + bibleData.length + " 卷");
    process.exit(1);
  }

  console.log("读取成功: " + bibleData.length + " 卷书\n");

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  let totalChapters = 0;
  let totalVerses = 0;
  const booksIndex = [];

  for (let i = 0; i < bibleData.length; i++) {
    const rawBook = bibleData[i];
    const bookMeta = BOOKS[i];

    if (!bookMeta) {
      console.error("位置 " + i + " 无法映射到书卷");
      continue;
    }

    const chapters = [];

    for (let c = 0; c < rawBook.chapters.length; c++) {
      const rawChapter = rawBook.chapters[c];
      const verses = [];

      for (let v = 0; v < rawChapter.length; v++) {
        verses.push({
          verse: v + 1,
          text: cleanVerseText(rawChapter[v]),
        });
      }

      if (verses.length > 0) {
        chapters.push({
          chapter: c + 1,
          verses: verses,
        });
        totalVerses += verses.length;
      }
    }

    totalChapters += chapters.length;

    const output = {
      book: bookMeta.name,
      bookId: bookMeta.id,
      chapters: chapters,
    };

    const filePath = path.join(OUTPUT_DIR, bookMeta.id + ".json");
    fs.writeFileSync(filePath, JSON.stringify(output, null, 2), "utf-8");

    booksIndex.push({
      id: bookMeta.id,
      name: bookMeta.name,
      chapters: chapters.length,
    });

    const isNT = i >= 39 ? " [新约]" : "";
    const padName = bookMeta.name.length < 6 ? bookMeta.name + "　".repeat(6 - bookMeta.name.length) : bookMeta.name;
    console.log("  " + String(i + 1).padStart(2) + ". " + padName + " (" + bookMeta.id + ") - " + chapters.length + " 章, " + versesCount(output) + " 节" + isNT);
  }

  const indexPath = path.join(OUTPUT_DIR, "books.json");
  fs.writeFileSync(indexPath, JSON.stringify(booksIndex, null, 2), "utf-8");

  console.log("\n========================================");
  console.log("  转换完成！");
  console.log("  书卷: " + bibleData.length + " 卷");
  console.log("  章节: " + totalChapters + " 章");
  console.log("  经文: " + totalVerses + " 节");
  console.log("  输出: " + OUTPUT_DIR + "/");
  console.log("========================================");
}

main();
