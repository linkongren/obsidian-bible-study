import {
  ItemView,
  WorkspaceLeaf,
  Notice,
} from "obsidian";
import { BookMeta, BibleStudySettings, ChapterData } from "./types";
import { BOOKS } from "./book-names";
import { loadBook, getChapter as getChapterData, isDataReady, downloadBibleData } from "./bible-data";

export const BIBLE_VIEW_TYPE = "bible-reading-view";

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

  private targetVerse: number | undefined;

  async navigateTo(bookId: string, chapter: number, verse?: number) {
    const book = BOOKS.find(b => b.id === bookId);
    if (!book) return;

    this.currentBook = book;
    this.currentChapter = Math.min(chapter, book.chapters);
    this.targetVerse = verse;
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

    // 查找并移除属于本 leaf 的关闭按钮
    const removeCloseBtn = () => {
      const leafEl = this.containerEl.closest(".workspace-leaf");
      if (!leafEl) return;
      const btns = leafEl.querySelectorAll("button, [aria-label]");
      btns.forEach((btn: Element) => {
        const aria = btn.getAttribute("aria-label") || "";
        const cls = (btn as HTMLElement).className || "";
        if (aria === "Close" || aria === "关闭" || aria === "Close pane" || cls.includes("close") || cls.includes("view-action")) {
          btn.remove();
        }
      });
    };
    removeCloseBtn();
    // MutationObserver 应对 Obsidian 重新渲染
    const observer = new MutationObserver(() => removeCloseBtn());
    const leafEl = this.containerEl.closest(".workspace-leaf");
    if (leafEl) observer.observe(leafEl, { childList: true, subtree: true });
    this._closeObserver = observer;

    await this.render(container);
  }

  async render(container: HTMLElement) {
    container.empty();
    const doc = container.ownerDocument;

    const header = container.createEl("div", { cls: "bible-reading-header" });

    const closeBtn = header.createEl("button", { text: "✕", cls: "bible-reading-close" });
    closeBtn.setAttribute("aria-label", "关闭面板");
    closeBtn.addEventListener("click", () => {
      this.leaf.detach();
    });

    const bookSelect = header.createEl("select", { cls: "bible-book-select" });

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
        this.loadCurrentChapter();
        this.renderContent(container);
      }
    });

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
        this.loadCurrentChapter();
        this.renderContent(container);
      }
    });

    const nextBtn = chapterNav.createEl("button", { text: "▶" });
    nextBtn.setAttribute("aria-label", "下一章");

    const goToChapter = (delta: number) => {
      const newChapter = this.currentChapter + delta;
      if (newChapter >= 1 && newChapter <= this.currentBook.chapters) {
        this.currentChapter = newChapter;
        this.loadCurrentChapter();
        this.renderContent(container);
      }
    };

    prevBtn.addEventListener("click", () => goToChapter(-1));
    nextBtn.addEventListener("click", () => goToChapter(1));

    container.addEventListener("keydown", (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        if (this.currentChapter > 1) {
          this.currentChapter--;
          this.loadCurrentChapter();
          this.renderContent(container);
        }
      } else if (e.key === "ArrowRight") {
        if (this.currentChapter < this.currentBook.chapters) {
          this.currentChapter++;
          this.loadCurrentChapter();
          this.renderContent(container);
        }
      }
    });

    const contentArea = container.createEl("div", { cls: "bible-verse-container" });
    contentArea.setAttribute("id", "bible-content-area");

    this.loadCurrentChapter();
    this.renderContent(container);
  }

  private loadCurrentChapter(): void {
    if (this.loadedBookId !== this.currentBook.id) {
      const data = loadBook(this.settings.defaultVersion, this.currentBook.id);
      if (data) {
        this.bookData = data.chapters;
        this.loadedBookId = this.currentBook.id;
      } else {
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

    if (!isDataReady()) {
      const noData = contentArea.createEl("div", { cls: "bible-no-data" });
      noData.createEl("h3", { text: "未下载圣经数据" });
      noData.createEl("p", { text: "首次使用需要下载圣经数据（约 3.7MB），下载后永久缓存。" });
      const dlBtn = noData.createEl("button", { text: "下载圣经数据" });
      const statusEl = noData.createEl("p", { cls: "bible-download-status" });
      dlBtn.addEventListener("click", async () => {
        dlBtn.disabled = true;
        dlBtn.textContent = "下载中...";
        await downloadBibleData((msg, done) => {
          statusEl.textContent = msg;
          if (done) {
            dlBtn.textContent = done ? "下载完成" : "重试";
            dlBtn.disabled = !done;
            if (msg.includes("完成") || msg.includes("就绪")) {
              this.renderContent(container);
            }
          }
        });
        if (!isDataReady()) {
          dlBtn.textContent = "重新下载";
          dlBtn.disabled = false;
        }
      });
      return;
    }

    if (this.bookData.length === 0) {
      const noData = contentArea.createEl("div", { cls: "bible-no-data" });
      noData.createEl("h3", { text: "暂无圣经数据" });
      noData.createEl("p", { text: "请点击上方按钮下载圣经数据。" });
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
        const text = `${this.currentBook.name} ${this.currentChapter}:${verse.verse}  ${verse.text}`;
        if (editor) {
          const citation = `> **${this.currentBook.name} ${this.currentChapter}:${verse.verse}**\n> ${verse.text}\n`;
          editor.replaceSelection(citation);
          new Notice(`已插入 ${this.currentBook.name} ${this.currentChapter}:${verse.verse}`);
        } else {
          navigator.clipboard.writeText(text).then(() => {
            new Notice(`已复制 ${this.currentBook.name} ${this.currentChapter}:${verse.verse}`);
          });
        }
      });

      verseEl.setAttribute("data-verse", String(verse.verse));

      verseEl.addEventListener("dblclick", () => {
        const text = `${this.currentBook.name} ${this.currentChapter}:${verse.verse}  ${verse.text}`;
        void navigator.clipboard.writeText(text).then(() => {
          new Notice(`已复制 ${this.currentBook.name} ${this.currentChapter}:${verse.verse}`);
        });
      });
    }

    // 滚动到目标节
    if (this.targetVerse !== undefined) {
      const targetEl = contentArea.querySelector(`.bible-verse[data-verse="${this.targetVerse}"]`);
      if (targetEl) {
        targetEl.scrollIntoView({ behavior: "smooth", block: "center" });
        targetEl.classList.add("bible-verse-highlight");
        setTimeout(() => targetEl.classList.remove("bible-verse-highlight"), 2000);
      }
      this.targetVerse = undefined;
    }
  }

  async onClose() {
    if (this._closeObserver) { this._closeObserver.disconnect(); }
  }

  private _closeObserver: MutationObserver | null = null;
}
