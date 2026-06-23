/**
 * 圣经阅读面板
 * 侧边栏 ItemView，支持选择书卷、章节浏览、点击插入经文
 */

import {
  ItemView,
  WorkspaceLeaf,
  Notice,
} from "obsidian";
import { BookMeta, BibleStudySettings, ChapterData } from "./types";
import { BOOKS } from "./book-names";
import { loadBook, getChapter as getChapterData } from "./bible-data";

export const BIBLE_VIEW_TYPE = "bible-reading-view";

/**
 * 圣经阅读面板
 */
export class BibleReadingView extends ItemView {
  private settings: BibleStudySettings;
  private currentBook: BookMeta;
  private currentChapter: number = 1;
  private bookData: ChapterData[] = [];
  private loadedBookId: string = "";

  constructor(leaf: WorkspaceLeaf, settings: BibleStudySettings) {
    super(leaf);
    this.settings = settings;
    this.currentBook = BOOKS.find(b => b.id === "jhn") || BOOKS[0];
  }

  getViewType(): string {
    return BIBLE_VIEW_TYPE;
  }

  getDisplayText(): string {
    return "圣经阅读";
  }

  getIcon(): string {
    return "book-open";
  }

  /** 外部调用：跳转到指定书卷章节 */
  async navigateTo(bookId: string, chapter: number) {
    const book = BOOKS.find(b => b.id === bookId);
    if (!book) return;

    this.currentBook = book;
    this.currentChapter = Math.min(chapter, book.chapters);
    this.loadedBookId = "";
    await this.loadCurrentChapter();

    const container = this.containerEl.children[1] as HTMLElement;
    const bookSelect = container.querySelector(".bible-book-select") as HTMLSelectElement;
    if (bookSelect) bookSelect.value = bookId;
    const chSelect = container.querySelector(".chapter-select") as HTMLSelectElement;
    if (chSelect) {
      chSelect.empty();
      for (let c = 1; c <= book.chapters; c++) {
        const opt = chSelect.createEl("option");
        opt.value = String(c);
        opt.textContent = `第 ${c} 章`;
      }
      chSelect.value = String(this.currentChapter);
    }
    this.renderContent(container);
  }

  async onOpen() {
    const container = this.containerEl.children[1] as HTMLElement;
    container.empty();
    container.addClass("bible-reading-panel");
    container.setAttr("style", `--bible-font-size: ${this.settings.fontSize}px;`);

    await this.render(container);
  }

  async render(container: HTMLElement) {
    container.empty();
    const doc = container.ownerDocument;

    // === 头部导航栏 ===
    const header = container.createEl("div", { cls: "bible-reading-header" });

    // 书卷选择器
    const bookSelect = header.createEl("select", { cls: "bible-book-select" });

    // 分组：旧约 / 新约
    const oldGroup = doc.createElement("optgroup");
    oldGroup.label = "── 旧约 ──";

    const newGroup = doc.createElement("optgroup");
    newGroup.label = "── 新约 ──";

    for (const book of BOOKS) {
      const option = doc.createElement("option");
      option.value = book.id;
      option.textContent = book.name;

      if (book.testament === "old") {
        oldGroup.appendChild(option);
      } else {
        newGroup.appendChild(option);
      }

      if (book.id === this.currentBook.id) {
        option.selected = true;
      }
    }

    bookSelect.appendChild(oldGroup);
    bookSelect.appendChild(newGroup);

    bookSelect.addEventListener("change", () => {
      const book = BOOKS.find(b => b.id === bookSelect.value);
      if (book) {
        this.currentBook = book;
        this.currentChapter = 1;
        const chSelect = container.querySelector(".chapter-select") as HTMLSelectElement;
        if (chSelect) {
          chSelect.empty();
          for (let c = 1; c <= book.chapters; c++) {
            const opt = chSelect.createEl("option");
            opt.value = String(c);
            opt.textContent = `第 ${c} 章`;
          }
          chSelect.value = "1";
        }
        void this.loadCurrentChapter().then(() => {
          this.renderContent(container);
        });
      }
    });

    // 章导航：◀ 章下拉 ▶
    const chapterNav = header.createEl("div", { cls: "chapter-nav" });

    const prevBtn = chapterNav.createEl("button", { text: "◀" });
    prevBtn.setAttribute("aria-label", "上一章");

    const chapterSelect = chapterNav.createEl("select", { cls: "chapter-select" });
    chapterSelect.setAttribute("aria-label", "选择章节");

    const populateChapters = () => {
      chapterSelect.empty();
      for (let c = 1; c <= this.currentBook.chapters; c++) {
        const opt = chapterSelect.createEl("option");
        opt.value = String(c);
        opt.textContent = `第 ${c} 章`;
      }
      chapterSelect.value = String(this.currentChapter);
    };
    populateChapters();

    chapterSelect.addEventListener("change", () => {
      const newChapter = parseInt(chapterSelect.value, 10);
      if (newChapter !== this.currentChapter) {
        this.currentChapter = newChapter;
        void this.loadCurrentChapter().then(() => {
          this.renderContent(container);
        });
      }
    });

    const nextBtn = chapterNav.createEl("button", { text: "▶" });
    nextBtn.setAttribute("aria-label", "下一章");

    const goToChapter = (delta: number) => {
      const newChapter = this.currentChapter + delta;
      if (newChapter >= 1 && newChapter <= this.currentBook.chapters) {
        this.currentChapter = newChapter;
        void this.loadCurrentChapter().then(() => {
          this.renderContent(container);
        });
      }
    };

    prevBtn.addEventListener("click", () => goToChapter(-1));
    nextBtn.addEventListener("click", () => goToChapter(1));

    // 键盘导航
    container.addEventListener("keydown", async (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        if (this.currentChapter > 1) {
          this.currentChapter--;
          await this.loadCurrentChapter();
          this.renderContent(container);
        }
      } else if (e.key === "ArrowRight") {
        if (this.currentChapter < this.currentBook.chapters) {
          this.currentChapter++;
          await this.loadCurrentChapter();
          this.renderContent(container);
        }
      }
    });

    // === 经文内容区 ===
    const contentArea = container.createEl("div", { cls: "bible-verse-container" });
    contentArea.setAttribute("id", "bible-content-area");

    await this.loadCurrentChapter();
    this.renderContent(container);
  }

  private async loadCurrentChapter(): Promise<void> {
    if (this.loadedBookId !== this.currentBook.id) {
      try {
        const adapter = (this.app.vault.adapter as { read: (path: string) => Promise<string>; exists: (path: string) => Promise<boolean> });
        const data = await loadBook(this.settings.defaultVersion, this.currentBook.id, adapter);

        if (data) {
          this.bookData = data.chapters;
          this.loadedBookId = this.currentBook.id;
        } else {
          this.bookData = [];
        }
      } catch (e) {
        console.error("Bible Study: 加载书卷失败", e);
        this.bookData = [];
      }
    }
  }

  private renderContent(container: HTMLElement) {
    let contentArea = container.querySelector("#bible-content-area") as HTMLElement;
    if (contentArea) {
      contentArea.empty();
    } else {
      contentArea = container.querySelector(".bible-verse-container") as HTMLElement;
      if (!contentArea) {
        contentArea = container.createEl("div", { cls: "bible-verse-container" });
        contentArea.setAttribute("id", "bible-content-area");
      }
    }

    const chapterSelect = container.querySelector(".chapter-select") as HTMLSelectElement;
    if (chapterSelect) {
      chapterSelect.value = String(this.currentChapter);
    }

    if (this.bookData.length === 0) {
      const noData = contentArea.createEl("div", { cls: "bible-no-data" });
      noData.createEl("h3", { text: "暂无圣经数据" });
      noData.createEl("p", {
        text: '请运行 npm run fetch-bible 下载和合本经文数据，或手动将 JSON 文件放入 data/cuv/ 目录。',
      });
      return;
    }

    const chapterData = getChapterData({ book: this.currentBook.name, bookId: this.currentBook.id, chapters: this.bookData }, this.currentChapter);

    if (!chapterData) {
      contentArea.createEl("div", {
        text: `未找到 ${this.currentBook.name} 第 ${this.currentChapter} 章`,
        cls: "bible-no-data",
      });
      return;
    }

    for (const verse of chapterData.verses) {
      const verseEl = contentArea.createEl("div", { cls: "bible-verse" });

      if (this.settings.showVerseNumbers) {
        verseEl.createEl("span", {
          text: `${verse.verse}`,
          cls: "verse-number",
        });
      }

      verseEl.createEl("span", {
        text: verse.text,
        cls: "verse-text",
      });

      verseEl.addEventListener("click", () => {
        const editor = this.app.workspace.activeEditor?.editor;
        if (editor) {
          const citation = `> **${this.currentBook.name} ${this.currentChapter}:${verse.verse}**\n> ${verse.text}\n`;
          editor.replaceSelection(citation);
          new Notice(`已插入 ${this.currentBook.name} ${this.currentChapter}:${verse.verse}`);
        } else {
          new Notice("请先打开一个笔记文件");
        }
      });

      verseEl.addEventListener("dblclick", () => {
        const text = `${this.currentBook.name} ${this.currentChapter}:${verse.verse}  ${verse.text}`;
        void navigator.clipboard.writeText(text).then(() => {
          new Notice(`已复制 ${this.currentBook.name} ${this.currentChapter}:${verse.verse}`);
        });
      });
    }
  }

  async onClose() {
    // 清理
  }
}
