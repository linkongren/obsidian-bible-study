import assert from "node:assert/strict";
import test from "node:test";
import { gunzipSync } from "node:zlib";
import { BIBLE_DATA_BASE64 } from "../src/bible-data-bundle";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

type CompactChapter = [number, string[]];
type CompactBook = [string, string, CompactChapter[]];

const decoded = gunzipSync(Buffer.from(BIBLE_DATA_BASE64, "base64")).toString("utf8");
const compact = JSON.parse(decoded) as Record<string, CompactBook>;
const raw = JSON.parse(readFileSync(resolve(process.cwd(), "bible-data.json"), "utf8")) as Record<
  string,
  { chapters: Array<{ chapter: number; verses: Array<{ verse: number; text: string }> }> }
>;

test("bundled gzip/base64 data decodes to all 66 books", () => {
  assert.equal(Object.keys(compact).length, 66);
});

test("bundled compact entries use consistent ids and chapter arrays", () => {
  for (const [id, entry] of Object.entries(compact)) {
    assert.equal(entry[0], id);
    assert.ok(entry[1].length > 0, id);
    assert.ok(entry[2].length > 0, id);
    entry[2].forEach(([chapter, verses], index) => {
      assert.equal(chapter, index + 1, `${id} chapter order`);
      assert.equal(verses[0], null, `${id} ${chapter} index zero placeholder`);
      assert.ok(verses.slice(1).every(text => typeof text === "string" && text.length > 0));
    });
  }
});

test("known bundled verses are preserved", () => {
  assert.match(compact.gen[2][0][1][1], /起初.*神.*天地/);
  assert.match(compact.jhn[2][2][1][16], /神爱世人/);
});

test("bundled compact data equals all 31,101 raw verses", () => {
  let compared = 0;
  for (const [id, rawBook] of Object.entries(raw)) {
    const compactBook = compact[id];
    assert.ok(compactBook, id);
    for (const chapter of rawBook.chapters) {
      const compactChapter = compactBook[2][chapter.chapter - 1];
      assert.equal(compactChapter[0], chapter.chapter);
      for (const verse of chapter.verses) {
        assert.equal(compactChapter[1][verse.verse], verse.text, `${id} ${chapter.chapter}:${verse.verse}`);
        compared++;
      }
    }
  }
  assert.equal(compared, 31101);
});
