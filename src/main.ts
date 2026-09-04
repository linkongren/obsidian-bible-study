/**
 * Bible Study 插件主入口
 */

import { Plugin, Notice } from "obsidian";
import { BibleStudySettings, DEFAULT_SETTINGS } from "./types";
import { BibleStudySettingTab } from "./settings";
import { ReferenceModal } from "./reference-modal";
import { createPlainReferenceRegExp, parseReference, parseMultiReference, plainRefRange } from "./reference-parser";
import { BibleReadingView, BIBLE_VIEW_TYPE } from "./bible-view";
import { clearCache, initBibleData } from "./bible-data";
import { adjustReferenceRange, doExpand, createTabExpandExtension } from "./inline-expand";
import { createRefLinkExtension } from "./ref-link";

/** 普通文本引用（书名+章节）正则：马太福音 5:6 */
const PLAIN_REF_RE = createPlainReferenceRegExp();

export default class BibleStudyPlugin extends Plugin {
  settings: BibleStudySettings;

  async onload() {
    await this.loadSettings();
    this.addSettingTab(new BibleStudySettingTab(this.app, this));

    // 初始化圣经数据（解压内置数据）
    await initBibleData();

    this.registerView(BIBLE_VIEW_TYPE, (leaf) => new BibleReadingView(leaf, this.settings, this));
    this.addRibbonIcon("book-open", "切换圣经阅读面板", () => { void this.toggleView(); });

    this.registerEditorExtension(createTabExpandExtension(() => this.settings));

    this.registerEditorExtension(createRefLinkExtension((refText: string) => { void this.navigateToRef(refText); }));

    // 阅读模式：根据配置将 *ref* 渲染为可点击链接
    this.registerMarkdownPostProcessor((el) => { this.processReadingModeLinks(el); });

    this.addCommand({
      id: "insert-bible-reference",
      name: "插入/展开经文引用",
      callback: async () => {
        const editor = this.app.workspace.activeEditor?.editor;
        if (editor) {
          if (doExpand(editor, this.settings)) return;
        }
        new ReferenceModal(this.app, this.settings).open();
      },
    });

    this.addCommand({ id: "open-bible-reading-panel", name: "切换圣经阅读面板", callback: () => { void this.toggleView(); } });
    this.addCommand({ id: "lookup-selected-reference", name: "查找选中的经文引用", callback: () => { void this.lookupSelectedReference(); } });
    this.addCommand({
      id: "extend-bible-reference-range",
      name: "经文范围增加一节",
      editorCallback: (editor) => { adjustReferenceRange(editor, this.settings, "plus"); },
    });
    this.addCommand({
      id: "shrink-bible-reference-range",
      name: "经文范围减少一节",
      editorCallback: (editor) => { adjustReferenceRange(editor, this.settings, "minus"); },
    });
  }

  onunload() {}

  async loadSettings() {
    const saved: unknown = await this.loadData();
    if (typeof saved !== "object" || saved === null || Array.isArray(saved)) {
      this.settings = { ...DEFAULT_SETTINGS };
      return;
    }
    const values = saved as Record<string, unknown>;
    this.settings = {
      ...DEFAULT_SETTINGS,
      ...(typeof values.defaultVersion === "string" ? { defaultVersion: values.defaultVersion } : {}),
      ...(values.verseFormat === "full" || values.verseFormat === "short" ? { verseFormat: values.verseFormat } : {}),
      ...(typeof values.showVerseNumbers === "boolean" ? { showVerseNumbers: values.showVerseNumbers } : {}),
      ...(typeof values.fontSize === "number" && Number.isFinite(values.fontSize) ? { fontSize: values.fontSize } : {}),
      ...(values.readingTheme === "paper" || values.readingTheme === "eyecare" || values.readingTheme === "night" || values.readingTheme === "parchment" || values.readingTheme === "minimal" ? { readingTheme: values.readingTheme } : {}),
      ...(typeof values.inlineExpandEnabled === "boolean" ? { inlineExpandEnabled: values.inlineExpandEnabled } : {}),
      ...(values.expandKey === "tab" || values.expandKey === "enter" || values.expandKey === "both" ? { expandKey: values.expandKey } : {}),
      ...(typeof values.readingClickEnabled === "boolean" ? { readingClickEnabled: values.readingClickEnabled } : {}),
    };
  }
  async saveSettings() { await this.saveData(this.settings); this.updateViews(); }

  async refreshData() {
    clearCache();
    await initBibleData();
    this.updateViews();
    new Notice("缓存已刷新");
  }

  private updateViews() {
    for (const leaf of this.app.workspace.getLeavesOfType(BIBLE_VIEW_TYPE)) {
      if (leaf.view instanceof BibleReadingView) leaf.view.refreshSettings();
    }
  }

  async activateView() {
    const { workspace } = this.app;
    let leaf = workspace.getLeavesOfType(BIBLE_VIEW_TYPE)[0];
    if (!leaf) {
      const rightLeaf = workspace.getRightLeaf(false);
      if (!rightLeaf) return null;
      await rightLeaf.setViewState({ type: BIBLE_VIEW_TYPE, active: true });
      leaf = rightLeaf;
    }
    workspace.setActiveLeaf(leaf, { focus: true });
    return leaf;
  }

  toggleView() {
    const leaves = this.app.workspace.getLeavesOfType(BIBLE_VIEW_TYPE);
    if (leaves.length > 0) { for (const leaf of leaves) leaf.detach(); }
    else { void this.activateView(); }
  }

  async navigateToRef(refText: string) {
    const ref = parseReference(refText);
    if (!ref) { new Notice(`无法解析: "${refText}"`); return; }
    const leaf = await this.activateView();
    if (leaf?.view instanceof BibleReadingView) {
      await leaf.view.navigateTo(ref.bookId, ref.chapter, ref.startVerse);
    }
  }

  async lookupSelectedReference() {
    const editor = this.app.workspace.activeEditor?.editor;
    if (!editor) { new Notice("请先打开笔记"); return; }
    const selection = editor.getSelection();
    if (!selection) { new Notice("请先选中经文引用"); return; }
    const modal = new ReferenceModal(this.app, this.settings);
    modal.open();
    window.setTimeout(() => {
      const input = modal.contentEl.querySelector("input");
      if (input) { input.value = selection; input.dispatchEvent(new Event("input")); }
    }, 50);
  }

  // ===== 阅读模式 =====

  private processReadingModeLinks(el: HTMLElement) {
    if (!this.settings.readingClickEnabled) return;

    const RE = /^([一-鿿a-zA-Z]+)\s+([\d:：,，\s\-–—]+)$/;
    const ems = el.querySelectorAll("em");

    Array.from(ems).forEach(em => {
      const text = em.textContent?.trim() || "";
      const match = text.match(RE);
      if (!match) return;

      const refText = match[1] + " " + match[2];
      if (parseMultiReference(refText).length === 0) return;

      const link = createEl("a", { cls: "bible-ref-link" });
      link.setAttribute("data-bible-ref", refText);
      link.textContent = text;
      link.addEventListener("click", (e) => { e.preventDefault(); void this.navigateToRef(refText); });

      const parent = em.parentNode;
      if (parent) parent.replaceChild(link, em);
    });

    // 普通文本引用（书名+章节，不带 * 或 -）
    this.wrapPlainRefs(el);
  }

  /** 把正文里的纯文本引用（马太福音 5:6）转为可点击链接 */
  private wrapPlainRefs(el: HTMLElement) {
    const treeWalker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const textNodes: Text[] = [];
    let n;
    while ((n = treeWalker.nextNode())) {
      const t = n as Text;
      if (!t.textContent || !t.textContent.trim()) continue;
      // 跳过链接、代码、已被本插件处理过的节点（检查整条祖先链）
      let parent = t.parentElement;
      let skip = false;
      while (parent) {
        if (parent.classList?.contains("bible-ref-link") || ["A", "CODE", "PRE"].includes(parent.tagName)) {
          skip = true;
          break;
        }
        parent = parent.parentElement;
      }
      if (skip) continue;
      textNodes.push(t);
    }
    for (const node of textNodes) {
      const text = node.textContent || "";
      PLAIN_REF_RE.lastIndex = 0;
      let match;
      let last = 0;
      let changed = false;
      const frag = createFragment();
      while ((match = PLAIN_REF_RE.exec(text)) !== null) {
        const r = plainRefRange(match);
        if (parseMultiReference(r.refText).length === 0) continue;
        if (r.start > last) frag.appendChild(document.createTextNode(text.slice(last, r.start)));
        const a = createEl("a", { cls: "bible-ref-link" });
        a.setAttribute("data-bible-ref", r.refText);
        a.textContent = text.slice(r.start, r.end);
        a.addEventListener("click", (e) => { e.preventDefault(); void this.navigateToRef(r.refText); });
        frag.appendChild(a);
        last = r.end;
        changed = true;
      }
      if (changed) {
        if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));
        node.replaceWith(frag);
      }
    }
  }
}
