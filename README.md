# Bible Study — Obsidian 圣经研读插件

在 Obsidian 中快速引用、阅读、浏览圣经（和合本 CUV 简体中文）。

## 功能

| 功能 | 说明 |
|------|------|
| 📝 **内联展开** | 输入 `:约3:16` 按 Tab，直接展开为经文 |
| 🔗 **引用链接** | `:约3:16` 自动高亮为可点击链接 |
| 👁️ **悬停预览** | 鼠标悬停在引用链接上，弹出经文预览卡片 |
| 📖 **阅读面板** | 右侧栏圣经阅读器，支持书卷/章节选择 |
| 🎯 **智能搜索** | 支持中文名、简称、拼音、拼音首字母搜索 |
| ⌨️ **快捷键** | `Ctrl+Shift+B` 插入经文 / 弹窗引用 |

## 使用方式

### 内联引用

在编辑器中输入 `:书卷 章:节`，然后：

- **按 Tab** → 展开为完整经文
- **悬停 0.3 秒** → 预览经文卡片
- **点击链接** → 打开圣经面板并跳转

```
:约3:16        → 约翰福音 3:16
:创1:1         → 创世记 1:1
:诗23:1-3      → 诗篇 23:1-3（范围引用）
:yhfy 3:16     → 拼音首字母也行
:yuehan 3:16   → 拼音全拼也行
```

### 阅读面板

- 点击左侧栏 📖 图标打开
- 下拉选择书卷和章节
- 点击任意经文 → 插入到当前笔记
- 双击经文 → 复制引用
- ← → 方向键翻章

### 快捷键

| 快捷键 | 功能 |
|--------|------|
| `Ctrl+Shift+B` | 展开内联引用 / 弹窗输入 |

## 安装

### 方法一：手动安装（推荐）

1. 下载本仓库
2. 将整个 `bible-study` 文件夹复制到你的 Obsidian Vault 的 `.obsidian/plugins/` 目录下
3. 重启 Obsidian
4. 设置 → 第三方插件 → 启用 "Bible Study"

```
你的Vault/
└── .obsidian/
    └── plugins/
        └── bible-study/       ← 放在这里
            ├── main.js
            ├── manifest.json
            ├── styles.css
            └── data/
                └── cuv/
                    ├── gen.json
                    ├── exo.json
                    └── ...
```

### 方法二：BRAT 插件安装

1. 安装 [BRAT](https://github.com/TfTHacker/obsidian42-brat) 插件
2. BRAT → Add Beta Plugin → 输入本仓库的 GitHub URL
3. 启用 "Bible Study"

## 圣经数据

插件已内置完整的和合本 (CUV) 简体中文圣经数据（66卷、1189章、31101节）。

如需更新数据，运行：

```bash
npm run fetch-bible    # 从在线 API 下载
```

## 开发

```bash
npm install
npm run dev     # 开发模式（自动监听）
npm run build   # 生产构建
```

## 致谢

- 圣经数据来源：[thiagobodruk/bible](https://github.com/thiagobodruk/bible)
- 繁简转换：[opencc-js](https://github.com/nk2028/opencc-js)

## License

MIT
