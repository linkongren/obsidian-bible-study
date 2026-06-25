/**
 * 插件设置选项卡
 */

import { App, PluginSettingTab, Setting } from "obsidian";
import type BibleStudyPlugin from "./main";

export class BibleStudySettingTab extends PluginSettingTab {
  plugin: BibleStudyPlugin;

  constructor(app: App, plugin: BibleStudyPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    const doc = containerEl.ownerDocument;
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
            doc.documentElement.style.setProperty("--bible-font-size", `${value}px`);
          });
      });

    // === 内联展开 ===
    new Setting(containerEl).setName("内联展开").setHeading();

    new Setting(containerEl)
      .setName("启用内联展开")
      .setDesc("在编辑器中输入 -ref 后按 Tab 或 Enter 两步展开经文")
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
            this.plugin.refreshData();
          });
      });
  }
}
