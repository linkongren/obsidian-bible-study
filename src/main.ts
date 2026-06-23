/**
 * Bible Study 插件主入口
 *
 * 功能：
 * 1. 快速引用插入 — 输入经文出处，自动插入经文内容
 * 2. 圣经阅读面板 — 侧边栏阅读器，浏览任意书卷章节
 * 3. 设置面板 — 自定义显示和行为
 */

import { Plugin, Notice } from "obsidian";
import { BibleStudySettings, DEFAULT_SETTINGS } from "./types";
import { BibleStudySettingTab } from "./settings";
import { ReferenceModal } from "./reference-modal";
import { BibleReadingView, BIBLE_VIEW_TYPE } from "./bible-view";
import { clearCache } from "./bible-data";
import { doExpand, createTabExpandExtension } from "./inline-expand";
import { createRefLinkExtension } from "./ref-link";
import { parseReference } from "./reference-modal";

export default class BibleStudyPlugin extends Plugin {
  settings: BibleStudySettings;

  async onload() {
    console.log("Bible Study: 插件加载中...");

    // 加载设置
    await this.loadSettings();

    // 注册设置选项卡
    this.addSettingTab(new BibleStudySettingTab(this.app, this));

    // 注册圣经阅读面板视图
    this.registerView(
      BIBLE_VIEW_TYPE,
      (leaf) => new BibleReadingView(leaf, this.settings)
    );

    // 添加 Ribbon 图标（左侧栏）
    this.addRibbonIcon("book-open", "打开圣经阅读面板", () => {
      void this.activateView();
    });

    // 注册编辑器 Tab 展开扩展
    this.registerEditorExtension(
      createTabExpandExtension(this.settings)
    );

    // 注册引用链接装饰扩展（:ref 显示为可点击链接 + 悬停预览）
    this.registerEditorExtension(
      createRefLinkExtension((refText: string) => {
        void this.navigateToRef(refText);
      })
    );

    // 注册命令：插入经文引用（优先内联展开，否则弹窗）
    this.addCommand({
      id: "insert-bible-reference",
      name: "插入/展开经文引用",
      callback: async () => {
        const editor = this.app.workspace.activeEditor?.editor;
        if (editor) {
          // 先尝试内联展开 :ref
          const expanded = doExpand(editor, this.settings);
          if (expanded) return;
        }
        // 否则弹窗输入
        new ReferenceModal(this.app, this.settings).open();
      },
    });

    // 注册命令：打开圣经阅读面板
    this.addCommand({
      id: "open-bible-reading-panel",
      name: "打开圣经阅读面板",
      callback: () => {
        void this.activateView();
      },
    });

    // 注册命令：关闭圣经阅读面板
    this.addCommand({
      id: "close-bible-reading-panel",
      name: "关闭圣经阅读面板",
      callback: () => {
        const leaves = this.app.workspace.getLeavesOfType(BIBLE_VIEW_TYPE);
        for (const leaf of leaves) {
          leaf.detach();
        }
      },
    });

    // 注册命令：查找当前选中的经文
    this.addCommand({
      id: "lookup-selected-reference",
      name: "查找选中的经文引用",
      callback: () => {
        void this.lookupSelectedReference();
      },
    });

    console.log("Bible Study: 插件加载完成 ✅");
  }

  onunload() {
    console.log("Bible Study: 插件卸载");
  }

  /**
   * 加载插件设置
   */
  async loadSettings() {
    const data = await this.loadData() as Partial<BibleStudySettings> | undefined;
    this.settings = Object.assign({}, DEFAULT_SETTINGS, data);
  }

  /**
   * 保存插件设置
   */
  async saveSettings() {
    await this.saveData(this.settings);
    // 更新视图
    this.updateViews();
  }

  /**
   * 刷新圣经数据缓存
   */
  refreshData() {
    clearCache();
    new Notice("Bible Study: 缓存已刷新，重新打开面板以加载数据");
  }

  /**
   * 更新所有打开的圣经视图
   */
  private updateViews() {
    const leaves = this.app.workspace.getLeavesOfType(BIBLE_VIEW_TYPE);
    for (const leaf of leaves) {
      if (leaf.view instanceof BibleReadingView) {
        void leaf.view.onOpen();
      }
    }
  }

  /**
   * 激活/创建圣经阅读面板
   */
  async activateView() {
    const { workspace } = this.app;

    // 检查是否已有面板
    let leaf = workspace.getLeavesOfType(BIBLE_VIEW_TYPE)[0];

    if (!leaf) {
      // 在右侧边栏创建新面板
      const rightLeaf = workspace.getRightLeaf(false);
      if (rightLeaf) {
        await rightLeaf.setViewState({
          type: BIBLE_VIEW_TYPE,
          active: true,
        });
        leaf = rightLeaf;
      }
    } else {
      // 已有面板，聚焦它
      workspace.setActiveLeaf(leaf, { focus: true });
    }
  }

  /**
   * 点击引用链接时：打开圣经面板并跳转
   */
  async navigateToRef(refText: string) {
    const ref = parseReference(refText);
    if (!ref) {
      new Notice(`无法解析引用: "${refText}"`);
      return;
    }

    // 激活/创建阅读面板
    await this.activateView();

    // 找到面板视图并跳转
    const leaves = this.app.workspace.getLeavesOfType(BIBLE_VIEW_TYPE);
    if (leaves.length > 0 && leaves[0].view instanceof BibleReadingView) {
      await leaves[0].view.navigateTo(ref.bookId, ref.chapter);
      new Notice(`已跳转到 ${ref.bookName} 第 ${ref.chapter} 章`);
    }
  }

  /**
   * 查找当前选中的经文引用
   */
  async lookupSelectedReference() {
    const editor = this.app.workspace.activeEditor?.editor;
    if (!editor) {
      new Notice("请先打开一个笔记文件");
      return;
    }

    const selection = editor.getSelection();
    if (!selection) {
      new Notice("请先选中一段经文引用文字（如「约3:16」）");
      return;
    }

    // 打开引用弹窗并预填选中文本
    const modal = new ReferenceModal(this.app, this.settings);
    modal.open();

    // 预填输入框（在 onOpen 中已创建）
    window.setTimeout(() => {
      const input = modal.contentEl.querySelector("input");
      if (input) {
        input.value = selection;
        input.dispatchEvent(new Event("input"));
      }
    }, 50);
  }
}
