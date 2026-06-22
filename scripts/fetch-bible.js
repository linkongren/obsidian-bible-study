/**
 * 圣经数据获取脚本
 *
 * 从在线 API 下载和合本 (CUV) 经文数据，
 * 转换为插件所需的 JSON 格式并保存到 data/cuv/ 目录。
 *
 * 用法：
 *   node scripts/fetch-bible.js              # 下载全部 66 卷
 *   node scripts/fetch-bible.js --book=jhn   # 下载单卷
 *   node scripts/fetch-bible.js --new        # 仅新约
 *   node scripts/fetch-bible.js --old        # 仅旧约
 *   node scripts/fetch-bible.js --resume     # 跳过已有文件
 */

const fs = require("fs");
const path = require("path");
const https = require("https");

// ===== 配置 =====
const TRANSLATION = "cuv"; // 和合本
const API_BASE = "https://bible-api.com";
const OUTPUT_DIR = path.join(__dirname, "..", "data", "cuv");
const DELAY_MS = 300; // API 请求间隔（毫秒），避免限流
const MAX_RETRIES = 3;

// ===== 书卷列表 =====
const BOOKS = [
  // 旧约
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
  // 新约
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

// ===== 工具函数 =====

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function httpGet(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { timeout: 30000 }, (res) => {
        // 处理重定向
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          httpGet(res.headers.location).then(resolve).catch(reject);
          return;
        }

        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode}: ${url}`));
          return;
        }

        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => resolve(data));
      })
      .on("error", reject);
  });
}

/**
 * 从 bible-api.com 获取一章经文
 */
async function fetchChapter(bookId, chapter) {
  const url = `${API_BASE}/${encodeURIComponent(bookId)}+${chapter}?translation=${TRANSLATION}`;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const raw = await httpGet(url);
      const data = JSON.parse(raw);

      // API 返回格式：
      // {
      //   "verses": [
      //     { "book_id": "JHN", "book_name": "John", "chapter": 3, "verse": 16, "text": "..." },
      //     ...
      //   ]
      // }
      if (!data.verses || data.verses.length === 0) {
        throw new Error(`空数据`);
      }

      return data.verses.map((v) => ({
        verse: v.verse,
        text: v.text.replace(/\s+/g, " ").trim(),
      }));
    } catch (err) {
      if (attempt < MAX_RETRIES) {
        console.warn(`  ⚠️ 重试 ${attempt}/${MAX_RETRIES}: ${err.message}`);
        await sleep(1000 * attempt);
      } else {
        throw err;
      }
    }
  }
}

/**
 * 获取一卷书的全部章节
 */
async function fetchBook(book) {
  const chapters = [];

  for (let c = 1; c <= book.chapters; c++) {
    process.stdout.write(`\r  📖 第 ${c}/${book.chapters} 章...`);

    try {
      const verses = await fetchChapter(book.id, c);
      chapters.push({ chapter: c, verses });
    } catch (err) {
      console.error(`\n  ❌ ${book.name} 第 ${c} 章 下载失败: ${err.message}`);
      // 继续尝试后续章节
    }

    // 限流延迟
    await sleep(DELAY_MS);
  }

  console.log(`\r  ✅ ${book.name} 完成 (${chapters.length}/${book.chapters} 章)`);
  return chapters;
}

// ===== 主流程 =====

async function main() {
  const args = process.argv.slice(2);
  const resume = args.includes("--resume");
  const newOnly = args.includes("--new");
  const oldOnly = args.includes("--old");

  // 筛选书卷
  let booksToFetch = BOOKS;

  // 检查是否有 --book=xxx 参数
  const bookArg = args.find((a) => a.startsWith("--book="));
  if (bookArg) {
    const bookId = bookArg.split("=")[1].toLowerCase();
    booksToFetch = BOOKS.filter((b) => b.id === bookId);
    if (booksToFetch.length === 0) {
      console.error(`未找到书卷: ${bookId}`);
      console.log(
        "可用书卷:",
        BOOKS.map((b) => b.id).join(", ")
      );
      process.exit(1);
    }
  } else if (newOnly) {
    booksToFetch = BOOKS.slice(39); // 新约从第 40 卷开始
  } else if (oldOnly) {
    booksToFetch = BOOKS.slice(0, 39);
  }

  // 确保输出目录存在
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  console.log("========================================");
  console.log("  Bible Study - 圣经数据下载工具");
  console.log("  译本: 和合本 (CUV)");
  console.log(`  书卷数: ${booksToFetch.length}`);
  console.log("========================================\n");

  // 检查下载模式
  if (resume) {
    booksToFetch = booksToFetch.filter((b) => {
      const filePath = path.join(OUTPUT_DIR, `${b.id}.json`);
      return !fs.existsSync(filePath);
    });
    console.log(`📌 续传模式: 跳过已有文件，剩余 ${booksToFetch.length} 卷\n`);
  }

  if (booksToFetch.length === 0) {
    console.log("✅ 所有书卷已下载完毕！");
    return;
  }

  // 估算时间
  const totalChapters = booksToFetch.reduce((sum, b) => sum + b.chapters, 0);
  const estMinutes = Math.ceil((totalChapters * DELAY_MS) / 1000 / 60);
  console.log(`📊 总计 ${totalChapters} 章，预计 ${estMinutes} 分钟\n`);

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < booksToFetch.length; i++) {
    const book = booksToFetch[i];
    const progress = `[${i + 1}/${booksToFetch.length}]`;

    console.log(`\n${progress} 📘 ${book.name} (${book.id}) - ${book.chapters} 章`);

    try {
      const chapters = await fetchBook(book);

      if (chapters.length > 0) {
        // 写入 JSON 文件
        const output = {
          book: book.name,
          bookId: book.id,
          chapters: chapters,
        };

        const filePath = path.join(OUTPUT_DIR, `${book.id}.json`);
        fs.writeFileSync(filePath, JSON.stringify(output, null, 2), "utf-8");
        console.log(`  💾 已保存: ${filePath}`);
        successCount++;
      } else {
        console.log(`  ⚠️ 无数据，跳过`);
        failCount++;
      }
    } catch (err) {
      console.error(`  ❌ ${book.name} 下载失败: ${err.message}`);
      failCount++;
    }
  }

  // 生成 books.json 索引
  generateBookIndex(booksToFetch);

  // 汇总
  console.log("\n========================================");
  console.log(`  完成！成功: ${successCount}, 失败: ${failCount}`);
  console.log(`  数据目录: ${OUTPUT_DIR}`);
  console.log("========================================");

  if (failCount > 0) {
    console.log("\n💡 提示: 使用 --resume 参数重新运行以重试失败的下载");
  }
}

/**
 * 生成书卷索引文件
 */
function generateBookIndex(fetchedBooks) {
  const indexPath = path.join(OUTPUT_DIR, "books.json");
  const index = fetchedBooks.map((b) => ({
    id: b.id,
    name: b.name,
    chapters: b.chapters,
  }));

  fs.writeFileSync(indexPath, JSON.stringify(index, null, 2), "utf-8");
  console.log(`\n📋 索引已生成: ${indexPath}`);
}

// 启动
main().catch((err) => {
  console.error("\n❌ 严重错误:", err.message);
  process.exit(1);
});
