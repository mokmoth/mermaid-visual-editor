# Mermaid Visual Editor

一个现代化的 Mermaid 流程图可视化编辑器，使用 React + TypeScript + Vite 构建。

## 特性

- 🎨 **可视化编辑** - 拖拽式节点编辑，所见即所得
- 📝 **双向同步** - 代码与图形实时同步
- 🔄 **撤销/重做** - 完整的历史记录支持
- 📐 **自动布局** - 基于 Dagre 的智能排版
- 📦 **多种形状** - 支持矩形、圆角、菱形、六边形等多种节点形状
- 🔗 **灵活连线** - 支持实线、虚线、多种箭头方向
- 📤 **多格式导出** - 支持 SVG、PNG、PDF 导出
- 🎯 **精确控制** - 网格对齐、节点缩放、框选等高级功能

## 快速开始

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev
```

### 构建生产版本

```bash
npm run build
```

### 预览生产版本

```bash
npm run preview
```

## 技术栈

- **React 18** - 用户界面
- **TypeScript** - 类型安全
- **Vite** - 构建工具
- **Tailwind CSS** - 样式框架
- **Mermaid.js** - 图表渲染
- **Dagre** - 自动布局算法
- **jsPDF** - PDF 导出
- **Zustand** - 状态管理

## 部署到 Vercel

本项目已针对 Vercel 部署进行优化：

1. Fork 此仓库或将代码推送到你的 GitHub
2. 在 Vercel 中导入项目
3. Vercel 会自动检测 Vite 配置并完成部署

或使用 Vercel CLI：

```bash
npm i -g vercel
vercel
```

## 项目结构

```
src/
├── components/          # React 组件
│   ├── Canvas.tsx       # 主画布组件
│   ├── Header.tsx       # 顶部工具栏
│   ├── Sidebar.tsx      # 右侧属性面板
│   ├── NodeVisual.tsx   # 节点渲染组件
│   ├── LinkRenderer.tsx # 连线渲染组件
│   └── Icons.tsx        # 图标组件
├── hooks/               # 自定义 Hooks
│   ├── useUndoRedo.ts   # 撤销/重做逻辑
│   └── useCanvas.ts     # 画布操作逻辑
├── store/               # 状态管理
│   └── editorStore.ts   # Zustand store
├── types/               # TypeScript 类型定义
│   └── index.ts
├── utils/               # 工具函数
│   ├── geometry.ts      # 几何计算
│   ├── nodeSize.ts      # 节点尺寸计算
│   ├── mermaid.ts       # Mermaid 代码生成/解析
│   ├── layout.ts        # 自动布局
│   └── export.ts        # 导出功能
├── App.tsx              # 主应用组件
├── main.tsx             # 入口文件
└── index.css            # 全局样式
```

## 键盘快捷键

| 快捷键 | 功能 |
|--------|------|
| `Cmd/Ctrl + Z` | 撤销 |
| `Cmd/Ctrl + Shift + Z` | 重做 |
| `Cmd/Ctrl + C` | 复制 |
| `Cmd/Ctrl + V` | 粘贴 |
| `Cmd/Ctrl + A` | 全选 |
| `Delete / Backspace` | 删除选中 |
| `Escape` | 取消选择 |

## 许可证

MIT
