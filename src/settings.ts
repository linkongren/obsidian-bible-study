/**
 * 插件设置选项卡
 */

import { App, PluginSettingTab, Setting } from "obsidian";
import type { SettingDefinitionItem } from "obsidian";
import type BibleStudyPlugin from "./main";

export class BibleStudySettingTab extends PluginSettingTab {
  plugin: BibleStudyPlugin;

  constructor(app: App, plugin: BibleStudyPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  /** 声明式设置定义：使设置可在 Obsidian 设置搜索中找到（1.13.0+） */
  getSettingDefinitions(): SettingDefinitionItem[] {
    return [
      { type: "group", heading: "经文版本", items: [
        { name: "默认译本", desc: "选择默认使用的圣经译本（目前仅支持和合本 CUV）", control: { key: "defaultVersion", type: "dropdown", options: { cuv: "和合本 (CUV)" } } },
      ] },
      { type: "group", heading: "显示设置", items: [
        { name: "显示经文编号", desc: "在经文旁显示节数编号", control: { key: "showVerseNumbers", type: "toggle" } },
        { name: "引用格式", desc: "插入经文时的格式：完整格式（分行，含编号）或简短格式（单行）", control: { key: "verseFormat", type: "dropdown", options: { full: "完整格式", short: "简短格式" } } },
        { name: "阅读面板字号", desc: "圣经阅读面板中的字体大小", control: { key: "fontSize", type: "slider", min: 12, max: 24, step: 1 } },
        { name: "阅读主题", desc: "阅读面板的字体、文字颜色与背景配色", control: { key: "readingTheme", type: "dropdown", options: { paper: "经典纸书", eyecare: "护眼绿", parchment: "羊皮纸", night: "夜间暗色", minimal: "极简灰" } } },
      ] },
      { type: "group", heading: "内联展开", items: [
        { name: "启用内联展开", desc: "在编辑器中输入经文引用后按 Tab 或 Enter 展开经文", control: { key: "inlineExpandEnabled", type: "toggle" } },
        { name: "展开快捷键", desc: "选择触发内联展开的按键", control: { key: "expandKey", type: "dropdown", options: { tab: "Tab", enter: "Enter", both: "Tab + Enter" } } },
      ] },
      { type: "group", heading: "阅读模式", items: [
        { name: "启用点击跳转", desc: "阅读模式下，点击 *经文引用* 跳转到圣经面板", control: { key: "readingClickEnabled", type: "toggle" } },
      ] },
      { type: "group", heading: "数据管理", items: [
        { name: "重新加载数据", desc: "清除数据缓存并重新从文件加载", action: () => { void this.plugin.refreshData(); } },
      ] },
    ];
  }

  getControlValue(key: string): unknown {
    return (this.plugin.settings as unknown as Record<string, unknown>)[key];
  }

  setControlValue(key: string, value: unknown): void {
    (this.plugin.settings as unknown as Record<string, unknown>)[key] = value;
    void this.plugin.saveSettings();
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl).setName("设置").setHeading();

    // === 经文版本 ===
    new Setting(containerEl).setName("圣经版本").setHeading();

    new Setting(containerEl)
      .setName("默认译本")
      .setDesc("选择默认使用的圣经译本（目前仅支持和合本 CUV）")
      .addDropdown(dropdown => {
        dropdown
          .addOption("cuv", "和合本 (CUV)")
          .setValue(this.plugin.settings.defaultVersion)
          .onChange(async (value) => {
            this.plugin.settings.defaultVersion = value;
            await this.plugin.saveSettings();
          });
      });

    // === 显示设置 ===
    new Setting(containerEl).setName("显示设置").setHeading();

    new Setting(containerEl)
      .setName("显示经文编号")
      .setDesc("在经文旁显示节数编号")
      .addToggle(toggle => {
        toggle
          .setValue(this.plugin.settings.showVerseNumbers)
          .onChange(async (value) => {
            this.plugin.settings.showVerseNumbers = value;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("引用格式")
      .setDesc("插入经文时的格式：完整格式（分行，含编号）或简短格式（单行）")
      .addDropdown(dropdown => {
        dropdown
          .addOption("full", "完整格式")
          .addOption("short", "简短格式")
          .setValue(this.plugin.settings.verseFormat)
          .onChange(async (value) => {
            this.plugin.settings.verseFormat = value as "full" | "short";
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("阅读面板字号")
      .setDesc("圣经阅读面板中的字体大小")
      .addSlider(slider => {
        slider
          .setLimits(12, 24, 1)
          .setValue(this.plugin.settings.fontSize)
          .onChange(async (value) => {
            this.plugin.settings.fontSize = value;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("阅读主题")
      .setDesc("阅读面板的字体、文字颜色与背景配色")
      .addDropdown(dropdown => {
        dropdown
          .addOption("paper", "经典纸书")
          .addOption("eyecare", "护眼绿")
          .addOption("parchment", "羊皮纸")
          .addOption("night", "夜间暗色")
          .addOption("minimal", "极简灰")
          .setValue(this.plugin.settings.readingTheme)
          .onChange(async (value) => {
            this.plugin.settings.readingTheme = value as typeof this.plugin.settings.readingTheme;
            await this.plugin.saveSettings();
          });
      });

    // === 内联展开 ===
    new Setting(containerEl).setName("内联展开").setHeading();

    new Setting(containerEl)
      .setName("启用内联展开")
      .setDesc("在编辑器中输入经文引用后按 Tab 或 Enter 补全并展开经文")
      .addToggle(toggle => {
        toggle
          .setValue(this.plugin.settings.inlineExpandEnabled)
          .onChange(async (value) => {
            this.plugin.settings.inlineExpandEnabled = value;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("展开快捷键")
      .setDesc("选择触发内联展开的按键")
      .addDropdown(dropdown => {
        dropdown
          .addOption("tab", "Tab")
          .addOption("enter", "Enter")
          .addOption("both", "Tab + Enter")
          .setValue(this.plugin.settings.expandKey)
          .onChange(async (value) => {
            this.plugin.settings.expandKey = value as "tab" | "enter" | "both";
            await this.plugin.saveSettings();
          });
      });

    // === 阅读模式 ===
    new Setting(containerEl).setName("阅读模式").setHeading();

    new Setting(containerEl)
      .setName("启用点击跳转")
      .setDesc("阅读模式下，点击 *经文引用* 跳转到圣经面板")
      .addToggle(toggle => {
        toggle
          .setValue(this.plugin.settings.readingClickEnabled)
          .onChange(async (value) => {
            this.plugin.settings.readingClickEnabled = value;
            await this.plugin.saveSettings();
          });
      });

    // === 数据管理 ===
    new Setting(containerEl).setName("数据管理").setHeading();

    const configDir = this.app.vault.configDir;
    const dataInfo = containerEl.createEl("div", { cls: "setting-item-description" });
    dataInfo.createEl("p", {
      text: `经文数据存储在 ${configDir}/plugins/bible-study/data/cuv/ 目录下，每卷书一个 JSON 文件。`,
    });
    dataInfo.createEl("p", {
      text: "运行 node scripts/fetch-bible.js 可从在线 API 下载完整的和合本经文数据。",
    });

    new Setting(containerEl)
      .setName("重新加载数据")
      .setDesc("清除数据缓存并重新从文件加载")
      .addButton(button => {
        button
          .setButtonText("刷新缓存")
          .onClick(() => {
            void this.plugin.refreshData();
          });
      });
  }
}
