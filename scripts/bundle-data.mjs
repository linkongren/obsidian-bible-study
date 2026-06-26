import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, "..", "data", "cuv");
const outFile = path.join(__dirname, "..", "src", "bible-data-bundle.ts");

const files = fs.readdirSync(dataDir).filter(f => f.endsWith(".json") && f !== "books.json");

// Build compact format: array-based, no keys
const data = {};
for (const file of files) {
  const raw = fs.readFileSync(path.join(dataDir, file), "utf-8");
  const book = JSON.parse(raw);
  if (!book.bookId) continue;

  // [bookId, bookName, [[chNum, [null, verseText...]], ...]]
  const chapters = book.chapters.map(ch => {
    const verses = new Array(ch.verses.length + 1);
    for (const v of ch.verses) verses[v.verse] = v.text;
    return [ch.chapter, verses];
  });
  data[book.bookId] = [book.bookId, book.book, chapters];
}

const json = JSON.stringify(data);
const kb = (json.length / 1024).toFixed(0);

const output = `// Auto-generated — do not edit.
// Compact format: { bookId: [bookId, bookName, [[chNum, [null, vText...]], ...]] }
// Size: ${kb}KB

export const BIBLE_DATA = ${json} as Record<string, [string, string, Array<[number, string[]]>]>;
`;

fs.writeFileSync(outFile, output);
console.log(`Bundled 66 books (${kb}KB) into ${outFile}`);
