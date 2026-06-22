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
    containerEl.empty();

    containerEl.createEl("h2", { text: "Bible Study 设置" });

    // === 经文版本 ===
    containerEl.createEl("h3", { text: "圣经版本" });

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
    containerEl.createEl("h3", { text: "显示设置" });

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
          .setDynamicTooltip()
          .onChange(async (value) => {
            this.plugin.settings.fontSize = value;
            await this.plugin.saveSettings();
            // 动态更新面板字号
            document.documentElement.style.setProperty("--bible-font-size", `${value}px`);
          });
      });

    // === 数据管理 ===
    containerEl.createEl("h3", { text: "数据管理" });

    const dataInfo = containerEl.createEl("div", { cls: "setting-item-description" });
    dataInfo.createEl("p", {
      text: "经文数据存储在 .obsidian/plugins/bible-study/data/cuv/ 目录下，每卷书一个 JSON 文件。",
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
            // 触发数据重新加载
            this.plugin.refreshData();
          });
      });
  }
}
