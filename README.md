# 华夏史迹 - 交互式中国历史地图

一个基于 ECharts 的交互式中国历史地图网页应用，帮助用户探索中国历史事件、标志性建筑和历史人物。

## 功能特性

- 🗺️ **交互式地图**：点击省份查看该地区的历史信息
- 📅 **时间轴筛选**：按朝代筛选历史事件，显示各朝代版图范围
- 🔍 **搜索功能**：搜索城市、历史事件、人物、建筑
- ❤️ **收藏功能**：收藏感兴趣的历史项目
- 📚 **每日问答**：每日历史知识问答，提升学习兴趣
- 🏆 **游戏化系统**：积分、成就、排行榜、学习进度追踪
- 🌙 **深色模式**：支持浅色/深色主题切换

## 技术栈

- HTML5 + CSS3 + JavaScript (ES6+)
- ECharts 5.x（地图可视化）
- LocalStorage（数据缓存和用户数据存储）

## 使用方法

### 本地运行

1. 克隆仓库：
```bash
git clone https://github.com/your-username/china-history-map.git
cd china-history-map
```

2. 使用本地服务器运行（推荐）：
```bash
# Python 3
python -m http.server 8000

# Python 2
python -m SimpleHTTPServer 8000

# Node.js (需要安装 http-server)
npx http-server -p 8000
```

3. 在浏览器中访问：`http://localhost:8000`

### GitHub Pages 部署

1. 在 GitHub 仓库设置中启用 GitHub Pages
2. 选择 `main` 分支和 `/ (root)` 目录
3. 访问：`https://your-username.github.io/china-history-map/`

## 项目结构

```
china-history-map/
├── index.html          # 主页面
├── css/
│   └── style.css      # 样式文件
├── js/
│   ├── main.js        # 主要逻辑
│   ├── map.js         # 地图相关功能
│   ├── quiz.js        # 问答功能
│   └── gamification.js # 游戏化系统
├── data/
│   └── history-data.json # 历史数据
└── README.md          # 项目说明
```

## 数据说明

- 覆盖 34 个省级行政区
- 包含 48 个重要城市
- 每个城市包含 3-5 个历史项目
- 数据涵盖从夏商周到现代的历史事件

## 浏览器支持

- Chrome/Edge (推荐)
- Firefox
- Safari
- 其他现代浏览器

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！

