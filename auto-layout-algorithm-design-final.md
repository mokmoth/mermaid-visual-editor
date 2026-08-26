# 流程图自动排版算法设计方案

## TL;DR

> **快速概述**: 为通用流程图工具设计一套混合自动排版算法，采用 **Sugiyama 分层布局**为主、**Force-Directed 力导向**为辅的策略，支持泳道/分组嵌套、循环边智能处理、多方向布局。
>
> **核心产物**:
> - 完整的算法架构设计（6阶段Pipeline）
> - 数据结构定义
> - 各场景处理策略
> - 库选型与接口设计
>
> **预计复杂度**: **中等**（基于现有 Dagre 增强为主）

---

## 一、需求背景

### 1.1 产品定位
- **目标用户**: 技术人员（开发/架构师）+ 通用画图用户
- **类比产品**: draw.io / ProcessOn / Miro 的流程图功能
- **核心场景**: 业务流程图、UML图（类图/活动图）、系统架构图

### 1.2 功能目标
当用户点击"自动排版"按钮时，系统对当前画布上的所有节点和连线进行全局重排，以达到：
1. **层次清晰**: 体现流程的先后顺序
2. **交叉最少**: 尽量减少连线交叉
3. **美观整齐**: 对齐、间距均匀、专业感
4. **语义正确**: 开始在上/左，结束在下/右

### 1.3 技术约束
| 约束项 | 值 |
|-------|---|
| 运行环境 | Web 浏览器（主线程） |
| 节点规模 | 典型 200-1000 个节点 |
| 性能预期 | < 300ms 完成（可接受范围内） |
| 动画 | 无（即时切换） |

---

## 二、核心需求规格

### 2.1 支持的节点类型

| 类型 | 示例 | 特殊处理 |
|-----|------|---------|
| **基础流程图** | 矩形、菱形、圆角矩形、椭圆 | 动态连接点 |
| **UML节点** | 类图、活动图、用例图节点 | 固定端口（上下左右） |
| **容器/泳道** | 分组、泳道 | 递归内部布局 |
| **开始/结束** | 开始节点、结束节点 | 强制顶部/底部定位 |

### 2.2 支持的图特征

| 特征 | 处理策略 |
|-----|---------|
| **DAG（无环有向图）** | 直接应用 Sugiyama |
| **有环图** | 智能检测回边 → 临时反转 → 排布 → 恢复 |
| **混合图（有向+无向）** | 有向边走 Sugiyama，无向边走 Force |
| **森林（多棵独立树）** | 分别布局 → 合并放置 |

### 2.3 布局方向（用户可选）

| 方向 | 代码 | 说明 |
|-----|-----|------|
| 上到下 | `TB` (Top-Bottom) | 默认，标准流程图风格 |
| 下到上 | `BT` | 罕见，但支持 |
| 左到右 | `LR` | 时间轴/泳道风格 |
| 右到左 | `RL` | RTL语言场景 |

### 2.4 边路由策略

| 图类型 | 边路由 | 说明 |
|-------|-------|------|
| 流程图 | **正交 (Orthogonal)** | 只走水平/垂直，专业感 |
| UML活动图 | **正交** | 清晰的决策分支 |
| 架构图/自由图 | **贝塞尔曲线** | 更自然、美观 |
| 密集图 | **直线** | 降低复杂度 |

---

## 三、算法架构设计

### 3.1 总体 Pipeline（六阶段）

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          AUTO-LAYOUT PIPELINE                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌────────────┐    ┌────────────┐    ┌────────────┐    ┌────────────┐       │
│  │  Stage 1   │───▶│  Stage 2   │───▶│  Stage 3   │───▶│  Stage 4   │       │
│  │ 预处理     │    │ 结构分析   │    │ 分层排布   │    │ 层内排序   │       │
│  │Preprocess  │    │ Analyze    │    │ Layering   │    │ Ordering   │       │
│  └────────────┘    └────────────┘    └────────────┘    └────────────┘       │
│        │                                                      │              │
│        │                                                      ▼              │
│        │                                               ┌────────────┐       │
│        │                                               │  Stage 5   │       │
│        │                                               │ 坐标分配   │       │
│        │                                               │Positioning │       │
│        │                                               └────────────┘       │
│        │                                                      │              │
│        │                                                      ▼              │
│        │                                               ┌────────────┐       │
│        └──────────────────────────────────────────────▶│  Stage 6   │       │
│                                                        │ 边路由     │       │
│                                                        │Edge Routing│       │
│                                                        └────────────┘       │
│                                                              │               │
│                                                              ▼               │
│                                                        [最终布局]            │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 各阶段详解

---

#### Stage 1: 预处理 (Preprocessing)

**目标**: 将用户画布数据转换为算法可处理的图结构

**输入**: 画布原始数据 `{ nodes: Node[], edges: Edge[] }`

**处理步骤**:

```
1.1 节点标准化
    ├── 提取节点 ID、类型、尺寸
    ├── 标记特殊节点（开始/结束/泳道）
    └── 记录原始位置（用于失败回退）

1.2 边标准化  
    ├── 统一边的表示 { source, target, type }
    ├── 处理自环边（A→A）：标记，后续特殊渲染
    └── 处理重复边：合并或标记

1.3 泳道/容器处理
    ├── 识别容器节点及其子节点
    ├── 构建层级关系 parentId → childIds[]
    └── 临时"折叠"容器为单个虚拟节点

1.4 连接点预处理
    ├── UML节点：记录固定端口位置
    └── 普通节点：标记为动态计算
```

**输出**: 标准化图结构 `NormalizedGraph`

```typescript
interface NormalizedGraph {
  nodes: NormalizedNode[];
  edges: NormalizedEdge[];
  containers: ContainerInfo[];  // 泳道/分组信息
  specialNodes: {
    startNodes: string[];       // 开始节点 IDs
    endNodes: string[];         // 结束节点 IDs
  };
  originalPositions: Map<string, Position>;  // 回退用
}
```

---

#### Stage 2: 结构分析 (Structure Analysis)

**目标**: 理解图的拓扑特征，选择最优算法策略

**分析维度**:

```
2.1 连通性分析
    ├── 识别连通分量 (Connected Components)
    ├── 多个分量 → 分别布局后合并
    └── 孤立节点 → 单独放置区域

2.2 有向性分析
    ├── 计算有向边占比
    ├── > 70% 有向 → Sugiyama 为主
    ├── < 30% 有向 → Force-Directed 为主
    └── 中间值 → 混合策略

2.3 环路检测 (Cycle Detection)
    ├── 使用 DFS 检测强连通分量 (SCC)
    ├── 识别"回边" (Back Edges)
    └── 标记需要临时反转的边

2.4 层次深度估算
    ├── 计算最长路径长度
    ├── 估算层数 → 用于布局方向建议
    └── 宽 > 高 → 建议 LR，否则 TB

2.5 密度分析
    ├── 计算 edges/nodes 比率
    ├── > 2.0 → 密集图，可能需要简化策略
    └── < 0.5 → 稀疏图，可放大间距
```

**输出**: 分析报告 `GraphAnalysis`

```typescript
interface GraphAnalysis {
  components: NodeId[][];        // 连通分量
  isDAG: boolean;                // 是否无环
  backEdges: EdgeId[];           // 需反转的回边
  directedRatio: number;         // 有向边比例 0-1
  maxDepth: number;              // 最大深度
  density: number;               // 密度
  suggestedDirection: 'TB' | 'LR' | 'BT' | 'RL';
  suggestedAlgorithm: 'sugiyama' | 'force' | 'hybrid';
}
```

---

#### Stage 3: 分层排布 (Layer Assignment) - Sugiyama Phase 1

**目标**: 将节点分配到不同的层级（行/列）

**算法选择**: Network Simplex（最优）或 Longest Path（快速）

**处理步骤**:

```
3.1 准备工作
    ├── 临时反转回边（Stage 2 标记的）
    └── 此时图变为 DAG

3.2 初始分层
    ├── 拓扑排序确定基本层级
    ├── 开始节点 → 强制第0层
    └── 结束节点 → 强制最后层

3.3 层级优化 (Network Simplex)
    ├── 目标：最小化总边长度
    ├── 约束：layer[target] > layer[source]
    └── 迭代调整直到最优

3.4 虚拟节点插入
    ├── 跨多层的边 → 插入虚拟节点
    ├── 虚拟节点用于边弯折点
    └── 保持边只跨越相邻层

3.5 容器/泳道约束
    ├── 容器内节点必须连续分层
    └── 容器边界不能被其他节点打断
```

**输出**: 层级分配 `LayerAssignment`

```typescript
interface LayerAssignment {
  layers: NodeId[][];            // layers[i] = 第i层的节点IDs
  nodeToLayer: Map<NodeId, number>;
  virtualNodes: VirtualNode[];   // 插入的虚拟节点
  layerCount: number;
}
```

**示意图**:
```
Layer 0:  [开始]
Layer 1:  [A] [B]
Layer 2:  [虚拟1] [C] [D]
Layer 3:  [E]
Layer 4:  [结束]
```

---

#### Stage 4: 层内排序 (Crossing Reduction) - Sugiyama Phase 2

**目标**: 在每层内调整节点顺序，最小化边交叉

**算法选择**: Barycenter Heuristic（重心法）

**核心思想**: 节点的位置 = 其邻居位置的加权平均

**处理步骤**:

```
4.1 初始排序
    └── 按原始x坐标排序（利用用户习惯）

4.2 迭代优化 (Layer-by-Layer Sweep)
    ├── 从上到下扫一遍
    │   └── 每层节点按"上层邻居平均位置"排序
    ├── 从下到上扫一遍  
    │   └── 每层节点按"下层邻居平均位置"排序
    └── 重复直到交叉数收敛（或达到最大迭代次数）

4.3 开始/结束节点约束
    ├── 开始节点 → 尽量居中或居左
    └── 结束节点 → 尽量居中或居右

4.4 泳道约束
    └── 同一泳道的节点必须相邻排列
```

**Barycenter 公式**:
```
barycenter(node) = Σ(position(neighbor)) / count(neighbors)
```

**输出**: 每层的节点排列顺序

---

#### Stage 5: 坐标分配 (Coordinate Assignment) - Sugiyama Phase 3

**目标**: 计算每个节点的精确 (x, y) 坐标

**考量因素**:
- 节点尺寸不同（矩形 vs 菱形）
- 间距均匀
- 对齐美观
- 容器边界正确

**处理步骤**:

```
5.1 Y坐标分配（垂直位置 - 针对TB布局）
    ├── 按层分配：y = layer * layerSpacing + offset
    ├── layerSpacing = max(该层节点高度) + gap
    └── 适配布局方向（LR时x/y互换）

5.2 X坐标分配（水平位置）
    ├── 算法选择：Brandes-Köpf 或 Priority Layout
    ├── 目标：最小化边的水平偏移
    ├── 约束：相邻节点间距 >= nodeSpacing
    └── 对齐策略：居中对齐（美观）或左对齐（紧凑）

5.3 容器尺寸计算
    ├── 先布局容器内部节点
    ├── 计算内部节点的边界框
    ├── 容器尺寸 = 边界框 + padding
    └── 调整外部布局适应容器尺寸

5.4 后处理对齐
    ├── 检查并修正节点重叠
    ├── 微调实现更好的视觉对齐
    └── 应用网格对齐（可选）
```

**间距参数**（建议可配置）:

| 参数 | 默认值 | 说明 |
|-----|-------|------|
| `layerSpacing` | 80px | 层与层之间的距离 |
| `nodeSpacing` | 50px | 同层节点之间的距离 |
| `containerPadding` | 30px | 容器内边距 |
| `edgePadding` | 10px | 边与节点的最小距离 |

**输出**: 节点位置 `Map<NodeId, {x, y, width, height}>`

---

#### Stage 6: 边路由 (Edge Routing)

**目标**: 计算每条边的路径（连接点 + 弯折点）

**策略选择**（基于 Stage 2 分析）:

```
6.1 路由类型选择
    ├── 流程图/UML → 正交路由 (Orthogonal)
    ├── 架构图 → 贝塞尔曲线 (Bezier)
    └── 密集图 → 直线 (Straight)

6.2 连接点计算
    ├── 固定端口节点（UML）→ 使用预定义端口
    └── 动态节点 → 计算最佳连接位置
        ├── 同层连接 → 左右端口
        ├── 跨层连接 → 上下端口
        └── 斜向连接 → 最近点

6.3 正交路由算法
    ├── 使用虚拟节点确定弯折点
    ├── 避免与其他节点重叠
    ├── 尽量减少弯折次数
    └── 生成路径点数组 [{x, y}, ...]

6.4 回边特殊处理
    ├── 从下层指向上层的边
    ├── 绕过其他节点
    └── 可选：用虚线/不同颜色标记

6.5 边交叉优化
    └── 微调路径减少交叉（启发式）
```

**输出**: 边路径 `Map<EdgeId, PathPoints[]>`

```typescript
interface EdgeRoute {
  sourcePort: { x: number, y: number, side: 'top'|'bottom'|'left'|'right' };
  targetPort: { x: number, y: number, side: 'top'|'bottom'|'left'|'right' };
  bendPoints: { x: number, y: number }[];
  routeType: 'orthogonal' | 'bezier' | 'straight';
}
```

---

### 3.3 降级策略 (Fallback)

当 Sugiyama 算法失败或超时时，降级到 Force-Directed:

```
降级触发条件:
├── 分层阶段失败（极端复杂图）
├── 计算超时（> 500ms）
└── 结果质量评分过低

Force-Directed 降级流程:
├── 初始化：使用原始位置或随机位置
├── 模拟参数：
│   ├── 斥力强度：-300
│   ├── 引力强度：1.0
│   ├── 碰撞半径：节点尺寸 + padding
│   └── 迭代次数：300
├── 运行模拟直到稳定
└── 边采用直线连接

降级提示:
└── 可选：通知用户"复杂图形，采用简化布局"
```

---

## 四、数据结构定义

### 4.1 输入数据结构

```typescript
// 画布原始数据
interface CanvasData {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
}

interface CanvasNode {
  id: string;
  type: 'rect' | 'diamond' | 'ellipse' | 'uml-class' | 'swimlane' | 'start' | 'end' | string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  parentId?: string;           // 所属容器
  ports?: Port[];              // UML节点的端口
  data?: Record<string, any>;  // 业务数据
}

interface CanvasEdge {
  id: string;
  source: string;              // 源节点ID
  target: string;              // 目标节点ID
  sourcePort?: string;         // 源端口ID
  targetPort?: string;         // 目标端口ID
  label?: string;
}

interface Port {
  id: string;
  position: 'top' | 'bottom' | 'left' | 'right';
  offset?: number;             // 相对于边中点的偏移
}
```

### 4.2 输出数据结构

```typescript
// 布局结果
interface LayoutResult {
  success: boolean;
  algorithm: 'sugiyama' | 'force' | 'hybrid';
  nodes: Map<string, NodeLayout>;
  edges: Map<string, EdgeLayout>;
  containers: Map<string, ContainerLayout>;
  metrics: LayoutMetrics;
}

interface NodeLayout {
  id: string;
  position: { x: number; y: number };
  size: { width: number; height: number };  // 可能调整后的尺寸
  layer?: number;              // 所在层级
}

interface EdgeLayout {
  id: string;
  route: EdgeRoute;            // 路由信息
}

interface ContainerLayout {
  id: string;
  position: { x: number; y: number };
  size: { width: number; height: number };  // 根据内容计算
  childrenBounds: Bounds;      // 内部节点边界
}

interface LayoutMetrics {
  crossingCount: number;       // 边交叉数
  totalEdgeLength: number;     // 总边长度
  symmetry: number;            // 对称性评分 0-1
  executionTime: number;       // 执行时间 ms
}
```

### 4.3 配置选项

```typescript
interface LayoutOptions {
  // 布局方向
  direction: 'TB' | 'BT' | 'LR' | 'RL';
  
  // 间距配置
  spacing: {
    layer: number;             // 层间距 (default: 80)
    node: number;              // 节点间距 (default: 50)
    containerPadding: number;  // 容器内边距 (default: 30)
  };
  
  // 边路由
  edgeRouting: 'orthogonal' | 'bezier' | 'straight' | 'auto';
  
  // 算法选项
  algorithm: {
    type: 'sugiyama' | 'force' | 'auto';
    maxIterations?: number;    // 最大迭代次数
    timeout?: number;          // 超时时间 ms
  };
  
  // 特殊处理
  specialNodes: {
    treatStartAsFirst: boolean;  // 开始节点置顶
    treatEndAsLast: boolean;     // 结束节点置底
  };
  
  // 调试选项
  debug?: {
    showLayers: boolean;       // 显示层级
    showMetrics: boolean;      // 显示质量指标
  };
}
```

---

## 五、库选型建议

### 5.1 主推：ELKjs

**理由**:
- 功能最全面（14+ 种算法）
- 原生支持嵌套布局（泳道/容器）
- 学术背景深厚，算法质量高
- 活跃维护

**使用方式**:
```typescript
import ELK from 'elkjs/lib/elk.bundled.js';

const elk = new ELK();
const layout = await elk.layout({
  id: "root",
  layoutOptions: {
    'elk.algorithm': 'layered',
    'elk.direction': 'DOWN',
    'elk.layered.spacing.nodeNodeBetweenLayers': '80',
    'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX'
  },
  children: nodes,
  edges: edges
});
```

### 5.2 **推荐: Dagre + 增强 (基于现有栈)**

**关键优势**:
- ✅ **你已在使用 Dagre**，无需引入新依赖
- ✅ 与 React 生态完美集成
- ✅ 代码量最小，维护成本低
- ✅ 性能优异，适合质量优先场景

**基于现有 Dagre 的增强策略**:
```typescript
// 扩展现有 Dagre 使用
import dagre from 'dagre';
import { forceSimulation, forceCollide } from 'd3-force';

// 主布局 - Dagre (你已熟悉)
const g = new dagre.graphlib.Graph();
g.setGraph({
  rankdir: 'TB',           // 基于用户选择
  nodesep: 50,             // 可配置间距
  ranksep: 80,
  marginx: 20,
  marginy: 20
});

// 节点标准化 (适配你的数据结构)
nodes.forEach(node => {
  g.setNode(node.id, { 
    width: node.width, 
    height: node.height,
    // 自定义属性用于特殊处理
    type: node.type,
    isStart: node.type === 'start',
    isEnd: node.type === 'end'
  });
});

// 边处理 (支持你的容器结构)
edges.forEach(edge => {
  g.setEdge(edge.source, edge.target, {
    // 用于正交路由
    points: [],
    // 特殊标记
    isBackEdge: detectBackEdge(edge)
  });
});

// 执行布局
dagre.layout(g);

// 后处理增强
const layoutResult = {
  nodes: extractNodePositions(g),
  edges: enhanceEdgeRouting(g, edges), // 正交路由增强
  quality: calculateLayoutQuality(g)
};
```

**基于 React Hook 的 API 设计**:
```typescript
// 完全融入你现有的 React Hooks 模式
const useAutoLayout = (
  nodes: DiagramNode[],
  edges: DiagramEdge[],
  options: LayoutOptions
) => {
  const [layoutResult, setLayoutResult] = useState<LayoutResult | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  const runLayout = useCallback(async () => {
    setIsCalculating(true);
    try {
      // 1. 预处理 (适配你的 Mermaid + SVG 数据)
      const normalized = preprocessDiagram(nodes, edges);
      
      // 2. Dagre 核心布局
      const dagreResult = runDagreLayout(normalized, options);
      
      // 3. 边路由增强 (正交/贝塞尔)
      const enhancedResult = enhanceEdgeRouting(dagreResult, options);
      
      // 4. 质量优化 (基于质量优先)
      const optimized = optimizeForQuality(enhancedResult);
      
      setLayoutResult(optimized);
    } finally {
      setIsCalculating(false);
    }
  }, [nodes, edges, options]);

  return { layoutResult, runLayout, isCalculating };
};
```

### 5.3 备选：Dagre + d3-force (复杂场景)

**适用场景**:
- 需要处理无向图的混合场景
- 想要对特定区域进行力导向优化

**组合策略**:
```typescript
// 主布局用 Dagre (你现有的)
import dagre from 'dagre';

// 特定区域用 d3-force (新增)
import { forceSimulation, forceLink, forceManyBody, forceCollide } from 'd3-force';

// 混合布局: Dagre + Force 微调
function hybridLayout(nodes, edges, options) {
  // 1. Dagre 主要布局
  const dagreResult = runDagreLayout(nodes, edges, options);
  
  // 2. 识别需要 Force 优化的区域
  const forceNodes = identifyForceOptimizationArea(dagreResult, options);
  
  // 3. 局部 Force-Directed 优化
  if (forceNodes.length > 0) {
    const forceResult = forceSimulation(forceNodes)
      .force('collide', forceCollide(d => d.radius))
      .stop();
    
    // 4. 合并结果
    return mergeLayouts(dagreResult, forceResult);
  }
  
  return dagreResult;
}
```

### 5.4 对比总结

| 维度 | ELKjs | Dagre | d3-force |
|-----|-------|-------|----------|
| 算法丰富度 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ |
| 嵌套布局 | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐ |
| 学习曲线 | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| Bundle 大小 | 较大 (~500KB) | 小 (~50KB) | 中 (~100KB) |
| 性能 | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| 自定义能力 | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |

**推荐**: **基于现有 Dagre 增强方案** - 最小成本，最大收益！  
备选：ELKjs（如需复杂嵌套布局时）

---

## 六、边缘情况处理

### 6.1 空图
```
处理: 直接返回成功，无变化
```

### 6.2 单节点
```
处理: 居中放置，无边处理
```

### 6.3 孤立节点（无连接）
```
处理: 
├── 识别所有孤立节点
├── 主流程正常布局
└── 孤立节点放置在画布边缘区域
```

### 6.4 自环边（A → A）
```
处理:
├── 从布局算法中排除
├── 后处理：画回到自身的曲线
└── 通常放在节点右侧或下侧
```

### 6.5 极端密集图
```
处理:
├── 检测 density > 3.0
├── 提示用户"图形过于复杂"
├── 降级到 Force-Directed
└── 可选：建议用户分解图形
```

### 6.6 超大规模（>1000节点）
```
处理:
├── 分块布局策略
│   ├── 按连通分量分块
│   └── 或按泳道/容器分块
├── 各块独立布局
├── 块间位置协调
└── 考虑 Web Worker 异步（未来优化）
```

---

## 七、质量评估指标

布局完成后，计算以下指标用于质量评估和调试:

| 指标 | 计算方法 | 理想值 |
|-----|---------|-------|
| **边交叉数** | 检测所有边对的交点 | 越少越好，0最佳 |
| **边弯折数** | 统计正交路由的拐角 | 越少越好 |
| **平均边长度** | 所有边长度的平均值 | 适中，过长过短都不好 |
| **节点重叠** | 检测矩形交集 | 必须为 0 |
| **对称性** | 图的轴对称/中心对称程度 | 越高越美观 |
| **紧凑度** | 布局面积 / 节点总面积 | 1.5-3.0 为佳 |

```typescript
interface QualityMetrics {
  crossings: number;
  bends: number;
  avgEdgeLength: number;
  overlaps: number;           // 必须为 0
  symmetryScore: number;      // 0-1
  compactness: number;
  overallScore: number;       // 综合评分 0-100
}
```

---

## 八、API 接口设计

### 8.1 主入口

```typescript
/**
 * 自动排版主函数
 * @param canvas - 画布数据
 * @param options - 配置选项
 * @returns 布局结果
 */
async function autoLayout(
  canvas: CanvasData,
  options?: Partial<LayoutOptions>
): Promise<LayoutResult> {
  // 1. 合并默认选项
  const opts = mergeOptions(defaultOptions, options);
  
  // 2. 预处理
  const normalized = preprocess(canvas);
  
  // 3. 结构分析
  const analysis = analyzeStructure(normalized);
  
  // 4. 选择算法
  const algorithm = selectAlgorithm(analysis, opts);
  
  // 5. 执行布局
  const result = await executeLayout(normalized, analysis, algorithm, opts);
  
  // 6. 后处理边路由
  const finalResult = routeEdges(result, opts);
  
  // 7. 计算质量指标
  finalResult.metrics = calculateMetrics(finalResult);
  
  return finalResult;
}
```

### 8.2 辅助函数

```typescript
// 仅对选中节点进行布局
function layoutSelection(
  canvas: CanvasData,
  selectedNodeIds: string[],
  options?: Partial<LayoutOptions>
): Promise<LayoutResult>;

// 获取布局建议（不执行）
function suggestLayout(canvas: CanvasData): LayoutSuggestion;

// 验证布局结果
function validateLayout(result: LayoutResult): ValidationResult;
```

---

## 九、实现路线图建议

### Phase 1: 基础分层布局 (MVP)
- [ ] 预处理模块
- [ ] 基础 Sugiyama（无容器）
- [ ] 直线边路由
- [ ] TB/LR 方向支持

### Phase 2: 边路由增强
- [ ] 正交边路由
- [ ] 贝塞尔曲线边路由
- [ ] 回边处理

### Phase 3: 容器支持
- [ ] 泳道/分组识别
- [ ] 递归内部布局
- [ ] 容器尺寸自适应

### Phase 4: 优化 & 降级
- [ ] Force-Directed 降级
- [ ] 性能优化
- [ ] 质量评估指标

### Phase 5: 高级特性
- [ ] 局部布局
- [ ] 布局动画过渡（可选）
- [ ] Web Worker 异步（可选）

---

## 十、参考资源

### 论文
1. Sugiyama, K., Tagawa, S., & Toda, M. (1981). "Methods for visual understanding of hierarchical system structures"
2. Gansner, E. R., et al. (1993). "A technique for drawing directed graphs" (Graphviz dot 算法基础)
3. Brandes, U., & Köpf, B. (2001). "Fast and simple horizontal coordinate assignment"

### 库文档
1. [ELKjs Documentation](https://eclipse.dev/elk/)
2. [Dagre Wiki](https://github.com/dagrejs/dagre/wiki)
3. [d3-force API](https://github.com/d3/d3-force)

### 开源参考
1. draw.io / diagrams.net - 开源图表编辑器
2. React Flow - 现代 React 流程图库
3. JointJS / X6 - 图形编辑框架

---

## 附录：术语表

| 术语 | 英文 | 说明 |
|-----|------|------|
| 分层布局 | Layered Layout | 节点按层级排列 |
| 力导向布局 | Force-Directed | 基于物理模拟的布局 |
| 正交路由 | Orthogonal Routing | 只走水平/垂直的边路由 |
| 回边 | Back Edge | 从后序节点指向前序节点的边 |
| 重心法 | Barycenter Heuristic | 基于邻居平均位置的排序算法 |
| 边交叉 | Edge Crossing | 两条边在非端点处相交 |
| 虚拟节点 | Virtual Node | 跨多层边的中间弯折点 |
| 连通分量 | Connected Component | 图中相互可达的节点集合 |
