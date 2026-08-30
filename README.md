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
npm test         # 单元测试
```

## 部署与嵌入

Vercel 的正式入口是 `/mermaid/`；`vercel.json` 会把该前缀映射到 Vite
构建产物，确保 `/mermaid/assets/*` 能正确加载。

iframe 宿主桥只接受同源父窗口的消息，并同时校验 `event.source` 与
`event.origin`。嵌入方需从与编辑器相同的 origin 提供页面（例如经宿主的
同源静态预览路由），协议不支持任意跨域父页面。

## 当前能力

- 五种图：flowchart / state / class / er / sequence
- 画布拖拽、连线、框选、缩放、自动布局
- 右侧代码编辑 + Mermaid 实时预览，导出 SVG / PNG / PDF
- 本地用户隔离存储（localStorage）；第一个注册的用户是管理员

## 技术栈

React 18 · TypeScript · Vite 5 · Tailwind · Mermaid 11 · dagre / 自研 Sugiyama 布局 · jsPDF

## 已知缺口（捡起来时优先看）

- `src/App.tsx` 仍是约 1800 行总控，插件接口没有真正吃掉 flowchart
- 密码是本地弱哈希，只适合单机自用
- 自动测试目前集中在纯逻辑、存储与 embed 协议，交互覆盖仍需继续补齐
