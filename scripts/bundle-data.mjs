import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
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

  // Compact: [bookId, bookName, [[chapterNum, [verseTexts...]], ...]]
  // verseTexts are indexed by verse number (1-based), index 0 is placeholder
  const chapters = book.chapters.map(ch => {
    const verses = new Array(ch.verses.length + 1);
    for (const v of ch.verses) {
      verses[v.verse] = v.text;
    }
    return [ch.chapter, verses];
  });
  data[book.bookId] = [book.bookId, book.book, chapters];
}

const json = JSON.stringify(data);

// Gzip compress
const compressed = zlib.gzipSync(Buffer.from(json, "utf-8"));
const base64 = compressed.toString("base64");

const output = `// Auto-generated — do not edit.
// Compact format: { bookId: [bookId, bookName, [[chNum, [vText...]], ...]] }
// Gzip compressed, base64 encoded.
// Uncompressed: ${(json.length / 1024).toFixed(0)}KB, Compressed: ${(compressed.length / 1024).toFixed(0)}KB

export const BIBLE_DATA_BASE64 = ${JSON.stringify(base64)};
`;

fs.writeFileSync(outFile, output);
console.log(`Bundled 66 books: ${(json.length/1024).toFixed(0)}KB → ${(compressed.length/1024).toFixed(0)}KB gzipped`);
