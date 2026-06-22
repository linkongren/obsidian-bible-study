/**
 * 经文引用插入弹窗
 * 用户输入经文出处（如 "约翰福音3:16"），预览并插入经文
 */

import { App, Modal, Setting, Notice } from "obsidian";
import { BibleReference } from "./types";
import { findBook } from "./book-names";
import { loadBook, getVerses, formatVersePlain } from "./bible-data";
import { BibleStudySettings } from "./types";

/**
 * 解析用户输入的经文引用字符串
 * 支持格式：
 *   "约翰福音 3:16"
 *   "约3:16"
 *   "约翰福音3:16-18"
 *   "约 3:16"
 *   "John 3:16"
 *   "jhn 3:16"
 */
export function parseReference(input: string): BibleReference | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // 尝试多种正则匹配
  // 模式：书名 章:节(-节)
  // 书名可以是中文（含空格）或英文
  const patterns = [
    // 中文全名：中文书名 + 数字:数字(-数字)?
    /^([一-鿿\s]+?)\s*(\d+)\s*:\s*(\d+)(?:\s*[-–—]\s*(\d+))?$/,
    // 英文名：英文书名 + 数字:数字(-数字)?
    /^([a-zA-Z\s\d]+?)\s+(\d+)\s*:\s*(\d+)(?:\s*[-–—]\s*(\d+))?$/i,
    // 紧凑模式：书名数字:数字(-数字)?（中英文皆可）
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

  // 查找书卷
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

/**
 * 经文引用插入弹窗
 */
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

    // 提示文字
    contentEl.createEl("p", {
      text: "输入经文出处，如「约翰福音 3:16」「约3:16」「约3:16-18」",
      cls: "hint-text",
    });

    // 输入框
    const inputEl = contentEl.createEl("input", {
      type: "text",
      placeholder: "例如：约翰福音 3:16",
      cls: "search-input",
    });

    // 预览区域
    const previewEl = contentEl.createEl("div", { cls: "preview-box" });
    previewEl.createEl("div", {
      text: "在此预览经文...",
      cls: "hint-text",
    });

    // 按钮区域
    const buttonRow = contentEl.createEl("div");

    const insertBtn = buttonRow.createEl("button", {
      text: "插入经文",
    });
    insertBtn.disabled = true;
    insertBtn.style.marginRight = "8px";

    const cancelBtn = buttonRow.createEl("button", {
      text: "取消",
    });
    cancelBtn.style.background = "var(--background-secondary)";
    cancelBtn.style.color = "var(--text-normal)";
    cancelBtn.addEventListener("click", () => {
      this.close();
    });

    // 输入事件：实时预览
    let currentRef: BibleReference | null = null;

    const updatePreview = async () => {
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

      // 加载经文数据
      try {
        const adapter = (this.app.vault.adapter as any);
        const bookData = await loadBook(
          this.settings.defaultVersion,
          ref.bookId,
          adapter
        );

        if (!bookData) {
          previewEl.createEl("div", {
            text: `⚠️ 未找到「${ref.bookName}」的经文数据，请先下载圣经数据`,
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

        // 显示预览
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
      } catch (e) {
        previewEl.createEl("div", {
          text: `❌ 加载失败: ${e}`,
          cls: "hint-text",
        });
        insertBtn.disabled = true;
      }
    };

    inputEl.addEventListener("input", () => {
      updatePreview();
    });

    // 回车插入
    inputEl.addEventListener("keydown", async (e) => {
      if (e.key === "Enter" && currentRef && !insertBtn.disabled) {
        await this.insertVerse(currentRef);
        this.close();
      } else if (e.key === "Escape") {
        this.close();
      }
    });

    // 插入按钮
    insertBtn.addEventListener("click", async () => {
      if (currentRef) {
        await this.insertVerse(currentRef);
        this.close();
      }
    });

    // 自动聚焦输入框
    inputEl.focus();
  }

  async insertVerse(ref: BibleReference) {
    const adapter = (this.app.vault.adapter as any);
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

    // 插入到当前编辑器中
    const editor = this.app.workspace.activeEditor?.editor;
    if (editor) {
      editor.replaceSelection(formattedText);
      new Notice(`已插入 ${ref.bookName} ${ref.chapter}:${ref.startVerse}${ref.endVerse ? `-${ref.endVerse}` : ''}`);
    } else {
      // 如果没有活动编辑器，复制到剪贴板
      await navigator.clipboard.writeText(formattedText);
      new Notice("经文已复制到剪贴板（无活动编辑器）");
    }
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}
