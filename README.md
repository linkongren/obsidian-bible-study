# Bible Study — Obsidian 圣经研读插件

在 Obsidian 中快速引用、阅读、浏览圣经（和合本 CUV 简体中文）。

## 功能

| 功能 | 说明 |
|------|------|
| 简化输入 | 输入 `-太5 6` 这类简写，按 Enter 自动补全 `马太福音 5:6`，按 `+`/`-` 调整范围 |
| 经文引用 | 完整经文如 `马太福音 5:6`，再按 Enter 自动插入对应经文，点击可跳转到圣经阅读面板 |
| 阅读面板 | 右侧栏圣经阅读器，卷/章多列选择器，多套阅读主题 |
| 手机友好 | 支持 `！`/`-` 识别简化经文，Enter 键、空格分隔补全和展开经文 |

## 使用方式

### 补全和展开经文

**支持的简化输入格式：**

```
-太5 6                      → 马太福音 5:6（以 `-` 开头触发识别）
！太5 6                     → 马太福音 5:6（手机可以 `!` 触发符）
-约 5 5 6                   → 约翰福音 5:5-6（空格三段式）
-yh 3:16                    → 约翰福音 3:16（拼音首字母）
-约3 16,3 17 18,4 1         → 约翰福音 3:16, 3:17-18, 4:1（多段引用）
```

**示例：两步展开**

输入 `-太5 6`，光标停在引用内，然后：

| 步骤 | 操作 | 效果 |
|------|------|------|
| ① | 按 `Enter`（或 `Tab`） | `-太5 6` → `马太福音 5:6`（去掉 `-`，补全书名，变成标准名） |
| ② | 再按 `Enter` | 在 `马太福音 5:6` 下方插入第 6 节经文 |

```
马太福音 5:6
> 〔6〕虚心的人有福了！因为天国是他们的。
```

**调整范围**（光标停在引用上时）：

| 按键 | 效果 |
|------|------|
| `+` | 追加下一节：`马太福音 5:6` → `马太福音 5:6-7`，并追加第 7 节经文 |
| `-` | 退回一节：`马太福音 5:6-8` → `马太福音 5:6-7`，并删除第 8 节 |
| 点击引用 | 打开面板并跳转到对应章节 |


### 阅读面板

- 点击 📖 图标切换面板（再点关闭）
- 卷/章多列网格选择器（卷 5 列、章 10 列）
- 5 套阅读主题，面板底部下拉切换
- 支持拖选文本复制（`Ctrl+C`），双击经文复制整节引用
- ← → 方向键翻章
- 点击引用链接 → 打开面板并跳转到节

### 命令

| 命令 | 快捷键 |
|------|--------|
| 插入/展开经文引用 | `Ctrl+Shift+B` |
| 切换圣经阅读面板 | — |

## 安装

### 社区插件（推荐）

在 Obsidian 设置 → 第三方插件 → 浏览 → 搜索 "Bible Study" 安装。

### 手动安装

1. 下载 [最新 Release](https://github.com/linkongren/obsidian-bible-study/releases)
2. 将 `main.js`、`manifest.json`、`styles.css` 放入 `.obsidian/plugins/bible-study/`
3. 重启 Obsidian，关闭安全模式并启用插件

## 开发

```bash
npm install
npm run dev     # 开发模式
npm run build   # 生产构建
```

## 致谢

- 圣经数据：[thiagobodruk/bible](https://github.com/thiagobodruk/bible)
- 繁简转换：[opencc-js](https://github.com/nk2028/opencc-js)

---

# English

A Bible study plugin for Obsidian. Quickly reference, read, and browse Bible verses (CUV, Simplified Chinese).

## Features

| Feature | Description |
|---------|-------------|
| Simplified Input | Type a shorthand like `-太5 6`, press Enter to auto-fill `马太福音 5:6`, adjust the range with `+` / `-` |
| Verse Quote | Type a full reference like `马太福音 5:6`, press Enter to insert the verse; click to jump to the reading panel |
| Reading Panel | Right-sidebar reader with multi-column book/chapter pickers and multiple reading themes |
| Mobile Friendly | `！` / `-` to recognize shorthand references; Enter key and space-separated input for completion and expansion |

## Usage

### Inline References

A reference can be written in **3 ways**, all of which are recognized:

| Form | Notes |
|------|-------|
| `-马太福音 5:6` | Starts with `-` to mark a reference to convert |
| `马太福音 5:6` | Plain text, auto-recognized |
| `*马太福音 5:6*` | Legacy `*...*` form (kept for compatibility) |

**Example: two-step expansion**

Type `-太5 6`, keep the cursor inside the reference:

| Step | Action | Result |
|------|--------|--------|
| 1 | Press `Enter` (or `Tab`) | `-太5 6` → `马太福音 5:6` (removes `-`, fills in the full book name, becomes a plain reference) |
| 2 | Press `Enter` again | Inserts verse 6 below `马太福音 5:6` |

```
马太福音 5:6
> 〔6〕虚心的人有福了！因为天国是他们的。
```

**Adjusting the range** (cursor on the reference):

| Key | Result |
|-----|--------|
| `+` | Appends next verse: `马太福音 5:6` → `马太福音 5:6-7`, inserting verse 7 |
| `-` | Shrinks back: `马太福音 5:6-8` → `马太福音 5:6-7`, removing verse 8 |
| Click reference | Opens panel and navigates to the verse |

```
-马太福音 5:6            → 马太福音 5:6 (removes -)
-约3:16,3:17-18,4:1      → 约翰福音 3:16, 3:17-18, 4:1 (multi-reference)
-jhn 3:16                → 约翰福音 3:16 (English abbreviation)
马太福音 5:6             → plain text reference, auto-recognized
```

### Reading Panel

- Click 📖 ribbon icon to toggle
- Multi-column book/chapter pickers (5 columns for books, 10 for chapters)
- 5 reading themes, switchable from a footer dropdown
- Select any text and `Ctrl+C`; double-click a verse to copy the full reference
- ← → arrow keys to navigate chapters
- Click reference link → navigate to specific verse

### Settings

- **Inline expand** toggle, **expand key** (Tab/Enter/both)
- Default version, verse display options, font size, reading theme

### Commands

| Command | Hotkey |
|---------|--------|
| Insert / Expand Reference | `Ctrl+Shift+B` |
| Toggle Reading Panel | — |

## Installation

### Community Plugin (Recommended)

Obsidian → Settings → Community Plugins → Browse → "Bible Study".

### Manual

1. Download [latest Release](https://github.com/linkongren/obsidian-bible-study/releases)
2. Copy `main.js`, `manifest.json`, `styles.css` to `.obsidian/plugins/bible-study/`
3. Restart Obsidian, disable restricted mode, and enable the plugin

## Bible Data

The plugin bundles complete CUV Bible data (compressed, ~1.1MB). No network needed after installation.

## Development

```bash
npm install
npm run dev     # Watch mode
npm run build   # Production build
```

## Credits

- Bible data: [thiagobodruk/bible](https://github.com/thiagobodruk/bible)
- Chinese conversion: [opencc-js](https://github.com/nk2028/opencc-js)

## License

MIT
