# RL's Mermaid Tool

可视化编辑多种 Mermaid 图表：流程图、状态图、类图、ER 图、时序图。代码与画布双向同步，图表保存在浏览器本地。

GitHub：https://github.com/mokmoth/mermaid-visual-editor

## 本地开发

```bash
npm install
npm run dev
```

开发地址：http://127.0.0.1:5173/mermaid/  
（Vite `base` 设为 `/mermaid/`，方便挂到子路径。）

```bash
npm run build    # 产出 dist/
npm run preview  # 预览生产构建
```

## 当前能力

- 五种图：flowchart / state / class / er / sequence
- 画布拖拽、连线、框选、缩放、自动布局
- 右侧代码编辑 + Mermaid 实时预览，导出 SVG / PNG / PDF
- 本地用户隔离存储（localStorage）；第一个注册的用户是管理员

## 技术栈

React 18 · TypeScript · Vite 5 · Tailwind · Mermaid 11 · dagre / 自研 Sugiyama 布局 · jsPDF

## Git 状态（2026-08-26）

`origin/main` 当前在 `f4d39a2`（v2 多图类型 + 预览/撤销/非法代码护栏）。

## 已知缺口（捡起来时优先看）

- `src/App.tsx` 仍是约 1800 行总控，插件接口没有真正吃掉 flowchart
- 密码是本地弱哈希，只适合单机自用
- 没有自动测试；Mermaid 报错 SVG 有时会漏到页面上
