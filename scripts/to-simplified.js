/**
 * 将 CUV 经文数据从繁体中文转换为简体中文
 *
 * 用法：node scripts/to-simplified.js
 */

const fs = require("fs");
const path = require("path");
const { Converter } = require("opencc-js");

const DATA_DIR = path.join(__dirname, "..", "data", "cuv");

async function main() {
  console.log("========================================");
  console.log("  繁体 → 简体 转换工具 (OpenCC)");
  console.log("========================================\n");

  // 加载 OpenCC 转换器 (t2s = Traditional to Simplified)
  console.log("加载 OpenCC 转换器...");
  const converter = Converter({ from: "tw", to: "cn" });
  console.log("转换器就绪\n");

  const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith(".json") && f !== "books.json");

  let totalVerses = 0;

  for (const file of files) {
    const filePath = path.join(DATA_DIR, file);
    const data = JSON.parse(fs.readFileSync(filePath, "utf8"));

    let bookVerses = 0;
    for (const chapter of data.chapters) {
      for (const verse of chapter.verses) {
        verse.text = converter(verse.text);
        bookVerses++;
      }
    }

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
    totalVerses += bookVerses;
    console.log("  " + data.book.padEnd(7, "　") + " (" + data.bookId + ") " + bookVerses + " 节");
  }

  console.log("\n========================================");
  console.log("  转换完成！");
  console.log("  书卷: " + files.length + " 卷");
  console.log("  经文: " + totalVerses + " 节");
  console.log("  方向: 繁体 → 简体 (OpenCC tw→cn)");
  console.log("========================================");
}

main().catch(err => {
  console.error("转换失败:", err.message);
  process.exit(1);
});
