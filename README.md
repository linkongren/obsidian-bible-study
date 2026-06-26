# Bible Study — Obsidian 圣经研读插件

在 Obsidian 中快速引用、阅读、浏览圣经（和合本 CUV 简体中文）。

## 功能

| 功能 | 说明 |
|------|------|
| 内联两步展开 | 输入 `-约3:16` 按 Tab → 变为 `*约3:16*`，再按 → 展开经文 |
| 引用链接 | `-约3:16` 和 `*约翰福音 3:16*` 自动高亮为可点击链接 |
| 阅读面板 | 右侧栏圣经阅读器，点击经文插入，点击引用跳转到具体节号 |
| 多段引用 | 支持逗号分隔：`-约3:16, 3:17-18, 4:1` |
| 智能搜索 | 支持中文名、简称、拼音、拼音首字母、英文缩写 |
| 手机友好 | 支持 `！` 触发、Enter 键、空格分隔 |

## 使用方式

### 内联引用

输入 `-书卷 章:节`（或 `！书卷 章:节`），两步操作：

| 操作 | 效果 |
|------|------|
| **第一次 Tab / Enter** | `-约3:16` → `*约翰福音 3:16*` |
| **第二次 Tab / Enter** | 在 `*约翰福音 3:16*` 后追加完整经文 |
| **点击链接** | 打开面板并跳转到对应章节 |

支持的输入格式：

```
-约3:16                  → *约翰福音 3:16*
-约 3:16                 → *约翰福音 3:16*
-约3:16,3:17-18,4:1      → *约翰福音 3:16, 3:17-18, 4:1*
-yh 3:16                 → 拼音首字母
-jhn 3:16                → 英文缩写
！约3:16                 → 手机触发符
```

### 阅读面板

- 点击 📖 图标切换面板（再点关闭）
- 下拉选择书卷和章节
- 点击经文 → 插入到笔记（无笔记则复制）
- 双击经文 → 复制引用
- ← → 方向键翻章
- 点击引用链接 → 打开面板并跳转到节

### 设置

- **内联展开开关** — 关闭后 Tab/Enter 不再触发展开
- **展开快捷键** — 可选 Tab / Enter / Tab+Enter
- **默认译本** / **显示经文编号** / **引用格式** / **字号**

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
3. 重启 Obsidian，启用插件

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
| Two-step Inline Expand | Type `-约3:16` + Tab → `*John 3:16*`, Tab again → append full verse |
| Reference Links | `-book` and `*ref*` patterns auto-highlighted as clickable links |
| Reading Panel | Right-sidebar reader with book/chapter navigation, click to insert |
| Multi-reference | Comma-separated: `-约3:16, 3:17-18, 4:1` |
| Smart Search | Full name, abbreviation, Pinyin, English abbreviation |
| Mobile Friendly | `！` trigger, Enter key, space separator support |

## Usage

### Inline References

Type `-book chapter:verse` (or `！book chapter:verse`):

| Action | Result |
|--------|--------|
| **1st Tab / Enter** | `-约3:16` → `*John 3:16*` |
| **2nd Tab / Enter** | Appends the full verse text after `*John 3:16*` |
| **Click link** | Opens panel and navigates to the verse |

```
-jhn 3:16               → *John 3:16*
-jhn 3:16, 3:17-18      → *John 3:16, 3:17-18*
```

### Reading Panel

- Click 📖 ribbon icon to toggle
- Select book and chapter from dropdowns
- Click verse → insert into note (copy if no editor)
- Double-click → copy reference
- ← → arrow keys to navigate chapters
- Click reference link → navigate to specific verse

### Settings

- **Inline expand** toggle, **expand key** (Tab/Enter/both)
- Default version, verse display options, font size

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
3. Restart Obsidian, enable plugin

## Bible Data

The plugin downloads Bible data (~3.7MB) on first use from the GitHub Release. Cached locally afterwards.

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
