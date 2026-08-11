/**
 * Bible Study 插件主入口
 */

import { Plugin, Notice } from "obsidian";
import { BibleStudySettings, DEFAULT_SETTINGS } from "./types";
import { BibleStudySettingTab } from "./settings";
import { ReferenceModal, parseReference, parseMultiReference } from "./reference-modal";
import { BibleReadingView, BIBLE_VIEW_TYPE } from "./bible-view";
import { clearCache, initBibleData } from "./bible-data";
import { doExpand, createTabExpandExtension } from "./inline-expand";
import { createRefLinkExtension } from "./ref-link";
import { buildPlainBookPattern } from "./book-names";

/** 普通文本引用（书名+章节）正则：马太福音 5:6 */
const PLAIN_REF_RE = new RegExp(`(^|[^\\p{L}\\p{N}*\\-！])(${buildPlainBookPattern()})\\s+([\\d：:\\s,，\\-–—]+)`, "gu");

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
  }

  onunload() {}

  async loadSettings() { this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData()); }
  async saveSettings() { await this.saveData(this.settings); this.updateViews(); }

  refreshData() { clearCache(); new Notice("缓存已刷新"); }

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
      if (rightLeaf) { await rightLeaf.setViewState({ type: BIBLE_VIEW_TYPE, active: true }); leaf = rightLeaf; }
    } else {
      workspace.setActiveLeaf(leaf, { focus: true });
    }
  }

  toggleView() {
    const leaves = this.app.workspace.getLeavesOfType(BIBLE_VIEW_TYPE);
    if (leaves.length > 0) { for (const leaf of leaves) leaf.detach(); }
    else { void this.activateView(); }
  }

  async navigateToRef(refText: string) {
    const ref = parseReference(refText);
    if (!ref) { new Notice(`无法解析: "${refText}"`); return; }
    await this.activateView();
    const leaves = this.app.workspace.getLeavesOfType(BIBLE_VIEW_TYPE);
    if (leaves.length > 0 && leaves[0].view instanceof BibleReadingView) {
      await leaves[0].view.navigateTo(ref.bookId, ref.chapter, ref.startVerse);
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
      const parent = t.parentElement;
      if (parent && ["A", "CODE", "PRE"].includes(parent.tagName)) continue;
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
        const rest = match[3].replace(/[\s,，、；;]+$/, "");
        const refText = match[2] + " " + rest;
        if (parseMultiReference(refText).length === 0) continue;
        const start = match.index + match[1].length;
        const end = start + match[2].length + 1 + rest.length;
        if (start > last) frag.appendChild(document.createTextNode(text.slice(last, start)));
        const a = createEl("a", { cls: "bible-ref-link" });
        a.setAttribute("data-bible-ref", refText);
        a.textContent = text.slice(start, end);
        a.addEventListener("click", (e) => { e.preventDefault(); void this.navigateToRef(refText); });
        frag.appendChild(a);
        last = end;
        changed = true;
      }
      if (changed) {
        if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));
        node.replaceWith(frag);
      }
    }
  }
}
