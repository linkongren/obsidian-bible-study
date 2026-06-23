/**
 * 经文引用插入弹窗
 * 用户输入经文出处（如 "约翰福音3:16"），预览并插入经文
 */

import { App, Modal, Notice } from "obsidian";
import { BibleReference } from "./types";
import { findBook } from "./book-names";
import { loadBook, getVerses, formatVersePlain } from "./bible-data";
import { BibleStudySettings } from "./types";

interface VaultAdapter {
  read: (path: string) => Promise<string>;
  exists: (path: string) => Promise<boolean>;
}

export function parseReference(input: string): BibleReference | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const patterns = [
    /^([一-鿿\s]+?)\s*(\d+)\s*:\s*(\d+)(?:\s*[-–—]\s*(\d+))?$/,
    /^([a-zA-Z\s\d]+?)\s+(\d+)\s*:\s*(\d+)(?:\s*[-–—]\s*(\d+))?$/i,
    /^([一-鿿]+?)(\d+)\s*:\s*(\d+)(?:\s*[-–—]\s*(\d+))?$/,
  ];

  let bookName = "";
  let chapter = 0;
  let startVerse = 0;
  let endVerse: number | undefined;

  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match) {
      bookName = match[1].trim();
      chapter = parseInt(match[2], 10);
      startVerse = parseInt(match[3], 10);
      if (match[4] !== undefined) {
        endVerse = parseInt(match[4], 10);
      }
      break;
    }
  }

  if (!bookName || !chapter || !startVerse) {
    return null;
  }

  const book = findBook(bookName);
  if (!book) {
    return null;
  }

  return {
    bookId: book.id,
    bookName: book.name,
    chapter,
    startVerse,
    endVerse: endVerse && endVerse > startVerse ? endVerse : undefined,
  };
}

export class ReferenceModal extends Modal {
  settings: BibleStudySettings;
  result: string | null = null;

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

      const adapter = this.app.vault.adapter as VaultAdapter;

      void loadBook(
        this.settings.defaultVersion,
        ref.bookId,
        adapter
      ).then((bookData) => {
        if (!bookData) {
          previewEl.empty();
          previewEl.createEl("div", {
            text: `⚠️ 未找到「${ref.bookName}」的经文数据，请先下载圣经数据`,
            cls: "hint-text",
          });
          insertBtn.disabled = true;
          return;
        }

        const verses = getVerses(bookData, ref.chapter, ref.startVerse, ref.endVerse);

        if (verses.length === 0) {
          previewEl.empty();
          previewEl.createEl("div", {
            text: `⚠️ 未找到 ${ref.bookName} ${ref.chapter}:${ref.startVerse} 的经文`,
            cls: "hint-text",
          });
          insertBtn.disabled = true;
          return;
        }

        previewEl.empty();
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
          verseRow.createEl("span", {
            text: `${v.verse}`,
            cls: "preview-verse-num",
          });
          verseRow.createEl("span", { text: v.text });
        }

        insertBtn.disabled = false;
      }).catch((e: unknown) => {
        previewEl.empty();
        previewEl.createEl("div", {
          text: `❌ 加载失败: ${String(e)}`,
          cls: "hint-text",
        });
        insertBtn.disabled = true;
      });
    };

    inputEl.addEventListener("input", () => {
      updatePreview();
    });

    inputEl.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && currentRef && !insertBtn.disabled) {
        void this.insertVerse(currentRef).then(() => {
          this.close();
        });
      } else if (e.key === "Escape") {
        this.close();
      }
    });

    insertBtn.addEventListener("click", () => {
      if (currentRef) {
        void this.insertVerse(currentRef).then(() => {
          this.close();
        });
      }
    });

    inputEl.focus();
  }

  async insertVerse(ref: BibleReference) {
    const adapter = this.app.vault.adapter as VaultAdapter;
    const bookData = await loadBook(this.settings.defaultVersion, ref.bookId, adapter);

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
      await navigator.clipboard.writeText(formattedText);
      new Notice("经文已复制到剪贴板（无活动编辑器）");
    }
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}
