import assert from "node:assert/strict";
import test from "node:test";
import { formatVerseParagraphs, getVerseIndent, isExpandedVerseLine } from "../src/inline-format";

const verses = [
  { verse: 6, text: "虚心的人有福了！" },
  { verse: 7, text: "哀恸的人有福了！" },
];

test("top-level reference uses two full-width spaces", () => {
  assert.equal(getVerseIndent("马太福音 5:6"), "\u3000\u3000");
  assert.equal(
    formatVerseParagraphs(verses, "马太福音 5:6"),
    "\n\u3000\u3000虚心的人有福了！\n\u3000\u3000哀恸的人有福了！"
  );
});

test("full-width paragraph indentation is preserved without duplication", () => {
  assert.equal(getVerseIndent("\u3000\u3000马太福音 5:6"), "\u3000\u3000");
});

test("tab and half-width indentation moves verse text one level deeper", () => {
  assert.equal(getVerseIndent("\t马太福音 5:6"), "\t\t");
  assert.equal(getVerseIndent("    马太福音 5:6"), "    \t");
});

test("list items use content indentation plus one Tab", () => {
  assert.equal(getVerseIndent("- 马太福音 5:6"), "  \t");
  assert.equal(getVerseIndent("1. 马太福音 5:6"), "   \t");
  assert.equal(getVerseIndent("- [ ] 马太福音 5:6"), "      \t");
  assert.equal(getVerseIndent("\t- 马太福音 5:6"), "      \t");
  assert.equal(getVerseIndent("+ 马太福音 5:6"), "  \t");
  assert.equal(getVerseIndent("* 马太福音 5:6"), "  \t");
  assert.equal(getVerseIndent("10. 马太福音 5:6"), "    \t");
  assert.equal(getVerseIndent("1) 马太福音 5:6"), "   \t");
  assert.equal(getVerseIndent("- [x] 马太福音 5:6"), "      \t");
  assert.equal(getVerseIndent("- [X] 马太福音 5:6"), "      \t");
});

test("mixed indentation is preserved and moved one Tab deeper", () => {
  assert.equal(getVerseIndent(" \t马太福音 5:6"), " \t\t");
  assert.equal(getVerseIndent("\t    马太福音 5:6"), "\t    \t");
});

test("empty verse collection produces only a leading line break", () => {
  assert.equal(formatVerseParagraphs([], "马太福音 5:6"), "\n");
});

test("expanded verse line detection requires exact generated indentation", () => {
  assert.equal(isExpandedVerseLine("马太福音 5:6", "\u3000\u3000虚心的人有福了！"), true);
  assert.equal(isExpandedVerseLine("马太福音 5:6", "  普通缩进说明"), false);
  assert.equal(isExpandedVerseLine("\t马太福音 5:6", "\t\t虚心的人有福了！"), true);
  assert.equal(isExpandedVerseLine("\t马太福音 5:6", "\t普通说明"), false);
  assert.equal(isExpandedVerseLine("马太福音 5:6", ""), false);
});
