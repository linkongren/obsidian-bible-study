import {
  ItemView,
  WorkspaceLeaf,
  Notice,
} from "obsidian";
import { BookMeta, BibleStudySettings, ChapterData, ReadingTheme } from "./types";
import type BibleStudyPlugin from "./main";
import { BOOKS } from "./book-names";
import { loadBook, getChapter as getChapterData, isDataReady } from "./bible-data";

export const BIBLE_VIEW_TYPE = "bible-reading-view";

/** 阅读主题配色（JS 直接应用，确保在深色 Obsidian 下也能生效） */
const THEMES: Record<ReadingTheme, { bg: string; text: string; accent: string; headerBg: string; font: string }> = {
  paper: { bg: "#faf6ef", text: "#3b3328", accent: "#8a6d3b", headerBg: "#f1eadd", font: '"Noto Serif SC", "Source Han Serif SC", "Songti SC", "SimSun", serif' },
  eyecare: { bg: "#e8f5e9", text: "#2f4a3e", accent: "#4e7a54", headerBg: "#dcedd9", font: '"Microsoft YaHei", "PingFang SC", "Noto Sans SC", sans-serif' },
  parchment: { bg: "#efe6d2", text: "#4a3b2a", accent: "#7a5c2e", headerBg: "#e5d7bd", font: '"Noto Serif SC", "Source Han Serif SC", "Songti SC", "SimSun", serif' },
  night: { bg: "#20222a", text: "#d3cec0", accent: "#b8a36a", headerBg: "#2a2d37", font: '"Microsoft YaHei", "PingFang SC", "Noto Sans SC", sans-serif' },
  minimal: { bg: "#f7f7f8", text: "#222222", accent: "#5a5a5a", headerBg: "#ececed", font: '"Microsoft YaHei", "PingFang SC", "Noto Sans SC", sans-serif' },
};

const THEME_OPTIONS: Array<[ReadingTheme, string]> = [
  ["paper", "经典纸书"],
  ["eyecare", "护眼绿"],
  ["parchment", "羊皮纸"],
  ["night", "夜间暗色"],
  ["minimal", "极简灰"],
];

/** 把主题内联应用到面板（CSS 自定义属性），保证在深色 Obsidian 下也生效 */
function applyThemeTo(container: HTMLElement, theme: ReadingTheme, fontSize: number) {
  const t = THEMES[theme] || THEMES.paper;
  container.setAttr("data-theme", theme);
  container.setCssProps({
    "--bible-font-size": `${fontSize}px`,
    "--bible-bg": t.bg,
    "--bible-text": t.text,
    "--bible-accent": t.accent,
    "--bible-header-bg": t.headerBg,
    "--bible-font": t.font,
  });
}

export class BibleReadingView extends ItemView {
  private settings: BibleStudySettings;
  private plugin: BibleStudyPlugin;
  private currentBook: BookMeta;
  private currentChapter: number = 1;
  private bookData: ChapterData[] = [];
  private loadedKey: string = "";
  private targetVerse: number | undefined;
  private rendered = false;
  private _closeObserver: MutationObserver | null = null;
  private keyHandler: ((e: KeyboardEvent) => void) | null = null;
  private currentPicker: HTMLElement | null = null;
  private pickerDocHandler: ((e: MouseEvent) => void) | null = null;

  constructor(leaf: WorkspaceLeaf, settings: BibleStudySettings, plugin: BibleStudyPlugin) {
    super(leaf);
    this.settings = settings;
    this.plugin = plugin;
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

  async navigateTo(bookId: string, chapter: number, verse?: number) {
    const book = BOOKS.find(b => b.id === bookId);
    if (!book) return;

    this.currentBook = book;
    this.currentChapter = Math.min(chapter, book.chapters);
    this.targetVerse = verse;
    this.loadedKey = "";

    // 视图尚未渲染时（首次打开），由 onOpen 的渲染统一消费 targetVerse
    if (!this.rendered) return;

    this.loadCurrentChapter();
    this.renderContent(this.contentEl);
  }

  async onOpen() {
    const container = this.contentEl;
    container.empty();
    container.addClass("bible-reading-panel");
    applyThemeTo(container, this.settings.readingTheme, this.settings.fontSize);
    this.setupCloseButtonRemoval();
    await this.render(container);
  }

  /** 只移除 Obsidian 原生的面板关闭按钮（view-action），不动自定义 ✕ */
  private setupCloseButtonRemoval() {
    if (this._closeObserver) {
      this._closeObserver.disconnect();
      this._closeObserver = null;
    }
    const removeCloseBtn = () => {
      const leafEl = this.containerEl.closest(".workspace-leaf");
      if (!leafEl) return;
      leafEl.querySelectorAll(".view-action[aria-label]").forEach((btn) => {
        const aria = btn.getAttribute("aria-label") || "";
        if (aria === "Close" || aria === "关闭" || aria === "Close pane") btn.remove();
      });
    };
    removeCloseBtn();
    const observer = new MutationObserver(() => removeCloseBtn());
    const leafEl = this.containerEl.closest(".workspace-leaf");
    if (leafEl) observer.observe(leafEl, { childList: true, subtree: true });
    this._closeObserver = observer;
  }

  /** 设置变更时刷新主题/字号/内容，不重建整个面板 */
  refreshSettings() {
    const container = this.contentEl;
    applyThemeTo(container, this.settings.readingTheme, this.settings.fontSize);
    this.loadCurrentChapter();
    this.renderContent(container);
  }

  async render(container: HTMLElement) {
    container.empty();

    const header = container.createEl("div", { cls: "bible-reading-header" });

    const bookBtn = header.createEl("button", { text: this.currentBook.name, cls: "bible-book-btn" });
    bookBtn.addEventListener("click", () => {
      this.openBookPicker(bookBtn);
    });

    const chapterNav = header.createEl("div", { cls: "chapter-nav" });

    const prevBtn = chapterNav.createEl("button", { text: "◀" });
    prevBtn.setAttribute("aria-label", "上一章");

    const chapterBtn = chapterNav.createEl("button", { text: `第 ${this.currentChapter} 章`, cls: "chapter-btn" });
    chapterBtn.addEventListener("click", () => {
      this.openChapterPicker(chapterBtn);
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

    // 同一容器上的 keydown 监听只保留一个，避免重复叠加
    if (this.keyHandler) container.removeEventListener("keydown", this.keyHandler);
    this.keyHandler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") goToChapter(-1);
      else if (e.key === "ArrowRight") goToChapter(1);
    };
    container.addEventListener("keydown", this.keyHandler);

    container.createEl("div", { cls: "bible-verse-container", attr: { id: "bible-content-area" } });

    const footer = container.createEl("div", { cls: "bible-reading-footer" });
    footer.createEl("span", { text: "主题", cls: "bible-footer-label" });
    const themeSelect = footer.createEl("select", { cls: "bible-theme-select" });
    themeSelect.setAttribute("aria-label", "阅读主题");
    for (const [value, label] of THEME_OPTIONS) {
      const opt = themeSelect.createEl("option");
      opt.value = value;
      opt.textContent = label;
    }
    themeSelect.value = this.settings.readingTheme;
    themeSelect.addEventListener("change", () => {
      this.settings.readingTheme = themeSelect.value as ReadingTheme;
      applyThemeTo(container, this.settings.readingTheme, this.settings.fontSize);
      void this.plugin.saveData(this.settings);
    });

    this.loadCurrentChapter();
    this.renderContent(container);
    this.rendered = true;
  }

  // ===== 卷/章多列选择器 =====

  private closePicker() {
    if (this.currentPicker) {
      this.currentPicker.remove();
      this.currentPicker = null;
    }
    if (this.pickerDocHandler) {
      document.removeEventListener("mousedown", this.pickerDocHandler);
      this.pickerDocHandler = null;
    }
  }

  private openBookPicker(anchor: HTMLElement) {
    const items: Array<{ label: string; value: string; group?: string }> = BOOKS.map(b => ({
      label: b.name,
      value: b.id,
      group: b.testament === "old" ? "旧约" : "新约",
    }));
    this.openPicker(anchor, "books", items, (value) => {
      const book = BOOKS.find(b => b.id === value);
      if (!book) return;
      this.currentBook = book;
      this.currentChapter = 1;
      anchor.setText(book.name);
      const chBtn = this.contentEl.querySelector(".chapter-btn") as HTMLElement;
      if (chBtn) chBtn.setText("第 1 章");
      this.loadCurrentChapter();
      this.renderContent(this.contentEl);
    });
  }

  private openChapterPicker(anchor: HTMLElement) {
    const items: Array<{ label: string; value: string }> = [];
    for (let c = 1; c <= this.currentBook.chapters; c++) {
      items.push({ label: String(c), value: String(c) });
    }
    this.openPicker(anchor, "chapters", items, (value) => {
      const newChapter = parseInt(value, 10);
      if (newChapter === this.currentChapter) return;
      this.currentChapter = newChapter;
      this.loadCurrentChapter();
      this.renderContent(this.contentEl);
    });
  }

  private openPicker(
    anchor: HTMLElement,
    gridCls: string,
    items: Array<{ label: string; value: string; group?: string }>,
    onPick: (value: string) => void
  ) {
    if (this.currentPicker) {
      this.closePicker();
      return;
    }
    const doc = this.contentEl.ownerDocument;
    const picker = doc.body.createEl("div", { cls: "bible-picker" });
    picker.setAttr("data-theme", this.settings.readingTheme);
    // 主题配色通过 CSS 自定义属性应用（见 styles.css 的 .bible-picker）
    const t = THEMES[this.settings.readingTheme] || THEMES.paper;
    const grid = picker.createEl("div", { cls: `bible-picker-grid ${gridCls}` });

    let lastGroup: string | undefined;
    for (const item of items) {
      if (item.group && item.group !== lastGroup) {
        grid.createEl("div", { text: item.group, cls: "bible-picker-group" });
        lastGroup = item.group;
      }
      const btn = grid.createEl("button", { text: item.label, cls: "bible-picker-item" });
      if (item.label.length >= 5) btn.addClass("bible-picker-item-long");
      btn.addEventListener("click", () => {
        this.closePicker();
        onPick(item.value);
      });
    }

    // 动态定位通过 CSS 自定义属性应用，避免直接写 style
    const anchorRect = anchor.getBoundingClientRect();
    const width = Math.min(gridCls === "books" ? 310 : 330, window.innerWidth - 16);
    const left = Math.max(8, Math.min(anchorRect.left, window.innerWidth - width - 8));

    const spaceBelow = window.innerHeight - anchorRect.bottom;
    const spaceAbove = anchorRect.top;

    const props: Record<string, string> = {
      "--bible-bg": t.bg,
      "--bible-text": t.text,
      "--bible-accent": t.accent,
      "--bible-header-bg": t.headerBg,
      "--picker-width": `${width}px`,
      "--picker-left": `${left}px`,
      "--picker-top": "auto",
      "--picker-bottom": "auto",
    };

    if (gridCls === "books") {
      props["--picker-top"] = `${anchorRect.bottom + 4}px`;
      props["--picker-max-height"] = "90vh";
    } else if (spaceBelow >= 200 || spaceBelow >= spaceAbove) {
      props["--picker-top"] = `${anchorRect.bottom + 4}px`;
      props["--picker-max-height"] = `${Math.max(120, spaceBelow - 8)}px`;
    } else {
      props["--picker-bottom"] = `${window.innerHeight - anchorRect.top + 4}px`;
      props["--picker-max-height"] = `${Math.max(120, spaceAbove - 8)}px`;
    }

    picker.setCssProps(props);
    this.currentPicker = picker;

    const onDocDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (this.currentPicker && !this.currentPicker.contains(target) && !anchor.contains(target)) {
        this.closePicker();
      }
    };
    this.pickerDocHandler = onDocDown;
    document.addEventListener("mousedown", onDocDown);
    picker.setAttr("tabindex", "-1");
    picker.addEventListener("keydown", (e) => {
      if (e.key === "Escape") this.closePicker();
    });
    picker.focus();
  }

  private loadCurrentChapter(): void {
    const key = `${this.settings.defaultVersion}/${this.currentBook.id}`;
    if (this.loadedKey !== key) {
      const data = loadBook(this.settings.defaultVersion, this.currentBook.id);
      if (data) {
        this.bookData = data.chapters;
        this.loadedKey = key;
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

    const chBtn = container.querySelector(".chapter-btn") as HTMLElement;
    if (chBtn) chBtn.setText(`第 ${this.currentChapter} 章`);
    const bookBtn = container.querySelector(".bible-book-btn") as HTMLElement;
    if (bookBtn) bookBtn.setText(this.currentBook.name);

    if (!isDataReady() || this.bookData.length === 0) {
      const noData = contentArea.createEl("div", { cls: "bible-no-data" });
      noData.createEl("h3", { text: "圣经数据加载中" });
      noData.createEl("p", { text: "正在解压圣经数据..." });
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

      verseEl.setAttribute("data-verse", String(verse.verse));

      // 双击复制整节（单击不拦截，保证可部分选择复制）
      verseEl.addEventListener("dblclick", () => {
        const text = `${this.currentBook.name} ${this.currentChapter}:${verse.verse}  ${verse.text}`;
        void navigator.clipboard.writeText(text)
          .then(() => {
            new Notice(`已复制 ${this.currentBook.name} ${this.currentChapter}:${verse.verse}`);
          })
          .catch(() => {
            new Notice("复制失败");
          });
      });
    }

    // 滚动到目标节
    if (this.targetVerse !== undefined) {
      const targetEl = contentArea.querySelector(`.bible-verse[data-verse="${this.targetVerse}"]`);
      if (targetEl) {
        targetEl.scrollIntoView({ behavior: "smooth", block: "center" });
        targetEl.classList.add("bible-verse-highlight");
        window.setTimeout(() => targetEl.classList.remove("bible-verse-highlight"), 2000);
      }
      this.targetVerse = undefined;
    }
  }

  async onClose() {
    if (this._closeObserver) {
      this._closeObserver.disconnect();
      this._closeObserver = null;
    }
    if (this.keyHandler) {
      this.contentEl.removeEventListener("keydown", this.keyHandler);
      this.keyHandler = null;
    }
    this.closePicker();
  }
}
