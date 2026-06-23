# Bible Study — Obsidian 圣经研读插件

在 Obsidian 中快速引用、阅读、浏览圣经（和合本 CUV 简体中文）。

## 功能

| 功能 | 说明 |
|------|------|
| 📝 内联展开 | 输入 `-约3:16` 按 Tab，直接展开为经文 |
| 🔗 引用链接 | `-约3:16` 自动高亮为可点击链接 |
| 👁️ 悬停预览 | 鼠标悬停在引用链接上，弹出经文预览卡片 |
| 📖 阅读面板 | 右侧栏圣经阅读器，支持书卷/章节选择 |
| 🎯 智能搜索 | 支持中文名、简称、拼音、拼音首字母搜索 |
| ⌨️ 快捷键 | `Ctrl+Shift+B` 插入经文 / 弹窗引用 |

## 使用方式

### 内联引用

在编辑器中输入 `-书卷 章:节`，然后：

- **按 Tab** → 展开为完整经文
- **悬停 0.3 秒** → 预览经文卡片
- **点击链接** → 打开圣经面板并跳转

```
-约3:16        → 约翰福音 3:16
-创1:1         → 创世记 1:1
-诗23:1-3      → 诗篇 23:1-3（范围引用）
-yhfy 3:16     → 拼音首字母也行
```

### 阅读面板

- 点击左侧栏 📖 图标打开
- 下拉选择书卷和章节
- 点击任意经文 → 插入到当前笔记
- 双击经文 → 复制引用
- ← → 方向键翻章
- 右上角 ✕ 关闭面板

### 快捷键

| 快捷键 | 功能 |
|--------|------|
| `Ctrl+Shift+B` | 展开内联引用 / 弹窗输入 |

## 安装

### 社区插件（推荐）

在 Obsidian 设置 → 第三方插件 → 浏览 → 搜索 "Bible Study" 直接安装。

### 手动安装

1. 下载 [最新 Release](https://github.com/linkongren/obsidian-bible-study/releases)
2. 将 `main.js`、`manifest.json`、`styles.css` 放入 vault 的 `.obsidian/plugins/bible-study/` 目录
3. 重启 Obsidian，设置 → 第三方插件 → 启用 "Bible Study"

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

## Features

| Feature | Description |
|---------|-------------|
| Inline Expand | Type `-约3:16` and press Tab to expand into the full verse |
| Reference Links | `-约3:16` is automatically highlighted as a clickable link |
| Hover Preview | Hover over a reference link to see a verse preview card |
| Reading Panel | Right-sidebar Bible reader with book/chapter navigation |
| Smart Search | Supports Chinese full name, abbreviations, Pinyin, and English abbreviations |

## Usage

### Inline References

Type `-book chapter:verse` in the editor:

- **Press Tab** → expand to full verse text
- **Hover 0.3s** → preview verse card
- **Click link** → open Bible panel and navigate

```
-约3:16        → John 3:16
-创1:1         → Genesis 1:1
-诗23:1-3      → Psalm 23:1-3 (range)
-jhn 3:16      → English abbreviation works too
```

### Reading Panel

- Click 📖 ribbon icon to open
- Select book and chapter from dropdowns
- Click any verse → insert into current note
- Double-click verse → copy reference
- Arrow keys ← → to navigate chapters
- ✕ button to close panel

### Commands

| Command | Hotkey |
|---------|--------|
| Insert / Expand Bible Reference | `Ctrl+Shift+B` |
| Open Bible Reading Panel | — |
| Close Bible Reading Panel | — |

## Installation

### Community Plugin (Recommended)

Settings → Community Plugins → Browse → Search "Bible Study".

### Manual Install

1. Download the [latest Release](https://github.com/linkongren/obsidian-bible-study/releases)
2. Copy `main.js`, `manifest.json`, `styles.css` to `.obsidian/plugins/bible-study/`
3. Restart Obsidian → Settings → Community Plugins → Enable "Bible Study"

## Bible Data

The plugin embeds the complete CUV (Chinese Union Version, Simplified Chinese) Bible: 66 books, 1189 chapters, 31101 verses.

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
