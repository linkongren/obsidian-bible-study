import { App, Modal, Notice } from "obsidian";
import { BibleReference, BibleStudySettings } from "./types";
import { findBook } from "./book-names";
import { loadBook, getVerses, formatVersePlain } from "./bible-data";

export function parseReference(input: string): BibleReference | null {
  const results = parseMultiReference(input);
  return results.length > 0 ? results[0] : null;
}

/** 解析逗号分隔的多段引用，如 "约 3:16,3:17-18,4:1" */
export function parseMultiReference(input: string): BibleReference[] {
  const trimmed = input.trim();
  if (!trimmed) return [];

  // 提取书名和后面的章:节部分
  const bookMatch = trimmed.match(/^([一-鿿a-zA-Z]+)\s+(.+)$/);
  if (!bookMatch) {
    // 可能没有空格：约3:16
    const compactMatch = trimmed.match(/^([一-鿿a-zA-Z]+)(\d+.+)$/);
    if (!compactMatch) return [];
    const book = findBook(compactMatch[1]);
    if (!book) return [];
    return parseVerseRanges(book, compactMatch[2]);
  }

  const book = findBook(bookMatch[1]);
  if (!book) return [];
  return parseVerseRanges(book, bookMatch[2]);
}

/** 解析章:节列表部分 */
function parseVerseRanges(book: import("./types").BookMeta, rangesStr: string): BibleReference[] {
  const results: BibleReference[] = [];
  const parts = rangesStr.split(/[,，]/);

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    // 章:节-节 或 章:节 或 章:节-节,节
    let match = trimmed.match(/^(\d+)\s*[：:]\s*(\d+)(?:\s*[-–—]\s*(\d+))?$/);
    if (match) {
      const chapter = parseInt(match[1], 10);
      const startVerse = parseInt(match[2], 10);
      const endVerse = match[3] ? parseInt(match[3], 10) : undefined;
      results.push({
        bookId: book.id,
        bookName: book.name,
        chapter,
        startVerse,
        endVerse: endVerse && endVerse > startVerse ? endVerse : undefined,
      });
      continue;
    }

    // 空格分隔：章 节 或 章 节 止节
    match = trimmed.match(/^(\d+)\s+(\d+)(?:\s+(\d+))?$/);
    if (match) {
      const chapter = parseInt(match[1], 10);
      const startVerse = parseInt(match[2], 10);
      const endVerse = match[3] ? parseInt(match[3], 10) : undefined;
      results.push({
        bookId: book.id,
        bookName: book.name,
        chapter,
        startVerse,
        endVerse: endVerse && endVerse > startVerse ? endVerse : undefined,
      });
      continue;
    }

    // 单个数字：继承上一段的章，作为节
    match = trimmed.match(/^(\d+)$/);
    if (match && results.length > 0) {
      const lastChapter = results[results.length - 1].chapter;
      const verse = parseInt(match[1], 10);
      results.push({
        bookId: book.id,
        bookName: book.name,
        chapter: lastChapter,
        startVerse: verse,
      });
      continue;
    }

    // 节-节 范围：继承上一段的章
    match = trimmed.match(/^(\d+)\s*[-–—]\s*(\d+)$/);
    if (match && results.length > 0) {
      const lastChapter = results[results.length - 1].chapter;
      const startVerse = parseInt(match[1], 10);
      const endVerse = parseInt(match[2], 10);
      results.push({
        bookId: book.id,
        bookName: book.name,
        chapter: lastChapter,
        startVerse,
        endVerse: endVerse > startVerse ? endVerse : undefined,
      });
    }
  }

  return results;
}

export class ReferenceModal extends Modal {
  settings: BibleStudySettings;

  constructor(app: App, settings: BibleStudySettings) {
    super(app);
    this.settings = settings;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.addClass("bible-ref-modal");

    contentEl.createEl("h3", { text: "插入经文引用" });

    contentEl.createEl("p", {
      text: "输入经文出处，如「约翰福音 3:16」「约3:16」「约3:16-18」",
      cls: "hint-text",
    });

    const inputEl = contentEl.createEl("input", {
      type: "text",
      placeholder: "例如：约翰福音 3:16",
      cls: "search-input",
    });

    const previewEl = contentEl.createEl("div", { cls: "preview-box" });
    previewEl.createEl("div", {
      text: "在此预览经文...",
      cls: "hint-text",
    });

    const buttonRow = contentEl.createEl("div", { cls: "button-row" });

    const insertBtn = buttonRow.createEl("button", {
      text: "插入经文",
    });
    insertBtn.disabled = true;

    const cancelBtn = buttonRow.createEl("button", {
      text: "取消",
      cls: "bible-ref-cancel-btn",
    });
    cancelBtn.addEventListener("click", () => {
      this.close();
    });

    let currentRef: BibleReference | null = null;

    const updatePreview = () => {
      const ref = parseReference(inputEl.value);
      currentRef = ref;
      previewEl.empty();

      if (!ref) {
        previewEl.createEl("div", {
          text: inputEl.value ? "❌ 无法识别经文引用，请检查格式" : "在此预览经文...",
          cls: "hint-text",
        });
        insertBtn.disabled = true;
        return;
      }

      const bookData = loadBook(this.settings.defaultVersion, ref.bookId);

      if (!bookData) {
        previewEl.createEl("div", {
          text: `⚠️ 未找到「${ref.bookName}」的经文数据`,
          cls: "hint-text",
        });
        insertBtn.disabled = true;
        return;
      }

      const verses = getVerses(bookData, ref.chapter, ref.startVerse, ref.endVerse);

      if (verses.length === 0) {
        previewEl.createEl("div", {
          text: `⚠️ 未找到 ${ref.bookName} ${ref.chapter}:${ref.startVerse} 的经文`,
          cls: "hint-text",
        });
        insertBtn.disabled = true;
        return;
      }

      const verseLabel = ref.endVerse
        ? `${ref.bookName} ${ref.chapter}:${ref.startVerse}-${ref.endVerse}`
        : `${ref.bookName} ${ref.chapter}:${ref.startVerse}`;

      previewEl.createEl("div", {
        text: verseLabel,
        cls: "hint-text",
        attr: { style: "font-weight: 700; margin-bottom: 6px;" },
      });

      for (const v of verses) {
        const verseRow = previewEl.createEl("div", { cls: "preview-verse" });
        verseRow.createEl("span", { text: `${v.verse}`, cls: "preview-verse-num" });
        verseRow.createEl("span", { text: v.text });
      }

      insertBtn.disabled = false;
    };

    inputEl.addEventListener("input", () => {
      updatePreview();
    });

    inputEl.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && currentRef && !insertBtn.disabled) {
        this.insertVerse(currentRef);
        this.close();
      } else if (e.key === "Escape") {
        this.close();
      }
    });

    insertBtn.addEventListener("click", () => {
      if (currentRef) {
        this.insertVerse(currentRef);
        this.close();
      }
    });

    inputEl.focus();
  }

  insertVerse(ref: BibleReference) {
    const bookData = loadBook(this.settings.defaultVersion, ref.bookId);

    if (!bookData) {
      new Notice(`未找到「${ref.bookName}」的经文数据`);
      return;
    }

    const verses = getVerses(bookData, ref.chapter, ref.startVerse, ref.endVerse);

    if (verses.length === 0) {
      new Notice(`未找到经文 ${ref.bookName} ${ref.chapter}:${ref.startVerse}`);
      return;
    }

    const formattedText = formatVersePlain(ref.bookName, ref.chapter, verses);

    const editor = this.app.workspace.activeEditor?.editor;
    if (editor) {
      editor.replaceSelection(formattedText);
      new Notice(`已插入 ${ref.bookName} ${ref.chapter}:${ref.startVerse}${ref.endVerse ? `-${ref.endVerse}` : ''}`);
    } else {
      void navigator.clipboard.writeText(formattedText).then(() => {
        new Notice("经文已复制到剪贴板（无活动编辑器）");
      });
    }
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}
