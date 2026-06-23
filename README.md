# Bible Study — Obsidian Plugin

A Bible study plugin for Obsidian. Quickly reference, read, and browse Bible verses (CUV Chinese Union Version, Simplified Chinese).

在 Obsidian 中快速引用、阅读、浏览圣经（和合本 CUV 简体中文）。

## Features | 功能

| Feature | Description |
|---------|-------------|
| Inline Expand | Type `-约3:16` and press Tab to expand into the full verse |
| Reference Links | `-约3:16` is automatically highlighted as a clickable link |
| Hover Preview | Hover over a reference link to see a verse preview card |
| Reading Panel | Right-sidebar Bible reader with book/chapter navigation |
| Smart Search | Supports Chinese full name, abbreviations, Pinyin, and English abbreviations |
| Keyboard | `Ctrl+Shift+B` to insert verses / open reference modal |

## Usage | 使用方式

### Inline References | 内联引用

Type `-book chapter:verse` in the editor, then:

- **Press Tab** → expand to full verse text
- **Hover 0.3s** → preview verse card
- **Click link** → open Bible panel and navigate

```
-约3:16        → John 3:16
-创1:1         → Genesis 1:1
-诗23:1-3      → Psalm 23:1-3 (range)
-jhn 3:16      → English abbreviation works too
```

### Reading Panel | 阅读面板

- Click the 📖 ribbon icon to open
- Select book and chapter from dropdowns
- Click any verse → insert into current note
- Double-click verse → copy reference
- Arrow keys ← → to navigate chapters

## Installation | 安装

### Manual Install | 手动安装

1. Download this repository
2. Copy the `bible-study` folder to your vault's `.obsidian/plugins/` directory
3. Restart Obsidian
4. Settings → Community Plugins → Enable "Bible Study"

```
your-vault/
└── .obsidian/
    └── plugins/
        └── bible-study/
            ├── main.js
            ├── manifest.json
            ├── styles.css
            └── data/
                └── cuv/
                    ├── gen.json
                    └── ...
```

### Community Plugin Directory

Once approved, this plugin will be available directly in Obsidian's Community Plugin browser.

## Bible Data | 圣经数据

The plugin includes the complete CUV (Chinese Union Version) Simplified Chinese Bible data (66 books, 1189 chapters, 31101 verses).

To refresh the data:

```bash
npm run fetch-bible
```

## Development | 开发

```bash
npm install
npm run dev     # Watch mode
npm run build   # Production build
```

## Credits | 致谢

- Bible data: [thiagobodruk/bible](https://github.com/thiagobodruk/bible)
- Chinese conversion: [opencc-js](https://github.com/nk2028/opencc-js)

## License

MIT
