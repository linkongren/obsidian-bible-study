import assert from "node:assert/strict";
import test from "node:test";
import { BOOKS } from "../src/book-names";
import {
  clearCache,
  formatVersePlain,
  getChapter,
  getVerse,
  getVerses,
  initBibleData,
  isDataReady,
  loadBook,
} from "../src/bible-data";

test("runtime bundled data initializes and exposes all books", async () => {
  await initBibleData();
  assert.equal(isDataReady(), true);
  for (const meta of BOOKS) {
    const book = loadBook("cuv", meta.id);
    assert.ok(book, meta.id);
    assert.equal(book.bookId, meta.id);
    assert.equal(book.book, meta.name);
    assert.equal(book.chapters.length, meta.chapters);
  }
});

test("chapter and verse query helpers cover valid and invalid input", async () => {
  await initBibleData();
  const mat = loadBook("cuv", "mat");
  assert.ok(mat);
  assert.equal(getChapter(mat, 1)?.chapter, 1);
  assert.equal(getChapter(mat, 0), null);
  assert.equal(getChapter(mat, 29), null);
  assert.match(getVerse(mat, 5, 6)?.text ?? "", /饥渴慕义/);
  assert.equal(getVerse(mat, 5, 0), null);
  assert.equal(getVerse(mat, 5, 999), null);
  assert.deepEqual(getVerses(mat, 5, 6, 8).map(verse => verse.verse), [6, 7, 8]);
  assert.deepEqual(getVerses(mat, 5, 8, 6), []);
  assert.deepEqual(getVerses(mat, 999, 1), []);
});

test("every book exposes the first and last actual verse at runtime", async () => {
  await initBibleData();
  for (const meta of BOOKS) {
    const book = loadBook("cuv", meta.id);
    assert.ok(book, meta.id);
    const firstChapter = book.chapters[0];
    const lastChapter = book.chapters[book.chapters.length - 1];
    const firstVerse = firstChapter.verses[0];
    const lastVerse = lastChapter.verses[lastChapter.verses.length - 1];
    assert.equal(getVerse(book, firstChapter.chapter, firstVerse.verse)?.text, firstVerse.text);
    assert.equal(getVerse(book, lastChapter.chapter, lastVerse.verse)?.text, lastVerse.text);
  }
});

test("formatVersePlain produces the complete quote format", async () => {
  await initBibleData();
  const mat = loadBook("cuv", "mat");
  assert.ok(mat);
  const formatted = formatVersePlain("马太福音", 5, getVerses(mat, 5, 6, 7));
  assert.match(formatted, /^> \*\*马太福音 5:6-7\*\*/);
  assert.match(formatted, /> 〔6〕/);
  assert.match(formatted, /> 〔7〕/);
});

test("clearCache followed by initBibleData restores runtime data", async () => {
  for (let i = 0; i < 3; i++) {
    await initBibleData();
    clearCache();
    assert.equal(isDataReady(), false);
    assert.equal(loadBook("cuv", "gen"), null);
    await initBibleData();
    assert.equal(isDataReady(), true);
    assert.ok(loadBook("cuv", "gen"));
  }
});
