import assert from "node:assert/strict";
import test from "node:test";
import { BOOKS } from "../src/book-names";
import {
  createPlainReferenceRegExp,
  formatReferenceLabel,
  parseMultiReference,
  parseReference,
  plainRefRange,
} from "../src/reference-parser";

function simple(input: string) {
  const ref = parseReference(input);
  assert.ok(ref, `expected reference: ${input}`);
  return ref;
}

function matchPlain(input: string) {
  const re = createPlainReferenceRegExp();
  const match = re.exec(input);
  return match ? plainRefRange(match) : null;
}

test("all 66 books have unique metadata and valid chapter counts", () => {
  assert.equal(BOOKS.length, 66);
  assert.equal(new Set(BOOKS.map(book => book.id)).size, 66);
  assert.equal(new Set(BOOKS.map(book => book.name)).size, 66);
  for (const book of BOOKS) assert.ok(book.chapters >= 1, book.name);
});

test("every book is parsed by full name, abbreviation, pinyin and pinyin abbreviation", () => {
  for (const book of BOOKS) {
    for (const alias of [book.name, book.abbr, book.pinyin, book.pinyinAbbr, book.id]) {
      const ref = simple(`${alias} 1:1`);
      assert.equal(ref.bookId, book.id, `${alias} should resolve to ${book.id}`);
      assert.equal(ref.chapter, 1);
      assert.equal(ref.startVerse, 1);
    }
  }
});

test("every book alias is recognized by the plain-text matcher", () => {
  for (const book of BOOKS) {
    for (const alias of [book.name, book.abbr, book.pinyin, book.pinyinAbbr, book.id]) {
      const result = matchPlain(`${alias}1:1`);
      assert.ok(result, `${alias} should be recognized`);
      assert.equal(simple(result.refText).bookId, book.id, alias);
    }
  }
});

test("every book alias accepts representative input formats", () => {
  for (const book of BOOKS) {
    for (const alias of [book.name, book.abbr, book.pinyin, book.pinyinAbbr, book.id]) {
      for (const input of [`${alias}1:1`, `${alias} 1：1`, `${alias}1 1`, `${alias} 1 1`]) {
        const ref = simple(input);
        assert.equal(ref.bookId, book.id, input);
        assert.equal(ref.chapter, 1, input);
        assert.equal(ref.startVerse, 1, input);
      }
    }
  }
});

test("every book accepts its first and last chapter", () => {
  for (const book of BOOKS) {
    assert.equal(simple(`${book.name} 1:1`).chapter, 1);
    assert.equal(simple(`${book.name} ${book.chapters}:1`).chapter, book.chapters);
    assert.equal(parseReference(`${book.name} ${book.chapters + 1}:1`), null, book.name);
  }
});

test("recognizes colon, full-width colon, compact and space-separated formats", () => {
  for (const input of ["太 5:6", "太 5：6", "太5:6", "太 5 6", "太5 6"]) {
    const ref = simple(input);
    assert.deepEqual(
      { id: ref.bookId, chapter: ref.chapter, start: ref.startVerse, end: ref.endVerse },
      { id: "mat", chapter: 5, start: 6, end: undefined },
      input
    );
  }
});

test("recognizes ranges with hyphen, en dash, em dash and spaces", () => {
  for (const input of ["太 5:6-8", "太 5:6–8", "太 5:6—8", "太 5:6 8", "太 5 6 8", "太1: 1 2"]) {
    const ref = simple(input);
    assert.equal(ref.bookId, "mat", input);
    assert.equal(ref.endVerse, input.startsWith("太1") ? 2 : 8, input);
  }
});

test("range separator and whitespace matrix normalizes consistently", () => {
  const separators = ["-", "–", "—", " "];
  const whitespace = ["", " ", "  ", "\t"];
  for (const separator of separators) {
    for (const before of whitespace) {
      for (const after of whitespace) {
        const input = separator === " "
          ? `太5:6${before} ${after}8`
          : `太5:6${before}${separator}${after}8`;
        const ref = simple(input);
        assert.equal(ref.endVerse, 8, JSON.stringify(input));
      }
    }
  }
});

test("recognizes multi-part references and inherited chapters", () => {
  const refs = parseMultiReference("约 3:16,17,18-19,4:1");
  assert.deepEqual(
    refs.map(ref => [ref.chapter, ref.startVerse, ref.endVerse]),
    [[3, 16, undefined], [3, 17, undefined], [3, 18, 19], [4, 1, undefined]]
  );
});

test("formats parsed references with full book name and normalized separators", () => {
  assert.equal(formatReferenceLabel(parseMultiReference("太5 6")), "马太福音 5:6");
  assert.equal(formatReferenceLabel(parseMultiReference("约3:16,17,18-19,4:1")), "约翰福音 3:16, 3:17, 3:18-19, 4:1");
  assert.equal(formatReferenceLabel([]), "");
});

test("recognizes mixed whitespace including tabs without crossing lines", () => {
  for (const input of ["太\t5:6", "太\t5\t6", "太  \t 5： 6", "太5:\t6"]) {
    const result = matchPlain(input);
    assert.ok(result, input);
    assert.equal(simple(result.refText).bookId, "mat", input);
  }
  assert.equal(matchPlain("太\n5:6"), null);
  assert.equal(matchPlain("太\r\n5:6"), null);
});

test("recognizes punctuation variants and inherited multi-part ranges", () => {
  const refs = parseMultiReference("约 3：16，17，18–19，4：1—2");
  assert.deepEqual(
    refs.map(ref => [ref.chapter, ref.startVerse, ref.endVerse]),
    [[3, 16, undefined], [3, 17, undefined], [3, 18, 19], [4, 1, 2]]
  );
});

test("supports numeric English book ids", () => {
  assert.equal(simple("1co 3:1").bookId, "1co");
  assert.equal(simple("2sa 1:1").bookId, "2sa");
  assert.equal(simple("1jn 2:3").bookId, "1jn");
});

test("rejects unknown books, zero values, invalid chapters and reversed ranges", () => {
  for (const input of ["", " ", "不存在 1:1", "太 0:1", "太 1:0", "太 29:1", "太 -1:1", "太 5:8-6", "太 5:8-8", "太 5::6", "太 5:"]) {
    assert.equal(parseReference(input), null, input);
  }
});

test("plain matcher preserves exact source range for compact and spaced references", () => {
  const cases: Array<[string, string]> = [
    ["太5 6后文", "太5 6"],
    ["太 5:6 后文", "太 5:6"],
    ["太  5:6 后文", "太  5:6"],
    ["，太5:6。正文", "太5:6"],
  ];
  for (const [input, expected] of cases) {
    const result = matchPlain(input);
    assert.ok(result, input);
    assert.equal(input.slice(result.start, result.end), expected, input);
  }
});

test("plain matcher recognizes references at the start of later lines", () => {
  const input = "前一行\n马可福音 5:5-6";
  const result = matchPlain(input);
  assert.ok(result);
  assert.equal(result.refText, "马可福音 5:5-6");
  assert.equal(input.slice(result.start, result.end), "马可福音 5:5-6");
});

test("plain matcher stops before following text and four-digit years", () => {
  assert.equal(matchPlain("太5 6后文")?.refText, "太 5 6");
  assert.equal(matchPlain("马太福音 5:6 后面数字 123")?.refText, "马太福音 5:6");
  assert.equal(matchPlain("太5:6 2026年的记录"), null);
});

test("plain matcher rejects malformed continuation, wrapper syntax and cross-line references", () => {
  for (const input of ["太5:6-8-9", "太5:6789", "*太5:6*", "-太5:6", "！太5:6", "太\n5:6", "foo_gen 5:6"]) {
    assert.equal(matchPlain(input), null, input);
  }
});

test("plain matcher is case-insensitive for latin aliases", () => {
  assert.equal(matchPlain("MAT5:6")?.refText.toLowerCase(), "mat 5:6");
  assert.equal(matchPlain("MTFY 5 6")?.refText.toLowerCase(), "mtfy 5 6");
});

test("plain matcher honors punctuation and word boundaries", () => {
  assert.equal(matchPlain("（太5:6）")?.refText, "太 5:6");
  assert.equal(matchPlain("参考：马太福音 5:6。")?.refText, "马太福音 5:6");
  assert.equal(matchPlain("的马可福音 5:5")?.refText, "马可福音 5:5");
  assert.equal(matchPlain("大约 5:6"), null);
  assert.equal(matchPlain("format 5:6"), null);
  assert.equal(matchPlain("foo_gen 5:6"), null);
  assert.equal(matchPlain("xmat5:6"), null);
  assert.equal(matchPlain("前文马太福音 5:6")?.refText, "马太福音 5:6");
});

test("plain matcher rejects excessive numbers and dangling range syntax", () => {
  for (const input of ["太1234:1", "太1:1234", "太1:1-", "太1:1--2", "太1 1 2 3"]) {
    assert.equal(matchPlain(input), null, input);
  }
});

test("large text scan remains responsive", () => {
  const text = `${"普通文本。".repeat(20000)}马太福音 5:6 后文`;
  const started = performance.now();
  const result = matchPlain(text);
  const elapsed = performance.now() - started;
  assert.equal(result?.refText, "马太福音 5:6");
  assert.ok(elapsed < 1000, `plain matching took ${elapsed.toFixed(1)}ms`);
});

test("multiple plain references can be scanned sequentially", () => {
  const input = "马太福音 5:6；约翰福音 3:16；诗篇 23:1";
  const re = createPlainReferenceRegExp();
  const refs: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = re.exec(input)) !== null) refs.push(plainRefRange(match).refText);
  assert.deepEqual(refs, ["马太福音 5:6", "约翰福音 3:16", "诗篇 23:1"]);
});
