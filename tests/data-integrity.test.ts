import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { BOOKS } from "../src/book-names";

interface RawVerse { verse: number; text: string }
interface RawChapter { chapter: number; verses: RawVerse[] }
interface RawBook { book: string; bookId: string; chapters: RawChapter[] }

const data = JSON.parse(
  readFileSync(resolve(process.cwd(), "bible-data.json"), "utf8")
) as Record<string, RawBook>;

test("bible-data.json contains all 66 canonical books", () => {
  assert.equal(Object.keys(data).length, 66);
  for (const meta of BOOKS) {
    const book = data[meta.id];
    assert.ok(book, meta.id);
    assert.equal(book.bookId, meta.id);
    assert.equal(book.book, meta.name);
    assert.equal(book.chapters.length, meta.chapters, meta.name);
  }
});

test("all chapters and verses are positive, ordered and non-empty", () => {
  let verseCount = 0;
  for (const book of Object.values(data)) {
    book.chapters.forEach((chapter, chapterIndex) => {
      assert.equal(chapter.chapter, chapterIndex + 1, `${book.book} chapter order`);
      assert.ok(chapter.verses.length > 0, `${book.book} ${chapter.chapter}`);
      chapter.verses.forEach((verse, verseIndex) => {
        assert.equal(verse.verse, verseIndex + 1, `${book.book} ${chapter.chapter}:${verse.verse}`);
        assert.ok(verse.text.trim().length > 0, `${book.book} ${chapter.chapter}:${verse.verse}`);
        verseCount++;
      });
    });
  }
  assert.equal(verseCount, 31101);
});

test("canonical data contains exactly 1189 chapters", () => {
  const chapterCount = Object.values(data).reduce((sum, book) => sum + book.chapters.length, 0);
  assert.equal(chapterCount, 1189);
});

test("book, chapter and verse identifiers are internally consistent", () => {
  for (const [id, book] of Object.entries(data)) {
    assert.equal(id, book.bookId);
    for (const chapter of book.chapters) {
      const seen = new Set<number>();
      for (const verse of chapter.verses) {
        assert.equal(seen.has(verse.verse), false, `${book.book} ${chapter.chapter}:${verse.verse}`);
        seen.add(verse.verse);
      }
    }
  }
});

test("known verses contain expected text", () => {
  assert.match(data.gen.chapters[0].verses[0].text, /起初.*神.*天地/);
  assert.match(data.mat.chapters[4].verses[5].text, /饥渴慕义/);
  assert.match(data.jhn.chapters[2].verses[15].text, /神爱世人/);
  assert.match(data.psa.chapters[22].verses[0].text, /耶和华是我的牧者/);
});
